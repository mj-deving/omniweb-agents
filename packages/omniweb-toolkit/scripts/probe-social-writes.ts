#!/usr/bin/env -S bunx tsx
/**
 * probe-social-writes.ts — maintained live proof path for reactions, with
 * reply and tip kept as explicit optional extensions.
 *
 * Default behavior is non-destructive: select a suitable external feed post and
 * report the current readback state that would be used for the live proof.
 * Passing `--execute` performs the real reaction flow.
 * Add `--reply-text` when you intentionally want a real reply.
 * Passing `--include-tip` adds the live tip step as an explicit extra probe.
 *
 * Output: JSON to stdout. Errors to stderr.
 * Exit codes: 0 = success, 1 = live/runtime failure, 2 = invalid args.
 */

import {
  assertLiveColonyCopy,
} from "./_live-colony-copy-guard.js";
import { runDirectAttestedWrite } from "./_direct-attested-write.ts";
import {
  fetchText,
  DEFAULT_BASE_URL,
  getNumberArg,
  getStringArg,
  hasFlag,
} from "./_shared.js";
import {
  DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR,
  agentTipReadbackSatisfied,
  hasRecordedTip,
  normalizeAgentTipReadback,
  normalizeBalance,
  normalizeReactionEnvelope,
  rankSocialWriteCandidates,
  normalizeTipReadback,
  parentThreadContainsReply,
  reactionReadbackSatisfied,
  selectSocialWriteCandidate,
  socialWriteCandidateMeetsFloor,
  tipReadbackSatisfied,
  tipSpendObserved,
  verifyPublishVisibility,
} from "./_write-proof-shared.js";
import {
  buildWriteLifecycleProofPacket,
  classifyLifecycleStatus,
  createWriteLifecycleStore,
  finalVerdictForStatus,
  lifecycleFlagEnabled,
  readCurrentGitCommit,
  type WriteActionFamily,
  type WriteLifecycleSurface,
  type WriteLifecycleStatus,
} from "./_write-lifecycle.ts";

const DEFAULT_REPLY_CATEGORY = "ANALYSIS";
const DEFAULT_REPLY_ATTEST_URL = "https://blockchain.info/ticker";
const DEFAULT_FEED_LIMIT = 12;
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_REPLY_TIMEOUT_MS = 45_000;
const DEFAULT_REACTION_TIMEOUT_MS = 15_000;
const DEFAULT_TIP_TIMEOUT_MS = 30_000;
const DEFAULT_TIP_AMOUNT = 1;

type OmniInstance = Awaited<ReturnType<Awaited<ReturnType<typeof loadConnect>>>>;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts [options]

Options:
  --feed-limit N          Number of recent feed posts to scan for a target (default: ${DEFAULT_FEED_LIMIT})
  --tip-amount N          DEM amount to tip (default: ${DEFAULT_TIP_AMOUNT})
  --reply-category CAT    Reply category (default: ${DEFAULT_REPLY_CATEGORY})
  --reply-attest-url URL  Reply attestation URL (default: ${DEFAULT_REPLY_ATTEST_URL})
  --reply-text TEXT       Explicit non-operational text for live reply proof
  --reply-timeout-ms N    Visibility timeout for reply verification (default: ${DEFAULT_REPLY_TIMEOUT_MS})
  --reaction-timeout-ms N Polling timeout for reaction readback (default: ${DEFAULT_REACTION_TIMEOUT_MS})
  --tip-timeout-ms N      Polling timeout for tip readback (default: ${DEFAULT_TIP_TIMEOUT_MS})
  --include-tip           Include the live tip step in the proof sweep
  --poll-ms N             Poll interval for readback polling (default: ${DEFAULT_POLL_MS})
  --base-url URL          SuperColony base URL for direct reaction readback (default: ${DEFAULT_BASE_URL})
  --state-dir PATH        Override state directory for runtime guards
  --record-lifecycle      Persist lifecycle records for executed reaction/reply/tip writes
  --proof-out PATH        Write lifecycle proof packets to a directory or single JSON path
  --allow-insecure        Allow HTTP attestation URLs (local dev only)
  --execute               Perform the real live proof sweep
  --help, -h              Show this help

Output: JSON social-write proof report
Exit codes: 0 = success, 1 = runtime or proof failure, 2 = invalid args`);
  process.exit(0);
}

for (const flag of [
  "--feed-limit",
  "--tip-amount",
  "--reply-category",
  "--reply-attest-url",
  "--reply-text",
  "--reply-timeout-ms",
  "--reaction-timeout-ms",
  "--tip-timeout-ms",
  "--poll-ms",
  "--base-url",
  "--state-dir",
  "--proof-out",
]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const feedLimit = getIntegerArg("--feed-limit", DEFAULT_FEED_LIMIT);
const tipAmount = getIntegerArg("--tip-amount", DEFAULT_TIP_AMOUNT);
const replyCategory = getStringArg(args, "--reply-category") ?? DEFAULT_REPLY_CATEGORY;
const replyAttestUrl = getStringArg(args, "--reply-attest-url") ?? DEFAULT_REPLY_ATTEST_URL;
const replyTextArg = getStringArg(args, "--reply-text") ?? null;
const replyTimeoutMs = getIntegerArg("--reply-timeout-ms", DEFAULT_REPLY_TIMEOUT_MS);
const reactionTimeoutMs = getIntegerArg("--reaction-timeout-ms", DEFAULT_REACTION_TIMEOUT_MS);
const tipTimeoutMs = getIntegerArg("--tip-timeout-ms", DEFAULT_TIP_TIMEOUT_MS);
const pollMs = getIntegerArg("--poll-ms", DEFAULT_POLL_MS);
const baseUrl = getStringArg(args, "--base-url") ?? DEFAULT_BASE_URL;
const stateDir = getStringArg(args, "--state-dir") || undefined;
const recordLifecycle = lifecycleFlagEnabled(args);
const proofOut = getStringArg(args, "--proof-out");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const execute = hasFlag(args, "--execute");
const includeTip = hasFlag(args, "--include-tip");

for (const [label, value] of [
  ["--feed-limit", feedLimit],
  ["--tip-amount", tipAmount],
  ["--reply-timeout-ms", replyTimeoutMs],
  ["--reaction-timeout-ms", reactionTimeoutMs],
  ["--tip-timeout-ms", tipTimeoutMs],
  ["--poll-ms", pollMs],
] as const) {
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Error: invalid ${label} value ${value}`);
    process.exit(2);
  }
}

try {
  const connect = await loadConnect();
  const omni = await connect({ stateDir, allowInsecureUrls });
  const lifecycleStore = recordLifecycle ? createWriteLifecycleStore({ stateDir }) : null;
  const token = await omni.runtime.getToken();
  const feed = await omni.colony.getFeed({ limit: feedLimit });
  if (!feed?.ok) {
    throw new Error(`Feed read failed: ${feed?.error ?? "unknown_error"}`);
  }

  const posts = Array.isArray(feed.data?.posts) ? feed.data.posts : [];
  const rankedCandidates = rankSocialWriteCandidates(posts, omni.address);
  const candidate = await chooseCandidatePost(omni, posts, token, baseUrl);
  if (!candidate) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
      skipped: true,
      address: omni.address,
      floor: DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR,
      topRankedCandidate: rankedCandidates[0] ?? null,
      message:
        `No untouched attested post met the social interaction floor `
        + `(score >= ${DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR.minScore}, `
        + `engagement >= ${DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR.minEngagement}) `
        + `in the latest ${feedLimit} posts.`,
    }, null, 2));
    process.exit(0);
  }

  const beforeReaction = await readReactionEnvelope(candidate.txHash, token, baseUrl);
  const beforeTipStatsResult = await omni.colony.getTipStats(candidate.txHash);
  const beforeTipStats = normalizeTipReadback(beforeTipStatsResult?.ok ? beforeTipStatsResult.data : null);
  const beforeRecipientTipStatsResult = await omni.colony.getAgentTipStats(candidate.author);
  const beforeRecipientTipStats = normalizeAgentTipReadback(
    beforeRecipientTipStatsResult?.ok ? beforeRecipientTipStatsResult.data : null,
  );
  const beforeBalanceResult = await omni.colony.getBalance();
  const beforeBalance = normalizeBalance(beforeBalanceResult?.ok ? beforeBalanceResult.data?.balance : null);
  const beforeParentDetail = await omni.colony.getPostDetail(candidate.txHash);

  if (!execute) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
      address: omni.address,
      target: candidate,
      readback: {
        reactions: beforeReaction,
        tipStats: beforeTipStats,
        recipientTipStats: beforeRecipientTipStats,
        parentDetailOk: !!beforeParentDetail?.ok,
      },
      tipEnabled: includeTip,
      message:
        "Dry run only. Re-run with --execute for the live reaction proof, "
        + "add --reply-text when you intentionally want a real reply, "
        + "and add --include-tip only when you intentionally want the extra tip probe.",
    }, null, 2));
    process.exit(0);
  }

  const reactionResult = await omni.colony.react(candidate.txHash, "agree");
  const reactionVerification = reactionResult.ok
    ? await verifyReactionReadback(candidate.txHash, beforeReaction, token, baseUrl, {
        timeoutMs: reactionTimeoutMs,
        pollMs,
      })
    : { attempted: false };

  const balanceBeforeTip = beforeBalance;
  const tipResult = includeTip ? await omni.colony.tip(candidate.txHash, tipAmount) : null;
  const tipVerification = includeTip && tipResult?.ok
    ? await verifyTipReadback(
        omni,
        candidate.txHash,
        tipResult.data?.txHash,
        candidate.author,
        beforeTipStats,
        beforeRecipientTipStats,
        balanceBeforeTip,
        tipAmount,
        {
          timeoutMs: tipTimeoutMs,
          pollMs,
        },
      )
    : { attempted: false };

  if (replyTextArg) {
    assertLiveColonyCopy(replyTextArg, "Reply proof text");
  }
  const replyText = replyTextArg;
  const replyWrite = replyText
    ? await runDirectAttestedWrite({
        omni,
        kind: "reply",
        draft: {
          parentTxHash: candidate.txHash,
          text: replyText,
          category: replyCategory,
          attestUrl: replyAttestUrl,
        },
        verifyPublishVisibility,
        verification: {
          timeoutMs: replyTimeoutMs,
          pollMs,
          limit: feedLimit,
        },
      })
    : null;
  const replyResult = replyWrite?.result ?? null;
  const replyVerification = replyText && replyWrite?.accepted
    ? await verifyReplyReadback(
        omni,
        candidate.txHash,
        replyWrite.txHash,
        replyWrite.visibility as Awaited<ReturnType<typeof verifyPublishVisibility>>,
        {
          timeoutMs: replyTimeoutMs,
          pollMs,
          limit: feedLimit,
        },
      )
    : { attempted: false };

  const overallOk =
    reactionResult.ok
    && !!reactionVerification.attempted
    && reactionVerification.ok
    && (!replyText || (
      !!replyResult?.ok
      && !!replyVerification.attempted
      && replyVerification.ok
    ))
    && (!includeTip || (!!tipResult?.ok && !!tipVerification.attempted && tipVerification.ok));

  const lifecycle = lifecycleStore
    ? await Promise.all([
        persistSocialLifecycle(lifecycleStore, {
          family: "react",
          walletAddress: omni.address ?? null,
          txHash: candidate.txHash,
          targetPostHash: candidate.txHash,
          status: classifyLifecycleStatus({
            txHash: candidate.txHash,
            indexed: Boolean(reactionVerification.attempted && reactionVerification.ok),
            expired: Boolean(reactionVerification.attempted && !reactionVerification.ok),
            failed: !reactionResult.ok,
          }),
          expectedReadback: ["reaction-envelope"],
          budget: { unit: "none", spendStatus: "executed" },
          observation: {
            surface: "reaction-envelope",
            ok: Boolean(reactionVerification.attempted && reactionVerification.ok),
            data: reactionVerification,
          },
          metadata: { reactionType: "agree" },
        }, proofOut),
        includeTip && tipResult
          ? persistSocialLifecycle(lifecycleStore, {
              family: "tip",
              walletAddress: omni.address ?? null,
              txHash: tipResult.ok ? tipResult.data?.txHash : undefined,
              targetPostHash: candidate.txHash,
              status: classifyLifecycleStatus({
                txHash: tipResult.ok ? tipResult.data?.txHash : undefined,
                chainConfirmed: Boolean((tipVerification as { txConfirmed?: boolean }).txConfirmed),
                indexed: Boolean(tipVerification.attempted && tipVerification.ok),
                degraded: Boolean(
                  tipVerification.attempted
                  && !tipVerification.ok
                  && (tipVerification as { txConfirmed?: boolean }).txConfirmed
                ),
                expired: Boolean(tipVerification.attempted && !tipVerification.ok),
                failed: !tipResult.ok,
              }),
              expectedReadback: ["chain-rpc", "post-tip-stats", "recipient-tip-stats", "balance"],
              budget: { amount: tipAmount, unit: "DEM", ceiling: tipAmount, spendStatus: tipResult.ok ? "executed" : "planned" },
              observation: {
                surface: "post-tip-stats",
                ok: Boolean(tipVerification.attempted && tipVerification.ok),
                data: tipVerification,
              },
              metadata: { targetAuthor: candidate.author },
            }, proofOut)
          : null,
        replyText && replyWrite
          ? persistSocialLifecycle(lifecycleStore, {
              family: "reply",
              walletAddress: omni.address ?? null,
              txHash: replyWrite.txHash,
              attestationTxHash: replyWrite.attestationTxHash,
              targetPostHash: candidate.txHash,
              status: classifyLifecycleStatus({
                txHash: replyWrite.txHash,
                indexed: Boolean(replyVerification.attempted && replyVerification.ok),
                degraded: Boolean(replyVerification.attempted && !replyVerification.ok && replyWrite.accepted),
                failed: !replyWrite.accepted,
              }),
              expectedReadback: ["post-detail", "parent-thread", "recent-feed"],
              budget: { unit: "write-rate-slot", amount: 1, ceiling: 1, spendStatus: replyWrite.accepted ? "executed" : "planned" },
              observation: {
                surface: "parent-thread",
                ok: Boolean(replyVerification.attempted && replyVerification.ok),
                data: replyVerification,
              },
              metadata: { text: replyText, category: replyCategory, attestUrl: replyAttestUrl },
            }, proofOut)
          : null,
      ].filter(Boolean))
    : null;

  console.log(JSON.stringify({
    attempted: true,
    ok: overallOk,
    address: omni.address,
    target: candidate,
    tipEnabled: includeTip,
    reaction: {
      result: summarizeToolResult(reactionResult),
      verification: reactionVerification,
    },
    tip: {
      amount: tipAmount,
      skipped: !includeTip,
      result: tipResult ? summarizeToolResult(tipResult) : null,
      verification: tipVerification,
    },
    reply: {
      skipped: !replyText,
      category: replyCategory,
      attestUrl: replyAttestUrl,
      text: replyText,
      result: summarizeToolResult(replyResult),
      verification: replyVerification,
    },
    lifecycle,
    }, null, 2));

  process.exit(overallOk ? 0 : 1);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function persistSocialLifecycle(
  store: ReturnType<typeof createWriteLifecycleStore>,
  opts: {
    family: WriteActionFamily;
    walletAddress: string | null;
    txHash?: string;
    attestationTxHash?: string;
    targetPostHash?: string;
    status: WriteLifecycleStatus;
    expectedReadback: WriteLifecycleSurface[];
    budget: Parameters<ReturnType<typeof createWriteLifecycleStore>["create"]>[0]["budget"];
    observation: { surface: WriteLifecycleSurface; ok: boolean; data: unknown };
    metadata?: Record<string, unknown>;
  },
  proofOut?: string,
): Promise<Record<string, unknown>> {
  const record = await store.create({
    actionFamily: opts.family,
    walletAddress: opts.walletAddress,
    command: process.argv.join(" "),
    commit: readCurrentGitCommit(),
    budget: opts.budget,
    txHash: opts.txHash,
    attestationTxHash: opts.attestationTxHash,
    targetPostHash: opts.targetPostHash,
    expectedReadback: opts.expectedReadback,
    status: opts.txHash ? "broadcasted" : "planned",
    metadata: opts.metadata,
  });
  const updated = await store.update(record.id, {
    status: opts.status,
    transitionReason: `${opts.family} lifecycle observation: ${opts.status}`,
    observation: {
      surface: opts.observation.surface,
      status: opts.status,
      ok: opts.observation.ok,
      summary: `${opts.family} lifecycle observation reached ${opts.status}`,
      data: opts.observation.data,
    },
    finalVerdict: finalVerdictForStatus(opts.status)
      ? {
          verdict: finalVerdictForStatus(opts.status)!,
          rationale: `${opts.family} lifecycle observation reached ${opts.status}`,
          at: new Date().toISOString(),
        }
      : undefined,
  });
  const proofPacket = buildWriteLifecycleProofPacket(updated);
  const proofPath = await store.writeProofPacket(
    updated,
    proofPacket,
    proofOut && !proofOut.endsWith(".json") ? `${proofOut.replace(/\/+$/, "")}/${updated.id}.proof.json` : proofOut,
  );
  return { record: updated, proofPath, proofPacket };
}

function getIntegerArg(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return fallback;
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

async function verifyReactionReadback(
  txHash: string,
  before: ReturnType<typeof normalizeReactionEnvelope>,
  token: string | null,
  baseUrl: string,
  opts: { timeoutMs: number; pollMs: number },
): Promise<{
  attempted: true;
  ok: boolean;
  polls: number;
  before: ReturnType<typeof normalizeReactionEnvelope>;
  after: ReturnType<typeof normalizeReactionEnvelope>;
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = before;

  while (Date.now() <= deadline) {
    polls += 1;
    after = await readReactionEnvelope(txHash, token, baseUrl);
    if (reactionReadbackSatisfied(before, after, "agree")) {
      return { attempted: true, ok: true, polls, before, after };
    }
    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  return { attempted: true, ok: false, polls, before, after };
}

async function chooseCandidatePost(
  omni: OmniInstance,
  posts: unknown[],
  token: string | null,
  baseUrl: string,
): Promise<ReturnType<typeof selectSocialWriteCandidate>> {
  const ranked = rankSocialWriteCandidates(posts, omni.address);
  for (const candidate of ranked) {
    if (!socialWriteCandidateMeetsFloor(candidate)) continue;
    const reaction = await readReactionEnvelope(candidate.txHash, token, baseUrl);
    const tipStatsResult = await omni.colony.getTipStats(candidate.txHash);
    const tipStats = normalizeTipReadback(tipStatsResult?.ok ? tipStatsResult.data : null);
    if ((reaction?.myReaction ?? null) === null && !hasRecordedTip(tipStats?.myTip)) {
      return candidate;
    }
  }

  return null;
}

async function verifyTipReadback(
  omni: OmniInstance,
  postTxHash: string,
  tipTxHash: string | undefined,
  recipientAddress: string,
  before: ReturnType<typeof normalizeTipReadback>,
  beforeRecipient: ReturnType<typeof normalizeAgentTipReadback>,
  beforeBalance: number | null,
  tipAmountValue: number,
  opts: { timeoutMs: number; pollMs: number },
): Promise<{
  attempted: true;
  ok: boolean;
  polls: number;
  before: ReturnType<typeof normalizeTipReadback>;
  after: ReturnType<typeof normalizeTipReadback>;
  beforeRecipient: ReturnType<typeof normalizeAgentTipReadback>;
  afterRecipient: ReturnType<typeof normalizeAgentTipReadback>;
  beforeBalance: number | null;
  afterBalance: number | null;
  spendObserved: boolean;
  txConfirmed: boolean;
  txBlockNumber?: number;
  tipStatsConverged: boolean;
  recipientTipStatsConverged: boolean;
  readbackConverged: boolean;
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = before;
  let afterRecipient = beforeRecipient;
  let afterBalance = beforeBalance;
  let txConfirmed = false;
  let txBlockNumber: number | undefined;

  while (Date.now() <= deadline) {
    polls += 1;
    const tipStats = await omni.colony.getTipStats(postTxHash);
    after = normalizeTipReadback(tipStats?.ok ? tipStats.data : null);
    const recipientTipStats = await omni.colony.getAgentTipStats(recipientAddress);
    afterRecipient = normalizeAgentTipReadback(recipientTipStats?.ok ? recipientTipStats.data : null);
    const balanceResult = await omni.colony.getBalance();
    afterBalance = normalizeBalance(balanceResult?.ok ? balanceResult.data?.balance : null);
    const txVerification = await verifyTipTransfer(omni, tipTxHash);
    txConfirmed = txConfirmed || txVerification.confirmed;
    txBlockNumber = txVerification.blockNumber ?? txBlockNumber;

    const tipStatsConverged = tipReadbackSatisfied(before, after, tipAmountValue);
    const recipientTipStatsConverged = agentTipReadbackSatisfied(beforeRecipient, afterRecipient, tipAmountValue);
    const readbackConverged = tipStatsConverged || recipientTipStatsConverged;
    const spendObserved = txConfirmed || tipSpendObserved(beforeBalance, afterBalance, tipAmountValue);

    if (readbackConverged && spendObserved) {
      return {
        attempted: true,
        ok: true,
        polls,
        before,
        after,
        beforeRecipient,
        afterRecipient,
        beforeBalance,
        afterBalance,
        spendObserved,
        txConfirmed,
        txBlockNumber,
        tipStatsConverged,
        recipientTipStatsConverged,
        readbackConverged,
      };
    }

    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  const tipStatsConverged = tipReadbackSatisfied(before, after, tipAmountValue);
  const recipientTipStatsConverged = agentTipReadbackSatisfied(beforeRecipient, afterRecipient, tipAmountValue);
  const readbackConverged = tipStatsConverged || recipientTipStatsConverged;
  const spendObserved = txConfirmed || tipSpendObserved(beforeBalance, afterBalance, tipAmountValue);

  return {
    attempted: true,
    ok: false,
    polls,
    before,
    after,
    beforeRecipient,
    afterRecipient,
    beforeBalance,
    afterBalance,
    spendObserved,
    txConfirmed,
    txBlockNumber,
    tipStatsConverged,
    recipientTipStatsConverged,
    readbackConverged,
  };
}

async function verifyReplyReadback(
  omni: OmniInstance,
  parentTxHash: string,
  replyTxHash: string | undefined,
  visibility: Awaited<ReturnType<typeof verifyPublishVisibility>>,
  opts: { timeoutMs: number; pollMs: number; limit: number },
): Promise<{
  attempted: true;
  ok: boolean;
  visibility: Awaited<ReturnType<typeof verifyPublishVisibility>>;
  parentThread: {
    ok: boolean;
    polls: number;
  };
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let threadOk = false;

  while (Date.now() <= deadline && replyTxHash) {
    polls += 1;
    const parentDetail = await omni.colony.getPostDetail(parentTxHash);
    if (parentDetail?.ok && parentThreadContainsReply(parentDetail.data, replyTxHash)) {
      threadOk = true;
      break;
    }
    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  return {
    attempted: true,
    ok: visibility.visible && visibility.indexedVisible && threadOk,
    visibility,
    parentThread: { ok: threadOk, polls },
  };
}

async function readReactionEnvelope(
  txHash: string,
  token: string | null,
  baseUrl: string,
): Promise<ReturnType<typeof normalizeReactionEnvelope>> {
  const response = await fetchText(`/api/feed/${encodeURIComponent(txHash)}/react`, {
    baseUrl,
    token,
    timeoutMs: 15_000,
    accept: "application/json",
  });
  if (!response.ok) return null;

  try {
    return normalizeReactionEnvelope(JSON.parse(response.body) as unknown);
  } catch {
    return null;
  }
}

function summarizeToolResult(
  result: {
    ok: boolean;
    data?: { txHash?: string };
    error?: { code?: string; message?: string; retryable?: boolean };
    provenance?: unknown;
  } | null,
): Record<string, unknown> {
  if (!result) {
    return { ok: false, skipped: true };
  }
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

async function verifyTipTransfer(
  omni: OmniInstance,
  txHash: string | undefined,
): Promise<{ confirmed: boolean; blockNumber?: number }> {
  if (!txHash) return { confirmed: false };
  const bridge = omni?.runtime?.sdkBridge;
  if (!bridge || typeof bridge.verifyTransaction !== "function") {
    return { confirmed: false };
  }

  try {
    const verification = await bridge.verifyTransaction(txHash);
    if (!verification?.confirmed) return { confirmed: false };
    return {
      confirmed: true,
      blockNumber: typeof verification.blockNumber === "number" ? verification.blockNumber : undefined,
    };
  } catch {
    return { confirmed: false };
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
