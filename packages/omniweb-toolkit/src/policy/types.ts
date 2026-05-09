import type {
  MinimalAgentState,
  MinimalObserveContext,
  MinimalObserveResult,
} from "../minimal-agent.js";

export interface PolicyDeriveInput<
  TState extends MinimalAgentState,
  TObserved,
> {
  ctx: MinimalObserveContext<TState>;
  observed: TObserved;
}

export interface PolicyConditionInput<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
> {
  ctx: MinimalObserveContext<TState>;
  observed: TObserved;
  derived: TDerived;
}

export type PolicyConditionEvaluator<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
> = (input: PolicyConditionInput<TState, TObserved, TDerived>) => boolean;

export type PolicyConditionDefinitions<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
> = Record<TCondition, PolicyConditionEvaluator<TState, TObserved, TDerived>>;

export interface PolicyRouteInput<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
> extends PolicyConditionInput<TState, TObserved, TDerived> {
  conditionResults: Record<TCondition, boolean>;
  matchedConditions: TCondition[];
}

export interface PolicyRouteDefinition<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
  TRoute extends string,
> {
  id: TRoute;
  when(input: PolicyRouteInput<TState, TObserved, TDerived, TCondition>): boolean;
  buildDecision(input: PolicyRouteInput<TState, TObserved, TDerived, TCondition>): MinimalObserveResult<TState>;
}

export interface PolicyDefinition<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
  TRoute extends string,
> {
  policyId: string;
  observe(ctx: MinimalObserveContext<TState>): Promise<TObserved>;
  derive(input: PolicyDeriveInput<TState, TObserved>): TDerived | Promise<TDerived>;
  conditions?: PolicyConditionDefinitions<TState, TObserved, TDerived, TCondition>;
  routes: PolicyRouteDefinition<TState, TObserved, TDerived, TCondition, TRoute>[];
  fallbackRoute?: PolicyRouteDefinition<TState, TObserved, TDerived, TCondition, TRoute>;
}

export interface PolicyConditionEvaluation<TCondition extends string> {
  results: Record<TCondition, boolean>;
  matchedConditions: TCondition[];
}

export interface PolicyRunResult<
  TState extends MinimalAgentState,
  TObserved,
  TDerived,
  TCondition extends string,
  TRoute extends string,
> extends PolicyRouteInput<TState, TObserved, TDerived, TCondition> {
  route: PolicyRouteDefinition<TState, TObserved, TDerived, TCondition, TRoute>;
  routeId: TRoute;
  decision: MinimalObserveResult<TState>;
}
