#!/usr/bin/env npx tsx

import {
  DEFAULT_PENDING_VERDICT_PATH,
  DEFAULT_VERDICT_LOG_PATH,
  resolveDuePendingVerdicts,
} from "./_supervised-verdict-queue.ts";
import { getNumberArg, getStringArg, hasFlag, loadConnect, loadPackageExport } from "./_shared.ts";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-pending-verdicts.ts [options]

Options:
  --queue PATH                Pending verdict queue path
  --log PATH                  Verdict JSONL log path
  --state-dir PATH            Default state dir when queue entries do not record one
  --allow-insecure            Forwarded to connect() for local debugging only
  --verify-timeout-ms N       Visibility verification timeout (default: 45000)
  --verify-poll-ms N          Visibility poll interval (default: 5000)
  --verify-limit N            Feed limit for visibility checks (default: 50)
  --help, -h                  Show this help
`);
  process.exit(0);
}

const queuePath = getStringArg(args, "--queue") ?? DEFAULT_PENDING_VERDICT_PATH;
const logPath = getStringArg(args, "--log") ?? DEFAULT_VERDICT_LOG_PATH;
const defaultStateDir = getStringArg(args, "--state-dir");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const verifyTimeoutMs = getPositiveInt("--verify-timeout-ms", 45_000);
const verifyPollMs = getPositiveInt("--verify-poll-ms", 5_000);
const verifyLimit = getPositiveInt("--verify-limit", 50);

const connect = await loadConnect();
const verifyPublishVisibility = await loadPackageExport<
  (omni: any, txHash: string | undefined, text: string, opts: {
    timeoutMs: number;
    pollMs: number;
    limit: number;
  }) => Promise<any>
>(
  "../dist/publish-visibility.js",
  "../src/publish-visibility.ts",
  "verifyPublishVisibility",
);

const omniCache = new Map<string, any>();
const result = await resolveDuePendingVerdicts({
  queuePath,
  logPath,
  resolveEntry: async (entry) => {
    const stateDir = entry.stateDir ?? defaultStateDir;
    const cacheKey = `${stateDir ?? ""}|${allowInsecureUrls ? "1" : "0"}`;
    let omni = omniCache.get(cacheKey);
    if (!omni) {
      omni = await connect({ stateDir, allowInsecureUrls });
      omniCache.set(cacheKey, omni);
    }

    const verification = await verifyPublishVisibility(omni, entry.txHash, entry.text, {
      timeoutMs: verifyTimeoutMs,
      pollMs: verifyPollMs,
      limit: verifyLimit,
    });

    return {
      checkedAt: new Date().toISOString(),
      verdict: {
        verification,
      },
    };
  },
});

console.log(JSON.stringify({
  ok: true,
  queuePath,
  logPath,
  resolvedCount: result.resolved.length,
  remainingCount: result.remaining.length,
  retriedLaterCount: result.skipped.length,
  failureCount: result.failures.length,
  failures: result.failures.map(({ entry, error }) => ({
    id: entry.id,
    txHash: entry.txHash,
    category: entry.category,
    error,
  })),
  resolved: result.resolved.map((entry) => ({
    id: entry.id,
    txHash: entry.txHash,
    checkedAt: entry.checkedAt,
    verdict: entry.verdict,
  })),
}, null, 2));

function getPositiveInt(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed == null) return fallback;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} value`);
  }
  return parsed;
}
