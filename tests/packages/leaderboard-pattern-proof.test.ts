import { describe, expect, it } from "vitest";
import { runLeaderboardPatternProof } from "../../packages/omniweb-toolkit/src/leaderboard-pattern-proof.js";

describe("leaderboard pattern proof", () => {
  it("proves each archetype can produce one attestation-ready publish cycle and one skip control", async () => {
    const report = await runLeaderboardPatternProof();

    expect(report.ok).toBe(true);
    expect(report.results).toHaveLength(3);
    expect(report.results.map((entry) => entry.archetype)).toEqual([
      "research",
      "market",
      "engagement",
    ]);

    for (const entry of report.results) {
      expect(entry.ok).toBe(true);
      expect(entry.attestationReady).toBe(true);
      expect(entry.decision).toBe("publish");
      expect(entry.outcomeStatus).toBe("published");
      expect(entry.attestUrl).toMatch(/^https?:\/\//);
      expect(entry.observedScore).toBeGreaterThanOrEqual(80);
    }

    expect(report.skipControl.ok).toBe(true);
    expect(report.skipControl.outcomeStatus).toBe("skipped");
  });
});
