import type {
  LeaderboardPatternPackScorecard,
  LeaderboardPatternProofEntry,
  LeaderboardPatternProofReport,
} from "./leaderboard-pattern-proof.js";

export interface LeaderboardPatternScorecardSnapshot {
  generatedAt: string;
  ok: boolean;
  summary: {
    totalEntries: number;
    attestationReadyCount: number;
    successfulPublishCount: number;
  };
  packs: LeaderboardPatternPackScorecard[];
  sources: LeaderboardPatternProofEntry[];
}

export function buildLeaderboardPatternScorecardSnapshot(
  report: LeaderboardPatternProofReport,
): LeaderboardPatternScorecardSnapshot {
  return {
    generatedAt: report.checkedAt,
    ok: report.ok,
    summary: {
      totalEntries: report.results.length,
      attestationReadyCount: report.results.filter((entry) => entry.attestationReady).length,
      successfulPublishCount: report.results.filter((entry) => entry.ok).length,
    },
    packs: report.packScorecard.map((pack) => ({ ...pack })),
    sources: report.results.map((entry) => ({ ...entry })),
  };
}
