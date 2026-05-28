import type { OmniWeb } from "../colony.js";
import type { ResolvedIntent } from "../intent-types.js";
import type { MinimalReactionVerification } from "../minimal-agent.js";
import {
  normalizeReactionEnvelope,
  reactionReadbackSatisfied,
} from "../minimal-agent-verifier.js";
import { readApiErrorMessage } from "./readback-helpers.js";
import { buildFailedExecution } from "./result-helpers.js";
import type { ResolvedIntentExecutionResult } from "./types.js";

export async function executeReactionIntent(args: {
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
