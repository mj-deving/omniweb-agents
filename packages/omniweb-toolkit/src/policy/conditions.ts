import type { MinimalAgentState } from "../minimal-agent.js";
import type {
  PolicyConditionDefinitions,
  PolicyConditionEvaluation,
  PolicyConditionInput,
} from "./types.js";

export function evaluatePolicyConditions<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
>(
  conditions: PolicyConditionDefinitions<TState, TObserved, TDerived, TCondition> | undefined,
  input: PolicyConditionInput<TState, TObserved, TDerived>,
): PolicyConditionEvaluation<TCondition> {
  const entries = Object.entries(conditions ?? {}) as Array<[
    TCondition,
    (input: PolicyConditionInput<TState, TObserved, TDerived>) => boolean,
  ]>;
  const results = {} as Record<TCondition, boolean>;
  const matchedConditions: TCondition[] = [];

  for (const [conditionId, evaluate] of entries) {
    const matched = evaluate(input);
    results[conditionId] = matched;
    if (matched) {
      matchedConditions.push(conditionId);
    }
  }

  return { results, matchedConditions };
}
