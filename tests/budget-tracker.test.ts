/**
 * Tests for budget-tracker — autonomous treasury management.
 */

import { describe, it, expect } from "vitest";
import { createBudgetTracker } from "../src/lib/budget-tracker.js";

describe("BudgetTracker", () => {
  it("creates with correct total balance", () => {
    const bt = createBudgetTracker(1000);
    const snap = bt.getSnapshot();
    expect(snap.totalBalance).toBe(1000);
  });

  it("getBudget returns percentage of total", () => {
    const bt = createBudgetTracker(1000);
    // Default attestation = 20%
    expect(bt.getBudget("attestation")).toBe(200);
    // Default gas = 10%
    expect(bt.getBudget("gas")).toBe(100);
  });

  it("getRemaining starts at full budget", () => {
    const bt = createBudgetTracker(1000);
    expect(bt.getRemaining("attestation")).toBe(200);
  });

  it("canAfford returns true when within budget", () => {
    const bt = createBudgetTracker(1000);
    expect(bt.canAfford("attestation", 50)).toBe(true);
  });

  it("canAfford returns false when over budget", () => {
    const bt = createBudgetTracker(1000);
    expect(bt.canAfford("attestation", 250)).toBe(false);
  });

  it("recordSpend reduces remaining", () => {
    const bt = createBudgetTracker(1000);
    bt.recordSpend("attestation", 50, "DAHR attest");
    expect(bt.getRemaining("attestation")).toBe(150);
  });

  it("recordSpend returns false when over budget", () => {
    const bt = createBudgetTracker(100);
    // attestation = 20% of 100 = 20 DEM
    const ok = bt.recordSpend("attestation", 25, "over budget attest");
    expect(ok).toBe(false);
  });

  it("recordSpend returns true when within budget", () => {
    const bt = createBudgetTracker(1000);
    const ok = bt.recordSpend("attestation", 10, "DAHR attest");
    expect(ok).toBe(true);
  });

  it("recordIncome increases totalBalance", () => {
    const bt = createBudgetTracker(100);
    bt.recordIncome("tipping", 50, "tip received");
    expect(bt.getSnapshot().totalBalance).toBe(150);
  });

  it("setBalance updates total", () => {
    const bt = createBudgetTracker(100);
    bt.setBalance(500);
    expect(bt.getSnapshot().totalBalance).toBe(500);
    // Budget recalculates: attestation = 20% of 500 = 100
    expect(bt.getBudget("attestation")).toBe(100);
  });

  it("getSummary returns useful overview", () => {
    const bt = createBudgetTracker(1000);
    bt.recordSpend("gas", 5, "tx fee");
    bt.recordSpend("attestation", 1, "DAHR");
    bt.recordIncome("tipping", 10, "tip in");

    const summary = bt.getSummary();
    expect(summary.totalBalance).toBe(1010); // 1000 + 10 income
    expect(summary.sessionSpendTotal).toBe(6);
    expect(summary.sessionIncomeTotal).toBe(10);
    expect(summary.entries).toBe(3);
    expect(summary.gas_remaining).toBeDefined();
  });

  it("custom allocations override defaults", () => {
    const bt = createBudgetTracker(1000, {
      attestation: { percentage: 50 },
    });
    expect(bt.getBudget("attestation")).toBe(500);
    // Other categories keep defaults
    expect(bt.getBudget("gas")).toBe(100);
  });

  it("cap overrides percentage when lower", () => {
    const bt = createBudgetTracker(10000, {
      operations: { percentage: 20, cap: 100 },
    });
    // 20% of 10000 = 2000, but cap is 100
    expect(bt.getBudget("operations")).toBe(100);
  });

  it("entries track full history", () => {
    const bt = createBudgetTracker(100);
    bt.recordSpend("gas", 1, "fee1");
    bt.recordSpend("gas", 2, "fee2");
    bt.recordIncome("tipping", 5, "tip");
    const snap = bt.getSnapshot();
    expect(snap.entries).toHaveLength(3);
    expect(snap.entries[0].type).toBe("spend");
    expect(snap.entries[2].type).toBe("income");
  });
});
