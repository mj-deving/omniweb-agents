/**
 * Tests for own-tx-hashes — capped Set, session log loading, and pruning.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { addCapped, loadOwnTxHashes, pruneSessionLog, sessionLogPath } from "../src/reactive/own-tx-hashes.js";

// ── addCapped ──────────────────────────────────

describe("addCapped", () => {
  it("adds value to set normally when under cap", () => {
    const set = new Set<string>();
    addCapped(set, "tx-1", 5);
    addCapped(set, "tx-2", 5);
    expect(set.size).toBe(2);
    expect(set.has("tx-1")).toBe(true);
    expect(set.has("tx-2")).toBe(true);
  });

  it("evicts oldest entry when cap exceeded", () => {
    const set = new Set(["tx-1", "tx-2", "tx-3"]);
    addCapped(set, "tx-4", 3); // Cap is 3, now has 4 → evict tx-1
    expect(set.size).toBe(3);
    expect(set.has("tx-1")).toBe(false); // Evicted
    expect(set.has("tx-2")).toBe(true);
    expect(set.has("tx-3")).toBe(true);
    expect(set.has("tx-4")).toBe(true);
  });

  it("handles cap of 1", () => {
    const set = new Set<string>();
    addCapped(set, "tx-1", 1);
    expect(set.size).toBe(1);
    addCapped(set, "tx-2", 1);
    expect(set.size).toBe(1);
    expect(set.has("tx-1")).toBe(false);
    expect(set.has("tx-2")).toBe(true);
  });

  it("does not evict when adding duplicate", () => {
    const set = new Set(["tx-1", "tx-2", "tx-3"]);
    addCapped(set, "tx-2", 3); // Duplicate — no growth
    expect(set.size).toBe(3);
    expect(set.has("tx-1")).toBe(true);
  });

  it("uses default maxSize of 500", () => {
    const set = new Set<string>();
    for (let i = 0; i < 501; i++) {
      addCapped(set, `tx-${i}`);
    }
    expect(set.size).toBe(500);
    expect(set.has("tx-0")).toBe(false); // First one evicted
    expect(set.has("tx-500")).toBe(true); // Last one kept
  });
});

// ── loadOwnTxHashes ────────────────────────────

describe("loadOwnTxHashes", () => {
  // Use a unique agent name to avoid collision with real logs
  const testAgent = `_test_txhash_${Date.now()}`;
  const logPath = sessionLogPath(testAgent);

  afterEach(() => {
    try { unlinkSync(logPath); } catch { /* noop */ }
  });

  it("returns empty set when no log file", () => {
    const set = loadOwnTxHashes(`_nonexistent_${Date.now()}`);
    expect(set.size).toBe(0);
  });

  it("loads hashes from JSONL log", () => {
    const lines = [
      JSON.stringify({ txHash: "tx-aaa", phase: "publish" }),
      JSON.stringify({ txHash: "tx-bbb", phase: "reply" }),
      JSON.stringify({ phase: "audit" }), // No txHash — skipped
      JSON.stringify({ txHash: "tx-ccc", phase: "publish" }),
    ];
    writeFileSync(logPath, lines.join("\n") + "\n", "utf-8");

    const set = loadOwnTxHashes(testAgent);
    expect(set.size).toBe(3);
    expect(set.has("tx-aaa")).toBe(true);
    expect(set.has("tx-bbb")).toBe(true);
    expect(set.has("tx-ccc")).toBe(true);
  });

  it("only loads last maxEntries lines (tail behavior)", () => {
    const lines: string[] = [];
    for (let i = 0; i < 20; i++) {
      lines.push(JSON.stringify({ txHash: `tx-${i}` }));
    }
    writeFileSync(logPath, lines.join("\n") + "\n", "utf-8");

    const set = loadOwnTxHashes(testAgent, 5);
    // Only last 5 lines processed → tx-15 through tx-19
    expect(set.size).toBe(5);
    expect(set.has("tx-0")).toBe(false);
    expect(set.has("tx-15")).toBe(true);
    expect(set.has("tx-19")).toBe(true);
  });

  it("handles malformed JSON lines gracefully", () => {
    const lines = [
      JSON.stringify({ txHash: "tx-good" }),
      "not valid json {{{",
      JSON.stringify({ txHash: "tx-also-good" }),
    ];
    writeFileSync(logPath, lines.join("\n") + "\n", "utf-8");

    const set = loadOwnTxHashes(testAgent);
    expect(set.size).toBe(2);
  });
});

// ── pruneSessionLog ────────────────────────────

describe("pruneSessionLog", () => {
  const testAgent = `_test_prune_${Date.now()}`;
  const logPath = sessionLogPath(testAgent);

  afterEach(() => {
    try { unlinkSync(logPath); } catch { /* noop */ }
  });

  it("returns 0 when no log file exists", () => {
    expect(pruneSessionLog(`_nonexistent_${Date.now()}`)).toBe(0);
  });

  it("does nothing when log is under maxLines", () => {
    const lines = [
      JSON.stringify({ txHash: "tx-1" }),
      JSON.stringify({ txHash: "tx-2" }),
    ];
    writeFileSync(logPath, lines.join("\n") + "\n", "utf-8");

    const pruned = pruneSessionLog(testAgent, 10);
    expect(pruned).toBe(0);

    // File unchanged
    const content = readFileSync(logPath, "utf-8").trim().split("\n");
    expect(content.length).toBe(2);
  });

  it("truncates to last maxLines entries", () => {
    const lines: string[] = [];
    for (let i = 0; i < 20; i++) {
      lines.push(JSON.stringify({ txHash: `tx-${i}`, idx: i }));
    }
    writeFileSync(logPath, lines.join("\n") + "\n", "utf-8");

    const pruned = pruneSessionLog(testAgent, 5);
    expect(pruned).toBe(15);

    // Verify only last 5 remain
    const remaining = readFileSync(logPath, "utf-8").trim().split("\n");
    expect(remaining.length).toBe(5);
    expect(JSON.parse(remaining[0]).txHash).toBe("tx-15");
    expect(JSON.parse(remaining[4]).txHash).toBe("tx-19");
  });

  it("handles empty lines in log file", () => {
    const content = [
      JSON.stringify({ txHash: "tx-1" }),
      "",
      JSON.stringify({ txHash: "tx-2" }),
      "",
      JSON.stringify({ txHash: "tx-3" }),
    ].join("\n");
    writeFileSync(logPath, content + "\n", "utf-8");

    const pruned = pruneSessionLog(testAgent, 2);
    expect(pruned).toBe(1); // 3 non-empty lines → keep 2 → pruned 1

    const remaining = readFileSync(logPath, "utf-8").trim().split("\n");
    expect(remaining.length).toBe(2);
  });
});
