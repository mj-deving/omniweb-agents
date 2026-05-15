#!/usr/bin/env npx tsx
/**
 * check-tip-visibility.ts - live tip execution and readback proof.
 *
 * Default behavior is non-destructive and reports the planned tip target.
 * Passing --execute sends one explicit DEM tip, then records which confirmation
 * surface converged: post tip stats, recipient stats, tx confirmation, or
 * balance-spend fallback.
 */

import {
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
  normalizeTipReadback,
  rankSocialWriteCandidates,
  socialWriteCandidateMeetsFloor,
  tipReadbackSatisfied,
  tipSpendObserved,
  type SocialWriteCandidate,
} from "./_write-proof-shared.js";

const DEFAULT_FEED_LIMIT = 100;
const DEFAULT_POLL_MS = 3_000;
const DEFAULT_TIP_TIMEOUT_MS = 45_000;
const DEFAULT_TIP_AMOUNT = 1;

type OmniInstance = Awaited<ReturnType<Awaited<ReturnType<typeof loadConnect>>>>;
type TipReadback = ReturnType<typeof normalizeTipReadback>;
type AgentTipReadback = ReturnType<typeof normalizeAgentTipReadback>;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-tip-visibility.ts [options]

Options:
  --target-tx TX          Existing post tx hash to tip; otherwise select from feed
  --feed-limit N          Number of recent feed posts to scan for a target (default: ${DEFAULT_FEED_LIMIT})
  --tip-amount N          DEM amount to tip (default: ${DEFAULT_TIP_AMOUNT})
  --tip-timeout-ms N      Polling timeout for tip readback (default: ${DEFAULT_TIP_TIMEOUT_MS})
  --poll-ms N             Poll interval for readback polling (default: ${DEFAULT_POLL_MS})
  --base-url URL          SuperColony base URL for direct reads (default: ${DEFAULT_BASE_URL})
  --state-dir PATH        Override state directory for runtime guards
  --allow-insecure        Allow HTTP attestation URLs (local dev only)
  --execute               Perform the real live tip
  --help, -h              Show this help

Output: JSON tip proof report
Exit codes: 0 = tip accepted and at least one confirmation surface observed,
            1 = runtime or proof failure,
            2 = invalid args`);
  process.exit(0);
}

for (const flag of [
  "--target-tx",
  "--feed-limit",
  "--tip-amount",
  "--tip-timeout-ms",
  "--poll-ms",
  "--base-url",
  "--state-dir",
]) {
  const index = args.indexOf(flag);
  if (index >= 0 && !args[index + 1]) {
    console.error(`Error: ${flag} requires a value`);
    process.exit(2);
  }
}

const targetTx = getStringArg(args, "--target-tx") ?? null;
const feedLimit = getIntegerArg("--feed-limit", DEFAULT_FEED_LIMIT);
const tipAmount = getIntegerArg("--tip-amount", DEFAULT_TIP_AMOUNT);
const tipTimeoutMs = getIntegerArg("--tip-timeout-ms", DEFAULT_TIP_TIMEOUT_MS);
const pollMs = getIntegerArg("--poll-ms", DEFAULT_POLL_MS);
const baseUrl = getStringArg(args, "--base-url") ?? DEFAULT_BASE_URL;
const stateDir = getStringArg(args, "--state-dir") || undefined;
const allowInsecureUrls = hasFlag(args, "--allow-insecure");
const execute = hasFlag(args, "--execute");

for (const [label, value] of [
  ["--feed-limit", feedLimit],
  ["--tip-amount", tipAmount],
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
  const feed = await omni.colony.getFeed({ limit: feedLimit });
  if (!feed?.ok) {
    throw new Error(`Feed read failed: ${feed?.error ?? "unknown_error"}`);
  }

  const posts = Array.isArray(feed.data?.posts) ? feed.data.posts : [];
  const rankedCandidates = rankSocialWriteCandidates(posts, omni.address);
  const candidate = targetTx
    ? rankedCandidates.find((post) => post.txHash === targetTx) ?? await hydrateTargetCandidate(omni, targetTx, rankedCandidates)
    : await chooseTipCandidate(omni, rankedCandidates);

  if (!candidate) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
      skipped: true,
      address: omni.address,
      floor: DEFAULT_SOCIAL_WRITE_CANDIDATE_FLOOR,
      topRankedCandidate: rankedCandidates[0] ?? null,
      message: targetTx
        ? `Target ${targetTx} was not available or was not safe to tip.`
        : `No untipped attested post met the social interaction floor in the latest ${feedLimit} posts.`,
    }, null, 2));
    process.exit(0);
  }

  const before = await readTipState(omni, candidate, baseUrl);

  if (!execute) {
    console.log(JSON.stringify({
      attempted: false,
      ok: true,
      address: omni.address,
      target: candidate,
      tip: {
        amount: tipAmount,
        planned: true,
      },
      readback: before,
      message: "Dry run only. Re-run with --execute to perform the live tip proof.",
    }, null, 2));
    process.exit(0);
  }

  const tipResult = await omni.colony.tip(candidate.txHash, tipAmount);
  const txHash = tipResult?.ok ? tipResult.data?.txHash : undefined;
  const verification = tipResult?.ok
    ? await verifyTipReadback(omni, candidate, txHash, before, tipAmount, {
        timeoutMs: tipTimeoutMs,
        pollMs,
      })
    : { attempted: false };

  const ok = !!tipResult?.ok
    && verification.attempted
    && verification.ok;

  console.log(JSON.stringify({
    attempted: true,
    ok,
    address: omni.address,
    target: candidate,
    tip: {
      amount: tipAmount,
      result: summarizeToolResult(tipResult),
      txHash,
      verification,
    },
  }, null, 2));

  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

function getIntegerArg(flag: string, fallback: number): number {
  const parsed = getNumberArg(args, flag);
  if (parsed === undefined) return fallback;
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

async function chooseTipCandidate(
  omni: OmniInstance,
  ranked: SocialWriteCandidate[],
): Promise<SocialWriteCandidate | null> {
  for (const candidate of ranked) {
    if (!socialWriteCandidateMeetsFloor(candidate)) continue;
    const tipStatsResult = await omni.colony.getTipStats(candidate.txHash);
    const tipStats = normalizeTipReadback(tipStatsResult?.ok ? tipStatsResult.data : null);
    if (!hasRecordedTip(tipStats?.myTip)) {
      return candidate;
    }
  }
  return null;
}

async function hydrateTargetCandidate(
  omni: OmniInstance,
  txHash: string,
  ranked: SocialWriteCandidate[],
): Promise<SocialWriteCandidate | null> {
  const detail = await omni.colony.getPostDetail(txHash);
  if (!detail?.ok) return null;
  const hydrated = rankSocialWriteCandidates([detail.data], omni.address)[0]
    ?? ranked.find((post) => post.txHash === txHash)
    ?? null;
  if (!hydrated) return null;
  const tipStatsResult = await omni.colony.getTipStats(hydrated.txHash);
  const tipStats = normalizeTipReadback(tipStatsResult?.ok ? tipStatsResult.data : null);
  return hasRecordedTip(tipStats?.myTip) ? null : hydrated;
}

async function readTipState(
  omni: OmniInstance,
  candidate: SocialWriteCandidate,
  baseUrl: string,
): Promise<{
  postTipStats: TipReadback;
  recipientTipStats: AgentTipReadback;
  balance: number | null;
  parentDetailOk: boolean;
  baseUrl: string;
}> {
  const tipStatsResult = await omni.colony.getTipStats(candidate.txHash);
  const recipientTipStatsResult = await omni.colony.getAgentTipStats(candidate.author);
  const balanceResult = await omni.colony.getBalance();
  const parentDetail = await omni.colony.getPostDetail(candidate.txHash);

  return {
    postTipStats: normalizeTipReadback(tipStatsResult?.ok ? tipStatsResult.data : null),
    recipientTipStats: normalizeAgentTipReadback(recipientTipStatsResult?.ok ? recipientTipStatsResult.data : null),
    balance: normalizeBalance(balanceResult?.ok ? balanceResult.data?.balance : null),
    parentDetailOk: !!parentDetail?.ok,
    baseUrl,
  };
}

async function verifyTipReadback(
  omni: OmniInstance,
  candidate: SocialWriteCandidate,
  tipTxHash: string | undefined,
  before: Awaited<ReturnType<typeof readTipState>>,
  tipAmountValue: number,
  opts: { timeoutMs: number; pollMs: number },
): Promise<{
  attempted: true;
  ok: boolean;
  polls: number;
  before: Awaited<ReturnType<typeof readTipState>>;
  after: Awaited<ReturnType<typeof readTipState>>;
  spendObserved: boolean;
  txConfirmed: boolean;
  txBlockNumber?: number;
  postTipStatsConverged: boolean;
  recipientTipStatsConverged: boolean;
  balanceSpendObserved: boolean;
  confirmationSurface: "post_tip_stats" | "recipient_tip_stats" | "tx_confirmed" | "balance_spend" | "none";
}> {
  const deadline = Date.now() + opts.timeoutMs;
  let polls = 0;
  let after = before;
  let txConfirmed = false;
  let txBlockNumber: number | undefined;

  while (Date.now() <= deadline) {
    polls += 1;
    after = await readTipState(omni, candidate, before.baseUrl);
    const txVerification = await verifyTipTransfer(omni, tipTxHash);
    txConfirmed = txConfirmed || txVerification.confirmed;
    txBlockNumber = txVerification.blockNumber ?? txBlockNumber;

    const status = classifyTipConfirmation({ before, after, tipAmountValue, txConfirmed });
    if (status.ok) {
      return {
        attempted: true,
        ok: true,
        polls,
        before,
        after,
        spendObserved: status.spendObserved,
        txConfirmed,
        txBlockNumber,
        postTipStatsConverged: status.postTipStatsConverged,
        recipientTipStatsConverged: status.recipientTipStatsConverged,
        balanceSpendObserved: status.balanceSpendObserved,
        confirmationSurface: status.confirmationSurface,
      };
    }

    if (Date.now() + opts.pollMs > deadline) break;
    await sleep(opts.pollMs);
  }

  const status = classifyTipConfirmation({ before, after, tipAmountValue, txConfirmed });
  return {
    attempted: true,
    ok: false,
    polls,
    before,
    after,
    spendObserved: status.spendObserved,
    txConfirmed,
    txBlockNumber,
    postTipStatsConverged: status.postTipStatsConverged,
    recipientTipStatsConverged: status.recipientTipStatsConverged,
    balanceSpendObserved: status.balanceSpendObserved,
    confirmationSurface: status.confirmationSurface,
  };
}

function classifyTipConfirmation(args: {
  before: Awaited<ReturnType<typeof readTipState>>;
  after: Awaited<ReturnType<typeof readTipState>>;
  tipAmountValue: number;
  txConfirmed: boolean;
}): {
  ok: boolean;
  spendObserved: boolean;
  postTipStatsConverged: boolean;
  recipientTipStatsConverged: boolean;
  balanceSpendObserved: boolean;
  confirmationSurface: "post_tip_stats" | "recipient_tip_stats" | "tx_confirmed" | "balance_spend" | "none";
} {
  const postTipStatsConverged = tipReadbackSatisfied(args.before.postTipStats, args.after.postTipStats, args.tipAmountValue);
  const recipientTipStatsConverged = agentTipReadbackSatisfied(
    args.before.recipientTipStats,
    args.after.recipientTipStats,
    args.tipAmountValue,
  );
  const balanceSpendObserved = tipSpendObserved(args.before.balance, args.after.balance, args.tipAmountValue);
  const spendObserved = args.txConfirmed || balanceSpendObserved;

  let confirmationSurface: "post_tip_stats" | "recipient_tip_stats" | "tx_confirmed" | "balance_spend" | "none" = "none";
  if (postTipStatsConverged) confirmationSurface = "post_tip_stats";
  else if (recipientTipStatsConverged) confirmationSurface = "recipient_tip_stats";
  else if (args.txConfirmed) confirmationSurface = "tx_confirmed";
  else if (balanceSpendObserved) confirmationSurface = "balance_spend";

  return {
    ok: postTipStatsConverged || recipientTipStatsConverged || spendObserved,
    spendObserved,
    postTipStatsConverged,
    recipientTipStatsConverged,
    balanceSpendObserved,
    confirmationSurface,
  };
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

function summarizeToolResult(
  result: {
    ok: boolean;
    data?: { txHash?: string };
    error?: { code?: string; message?: string; retryable?: boolean };
    provenance?: unknown;
  } | null,
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
