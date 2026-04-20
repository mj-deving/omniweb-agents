#!/usr/bin/env npx tsx

import { runLeaderboardPatternProof } from "../src/leaderboard-pattern-proof.js";

const report = await runLeaderboardPatternProof();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
