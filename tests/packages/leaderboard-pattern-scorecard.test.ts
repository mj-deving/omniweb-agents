import { describe, expect, it } from "vitest";
import { runLeaderboardPatternProof } from "../../packages/omniweb-toolkit/src/leaderboard-pattern-proof.js";
import { buildLeaderboardPatternScorecardSnapshot } from "../../packages/omniweb-toolkit/src/leaderboard-pattern-scorecard.js";

describe("leaderboard pattern scorecard snapshot", () => {
  it("builds a durable snapshot from the proof report", async () => {
    const report = await runLeaderboardPatternProof();
    const snapshot = buildLeaderboardPatternScorecardSnapshot(report);

    expect(snapshot.ok).toBe(true);
    expect(snapshot.generatedAt).toBe(report.checkedAt);
    expect(snapshot.summary.totalEntries).toBe(report.results.length);
    expect(snapshot.summary.attestationReadyCount).toBe(report.results.filter((entry) => entry.attestationReady).length);
    expect(snapshot.summary.successfulPublishCount).toBe(report.results.filter((entry) => entry.ok).length);
    expect(snapshot.packs).toEqual(report.packScorecard);
    expect(snapshot.sources).toEqual(report.results);
  });
});
