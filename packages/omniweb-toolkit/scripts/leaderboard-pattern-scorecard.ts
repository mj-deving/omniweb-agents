#!/usr/bin/env npx tsx

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getStringArg, hasFlag, loadPackageExport } from "./_shared.js";

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

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx scripts/leaderboard-pattern-scorecard.ts [--out PATH]

Emit the current leaderboard-pattern starter-source scorecard as JSON.

Options:
  --out PATH   Also write the JSON snapshot to PATH
  --help, -h   Show this help

Output: JSON scorecard snapshot to stdout
Exit codes: 0 = success, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const outPath = getStringArg(args, "--out");
const unknownArgs = args.filter((arg, index) => {
  if (arg === "--out") return false;
  if (index > 0 && args[index - 1] === "--out") return false;
  return !["--help", "-h"].includes(arg);
});

if (unknownArgs.length > 0) {
  console.error(`Error: unknown argument(s): ${unknownArgs.join(", ")}`);
  process.exit(2);
}

const report = await runLeaderboardPatternProof();
const snapshot = buildLeaderboardPatternScorecardSnapshot(report);
const body = JSON.stringify(snapshot, null, 2);

if (outPath) {
  const resolved = resolve(outPath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, `${body}\n`, "utf8");
}

console.log(body);
process.exit(snapshot.ok ? 0 : 1);
