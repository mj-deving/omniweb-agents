import {
  normalizeDecisionToActionIntent,
  normalizeDecisionToPolicyActionRequest,
  normalizeDecisionToResolvedIntent,
} from "../minimal-agent-resolver.js";
import type { ActionIntentDecision, MinimalAgentState, MinimalObserveResult } from "../minimal-agent.js";
import type { PolicyActionRequest, ResolvedIntent } from "../intent-types.js";
import type { ResolveActionRequestOptions } from "../minimal-agent-resolver.js";

export interface CompilePolicyDecisionOptions extends ResolveActionRequestOptions {}

export interface CompiledPolicyDecision<TState extends MinimalAgentState = MinimalAgentState> {
  request: PolicyActionRequest;
  actionDecision: ActionIntentDecision<TState> | null;
  resolution: ResolvedIntent | null;
}

export function compilePolicyDecision<TState extends MinimalAgentState = MinimalAgentState>(
  decision: MinimalObserveResult<TState>,
  options: CompilePolicyDecisionOptions = {},
): CompiledPolicyDecision<TState> {
  return {
    request: normalizeDecisionToPolicyActionRequest(decision),
    actionDecision: normalizeDecisionToActionIntent(decision),
    resolution: normalizeDecisionToResolvedIntent(decision, options),
  };
}
