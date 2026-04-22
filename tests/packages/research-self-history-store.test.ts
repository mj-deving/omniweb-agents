import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendResearchPublishHistory,
  loadResearchPublishHistory,
  researchPublishHistoryPath,
} from "../../packages/omniweb-toolkit/src/research-self-history-store.js";

const createdDirs: string[] = [];

describe("research self history store", () => {
  afterEach(async () => {
    const { rm } = await import("node:fs/promises");
    await Promise.all(createdDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("loads an empty history when the state dir has no history file", async () => {
    const stateDir = await mkdtemp(resolve(tmpdir(), "research-history-"));
    createdDirs.push(stateDir);

    await expect(loadResearchPublishHistory(stateDir)).resolves.toEqual([]);
  });

  it("appends and reloads research publish history entries", async () => {
    const stateDir = await mkdtemp(resolve(tmpdir(), "research-history-"));
    createdDirs.push(stateDir);

    await appendResearchPublishHistory(stateDir, {
      topic: "fed stealth easing signal",
      family: "macro-liquidity",
      publishedAt: "2026-04-22T06:11:12.832Z",
      opportunityKind: "coverage_gap",
      textSnippet: "Bills still print 3.702% against notes at 3.212%.",
      evidenceValues: {
        treasuryBillsAvgRatePct: "3.702",
        treasuryNotesAvgRatePct: "3.212",
      },
    });

    const loaded = await loadResearchPublishHistory(stateDir);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.topic).toBe("fed stealth easing signal");

    const raw = JSON.parse(await readFile(researchPublishHistoryPath(stateDir), "utf8"));
    expect(raw[0]?.family).toBe("macro-liquidity");
  });
});
