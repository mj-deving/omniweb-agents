import type { ReactionType } from "../../../src/toolkit/types.js";
import type { MinimalReactionVerification, MinimalTipVerification, MinimalVerificationResult } from "./minimal-agent.js";

export function normalizeReactionEnvelope(value: unknown): MinimalReactionVerification["before"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const toCount = (key: string) => (typeof record[key] === "number" ? Number(record[key]) : 0);
  const myReaction = typeof record.myReaction === "string" ? record.myReaction : null;
  return {
    agree: toCount("agree"),
    disagree: toCount("disagree"),
    flag: toCount("flag"),
    myReaction,
  };
}

export function getObservedScore(verification?: MinimalVerificationResult): number | undefined {
  if (!verification || !("observedScore" in verification)) return undefined;
  return typeof verification.observedScore === "number" ? verification.observedScore : undefined;
}

export function reactionReadbackSatisfied(
  before: MinimalReactionVerification["before"],
  after: MinimalReactionVerification["after"],
  reactionType: Exclude<ReactionType, null>,
): boolean {
  if (!after) return false;
  if (after.myReaction === reactionType) return true;
  const beforeCount = before?.[reactionType] ?? 0;
  const afterCount = after[reactionType] ?? 0;
  return afterCount > beforeCount;
}

export function normalizeTipReadback(value: unknown): MinimalTipVerification["beforeTipStats"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    totalTips: readNumber(record.totalTips) ?? 0,
    totalDem: readNumber(record.totalDem) ?? 0,
    myTip: record.myTip,
  };
}

export function normalizeAgentTipReadback(value: unknown): MinimalTipVerification["beforeRecipientTipStats"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const tipsReceived = readRecord(record.tipsReceived);
  const tipsGiven = readRecord(record.tipsGiven);

  return {
    receivedCount: readNumber(tipsReceived?.count) ?? 0,
    receivedDem: readNumber(tipsReceived?.totalDem) ?? 0,
    givenCount: readNumber(tipsGiven?.count) ?? 0,
    givenDem: readNumber(tipsGiven?.totalDem) ?? 0,
  };
}

export function normalizeBalance(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeBalance(record.balance);
  }
  return null;
}

export function normalizeTipAmount(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

export function tipReadbackSatisfied(
  before: MinimalTipVerification["beforeTipStats"],
  after: MinimalTipVerification["afterTipStats"],
  minimumSpend: number,
): boolean {
  const beforeMyTip = readNumber(before?.myTip);
  const afterMyTip = readNumber(after?.myTip);

  if (afterMyTip != null) {
    if (beforeMyTip == null) {
      if (afterMyTip > 0) return true;
    } else if (afterMyTip > beforeMyTip) {
      return true;
    }
  } else if (hasRecordedTip(after?.myTip) && !hasRecordedTip(before?.myTip)) {
    return true;
  }

  if ((after?.totalTips ?? 0) > (before?.totalTips ?? 0)) return true;
  if ((after?.totalDem ?? 0) >= (before?.totalDem ?? 0) + minimumSpend) return true;

  return false;
}

export function agentTipReadbackSatisfied(
  before: MinimalTipVerification["beforeRecipientTipStats"],
  after: MinimalTipVerification["afterRecipientTipStats"],
  minimumSpend: number,
): boolean {
  if (!before || !after) return false;
  if ((after.receivedCount ?? 0) > (before.receivedCount ?? 0)) return true;
  if ((after.receivedDem ?? 0) >= (before.receivedDem ?? 0) + minimumSpend) return true;
  return false;
}

export function tipSpendObserved(
  beforeBalance: number | null,
  afterBalance: number | null,
  minimumSpend: number,
): boolean {
  if (beforeBalance == null || afterBalance == null) return false;
  return beforeBalance - afterBalance >= minimumSpend;
}

function hasRecordedTip(value: unknown): boolean {
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0;
  }
  return value != null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string"
      ? Number.isFinite(Number(value))
        ? Number(value)
        : null
      : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
