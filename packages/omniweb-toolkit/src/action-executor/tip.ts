import type { OmniWeb } from "../colony.js";
import type { ResolvedIntent } from "../intent-types.js";
import type {
  MinimalTipVerification,
  MinimalVerificationOptions,
} from "../minimal-agent.js";
import {
  agentTipReadbackSatisfied,
  normalizeAgentTipReadback,
  normalizeBalance,
  normalizeTipAmount,
  normalizeTipReadback,
  tipReadbackSatisfied,
  tipSpendObserved,
} from "../minimal-agent-verifier.js";
import { readApiErrorMessage, sleep } from "./readback-helpers.js";
import { buildFailedExecution } from "./result-helpers.js";
import type { ResolvedIntentExecutionResult } from "./types.js";

export async function executeTipIntent(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  verification: Required<MinimalVerificationOptions>;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution, verification: verificationOptions } = args;
  const targetTxHash = resolution.normalizedTarget.targetTxHash;
  const requestedAmount = resolution.normalizedDraft.amount;

  if (!targetTxHash) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_tip_target",
      retryable: false,
    });
  }

  if (typeof requestedAmount !== "number" || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_tip_amount",
      retryable: false,
    });
  }

  const normalizedAmount = normalizeTipAmount(requestedAmount);
  const recipientAddress = await readTipRecipientAddress(omni, targetTxHash);
  const beforeTipStats = normalizeTipReadback(await readTipStats(omni, targetTxHash));
  const beforeRecipientTipStats = normalizeAgentTipReadback(
    recipientAddress ? await readAgentTipStats(omni, recipientAddress) : undefined,
  );
  const beforeBalance = normalizeBalance(await readOwnBalance(omni));
  const tipResult = await omni.colony.tip(targetTxHash, normalizedAmount);

  if (tipResult?.ok !== true) {
    const verification: MinimalTipVerification = {
      attempted: true,
      visible: false,
      indexedVisible: false,
      polls: 0,
      elapsedMs: 0,
      txHash: targetTxHash,
      verificationPath: "none",
      tipConfirmationSurface: "none",
      amount: normalizedAmount,
      recipientAddress: recipientAddress ?? undefined,
      beforeTipStats,
      afterTipStats: beforeTipStats,
      beforeRecipientTipStats,
      afterRecipientTipStats: beforeRecipientTipStats,
      beforeBalance,
      afterBalance: beforeBalance,
      tipStatsConverged: false,
      recipientTipStatsConverged: false,
      spendObserved: false,
      error: readApiErrorMessage(tipResult?.error) ?? "tip_failed",
    };

    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: readApiErrorMessage(tipResult?.error) ?? "tip_failed",
      retryable: true,
    }, {
      verification,
    });
  }

  const startedAt = Date.now();
  const deadline = startedAt + Math.max(0, verificationOptions.timeoutMs);
  let polls = 0;
  let afterTipStats = beforeTipStats;
  let afterRecipientTipStats = beforeRecipientTipStats;
  let afterBalance = beforeBalance;
  let tipStatsConverged = false;
  let recipientTipStatsConverged = false;
  let spendObserved = false;

  while (true) {
    polls += 1;
    afterTipStats = normalizeTipReadback(await readTipStats(omni, targetTxHash));
    afterRecipientTipStats = normalizeAgentTipReadback(
      recipientAddress ? await readAgentTipStats(omni, recipientAddress) : undefined,
    );
    afterBalance = normalizeBalance(await readOwnBalance(omni));
    tipStatsConverged = tipReadbackSatisfied(beforeTipStats, afterTipStats, normalizedAmount);
    recipientTipStatsConverged = agentTipReadbackSatisfied(
      beforeRecipientTipStats,
      afterRecipientTipStats,
      normalizedAmount,
    );
    spendObserved = tipSpendObserved(beforeBalance, afterBalance, normalizedAmount);

    if (tipStatsConverged || recipientTipStatsConverged || Date.now() >= deadline) {
      break;
    }

    await sleep(verificationOptions.pollMs);
  }

  const tipConfirmationSurface = resolveTipConfirmationSurface({
    tipStatsConverged,
    recipientTipStatsConverged,
    spendObserved,
  });

  const verification: MinimalTipVerification = {
    attempted: true,
    visible: tipConfirmationSurface !== "none",
    indexedVisible: tipStatsConverged || recipientTipStatsConverged,
    polls,
    elapsedMs: Date.now() - startedAt,
    txHash: targetTxHash,
    verificationPath: tipConfirmationSurface,
    tipConfirmationSurface,
    amount: normalizedAmount,
    tipTxHash: tipResult.data.txHash,
    recipientAddress: recipientAddress ?? undefined,
    beforeTipStats,
    afterTipStats,
    beforeRecipientTipStats,
    afterRecipientTipStats,
    beforeBalance,
    afterBalance,
    tipStatsConverged,
    recipientTipStatsConverged,
    spendObserved,
    error: tipConfirmationSurface !== "none"
      ? undefined
      : "tip_readback_unconfirmed",
  };

  return {
    status: "executed",
    actionType: resolution.actionType,
    txHash: tipResult.data.txHash,
    demSpendEstimate: normalizedAmount,
    verification,
    verificationPath: verification.verificationPath,
    visible: verification.visible,
    indexedVisible: verification.indexedVisible,
  };
}

async function readTipRecipientAddress(omni: OmniWeb, targetTxHash: string): Promise<string | null> {
  const detailResult = await omni.colony.getPostDetail?.(targetTxHash);
  if (detailResult?.ok !== true) return null;
  return typeof detailResult.data?.post?.author === "string" && detailResult.data.post.author.length > 0
    ? detailResult.data.post.author
    : null;
}

async function readTipStats(omni: OmniWeb, targetTxHash: string): Promise<unknown> {
  const result = await omni.colony.getTipStats(targetTxHash);
  return result?.ok === true ? result.data : undefined;
}

async function readAgentTipStats(omni: OmniWeb, address: string): Promise<unknown> {
  const result = await omni.colony.getAgentTipStats(address);
  return result?.ok === true ? result.data : undefined;
}

async function readOwnBalance(omni: OmniWeb): Promise<unknown> {
  const result = await omni.colony.getBalance();
  return result?.ok === true ? result.data : undefined;
}

function resolveTipConfirmationSurface(args: {
  tipStatsConverged: boolean;
  recipientTipStatsConverged: boolean;
  spendObserved: boolean;
}): MinimalTipVerification["tipConfirmationSurface"] {
  if (args.tipStatsConverged) return "post_tip_stats";
  if (args.recipientTipStatsConverged) return "recipient_tip_stats";
  if (args.spendObserved) return "balance_spend";
  return "none";
}
