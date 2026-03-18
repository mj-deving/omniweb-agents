/**
 * Budget Tracker — autonomous treasury management for omniweb agents.
 *
 * Tracks DEM income and expenses by category. Provides canAfford()
 * checks before operations and recordSpend()/recordIncome() for bookkeeping.
 *
 * State is in-memory per session. Persistent state lives on-chain
 * via StoragePlugin (agents persist budget snapshots to Storage Programs).
 */

// ── Types ───────────────────────────────────────────

export type BudgetCategory = "gas" | "attestation" | "tipping" | "storage" | "operations" | "unallocated";

export interface BudgetAllocation {
  /** Percentage of total balance allocated to this category (0-100) */
  percentage: number;
  /** Absolute DEM cap (overrides percentage if set) */
  cap?: number;
}

export interface BudgetEntry {
  timestamp: string;
  category: BudgetCategory;
  amount: number;
  type: "spend" | "income";
  description: string;
}

export interface BudgetState {
  /** Total DEM balance (set from chain query) */
  totalBalance: number;
  /** Per-category allocation config */
  allocations: Record<BudgetCategory, BudgetAllocation>;
  /** Per-category spent this session */
  sessionSpend: Record<BudgetCategory, number>;
  /** Per-category earned this session */
  sessionIncome: Record<BudgetCategory, number>;
  /** Ledger of all entries this session */
  entries: BudgetEntry[];
}

// ── Default Allocations ─────────────────────────────

const DEFAULT_ALLOCATIONS: Record<BudgetCategory, BudgetAllocation> = {
  gas: { percentage: 10 },
  attestation: { percentage: 20 },
  tipping: { percentage: 15 },
  storage: { percentage: 5 },
  operations: { percentage: 20 },
  unallocated: { percentage: 30 },
};

// ── Factory ─────────────────────────────────────────

/**
 * Create a budget tracker for an agent session.
 *
 * @param totalBalance — current DEM balance (from chain query)
 * @param allocations — optional override for budget allocations
 */
export function createBudgetTracker(
  totalBalance: number,
  allocations: Partial<Record<BudgetCategory, BudgetAllocation>> = {},
) {
  const state: BudgetState = {
    totalBalance,
    allocations: { ...DEFAULT_ALLOCATIONS, ...allocations },
    sessionSpend: { gas: 0, attestation: 0, tipping: 0, storage: 0, operations: 0, unallocated: 0 },
    sessionIncome: { gas: 0, attestation: 0, tipping: 0, storage: 0, operations: 0, unallocated: 0 },
    entries: [],
  };

  /** Get the DEM budget for a category. */
  function getBudget(category: BudgetCategory): number {
    const alloc = state.allocations[category];
    const percentBudget = (state.totalBalance * alloc.percentage) / 100;
    return alloc.cap !== undefined ? Math.min(percentBudget, alloc.cap) : percentBudget;
  }

  /** Get remaining budget for a category (budget - spent). */
  function getRemaining(category: BudgetCategory): number {
    return Math.max(0, getBudget(category) - state.sessionSpend[category]);
  }

  /** Check if an amount is affordable within a category's budget. */
  function canAfford(category: BudgetCategory, amount: number): boolean {
    return getRemaining(category) >= amount;
  }

  /** Record a spend. Returns false if over budget (still records). */
  function recordSpend(category: BudgetCategory, amount: number, description: string): boolean {
    const affordable = canAfford(category, amount);
    state.sessionSpend[category] += amount;
    state.entries.push({
      timestamp: new Date().toISOString(),
      category,
      amount,
      type: "spend",
      description,
    });
    return affordable;
  }

  /** Record income (tips received, rewards, etc.). */
  function recordIncome(category: BudgetCategory, amount: number, description: string): void {
    state.sessionIncome[category] += amount;
    state.totalBalance += amount;
    state.entries.push({
      timestamp: new Date().toISOString(),
      category,
      amount,
      type: "income",
      description,
    });
  }

  /** Update total balance (e.g., after chain query). */
  function setBalance(newBalance: number): void {
    state.totalBalance = newBalance;
  }

  /** Get a snapshot of the current budget state. */
  function getSnapshot(): BudgetState {
    return { ...state };
  }

  /** Get a summary suitable for on-chain storage. */
  function getSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      totalBalance: state.totalBalance,
      sessionSpendTotal: Object.values(state.sessionSpend).reduce((a, b) => a + b, 0),
      sessionIncomeTotal: Object.values(state.sessionIncome).reduce((a, b) => a + b, 0),
      entries: state.entries.length,
    };
    for (const cat of Object.keys(state.allocations) as BudgetCategory[]) {
      summary[`${cat}_remaining`] = getRemaining(cat);
    }
    return summary;
  }

  return {
    getBudget,
    getRemaining,
    canAfford,
    recordSpend,
    recordIncome,
    setBalance,
    getSnapshot,
    getSummary,
  };
}

export type BudgetTracker = ReturnType<typeof createBudgetTracker>;
