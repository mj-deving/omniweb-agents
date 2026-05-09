import type { MinimalAgentState, MinimalObserveContext } from "../minimal-agent.js";
import type { PolicyDefinition } from "./types.js";

export async function runPolicyObserve<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
  TRoute extends string,
>(
  policy: PolicyDefinition<TState, TObserved, TDerived, TCondition, TRoute>,
  ctx: MinimalObserveContext<TState>,
): Promise<TObserved> {
  return policy.observe(ctx);
}
