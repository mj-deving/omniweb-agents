import { runDirectAttestedWrite } from "./direct-attested-write.js";
import type { OmniWeb } from "./colony.js";
import { getPrimaryAttestUrl } from "./minimal-attestation-plan.js";
import { verifyPublishVisibility } from "./publish-visibility.js";
import { normalizeReactionEnvelope, reactionReadbackSatisfied } from "./minimal-agent-verifier.js";
import type {
  ActionIntentDecision,
  MinimalAgentState,
  MinimalExecutionOutcome,
  MinimalObserveResult,
  MinimalReactionVerification,
  MinimalVerificationOptions,
} from "./minimal-agent.js";

export interface ExecuteMinimalActionOptions<TState extends MinimalAgentState = MinimalAgentState> {
  omni: OmniWeb;
  decision: MinimalObserveResult<TState>;
  actionDecision: ActionIntentDecision<TState>;
  verification: Required<MinimalVerificationOptions>;
}

export async function executeMinimalAction<TState extends MinimalAgentState = MinimalAgentState>(
  options: ExecuteMinimalActionOptions<TState>,
): Promise<MinimalExecutionOutcome> {
  const { omni, decision, actionDecision, verification } = options;
  const attestationGuardError = validateAttestationDecision(decision);
  if (attestationGuardError) {
    return {
      status: "failed",
      demSpendEstimate: 0,
      error: {
        stage: "execute",
        message: attestationGuardError,
        retryable: false,
      },
    };
  }

  if (decision.kind === "react" || actionDecision.action.type === "react") {
    return executeReactionAction({ omni, decision, actionDecision });
  }

  if (actionDecision.action.type !== "publish" && actionDecision.action.type !== "reply") {
    return {
      status: "failed",
      demSpendEstimate: 0,
      error: {
        stage: "execute",
        message: `unsupported_action_type:${actionDecision.action.type}`,
        retryable: false,
      },
    };
  }

  const directWrite = await runDirectAttestedWrite({
    omni,
    kind: actionDecision.action.type,
    draft: actionDecision.action.type === "publish"
      ? {
          text: actionDecision.action.text ?? "",
          category: actionDecision.action.category,
          attestUrl: actionDecision.action.attestUrl ?? "",
          tags: actionDecision.action.tags,
          confidence: actionDecision.action.confidence,
        }
      : {
          parentTxHash: actionDecision.action.parentTxHash,
          text: actionDecision.action.text ?? "",
          attestUrl: actionDecision.action.attestUrl ?? "",
          category: actionDecision.action.category,
        },
    verifyPublishVisibility,
    verification,
  });

  const publishResult = directWrite.result;
  if (!directWrite.accepted || !publishResult?.ok) {
    return {
      status: "failed",
      publishResult,
      demSpendEstimate: 0,
      error: {
        stage: "execute",
        message: publishResult?.error?.message ?? directWrite.error?.message ?? "publish_failed",
        code: publishResult?.error?.code ?? directWrite.error?.code,
        retryable: publishResult?.error?.retryable ?? directWrite.error?.retryable,
      },
    };
  }

  return {
    status: actionDecision.action.type === "publish" ? "published" : "replied",
    txHash: directWrite.txHash,
    attestationTxHash: directWrite.attestationTxHash,
    attestationResponseHash: directWrite.attestationResponseHash,
    demSpendEstimate: 1,
    publishResult,
    verification: directWrite.visibility,
  };
}

async function executeReactionAction<TState extends MinimalAgentState = MinimalAgentState>(args: {
  omni: OmniWeb;
  decision: MinimalObserveResult<TState>;
  actionDecision: ActionIntentDecision<TState>;
}): Promise<MinimalExecutionOutcome> {
  const { omni, decision, actionDecision } = args;
  const targetTxHash = decision.kind === "react"
    ? decision.targetTxHash
    : actionDecision.action.targetTxHash;
  const reactionType = decision.kind === "react"
    ? decision.reaction
    : actionDecision.action.reaction ?? "agree";

  if (!targetTxHash) {
    return {
      status: "failed",
      demSpendEstimate: 0,
      error: {
        stage: "execute",
        message: "missing_reaction_target",
        retryable: false,
      },
    };
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
    return {
      status: "failed",
      demSpendEstimate: 0,
      reactionResult: { ok: false, error: reactionResult?.error },
      verification,
      error: {
        stage: "execute",
        message: readApiErrorMessage(reactionResult?.error) ?? "reaction_failed",
        retryable: true,
      },
    };
  }

  return {
    status: "reacted",
    demSpendEstimate: 0,
    reactionResult: { ok: true },
    verification,
  };
}

export function readApiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" ? record.message : null;
}

export function validateAttestationDecision<TState extends MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): string | null {
  const plan = decision.attestationPlan;
  if (plan && !plan.ready) {
    return `attestation_plan_not_ready:${plan.reason}`;
  }

  if (decision.kind === "publish" || decision.kind === "reply") {
    if (isPlaceholderAttestUrl(decision.attestUrl)) {
      return `placeholder_attest_url:${decision.attestUrl}`;
    }
    const plannedUrl = getPrimaryAttestUrl(plan);
    if (plannedUrl && plannedUrl !== decision.attestUrl) {
      return `attest_url_mismatch:${decision.attestUrl}`;
    }
    return null;
  }

  if (decision.kind === "action") {
    const attestUrl = decision.action.attestUrl;
    if (typeof attestUrl === "string" && attestUrl.length > 0) {
      if (isPlaceholderAttestUrl(attestUrl)) {
        return `placeholder_attest_url:${attestUrl}`;
      }
      const plannedUrl = getPrimaryAttestUrl(plan);
      if (plannedUrl && plannedUrl !== attestUrl) {
        return `attest_url_mismatch:${attestUrl}`;
      }
    }
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
