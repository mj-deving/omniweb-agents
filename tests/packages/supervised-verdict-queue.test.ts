import { rm, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendVerdictLogEntry,
  buildPendingVerdictEntry,
  enqueuePendingVerdict,
  getVerdictDelayMs,
  loadPendingVerdicts,
  resolveDuePendingVerdicts,
} from "../../packages/omniweb-toolkit/scripts/_supervised-verdict-queue";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("supervised verdict queue", () => {
  it("uses category-specific default delay windows", () => {
    expect(getVerdictDelayMs("ANALYSIS")).toBe(2 * 60 * 60 * 1000);
    expect(getVerdictDelayMs("analysis")).toBe(2 * 60 * 60 * 1000);
    expect(getVerdictDelayMs("PREDICTION")).toBe(4 * 60 * 60 * 1000);
  });

  it("deduplicates queue inserts by tx hash", async () => {
    const dir = await makeTempDir();
    const queuePath = join(dir, "pending.json");
    const entry = buildPendingVerdictEntry({
      txHash: "0xabc",
      category: "ANALYSIS",
      text: "Compact claim",
      startedAt: "2026-04-21T10:00:00.000Z",
    });

    const first = await enqueuePendingVerdict(entry, queuePath);
    const second = await enqueuePendingVerdict(entry, queuePath);
    const queue = await loadPendingVerdicts(queuePath);

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.txHash).toBe("0xabc");
  });

  it("preserves both entries when concurrent inserts race on the same queue file", async () => {
    const dir = await makeTempDir();
    const queuePath = join(dir, "pending.json");
    const firstEntry = buildPendingVerdictEntry({
      txHash: "0xrace1",
      category: "ANALYSIS",
      text: "First concurrent claim",
      startedAt: "2026-04-21T10:00:00.000Z",
    });
    const secondEntry = buildPendingVerdictEntry({
      txHash: "0xrace2",
      category: "ANALYSIS",
      text: "Second concurrent claim",
      startedAt: "2026-04-21T10:00:10.000Z",
    });

    await Promise.all([
      enqueuePendingVerdict(firstEntry, queuePath),
      enqueuePendingVerdict(secondEntry, queuePath),
    ]);

    const queue = await loadPendingVerdicts(queuePath);

    expect(queue).toHaveLength(2);
    expect(queue.map((entry) => entry.txHash).sort()).toEqual(["0xrace1", "0xrace2"]);
  });

  it("resolves due entries into the log and removes them from the queue", async () => {
    const dir = await makeTempDir();
    const queuePath = join(dir, "pending.json");
    const logPath = join(dir, "verdicts.jsonl");
    const now = vi.fn(() => Date.parse("2026-04-21T12:30:00.000Z"));
    const entry = buildPendingVerdictEntry({
      txHash: "0xdef",
      category: "ANALYSIS",
      text: "Directional claim",
      startedAt: "2026-04-21T10:00:00.000Z",
      sourceRunPath: "/tmp/run.json",
    });
    await enqueuePendingVerdict(entry, queuePath);

    const result = await resolveDuePendingVerdicts({
      queuePath,
      logPath,
      now,
      resolveEntry: async (pendingEntry) => ({
        checkedAt: "2026-04-21T12:30:05.000Z",
        verdict: {
          verification: {
            txHash: pendingEntry.txHash,
            indexedVisible: true,
            observedScore: 90,
          },
        },
      }),
    });

    const queue = await loadPendingVerdicts(queuePath);
    const logLines = (await readFile(logPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));

    expect(result.resolved).toHaveLength(1);
    expect(result.remaining).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(queue).toEqual([]);
    expect(logLines).toHaveLength(1);
    expect(logLines[0]?.txHash).toBe("0xdef");
    expect(logLines[0]?.verdict?.verification?.observedScore).toBe(90);
  });

  it("keeps due entries queued when resolution throws", async () => {
    const dir = await makeTempDir();
    const queuePath = join(dir, "pending.json");
    const logPath = join(dir, "verdicts.jsonl");
    const entry = buildPendingVerdictEntry({
      txHash: "0xghi",
      category: "ANALYSIS",
      text: "Another claim",
      startedAt: "2026-04-21T10:00:00.000Z",
    });
    await enqueuePendingVerdict(entry, queuePath);

    const result = await resolveDuePendingVerdicts({
      queuePath,
      logPath,
      now: () => Date.parse("2026-04-21T12:30:00.000Z"),
      resolveEntry: async () => {
        throw new Error("temporary failure");
      },
    });

    const queue = await loadPendingVerdicts(queuePath);

    expect(result.resolved).toHaveLength(0);
    expect(result.remaining).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.error).toBe("temporary failure");
    expect(queue).toHaveLength(1);
  });

  it("preserves entries enqueued while due verdicts are resolving", async () => {
    const dir = await makeTempDir();
    const queuePath = join(dir, "pending.json");
    const logPath = join(dir, "verdicts.jsonl");
    const dueEntry = buildPendingVerdictEntry({
      txHash: "0xdue",
      category: "ANALYSIS",
      text: "Due claim",
      startedAt: "2026-04-21T10:00:00.000Z",
    });
    const newEntry = buildPendingVerdictEntry({
      txHash: "0xnew",
      category: "ANALYSIS",
      text: "New claim",
      startedAt: "2026-04-21T11:00:00.000Z",
    });
    await enqueuePendingVerdict(dueEntry, queuePath);

    const result = await resolveDuePendingVerdicts({
      queuePath,
      logPath,
      now: () => Date.parse("2026-04-21T12:30:00.000Z"),
      resolveEntry: async () => {
        await enqueuePendingVerdict(newEntry, queuePath);
        return {
          checkedAt: "2026-04-21T12:30:05.000Z",
          verdict: {
            verification: {
              indexedVisible: false,
            },
          },
        };
      },
    });

    const queue = await loadPendingVerdicts(queuePath);

    expect(result.resolved).toHaveLength(1);
    expect(result.remaining).toHaveLength(1);
    expect(result.remaining[0]?.txHash).toBe("0xnew");
    expect(queue).toHaveLength(1);
    expect(queue[0]?.txHash).toBe("0xnew");
  });

  it("appends verdict log entries as JSONL", async () => {
    const dir = await makeTempDir();
    const logPath = join(dir, "verdicts.jsonl");

    await appendVerdictLogEntry({
      version: 1,
      id: "ANALYSIS:0x123",
      txHash: "0x123",
      category: "ANALYSIS",
      text: "Compact claim",
      startedAt: "2026-04-21T10:00:00.000Z",
      recordedAt: "2026-04-21T10:00:10.000Z",
      checkAt: "2026-04-21T12:00:00.000Z",
      checkedAt: "2026-04-21T12:00:05.000Z",
      sourceRunPath: null,
      stateDir: null,
      verdict: { verification: { observedScore: 80 } },
    }, logPath);

    const raw = await readFile(logPath, "utf8");
    expect(raw.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(raw).verdict.verification.observedScore).toBe(80);
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "supervised-verdict-"));
  tempDirs.push(dir);
  return dir;
}
