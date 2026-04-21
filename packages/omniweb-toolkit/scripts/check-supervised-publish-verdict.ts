#!/usr/bin/env npx tsx

import { loadConnect } from "./_shared.ts";
import {
  evaluateSupervisedVerdictWindow,
  extractSupervisedVerdictMetrics,
  scheduleSupervisedVerdict,
} from "./_supervised-publish-verdict.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-supervised-publish-verdict.ts [options]

Options:
  --tx-hash HASH         Required published post tx hash
  --category CAT         Required category used at publish time (ANALYSIS or PREDICTION)
  --published-at ISO     Required publish timestamp (typically report checkedAt or verification time)
  --state-dir PATH       Override state directory for runtime guards
  --allow-insecure       Forwarded to connect() for local debugging only
  --help, -h             Show this help

Output: JSON supervised verdict report
Exit codes: 0 = verdict read succeeded, 1 = runtime/read failure, 2 = invalid args`);
  process.exit(0);
}

const txHash = getRequiredString("--tx-hash");
const category = getRequiredString("--category");
const publishedAt = getRequiredString("--published-at");
const stateDir = getOptionalString("--state-dir") || undefined;
const allowInsecureUrls = args.includes("--allow-insecure");

try {
  const connect = await loadConnect();
  const omni = await connect({ stateDir, allowInsecureUrls });
  const observedAt = new Date().toISOString();
  const schedule = scheduleSupervisedVerdict(category, publishedAt);
  const timing = evaluateSupervisedVerdictWindow(category, publishedAt, observedAt);
  const postDetail = await omni.colony.getPostDetail(txHash);

  if (!postDetail?.ok) {
    console.log(JSON.stringify({
      ok: false,
      txHash,
      category,
      publishedAt: schedule.publishedAt,
      observedAt,
      verdictSchedule: schedule,
      timing,
      error: postDetail?.error ?? "post_detail_failed",
    }, null, 2));
    process.exit(1);
  }

  const post = extractPostRecord(postDetail.data);
  const metrics = extractSupervisedVerdictMetrics(post);

  console.log(JSON.stringify({
    ok: true,
    txHash,
    category,
    publishedAt: schedule.publishedAt,
    observedAt,
    verdictSchedule: schedule,
    timing,
    post: {
      txHash: readString(post?.txHash ?? post?.tx_hash),
      blockNumber: readNumber(post?.blockNumber ?? post?.block_number),
      timestamp: readNumber(post?.timestamp),
      category: readString(post?.category ?? (post?.payload as { cat?: unknown } | undefined)?.cat),
      text: readString(post?.text ?? (post?.payload as { text?: unknown } | undefined)?.text),
    },
    metrics,
  }, null, 2));
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function getRequiredString(flag: string): string {
  const value = getOptionalString(flag);
  if (!value) {
    console.error(`Error: ${flag} is required`);
    process.exit(2);
  }
  return value;
}

function getOptionalString(flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  return args[index + 1] ?? null;
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
