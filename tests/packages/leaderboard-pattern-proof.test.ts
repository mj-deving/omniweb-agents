import { describe, expect, it } from "vitest";
import { runLeaderboardPatternProof } from "../../packages/omniweb-toolkit/src/leaderboard-pattern-proof.js";
import { listStarterSourcePacks } from "../../packages/omniweb-toolkit/src/starter-source-packs.js";

describe("leaderboard pattern proof", () => {
  it("proves every starter-pack entry can produce an attestation-ready publish cycle and emits a pack scorecard", async () => {
    const report = await runLeaderboardPatternProof();
    const packs = listStarterSourcePacks();
    const expectedEntryCount = packs.reduce((total, pack) => total + pack.entries.length, 0);

    expect(report.ok).toBe(true);
    expect(report.results).toHaveLength(expectedEntryCount);
    expect(report.packScorecard).toHaveLength(packs.length);

    for (const entry of report.results) {
      expect(entry.ok).toBe(true);
      expect(entry.attestationReady).toBe(true);
      expect(entry.decision).toBe("publish");
      expect(entry.outcomeStatus).toBe("published");
      expect(entry.attestUrl).toMatch(/^https?:\/\//);
      expect(entry.observedScore).toBeGreaterThanOrEqual(80);
      expect(entry.selectionScore).toBeGreaterThan(0);
      expect(entry.ratingOverall).toBeGreaterThan(0);
      expect(entry.trustTier).toBeTruthy();
      expect(entry.sourceLabel.length).toBeGreaterThan(0);
    }

    for (const pack of report.packScorecard) {
      const sourcePack = packs.find((entry) => entry.archetype === pack.archetype);
      expect(sourcePack).toBeDefined();
      expect(pack.totalEntries).toBe(sourcePack?.entries.length);
      expect(pack.attestationReadyCount).toBe(pack.totalEntries);
      expect(pack.successfulPublishCount).toBe(pack.totalEntries);
      expect(pack.recommendedSourceIds).toHaveLength(pack.totalEntries);
      expect([...pack.recommendedSourceIds].sort()).toEqual(
        [...(sourcePack?.entries.map((entry) => entry.sourceId) ?? [])].sort(),
      );
    }

    expect(report.skipControl.ok).toBe(true);
    expect(report.skipControl.outcomeStatus).toBe("skipped");
  });
});
