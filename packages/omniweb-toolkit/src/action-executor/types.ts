import type { PublishResult, ToolResult } from "../../../../src/toolkit/types.js";
import type { OmniWeb } from "../colony.js";
import type {
  IntentExecutionResult,
  IntentResultEnvelope,
  ResolvedIntent,
} from "../intent-types.js";
import type { ToolkitGuardrailEvaluationReport } from "../guardrails.js";
import type { ToolkitActionAdmissibilityReport } from "../action-admissibility.js";
import type { MinimalAttestationPlan } from "../minimal-attestation-plan.js";
import type {
  MinimalErrorStage,
  MinimalMarketWriteVerification,
  MinimalReactionVerification,
  MinimalTipVerification,
  MinimalVerificationOptions,
} from "../minimal-agent.js";
import type { PublishVisibilityResult } from "../publish-visibility.js";

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
  guardrailEvaluation?: ToolkitGuardrailEvaluationReport;
  admissibility?: ToolkitActionAdmissibilityReport;
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
