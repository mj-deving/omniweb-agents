/**
 * Budget Plugin — autonomous treasury management for omniweb agents.
 *
 * Hooks into the session loop to check budgets before actions
 * and record expenses after. State managed by budget-tracker.
 */

import type { FrameworkPlugin, HookFn } from "../types.js";

export interface BudgetPluginConfig {
  agentName: string;
  /** Initial DEM balance (from chain query at startup) */
  initialBalance: number;
}

/**
 * Create the Budget Plugin.
 *
 * The budget-tracker instance is injected into session context
 * so other plugins and the action executor can check budgets.
 */
export function createBudgetPlugin(config: BudgetPluginConfig): FrameworkPlugin {
  return {
    name: "budget",
    version: "1.0.0",
    description: `Autonomous treasury management for ${config.agentName}`,

    hooks: {
      /**
       * beforeAct: Inject budget tracker into session context.
       * The action executor reads context.budgetTracker to check canAfford().
       */
      beforeAct: (async (context: Record<string, unknown>) => {
        // Budget tracker is created by the runner and injected into context
        // This hook ensures it's available for the ACT phase
        if (!context.budgetTracker) {
          // Runner didn't inject — create a basic one
          const { createBudgetTracker } = await import("../../tools/lib/budget-tracker.js");
          context.budgetTracker = createBudgetTracker(config.initialBalance);
        }
      }) as HookFn,

      /**
       * afterAct: Persist budget summary to context for Storage Plugin to write.
       */
      afterAct: (async (context: Record<string, unknown>) => {
        const tracker = context.budgetTracker as any;
        if (tracker?.getSummary) {
          context.budgetSummary = tracker.getSummary();
        }
      }) as HookFn,
    },

    providers: [],
    evaluators: [],
    actions: [],
  };
}
