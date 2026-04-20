#!/usr/bin/env npx tsx

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getStringArg, hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

const args = process.argv.slice(2);

const runLeaderboardPatternProof = await loadPackageExport<
  () => Promise<any>
>(
  "../dist/leaderboard-pattern-proof.js",
  "../src/leaderboard-pattern-proof.ts",
  "runLeaderboardPatternProof",
);

const buildLeaderboardPatternScorecardSnapshot = await loadPackageExport<
  (report: any) => any
>(
  "../dist/leaderboard-pattern-scorecard.js",
  "../src/leaderboard-pattern-scorecard.ts",
  "buildLeaderboardPatternScorecardSnapshot",
);

const compareLeaderboardPatternScorecardSnapshots = await loadPackageExport<
  (baseline: any, current: any) => { ok: boolean; checks: unknown[] }
>(
  "../dist/leaderboard-pattern-scorecard-regression.js",
  "../src/leaderboard-pattern-scorecard-regression.ts",
  "compareLeaderboardPatternScorecardSnapshots",
);

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

const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as any;
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
