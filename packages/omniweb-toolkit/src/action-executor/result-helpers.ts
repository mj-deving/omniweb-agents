import type { MinimalActionType } from "../intent-types.js";
import type {
  MinimalErrorStage,
  MinimalExecutionOutcome,
} from "../minimal-agent.js";
import type { ToolkitGuardrailEvaluationReport } from "../guardrails.js";
import type { ToolkitActionAdmissibilityReport } from "../action-admissibility.js";
import type { ResolvedIntentExecutionResult } from "./types.js";

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
    guardrailEvaluation: execution.guardrailEvaluation,
    admissibility: execution.admissibility,
    error: execution.error,
  };
}

export function withRuntimeGateReports(
  execution: ResolvedIntentExecutionResult,
  guardrailEvaluation: ToolkitGuardrailEvaluationReport,
  admissibility: ToolkitActionAdmissibilityReport,
): ResolvedIntentExecutionResult {
  return {
    ...execution,
    guardrailEvaluation,
    admissibility,
  };
}

export function buildFailedExecution(
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
