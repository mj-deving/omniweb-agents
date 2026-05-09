import type { MinimalAgentState } from "../minimal-agent.js";
import type { PolicyRouteDefinition, PolicyRouteInput } from "./types.js";

export function selectPolicyRoute<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
  TRoute extends string,
>(
  routes: PolicyRouteDefinition<TState, TObserved, TDerived, TCondition, TRoute>[],
  input: PolicyRouteInput<TState, TObserved, TDerived, TCondition>,
): PolicyRouteDefinition<TState, TObserved, TDerived, TCondition, TRoute> | null {
  for (const route of routes) {
    if (route.when(input)) {
      return route;
    }
  }

  return null;
}
