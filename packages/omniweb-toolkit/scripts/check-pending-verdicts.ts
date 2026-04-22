#!/usr/bin/env npx tsx

import {
  DEFAULT_PENDING_VERDICT_PATH,
  DEFAULT_VERDICT_LOG_PATH,
  resolveDuePendingVerdicts,
} from "./_supervised-verdict-queue.ts";
import { resolvePredictionCheck } from "./_prediction-check.ts";
import { extractSupervisedVerdictMetrics } from "./_supervised-publish-verdict.js";
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
    const postDetail = await omni.colony.getPostDetail(entry.txHash);
    const postRecord = postDetail?.ok ? extractPostRecord(postDetail.data) : null;
    const metrics = postRecord ? extractSupervisedVerdictMetrics(postRecord) : null;
    const predictionCheck = entry.predictionCheck
      ? await resolvePredictionCheck(entry.predictionCheck)
      : null;

    return {
      checkedAt: new Date().toISOString(),
      verdict: {
        verification,
        post: postRecord ? {
          txHash: readString(postRecord.txHash ?? postRecord.tx_hash),
          blockNumber: readNumber(postRecord.blockNumber ?? postRecord.block_number),
          timestamp: readNumber(postRecord.timestamp),
          category: readString(postRecord.category ?? (postRecord.payload as { cat?: unknown } | undefined)?.cat),
          text: readString(postRecord.text ?? (postRecord.payload as { text?: unknown } | undefined)?.text),
        } : null,
        metrics,
        predictionCheck,
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

function extractPostRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const data = input as Record<string, unknown>;
  const post = data.post;
  if (post && typeof post === "object") return post as Record<string, unknown>;
  const nested = (data.data as { post?: unknown } | undefined)?.post;
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  return data;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
