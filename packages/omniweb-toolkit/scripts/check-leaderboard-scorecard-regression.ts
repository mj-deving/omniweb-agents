#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getStringArg, hasFlag, PACKAGE_ROOT } from "./_shared.js";
import { buildLeaderboardPatternScorecardSnapshot } from "../src/leaderboard-pattern-scorecard.js";
import { runLeaderboardPatternProof } from "../src/leaderboard-pattern-proof.js";
import { compareLeaderboardPatternScorecardSnapshots } from "../src/leaderboard-pattern-scorecard-regression.js";
import type { LeaderboardPatternScorecardSnapshot } from "../src/leaderboard-pattern-scorecard.js";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx scripts/check-leaderboard-scorecard-regression.ts [--baseline PATH]

Compare the current leaderboard-pattern scorecard snapshot against the committed baseline.

Options:
  --baseline PATH  Override baseline snapshot path
  --help, -h       Show this help

Output: JSON regression report
Exit codes: 0 = no regressions, 1 = regression detected, 2 = invalid args`);
  process.exit(0);
}

const baselinePath = resolve(
  getStringArg(args, "--baseline")
    ?? resolve(PACKAGE_ROOT, "evals", "leaderboard-pattern-scorecard.snapshot.json"),
);

const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as LeaderboardPatternScorecardSnapshot;
const report = await runLeaderboardPatternProof();
const current = buildLeaderboardPatternScorecardSnapshot(report);
const regression = compareLeaderboardPatternScorecardSnapshots(baseline, current);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  baselinePath,
  ok: regression.ok,
  baseline,
  current,
  checks: regression.checks,
}, null, 2));

process.exit(regression.ok ? 0 : 1);
