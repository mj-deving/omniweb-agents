import type { ReactionType } from "../../../src/toolkit/types.js";
import type { MinimalReactionVerification, MinimalVerificationResult } from "./minimal-agent.js";

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
