import type { ResolvedIntent } from "./intent-types.js";
import {
  evaluateToolkitGuardrails,
  type ToolkitGuardrailEvaluationReport,
} from "./guardrails.js";
import {
  evaluateToolkitActionAdmissibility,
  type ToolkitActionAdmissibilityReport,
} from "./action-admissibility.js";
import { validateResolvedIntentAttestation } from "./action-executor/attestation.js";
import { executeDirectAttestedWriteIntent } from "./action-executor/direct-attested-write.js";
import { executeMarketWriteIntent } from "./action-executor/market-write.js";
import { executeReactionIntent } from "./action-executor/reaction.js";
import { buildFailedExecution, withRuntimeGateReports } from "./action-executor/result-helpers.js";
import { executeTipIntent } from "./action-executor/tip.js";
import type {
  ExecuteResolvedIntentOptions,
  ResolvedIntentExecutionResult,
  ResolvedIntentResultEnvelope,
} from "./action-executor/types.js";

export type {
  ExecuteResolvedIntentOptions,
  ResolvedIntentExecutionResult,
  ResolvedIntentResultEnvelope,
} from "./action-executor/types.js";
export { isPlaceholderAttestUrl, validateResolvedIntentAttestation } from "./action-executor/attestation.js";
export { toMinimalExecutionOutcome } from "./action-executor/result-helpers.js";

export async function executeResolvedIntent(
  options: ExecuteResolvedIntentOptions,
): Promise<ResolvedIntentResultEnvelope> {
  const { omni, resolution, verification, dryRun = false, attestationPlan } = options;
  const executionMode = dryRun ? "dry-run" : "execute";
  const guardrailEvaluation = await evaluateToolkitGuardrails({
    mode: executionMode,
    explicitExecute: !dryRun,
    actionFamily: actionFamilyForResolvedIntent(resolution),
    resolution,
  });
  const admissibility = await evaluateToolkitActionAdmissibility({
    mode: executionMode,
    explicitExecute: !dryRun,
    actionFamily: actionFamilyForResolvedIntent(resolution),
    resolution,
    guardrailEvaluation,
  });

  if (resolution.status !== "executable") {
    return {
      resolution,
      execution: {
        status: "skipped",
        actionType: resolution.actionType,
        demSpendEstimate: 0,
        errorCode: resolution.reasonCodes[0] ?? `resolution_${resolution.status}`,
        errorMessage: `resolution_not_executable:${resolution.status}`,
        guardrailEvaluation,
        admissibility,
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
        guardrailEvaluation,
        admissibility,
      },
    };
  }

  const attestationGuardError = validateResolvedIntentAttestation(resolution, attestationPlan);
  if (admissibility.status !== "allowed") {
    const failureCode = admissibility.status === "blocked" && guardrailEvaluation.blockedReasonCodes.length > 0
      ? guardrailEvaluation.blockedReasonCodes[0]
      : admissibility.reasonCodes[0] ?? `admissibility_${admissibility.status}`;
    return {
      resolution,
      execution: buildFailedExecution(resolution.actionType, {
        stage: "execute",
        code: failureCode,
        message: `admissibility_${admissibility.status}:${admissibility.reasonCodes.join(",")}`,
        retryable: false,
      }, {
        guardrailEvaluation,
        admissibility,
      }),
    };
  }

  if (attestationGuardError) {
    return {
      resolution,
      execution: buildFailedExecution(resolution.actionType, {
        stage: "execute",
        message: attestationGuardError,
        retryable: false,
      }, {
        guardrailEvaluation,
        admissibility,
      }),
    };
  }

  if (resolution.executionPathFamily === "direct_attested_write") {
    return withExecutionGateReports(
      resolution,
      await executeDirectAttestedWriteIntent({ omni, resolution, verification }),
      guardrailEvaluation,
      admissibility,
    );
  }

  if (resolution.executionPathFamily === "reaction") {
    return withExecutionGateReports(
      resolution,
      await executeReactionIntent({ omni, resolution }),
      guardrailEvaluation,
      admissibility,
    );
  }

  if (resolution.executionPathFamily === "tip_transfer") {
    return withExecutionGateReports(
      resolution,
      await executeTipIntent({ omni, resolution, verification }),
      guardrailEvaluation,
      admissibility,
    );
  }

  if (resolution.executionPathFamily === "market_write") {
    return withExecutionGateReports(
      resolution,
      await executeMarketWriteIntent({ omni, resolution, verification }),
      guardrailEvaluation,
      admissibility,
    );
  }

  return {
    resolution,
    execution: buildFailedExecution(resolution.actionType, {
      stage: "execute",
      message: `unsupported_execution_path:${resolution.executionPathFamily}`,
      retryable: false,
    }, {
      guardrailEvaluation,
      admissibility,
    }),
  };
}

function actionFamilyForResolvedIntent(resolution: ResolvedIntent): string {
  if (resolution.actionType === "bet") {
    return resolution.normalizedDraft.marketKind === "higher_lower" ? "bet-hl" : "bet-fixed";
  }
  return resolution.actionType;
}

function withExecutionGateReports(
  resolution: ResolvedIntent,
  execution: ResolvedIntentExecutionResult,
  guardrailEvaluation: ToolkitGuardrailEvaluationReport,
  admissibility: ToolkitActionAdmissibilityReport,
): ResolvedIntentResultEnvelope {
  return {
    resolution,
    execution: withRuntimeGateReports(
      execution,
      guardrailEvaluation,
      admissibility,
    ),
  };
}
