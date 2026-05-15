import type { PublishResult, ToolResult } from "../../../src/toolkit/types.js";
import type { OmniWeb } from "./colony.js";
import { runDirectAttestedWrite } from "./direct-attested-write.js";
import type {
  IntentExecutionResult,
  IntentResultEnvelope,
  MinimalActionType,
  ResolvedIntent,
} from "./intent-types.js";
import type { MinimalAttestationPlan } from "./minimal-attestation-plan.js";
import type {
  MinimalBettingPoolReadback,
  MinimalErrorStage,
  MinimalExecutionOutcome,
  MinimalHigherLowerPoolReadback,
  MinimalMarketWriteVerification,
  MinimalReactionVerification,
  MinimalTipVerification,
  MinimalVerificationOptions,
} from "./minimal-agent.js";
import {
  agentTipReadbackSatisfied,
  normalizeAgentTipReadback,
  normalizeBalance,
  normalizeReactionEnvelope,
  normalizeTipAmount,
  normalizeTipReadback,
  reactionReadbackSatisfied,
  tipReadbackSatisfied,
  tipSpendObserved,
} from "./minimal-agent-verifier.js";
import { verifyPublishVisibility, type PublishVisibilityResult } from "./publish-visibility.js";

export interface ExecuteResolvedIntentOptions {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  verification: Required<MinimalVerificationOptions>;
  dryRun?: boolean;
  attestationPlan?: MinimalAttestationPlan;
}

export interface ResolvedIntentExecutionResult extends IntentExecutionResult {
  verification?: PublishVisibilityResult | MinimalReactionVerification | MinimalTipVerification | MinimalMarketWriteVerification;
  publishResult?: ToolResult<PublishResult>;
  reactionResult?: { ok: boolean; error?: unknown };
  error?: {
    stage: MinimalErrorStage;
    message: string;
    code?: string;
    retryable?: boolean;
  };
}

export interface ResolvedIntentResultEnvelope extends IntentResultEnvelope {
  resolution: ResolvedIntent;
  execution: ResolvedIntentExecutionResult;
}

export async function executeResolvedIntent(
  options: ExecuteResolvedIntentOptions,
): Promise<ResolvedIntentResultEnvelope> {
  const { omni, resolution, verification, dryRun = false, attestationPlan } = options;

  if (resolution.status !== "executable") {
    return {
      resolution,
      execution: {
        status: "skipped",
        actionType: resolution.actionType,
        demSpendEstimate: 0,
        errorCode: resolution.reasonCodes[0] ?? `resolution_${resolution.status}`,
        errorMessage: `resolution_not_executable:${resolution.status}`,
      },
    };
  }

  if (dryRun) {
    return {
      resolution,
      execution: {
        status: "dry_run",
        actionType: resolution.actionType,
        demSpendEstimate: 0,
      },
    };
  }

  const attestationGuardError = validateResolvedIntentAttestation(resolution, attestationPlan);
  if (attestationGuardError) {
    return {
      resolution,
      execution: buildFailedExecution(resolution.actionType, {
        stage: "execute",
        message: attestationGuardError,
        retryable: false,
      }),
    };
  }

  if (resolution.executionPathFamily === "direct_attested_write") {
    return {
      resolution,
      execution: await executeDirectAttestedWriteIntent({ omni, resolution, verification }),
    };
  }

  if (resolution.executionPathFamily === "reaction") {
    return {
      resolution,
      execution: await executeReactionIntent({ omni, resolution }),
    };
  }

  if (resolution.executionPathFamily === "tip_transfer") {
    return {
      resolution,
      execution: await executeTipIntent({ omni, resolution, verification }),
    };
  }

  if (resolution.executionPathFamily === "market_write") {
    return {
      resolution,
      execution: await executeMarketWriteIntent({ omni, resolution, verification }),
    };
  }

  return {
    resolution,
    execution: buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: `unsupported_execution_path:${resolution.executionPathFamily}`,
      retryable: false,
    }),
  };
}

export function toMinimalExecutionOutcome(
  execution: ResolvedIntentExecutionResult,
): MinimalExecutionOutcome {
  return {
    status: toMinimalCycleStatus(execution),
    txHash: execution.txHash,
    attestationTxHash: execution.attestationTxHash,
    attestationResponseHash: execution.attestationResponseHash,
    demSpendEstimate: execution.demSpendEstimate,
    verification: execution.verification,
    publishResult: execution.publishResult,
    reactionResult: execution.reactionResult,
    error: execution.error,
  };
}

export function validateResolvedIntentAttestation(
  resolution: ResolvedIntent,
  plan?: MinimalAttestationPlan,
): string | null {
  if (plan && !plan.ready) {
    return `attestation_plan_not_ready:${plan.reason}`;
  }

  if (resolution.actionType !== "publish" && resolution.actionType !== "reply") {
    return null;
  }

  const attestUrl = resolution.normalizedDraft.attestUrl;
  if (typeof attestUrl !== "string" || attestUrl.length === 0) {
    return `missing_attest_url:${resolution.actionType}`;
  }

  if (isPlaceholderAttestUrl(attestUrl)) {
    return `placeholder_attest_url:${attestUrl}`;
  }

  const plannedUrl = plan?.primary?.url;
  if (plannedUrl && plannedUrl !== attestUrl) {
    return `attest_url_mismatch:${attestUrl}`;
  }

  return null;
}

export function isPlaceholderAttestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "example.com"
      || parsed.hostname === "www.example.com"
      || parsed.pathname.includes("example")
      || parsed.pathname.includes("placeholder");
  } catch {
    return true;
  }
}

async function executeDirectAttestedWriteIntent(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  verification: Required<MinimalVerificationOptions>;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution, verification: verificationOptions } = args;

  if (resolution.actionType !== "publish" && resolution.actionType !== "reply") {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: `unsupported_direct_write_action:${resolution.actionType}`,
      retryable: false,
    });
  }

  if (resolution.actionType === "reply" && !resolution.normalizedTarget.parentTxHash) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_reply_parent",
      retryable: false,
    });
  }

  const directWrite = await runDirectAttestedWrite({
    omni,
    kind: resolution.actionType,
    draft: {
      text: resolution.normalizedDraft.text ?? "",
      category: resolution.normalizedDraft.category,
      attestUrl: resolution.normalizedDraft.attestUrl ?? "",
      confidence: resolution.normalizedDraft.confidence,
      tags: resolution.normalizedDraft.tags,
      parentTxHash: resolution.normalizedTarget.parentTxHash,
    },
    verifyPublishVisibility,
    verification: verificationOptions,
  });

  const publishResult = directWrite.result;
  const visibility = isVerificationResult(directWrite.visibility) ? directWrite.visibility : undefined;
  if (!directWrite.accepted || !publishResult?.ok) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: publishResult?.error?.message ?? directWrite.error?.message ?? `${resolution.actionType}_failed`,
      code: publishResult?.error?.code ?? directWrite.error?.code,
      retryable: publishResult?.error?.retryable ?? directWrite.error?.retryable,
    }, {
      publishResult,
      verification: visibility,
      txHash: directWrite.txHash,
      attestationTxHash: directWrite.attestationTxHash,
      attestationResponseHash: directWrite.attestationResponseHash,
    });
  }

  return {
    status: "executed",
    actionType: resolution.actionType,
    txHash: directWrite.txHash,
    attestationTxHash: directWrite.attestationTxHash,
    attestationResponseHash: directWrite.attestationResponseHash,
    demSpendEstimate: 1,
    verification: visibility,
    publishResult,
    verificationPath: visibility?.verificationPath,
    visible: visibility?.visible,
    indexedVisible: visibility?.indexedVisible,
  };
}

async function executeReactionIntent(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution } = args;
  const targetTxHash = resolution.normalizedTarget.targetTxHash;
  const reactionType = resolution.normalizedDraft.reaction ?? "agree";

  if (!targetTxHash) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_reaction_target",
      retryable: false,
    });
  }

  const beforeResult = await omni.colony.getReactions(targetTxHash);
  const before = normalizeReactionEnvelope(beforeResult?.ok === true ? beforeResult.data : undefined);
  const reactionResult = await omni.colony.react(targetTxHash, reactionType);
  const afterResult = await omni.colony.getReactions(targetTxHash);
  const after = normalizeReactionEnvelope(afterResult?.ok === true ? afterResult.data : undefined);
  const verification: MinimalReactionVerification = {
    attempted: true,
    visible: reactionResult?.ok === true,
    indexedVisible: reactionResult?.ok === true,
    polls: 1,
    elapsedMs: 0,
    txHash: targetTxHash,
    verificationPath: "reaction_counts",
    reactionType,
    before,
    after,
    error: reactionReadbackSatisfied(before, after, reactionType)
      ? undefined
      : reactionResult?.ok === true
        ? "reaction_readback_unconfirmed"
        : readApiErrorMessage(reactionResult?.error) ?? "reaction_failed",
  };

  if (reactionResult?.ok !== true) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: readApiErrorMessage(reactionResult?.error) ?? "reaction_failed",
      retryable: true,
    }, {
      reactionResult: { ok: false, error: reactionResult?.error },
      verification,
    });
  }

  return {
    status: "executed",
    actionType: resolution.actionType,
    demSpendEstimate: 0,
    reactionResult: { ok: true },
    verification,
    verificationPath: verification.verificationPath,
    visible: verification.visible,
    indexedVisible: verification.indexedVisible,
  };
}

async function executeTipIntent(args: {
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

async function executeMarketWriteIntent(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  verification: Required<MinimalVerificationOptions>;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution, verification: verificationOptions } = args;

  if (resolution.actionType !== "bet") {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: `unsupported_market_write_action:${resolution.actionType}`,
      retryable: false,
    });
  }

  const asset = resolution.normalizedTarget.asset;
  const horizon = resolution.normalizedDraft.horizon;
  const marketKind = resolution.normalizedDraft.marketKind;

  if (!asset) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_bet_asset",
      retryable: false,
    });
  }

  if (!horizon) {
    return buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: "missing_bet_horizon",
      retryable: false,
    });
  }

  if (marketKind === "fixed_price") {
    const predictedPrice = resolution.normalizedDraft.predictedPrice;
    if (typeof predictedPrice !== "number" || !Number.isFinite(predictedPrice) || predictedPrice <= 0) {
      return buildFailedExecution(resolution.actionType, {
        stage: "execute",
        message: "missing_predicted_price",
        retryable: false,
      });
    }

    const beforePool = normalizeBettingPoolReadback(await readBettingPool(omni, asset, horizon));
    const betResult = await omni.colony.placeBet(asset, predictedPrice, { horizon });

    if (betResult?.ok !== true) {
      const verification: MinimalMarketWriteVerification = {
        attempted: true,
        visible: false,
        indexedVisible: false,
        polls: 0,
        elapsedMs: 0,
        verificationPath: "betting_pool",
        marketKind,
        asset,
        horizon,
        amount: 5,
        predictedPrice,
        registrationConfirmed: false,
        beforePool,
        afterPool: beforePool,
        error: readApiErrorMessage(betResult?.error) ?? "bet_failed",
      };

      return buildFailedExecution(resolution.actionType, {
        stage: "execute",
        message: readApiErrorMessage(betResult?.error) ?? "bet_failed",
        retryable: true,
      }, {
        verification,
      });
    }

    const readback = await verifyFixedPriceBetReadback({
      omni,
      asset,
      horizon,
      txHash: betResult.data.txHash,
      beforePool,
      verification: verificationOptions,
    });
    const registrationError = betResult.data.registered
      ? undefined
      : betResult.data.registrationError;
    const readbackError = readback.indexedVisible ? undefined : "bet_readback_unconfirmed";
    const verification: MinimalMarketWriteVerification = {
      attempted: true,
      visible: true,
      indexedVisible: readback.indexedVisible,
      polls: readback.polls,
      elapsedMs: readback.elapsedMs,
      txHash: betResult.data.txHash,
      verificationPath: "betting_pool",
      marketKind,
      asset,
      horizon,
      amount: betResult.data.amount,
      memo: betResult.data.memo,
      predictedPrice,
      registrationConfirmed: readback.indexedVisible,
      beforePool,
      afterPool: readback.afterPool,
      error: registrationError ?? readbackError,
    };

    if (!readback.indexedVisible) {
      return buildFailedExecution(resolution.actionType, {
        stage: "verify",
        message: registrationError ?? readbackError ?? "bet_verification_failed",
        retryable: true,
      }, {
        txHash: betResult.data.txHash,
        demSpendEstimate: betResult.data.amount,
        verification,
        verificationPath: verification.verificationPath,
        visible: verification.visible,
        indexedVisible: verification.indexedVisible,
      });
    }

    return {
      status: "executed",
      actionType: resolution.actionType,
      txHash: betResult.data.txHash,
      demSpendEstimate: betResult.data.amount,
      verification,
      verificationPath: verification.verificationPath,
      visible: verification.visible,
      indexedVisible: verification.indexedVisible,
    };
  }

  if (marketKind === "higher_lower") {
    const direction = resolution.normalizedDraft.direction;
    if (direction !== "higher" && direction !== "lower") {
      return buildFailedExecution(resolution.actionType, {
        stage: "execute",
        message: "missing_higher_lower_direction",
        retryable: false,
      });
    }

    const beforePool = normalizeHigherLowerPoolReadback(await readHigherLowerPool(omni, asset, horizon));
    const betResult = await omni.colony.placeHL(asset, direction, { amount: 5, horizon });

    if (betResult?.ok !== true) {
      const verification: MinimalMarketWriteVerification = {
        attempted: true,
        visible: false,
        indexedVisible: false,
        polls: 0,
        elapsedMs: 0,
        verificationPath: "higher_lower_pool",
        marketKind,
        asset,
        horizon,
        amount: 5,
        direction,
        registrationConfirmed: false,
        beforePool,
        afterPool: beforePool,
        error: readApiErrorMessage(betResult?.error) ?? "higher_lower_bet_failed",
      };

      return buildFailedExecution(resolution.actionType, {
        stage: "execute",
        message: readApiErrorMessage(betResult?.error) ?? "higher_lower_bet_failed",
        retryable: true,
      }, {
        verification,
      });
    }

    const readback = await verifyHigherLowerBetReadback({
      omni,
      asset,
      horizon,
      direction,
      amount: betResult.data.amount,
      beforePool,
      verification: verificationOptions,
    });
    const registrationError = betResult.data.registered
      ? undefined
      : betResult.data.registrationError;
    const readbackError = readback.indexedVisible ? undefined : "higher_lower_readback_unconfirmed";
    const verification: MinimalMarketWriteVerification = {
      attempted: true,
      visible: true,
      indexedVisible: readback.indexedVisible,
      polls: readback.polls,
      elapsedMs: readback.elapsedMs,
      txHash: betResult.data.txHash,
      verificationPath: "higher_lower_pool",
      marketKind,
      asset,
      horizon,
      amount: betResult.data.amount,
      memo: betResult.data.memo,
      direction,
      registrationConfirmed: readback.indexedVisible,
      beforePool,
      afterPool: readback.afterPool,
      error: registrationError ?? readbackError,
    };

    if (!readback.indexedVisible) {
      return buildFailedExecution(resolution.actionType, {
        stage: "verify",
        message: registrationError ?? readbackError ?? "higher_lower_verification_failed",
        retryable: true,
      }, {
        txHash: betResult.data.txHash,
        demSpendEstimate: betResult.data.amount,
        verification,
        verificationPath: verification.verificationPath,
        visible: verification.visible,
        indexedVisible: verification.indexedVisible,
      });
    }

    return {
      status: "executed",
      actionType: resolution.actionType,
      txHash: betResult.data.txHash,
      demSpendEstimate: betResult.data.amount,
      verification,
      verificationPath: verification.verificationPath,
      visible: verification.visible,
      indexedVisible: verification.indexedVisible,
    };
  }

  return buildFailedExecution(resolution.actionType, {
    stage: "execute",
    message: "missing_market_kind",
    retryable: false,
  });
}

async function verifyFixedPriceBetReadback(args: {
  omni: OmniWeb;
  asset: string;
  horizon: string;
  txHash: string;
  beforePool: MinimalBettingPoolReadback | null;
  verification: Required<MinimalVerificationOptions>;
}): Promise<{
  afterPool: MinimalBettingPoolReadback | null;
  indexedVisible: boolean;
  polls: number;
  elapsedMs: number;
}> {
  const { omni, asset, horizon, txHash, beforePool, verification } = args;
  const startedAt = Date.now();
  const deadline = startedAt + Math.max(0, verification.timeoutMs);
  let polls = 0;
  let afterPool = beforePool;
  let indexedVisible = false;

  while (true) {
    polls += 1;
    afterPool = normalizeBettingPoolReadback(await readBettingPool(omni, asset, horizon));
    indexedVisible = fixedBetReadbackSatisfied(beforePool, afterPool, txHash);

    if (indexedVisible || Date.now() >= deadline) {
      break;
    }

    await sleep(verification.pollMs);
  }

  return {
    afterPool,
    indexedVisible,
    polls,
    elapsedMs: Date.now() - startedAt,
  };
}

async function verifyHigherLowerBetReadback(args: {
  omni: OmniWeb;
  asset: string;
  horizon: string;
  direction: "higher" | "lower";
  amount: number;
  beforePool: MinimalHigherLowerPoolReadback | null;
  verification: Required<MinimalVerificationOptions>;
}): Promise<{
  afterPool: MinimalHigherLowerPoolReadback | null;
  indexedVisible: boolean;
  polls: number;
  elapsedMs: number;
}> {
  const { omni, asset, horizon, direction, amount, beforePool, verification } = args;
  const startedAt = Date.now();
  const deadline = startedAt + Math.max(0, verification.timeoutMs);
  let polls = 0;
  let afterPool = beforePool;
  let indexedVisible = false;

  while (true) {
    polls += 1;
    afterPool = normalizeHigherLowerPoolReadback(await readHigherLowerPool(omni, asset, horizon));
    indexedVisible = higherLowerReadbackSatisfied(beforePool, afterPool, direction, amount);

    if (indexedVisible || Date.now() >= deadline) {
      break;
    }

    await sleep(verification.pollMs);
  }

  return {
    afterPool,
    indexedVisible,
    polls,
    elapsedMs: Date.now() - startedAt,
  };
}

function buildFailedExecution(
  actionType: MinimalActionType,
  error: {
    stage: MinimalErrorStage;
    message: string;
    code?: string;
    retryable?: boolean;
  },
  extras: Partial<ResolvedIntentExecutionResult> = {},
): ResolvedIntentExecutionResult {
  return {
    status: "failed",
    actionType,
    demSpendEstimate: 0,
    errorCode: error.code,
    errorMessage: error.message,
    retryable: error.retryable,
    error,
    ...extras,
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

async function readBettingPool(omni: OmniWeb, asset: string, horizon: string): Promise<unknown> {
  const result = await omni.colony.getPool({ asset, horizon });
  return result?.ok === true ? result.data : undefined;
}

async function readHigherLowerPool(omni: OmniWeb, asset: string, horizon: string): Promise<unknown> {
  const result = await omni.colony.getHigherLowerPool({ asset, horizon });
  return result?.ok === true ? result.data : undefined;
}

function normalizeBettingPoolReadback(value: unknown): MinimalBettingPoolReadback | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const asset = readNonEmptyString(record.asset);
  const horizon = readNonEmptyString(record.horizon);
  if (!asset || !horizon) return null;

  const bets = Array.isArray(record.bets)
    ? record.bets
      .map((entry) => normalizeBetEntry(entry))
      .filter((entry): entry is MinimalBettingPoolReadback["bets"][number] => entry !== null)
    : [];

  return {
    asset,
    horizon,
    totalBets: readFiniteNumber(record.totalBets) ?? 0,
    totalDem: readFiniteNumber(record.totalDem) ?? 0,
    bets,
  };
}

function normalizeHigherLowerPoolReadback(value: unknown): MinimalHigherLowerPoolReadback | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const asset = readNonEmptyString(record.asset);
  const horizon = readNonEmptyString(record.horizon);
  if (!asset || !horizon) return null;

  return {
    asset,
    horizon,
    totalHigher: readFiniteNumber(record.totalHigher) ?? 0,
    totalLower: readFiniteNumber(record.totalLower) ?? 0,
    totalDem: readFiniteNumber(record.totalDem) ?? 0,
    higherCount: readFiniteNumber(record.higherCount) ?? 0,
    lowerCount: readFiniteNumber(record.lowerCount) ?? 0,
    referencePrice: readFiniteNumber(record.referencePrice) ?? null,
    currentPrice: readFiniteNumber(record.currentPrice) ?? 0,
  };
}

function normalizeBetEntry(value: unknown): MinimalBettingPoolReadback["bets"][number] | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const txHash = readNonEmptyString(record.txHash);
  const predictedPrice = readFiniteNumber(record.predictedPrice);
  const amount = readFiniteNumber(record.amount);
  if (!txHash || predictedPrice == null || amount == null) {
    return null;
  }
  return { txHash, predictedPrice, amount };
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

function fixedBetReadbackSatisfied(
  before: MinimalBettingPoolReadback | null,
  after: MinimalBettingPoolReadback | null,
  txHash: string,
): boolean {
  if (!after) return false;
  if (after.bets.some((bet) => bet.txHash === txHash)) return true;
  if (!before) return false;
  return after.totalBets > before.totalBets || after.totalDem > before.totalDem;
}

function higherLowerReadbackSatisfied(
  before: MinimalHigherLowerPoolReadback | null,
  after: MinimalHigherLowerPoolReadback | null,
  direction: "higher" | "lower",
  amount: number,
): boolean {
  if (!after) return false;
  const totalField = direction === "higher" ? "totalHigher" : "totalLower";
  const countField = direction === "higher" ? "higherCount" : "lowerCount";
  if (!before) {
    return after[totalField] >= amount || after.totalDem >= amount;
  }
  return after[countField] > before[countField]
    || after[totalField] >= before[totalField] + amount
    || after.totalDem >= before.totalDem + amount;
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function readApiErrorMessage(value: unknown): string | null {
  if (typeof value === "string") return value.trim().length > 0 ? value : null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" ? record.message : null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isVerificationResult(value: unknown): value is PublishVisibilityResult {
  return Boolean(value && typeof value === "object" && "visible" in value && "indexedVisible" in value);
}

function toMinimalCycleStatus(execution: ResolvedIntentExecutionResult): MinimalExecutionOutcome["status"] {
  if (execution.status === "executed") {
    if (execution.actionType === "publish") return "published";
    if (execution.actionType === "reply") return "replied";
    if (execution.actionType === "react") return "reacted";
    if (execution.actionType === "tip") return "tipped";
    if (execution.actionType === "bet") return "market_written";
    return "failed";
  }

  if (execution.status === "dry_run") {
    return "dry_run";
  }

  if (execution.status === "skipped") {
    return "skipped";
  }

  return "failed";
}
