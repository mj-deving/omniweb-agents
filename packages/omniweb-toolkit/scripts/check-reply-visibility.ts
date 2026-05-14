#!/usr/bin/env npx tsx
/**
 * check-reply-visibility.ts - live reply visibility and thread readback proof.
 *
 * Default behavior is non-destructive and reports the planned reply target.
 * Passing --broadcast executes one explicit wallet-backed reply to the supplied
 * parent tx and verifies concrete visibility plus parent-thread readback.
 */

import { assertLiveColonyCopy } from "./_live-colony-copy-guard.js";
import { runDirectAttestedWrite } from "./_direct-attested-write.ts";
import { readRuntimeBalanceTruth, type RuntimeBalanceTruth } from "./_runtime-balance-truth.js";
import { describePublishVisibilityResult } from "./_publish-visibility-summary.ts";
import { getNumberArg, getStringArg, hasFlag } from "./_shared.js";
import {
  parentThreadContainsReply,
  verifyPublishVisibility,
} from "./_write-proof-shared.js";

const DEFAULT_ATTEST_URL = "https://blockchain.info/ticker";
const DEFAULT_REPLY_CATEGORY = "ANALYSIS";
const DEFAULT_FEED_TIMEOUT_MS = 90_000;
const DEFAULT_FEED_POLL_MS = 5_000;
const DEFAULT_FEED_LIMIT = 100;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-reply-visibility.ts [options]

Options:
  --parent-tx TX          Parent post tx hash to reply to (required)
  --reply-tx TX           Existing reply tx hash to verify without broadcasting
  --reply-text TEXT       Explicit non-operational text for the reply attempt
  --reply-category CAT    Reply category (default: ${DEFAULT_REPLY_CATEGORY})
  --attest-url URL        Attestation URL (default: Blockchain.info ticker JSON)
  --state-dir PATH        Override state directory for guard persistence
  --feed-timeout-ms N     Visibility/thread polling deadline (default: ${DEFAULT_FEED_TIMEOUT_MS})
  --feed-poll-ms N        Delay between visibility/thread polls (default: ${DEFAULT_FEED_POLL_MS})
  --feed-limit N          Recent feed window to scan (default: ${DEFAULT_FEED_LIMIT})
  --allow-insecure        Allow HTTP attest URLs (local dev only)
  --broadcast             Execute the real live reply
  --help, -h              Show this help

Output: JSON reply visibility report
Exit codes: 0 = reply visible on at least one surface and thread readback confirmed,
            1 = runtime failure or degraded visibility/readback,
            2 = invalid args`);
  process.exit(0);
}

for (const flag of [
  "--parent-tx",
  "--reply-tx",
  "--reply-text",
  "--reply-category",
  "--attest-url",
  "--state-dir",
  "--feed-timeout-ms",
  "--feed-poll-ms",
  "--feed-limit",
]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const parentTxHash = getStringArg(args, "--parent-tx") ?? null;
const replyTxHash = getStringArg(args, "--reply-tx") ?? null;
const replyText = getStringArg(args, "--reply-text") ?? null;
const replyCategory = getStringArg(args, "--reply-category") ?? DEFAULT_REPLY_CATEGORY;
const attestUrl = getStringArg(args, "--attest-url") ?? DEFAULT_ATTEST_URL;
const stateDir = getStringArg(args, "--state-dir");
const feedTimeoutMs = getIntegerArgOrExit("--feed-timeout-ms", DEFAULT_FEED_TIMEOUT_MS);
const feedPollMs = getIntegerArgOrExit("--feed-poll-ms", DEFAULT_FEED_POLL_MS);
const feedLimit = getIntegerArgOrExit("--feed-limit", DEFAULT_FEED_LIMIT);
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const broadcast = hasFlag(args, "--broadcast");

if (!parentTxHash) {
  console.error("Error: --parent-tx is required");
  process.exit(2);
}
if (feedTimeoutMs <= 0 || feedPollMs <= 0 || feedLimit <= 0) {
  console.error("Error: numeric arguments must be positive integers");
  process.exit(2);
}

try {
  const connect = await loadConnect();
  const omni = await connect({ stateDir, allowInsecureUrls });
  const initialBalance = await readRuntimeBalanceTruth(omni);
  const parentBefore = await readParentThread(omni, parentTxHash);
  const initialLaneStatus = classifyLaneStatus({ balance: initialBalance });

  if (!broadcast && replyTxHash) {
    if (!replyText) {
      throw new Error("Existing reply verification requires explicit --reply-text.");
    }
    const visibility = await verifyPublishVisibility(omni, replyTxHash, replyText, {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    });
    const threadReadback = await verifyReplyThreadReadback(omni, parentTxHash, replyTxHash, {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
    });
    const ok = initialLaneStatus.status === "ready"
      && visibility.visible
      && threadReadback.ok;

    console.log(JSON.stringify({
      attempted: false,
      verificationAttempted: true,
      ok,
      checkedAt: new Date().toISOString(),
      address: omni.address,
      stateDir: stateDir ?? "(default)",
      parentTxHash,
      replyTxHash,
      replyText,
      replyCategory,
      attestUrl,
      feedTimeoutMs,
      feedPollMs,
      feedLimit,
      runtime: buildRuntimeContext(omni, initialBalance),
      initialBalance,
      laneStatus: initialLaneStatus,
      parentBefore,
      verification: {
        visibility,
        visibilitySummary: describePublishVisibilityResult(visibility),
        threadReadback,
      },
    }, null, 2));
    process.exit(ok ? 0 : 1);
  }

  if (!broadcast) {
    console.log(JSON.stringify({
      attempted: false,
      ok: initialLaneStatus.status === "ready" && parentBefore.ok,
      checkedAt: new Date().toISOString(),
      address: omni.address,
      stateDir: stateDir ?? "(default)",
      parentTxHash,
      replyText,
      replyCategory,
      attestUrl,
      feedTimeoutMs,
      feedPollMs,
      feedLimit,
      runtime: buildRuntimeContext(omni, initialBalance),
      initialBalance,
      laneStatus: initialLaneStatus,
      parentBefore,
      plannedAttempt: {
        kind: "reply",
        parentTxHash,
        category: replyCategory,
        attestUrl,
      },
      message: "Dry run only. Re-run with --broadcast to execute the real reply visibility probe.",
    }, null, 2));
    process.exit(0);
  }

  if (initialLaneStatus.status !== "ready") {
    console.log(JSON.stringify({
      attempted: false,
      ok: false,
      checkedAt: new Date().toISOString(),
      address: omni.address,
      stateDir: stateDir ?? "(default)",
      parentTxHash,
      replyCategory,
      attestUrl,
      runtime: buildRuntimeContext(omni, initialBalance),
      initialBalance,
      laneStatus: initialLaneStatus,
      parentBefore,
      message: "Broadcast aborted before any live reply attempt because the lane is already blocked upstream.",
    }, null, 2));
    process.exit(1);
  }
  if (!parentBefore.ok) {
    console.log(JSON.stringify({
      attempted: false,
      ok: false,
      checkedAt: new Date().toISOString(),
      address: omni.address,
      stateDir: stateDir ?? "(default)",
      parentTxHash,
      parentBefore,
      message: "Broadcast aborted before any live reply attempt because parent detail readback failed.",
    }, null, 2));
    process.exit(1);
  }
  if (!replyText) {
    throw new Error("Live reply visibility checks require explicit --reply-text.");
  }

  assertLiveColonyCopy(replyText, "Reply visibility text");

  const write = await runDirectAttestedWrite({
    omni,
    kind: "reply",
    draft: {
      parentTxHash,
      text: replyText,
      category: replyCategory,
      attestUrl,
    },
    verifyPublishVisibility,
    verification: {
      timeoutMs: feedTimeoutMs,
      pollMs: feedPollMs,
      limit: feedLimit,
    },
  });
  const visibility = write.visibility as Awaited<ReturnType<typeof verifyPublishVisibility>> | undefined;
  const threadReadback = write.accepted
    ? await verifyReplyThreadReadback(omni, parentTxHash, write.txHash, { timeoutMs: feedTimeoutMs, pollMs: feedPollMs })
    : { attempted: false };
  const finalBalance = await readRuntimeBalanceTruth(omni);
  const laneStatus = classifyLaneStatus({ balance: finalBalance, error: write.error });
  const ok = write.accepted
    && !!visibility?.visible
    && threadReadback.attempted
    && threadReadback.ok
    && laneStatus.status === "ready";

  console.log(JSON.stringify({
    attempted: true,
    ok,
    checkedAt: new Date().toISOString(),
    address: omni.address,
    stateDir: stateDir ?? "(default)",
    parentTxHash,
    reply: {
      category: replyCategory,
      attestUrl,
      text: replyText,
      accepted: write.accepted,
      publishLatencyMs: write.publishLatencyMs,
      txHash: write.txHash,
      attestationTxHash: write.attestationTxHash,
      attestationResponseHash: write.attestationResponseHash,
      provenancePath: write.provenancePath,
      result: summarizeToolResult(write.result),
      error: write.accepted ? undefined : normalizeError(write.error, "UNKNOWN", "Unknown reply failure"),
      visibility,
      visibilitySummary: describePublishVisibilityResult(visibility),
      threadReadback,
    },
    runtime: buildRuntimeContext(omni, finalBalance),
    initialBalance,
    finalBalance,
    balanceDeltaDem: balanceDelta(initialBalance.effectiveDem, finalBalance.effectiveDem),
    laneStatus,
    parentBefore,
  }, null, 2));

  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function getIntegerArgOrExit(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return fallback;
  if (!Number.isInteger(parsed)) {
    console.error(`Error: ${flag} must be an integer`);
    process.exit(2);
  }
  return parsed;
}

async function verifyReplyThreadReadback(
  omni: any,
  parentTxHash: string,
  replyTxHash: string | undefined,
  opts: { timeoutMs: number; pollMs: number },
): Promise<{ attempted: true; ok: boolean; polls: number; elapsedMs: number; parentDetailOk: boolean }> {
  const startedMs = Date.now();
  const deadline = startedMs + opts.timeoutMs;
  let polls = 0;
  let parentDetailOk = false;

  while (Date.now() <= deadline && replyTxHash) {
    polls += 1;
    const parentDetail = await omni.colony.getPostDetail(parentTxHash);
    parentDetailOk = !!parentDetail?.ok;
    if (parentDetail?.ok && parentThreadContainsReply(parentDetail.data, replyTxHash)) {
      return {
        attempted: true,
        ok: true,
        polls,
        elapsedMs: Date.now() - startedMs,
        parentDetailOk,
      };
    }
    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  return {
    attempted: true,
    ok: false,
    polls,
    elapsedMs: Date.now() - startedMs,
    parentDetailOk,
  };
}

async function readParentThread(
  omni: any,
  parentTxHash: string,
): Promise<{ ok: boolean; replyCount: number | null; visibleReplyBodies: number; error?: unknown }> {
  const parentDetail = await omni.colony.getPostDetail(parentTxHash);
  if (!parentDetail?.ok) {
    return {
      ok: false,
      replyCount: null,
      visibleReplyBodies: 0,
      error: parentDetail?.error ?? "parent_detail_failed",
    };
  }

  return {
    ok: true,
    replyCount: readReplyCount(parentDetail.data),
    visibleReplyBodies: countVisibleReplies(parentDetail.data),
  };
}

function readReplyCount(value: unknown): number | null {
  const direct = readNumber((value as { replyCount?: unknown } | null | undefined)?.replyCount);
  const payload = (value as { payload?: unknown } | null | undefined)?.payload;
  return direct ?? readNumber((payload as { replyCount?: unknown } | null | undefined)?.replyCount);
}

function countVisibleReplies(value: unknown): number {
  const direct = (value as { replies?: unknown } | null | undefined)?.replies;
  const nested = (value as { data?: { replies?: unknown } } | null | undefined)?.data?.replies;
  const replies = Array.isArray(direct) ? direct : Array.isArray(nested) ? nested : [];
  return replies.filter((reply) => reply && typeof reply === "object").length;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeToolResult(
  result: {
    ok: boolean;
    data?: { txHash?: string };
    error?: { code?: string; message?: string; retryable?: boolean };
    provenance?: unknown;
  } | undefined,
): Record<string, unknown> {
  if (!result) return { ok: false, skipped: true };
  return result.ok
    ? {
        ok: true,
        txHash: result.data?.txHash,
        provenance: result.provenance,
      }
    : {
        ok: false,
        error: result.error,
        provenance: result.provenance,
      };
}

function classifyLaneStatus(opts: {
  balance: RuntimeBalanceTruth;
  error?: { code?: string; message?: string };
}): { status: "ready" | "blocked_upstream"; blocker?: string; message?: string } {
  if (opts.balance.divergence.blocksWriteReadiness) {
    return {
      status: "blocked_upstream",
      blocker: "node_api_balance_divergence",
      message: opts.balance.divergence.message,
    };
  }

  const message = opts.error?.message ?? "";
  if (/startProxy\(\) timed out|startproxy timeout|web2 proxy|proxy session/i.test(message)) {
    return {
      status: "blocked_upstream",
      blocker: "dahr_web2_proxy_failure",
      message,
    };
  }

  return { status: "ready" };
}

function buildRuntimeContext(omni: any, balance: RuntimeBalanceTruth) {
  return {
    rpcUrl: omni?.runtime?.rpcUrl ?? null,
    address: omni?.address ?? null,
    chainBlockNumber: balance.chainBlockNumber,
  };
}

function balanceDelta(initialBalance: number | null, finalBalance: number | null): number | null {
  if (initialBalance === null || finalBalance === null) {
    return null;
  }
  return Number((finalBalance - initialBalance).toFixed(6));
}

function normalizeError(
  error: { code?: string; message?: string; retryable?: boolean } | undefined,
  fallbackCode: string,
  fallbackMessage: string,
): { code: string; message: string; retryable?: boolean } {
  return {
    code: error?.code ?? fallbackCode,
    message: error?.message ?? fallbackMessage,
    retryable: error?.retryable,
  };
}

async function loadConnect(): Promise<(opts?: {
  stateDir?: string;
  allowInsecureUrls?: boolean;
}) => Promise<any>> {
  try {
    const mod = await import("../dist/runtime.js");
    if (typeof mod.connect === "function") {
      return mod.connect;
    }
  } catch {
    // Fall back to source during local development before build output exists.
  }

  const mod = await import("../src/runtime.ts");
  if (typeof mod.connect !== "function") {
    throw new Error("connect() export not found in dist/runtime.js or src/runtime.ts");
  }
  return mod.connect;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
