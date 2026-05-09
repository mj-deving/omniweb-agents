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
  MinimalErrorStage,
  MinimalExecutionOutcome,
  MinimalReactionVerification,
  MinimalVerificationOptions,
} from "./minimal-agent.js";
import { normalizeReactionEnvelope, reactionReadbackSatisfied } from "./minimal-agent-verifier.js";
import { verifyPublishVisibility, type PublishVisibilityResult } from "./publish-visibility.js";

export interface ExecuteResolvedIntentOptions {
  omni: OmniWeb;
  resolution: ResolvedIntent;
  verification: Required<MinimalVerificationOptions>;
  dryRun?: boolean;
  attestationPlan?: MinimalAttestationPlan;
}

export interface ResolvedIntentExecutionResult extends IntentExecutionResult {
  verification?: PublishVisibilityResult | MinimalReactionVerification;
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

function readApiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" ? record.message : null;
}

function isVerificationResult(value: unknown): value is PublishVisibilityResult {
  return Boolean(value && typeof value === "object" && "visible" in value && "indexedVisible" in value);
}

function toMinimalCycleStatus(execution: ResolvedIntentExecutionResult): MinimalExecutionOutcome["status"] {
  if (execution.status === "executed") {
    if (execution.actionType === "publish") return "published";
    if (execution.actionType === "reply") return "replied";
    if (execution.actionType === "react") return "reacted";
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
