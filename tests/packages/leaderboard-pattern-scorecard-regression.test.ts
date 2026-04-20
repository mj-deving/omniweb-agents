import { describe, expect, it } from "vitest";
import { compareLeaderboardPatternScorecardSnapshots } from "../../packages/omniweb-toolkit/src/leaderboard-pattern-scorecard-regression.js";
import type { LeaderboardPatternScorecardSnapshot } from "../../packages/omniweb-toolkit/src/leaderboard-pattern-scorecard.js";

function makeSnapshot(): LeaderboardPatternScorecardSnapshot {
  return {
    generatedAt: "2026-04-20T09:21:26.751Z",
    ok: true,
    summary: {
      totalEntries: 2,
      attestationReadyCount: 2,
      successfulPublishCount: 2,
    },
    packs: [
      {
        archetype: "research",
        totalEntries: 2,
        attestationReadyCount: 2,
        successfulPublishCount: 2,
        recommendedSourceIds: ["source-a", "source-b"],
      },
    ],
    sources: [],
  };
}

describe("leaderboard pattern scorecard regression", () => {
  it("passes when the current snapshot preserves or improves the baseline", () => {
    const baseline = makeSnapshot();
    const current = makeSnapshot();

    const result = compareLeaderboardPatternScorecardSnapshots(baseline, current);

    expect(result.ok).toBe(true);
    expect(result.checks.every((check) => check.ok)).toBe(true);
  });

  it("fails when the recommended ordering changes", () => {
    const baseline = makeSnapshot();
    const current = makeSnapshot();
    current.packs[0] = {
      ...current.packs[0],
      recommendedSourceIds: ["source-b", "source-a"],
    };

    const result = compareLeaderboardPatternScorecardSnapshots(baseline, current);

    expect(result.ok).toBe(false);
    expect(result.checks.find((check) => check.check === "recommended_order_stable:research")?.ok).toBe(false);
  });
});
