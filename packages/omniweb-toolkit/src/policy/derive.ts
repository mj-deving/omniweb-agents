import type { MinimalAgentState, MinimalObserveContext } from "../minimal-agent.js";
import type { PolicyDefinition } from "./types.js";

export async function runPolicyDerive<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
  TRoute extends string,
>(
  policy: PolicyDefinition<TState, TObserved, TDerived, TCondition, TRoute>,
  observed: TObserved,
  ctx: MinimalObserveContext<TState>,
): Promise<TDerived> {
  return policy.derive({ observed, ctx });
}
