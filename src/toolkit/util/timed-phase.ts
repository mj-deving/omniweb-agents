/**
 * Budget-aware async operation wrapper.
 *
 * Times an async operation against a declared budget. Reports overages
 * via an optional observe callback but never aborts — this is
 * observational instrumentation, not enforcement.
 *
 * Toolkit-layer primitive — no imports from cli/ or src/lib/.
 */

export interface TimedResult<T> {
  result: T;
  elapsedMs: number;
  budgetMs: number;
  overBudget: boolean;
  /** 0 if within budget, e.g. 50 means 50% over. */
  overagePercent: number;
}

export async function withBudget<T>(
  budgetMs: number,
  label: string,
  fn: () => Promise<T>,
  observe?: (type: string, msg: string, meta?: Record<string, unknown>) => void,
): Promise<TimedResult<T>> {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = Math.round(performance.now() - start);

  const overBudget = elapsedMs > budgetMs;
  const overagePercent = overBudget
    ? Math.round(((elapsedMs - budgetMs) / budgetMs) * 100)
    : 0;

  if (overBudget && observe) {
    observe("inefficiency", `${label} exceeded budget (${elapsedMs}ms / ${budgetMs}ms)`, {
      phase: label,
      durationMs: elapsedMs,
      budgetMs,
      overagePercent,
    });
  }

  return { result, elapsedMs, budgetMs, overBudget, overagePercent };
}
