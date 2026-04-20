import type { LeaderboardPatternScorecardSnapshot } from "./leaderboard-pattern-scorecard.js";

export interface LeaderboardPatternScorecardRegression {
  ok: boolean;
  checks: Array<{
    check: string;
    ok: boolean;
    detail: string;
  }>;
}

export function compareLeaderboardPatternScorecardSnapshots(
  baseline: LeaderboardPatternScorecardSnapshot,
  current: LeaderboardPatternScorecardSnapshot,
): LeaderboardPatternScorecardRegression {
  const checks: LeaderboardPatternScorecardRegression["checks"] = [];

  checks.push({
    check: "total_entries_non_decreasing",
    ok: current.summary.totalEntries >= baseline.summary.totalEntries,
    detail: `${current.summary.totalEntries} current vs ${baseline.summary.totalEntries} baseline`,
  });
  checks.push({
    check: "attestation_ready_non_decreasing",
    ok: current.summary.attestationReadyCount >= baseline.summary.attestationReadyCount,
    detail: `${current.summary.attestationReadyCount} current vs ${baseline.summary.attestationReadyCount} baseline`,
  });
  checks.push({
    check: "successful_publish_non_decreasing",
    ok: current.summary.successfulPublishCount >= baseline.summary.successfulPublishCount,
    detail: `${current.summary.successfulPublishCount} current vs ${baseline.summary.successfulPublishCount} baseline`,
  });

  for (const baselinePack of baseline.packs) {
    const currentPack = current.packs.find((pack) => pack.archetype === baselinePack.archetype);
    checks.push({
      check: `pack_present:${baselinePack.archetype}`,
      ok: !!currentPack,
      detail: currentPack ? "present" : "missing from current snapshot",
    });

    if (!currentPack) continue;

    checks.push({
      check: `pack_attestation_ready_non_decreasing:${baselinePack.archetype}`,
      ok: currentPack.attestationReadyCount >= baselinePack.attestationReadyCount,
      detail: `${currentPack.attestationReadyCount} current vs ${baselinePack.attestationReadyCount} baseline`,
    });
    checks.push({
      check: `pack_successful_publish_non_decreasing:${baselinePack.archetype}`,
      ok: currentPack.successfulPublishCount >= baselinePack.successfulPublishCount,
      detail: `${currentPack.successfulPublishCount} current vs ${baselinePack.successfulPublishCount} baseline`,
    });
    checks.push({
      check: `recommended_order_stable:${baselinePack.archetype}`,
      ok: arraysEqual(currentPack.recommendedSourceIds, baselinePack.recommendedSourceIds),
      detail: `current=${currentPack.recommendedSourceIds.join(",")} baseline=${baselinePack.recommendedSourceIds.join(",")}`,
    });
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
