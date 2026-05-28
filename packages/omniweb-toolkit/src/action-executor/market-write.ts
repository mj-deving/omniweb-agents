import type { OmniWeb } from "../colony.js";
import type { ResolvedIntent } from "../intent-types.js";
import type {
  MinimalBettingPoolReadback,
  MinimalHigherLowerPoolReadback,
  MinimalMarketWriteVerification,
  MinimalVerificationOptions,
} from "../minimal-agent.js";
import {
  readApiErrorMessage,
  readFiniteNumber,
  readNonEmptyString,
  sleep,
} from "./readback-helpers.js";
import { buildFailedExecution } from "./result-helpers.js";
import type { ResolvedIntentExecutionResult } from "./types.js";

export async function executeMarketWriteIntent(args: {
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
    return executeFixedPriceBet({
      omni,
      resolution,
      asset,
      horizon,
      verification: verificationOptions,
    });
  }

  if (marketKind === "higher_lower") {
    return executeHigherLowerBet({
      omni,
      resolution,
      asset,
      horizon,
      verification: verificationOptions,
    });
  }

  return buildFailedExecution(resolution.actionType, {
    stage: "execute",
    message: "missing_market_kind",
    retryable: false,
  });
}

async function executeFixedPriceBet(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  asset: string;
  horizon: string;
  verification: Required<MinimalVerificationOptions>;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution, asset, horizon, verification } = args;
  const marketKind = "fixed_price";
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
    const failedVerification: MinimalMarketWriteVerification = {
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
      verification: failedVerification,
    });
  }

  const readback = await verifyFixedPriceBetReadback({
    omni,
    asset,
    horizon,
    txHash: betResult.data.txHash,
    beforePool,
    verification,
  });
  const registrationError = betResult.data.registered
    ? undefined
    : betResult.data.registrationError;
  const readbackError = readback.indexedVisible ? undefined : "bet_readback_unconfirmed";
  const writeVerification: MinimalMarketWriteVerification = {
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
      verification: writeVerification,
      verificationPath: writeVerification.verificationPath,
      visible: writeVerification.visible,
      indexedVisible: writeVerification.indexedVisible,
    });
  }

  return {
    status: "executed",
    actionType: resolution.actionType,
    txHash: betResult.data.txHash,
    demSpendEstimate: betResult.data.amount,
    verification: writeVerification,
    verificationPath: writeVerification.verificationPath,
    visible: writeVerification.visible,
    indexedVisible: writeVerification.indexedVisible,
  };
}

async function executeHigherLowerBet(args: {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  asset: string;
  horizon: string;
  verification: Required<MinimalVerificationOptions>;
}): Promise<ResolvedIntentExecutionResult> {
  const { omni, resolution, asset, horizon, verification } = args;
  const marketKind = "higher_lower";
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
    const failedVerification: MinimalMarketWriteVerification = {
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
      verification: failedVerification,
    });
  }

  const readback = await verifyHigherLowerBetReadback({
    omni,
    asset,
    horizon,
    direction,
    amount: betResult.data.amount,
    beforePool,
    verification,
  });
  const registrationError = betResult.data.registered
    ? undefined
    : betResult.data.registrationError;
  const readbackError = readback.indexedVisible ? undefined : "higher_lower_readback_unconfirmed";
  const writeVerification: MinimalMarketWriteVerification = {
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
      verification: writeVerification,
      verificationPath: writeVerification.verificationPath,
      visible: writeVerification.visible,
      indexedVisible: writeVerification.indexedVisible,
    });
  }

  return {
    status: "executed",
    actionType: resolution.actionType,
    txHash: betResult.data.txHash,
    demSpendEstimate: betResult.data.amount,
    verification: writeVerification,
    verificationPath: writeVerification.verificationPath,
    visible: writeVerification.visible,
    indexedVisible: writeVerification.indexedVisible,
  };
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
