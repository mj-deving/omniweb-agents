import { executeResolvedIntent, isPlaceholderAttestUrl, toMinimalExecutionOutcome, validateResolvedIntentAttestation } from "./action-executor.js";
import type { OmniWeb } from "./colony.js";
import type { ResolvedIntent } from "./intent-types.js";
import type {
  ActionIntentDecision,
  MinimalAgentState,
  MinimalExecutionOutcome,
  MinimalObserveResult,
  MinimalVerificationOptions,
} from "./minimal-agent.js";
import { normalizeDecisionToResolvedIntent } from "./minimal-agent-resolver.js";
import { buildInjectedRuntimeCapabilities } from "./injected-runtime-capabilities.js";

export interface ExecuteMinimalActionOptions<TState extends MinimalAgentState = MinimalAgentState> {
  omni: OmniWeb;
  decision: MinimalObserveResult<TState>;
  actionDecision: ActionIntentDecision<TState>;
  verification: Required<MinimalVerificationOptions>;
  resolution?: ResolvedIntent | null;
  dryRun?: boolean;
}

export async function executeMinimalAction<TState extends MinimalAgentState = MinimalAgentState>(
  options: ExecuteMinimalActionOptions<TState>,
): Promise<MinimalExecutionOutcome> {
  const { omni, decision, actionDecision, verification, dryRun = false } = options;
  const resolution = options.resolution ?? normalizeDecisionToResolvedIntent(actionDecision, {
    runtimeCapabilities: buildInjectedRuntimeCapabilities(),
  });

  if (!resolution) {
    return {
      status: "failed",
      demSpendEstimate: 0,
      error: {
        stage: "execute",
        message: "missing_action_intent",
        retryable: false,
      },
    };
  }

  const envelope = await executeResolvedIntent({
    omni,
    resolution,
    verification,
    dryRun,
    attestationPlan: actionDecision.attestationPlan ?? decision.attestationPlan,
  });

  return toMinimalExecutionOutcome(envelope.execution);
}

export function readApiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" ? record.message : null;
}

export function validateAttestationDecision<TState extends MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
): string | null {
  const resolution = normalizeDecisionToResolvedIntent(decision, {
    runtimeCapabilities: buildInjectedRuntimeCapabilities(),
  });
  if (!resolution) return null;
  return validateResolvedIntentAttestation(resolution, decision.attestationPlan);
}

export { isPlaceholderAttestUrl };
