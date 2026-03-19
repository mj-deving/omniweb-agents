import { describe, it, expect } from "vitest";
import { canSpend, defaultSpendingPolicy, recordSpend, type SpendingLedger, type SpendingPolicyConfig } from "../src/lib/spending-policy.js";

function freshLedger(address = "0xtest"): SpendingLedger {
  return {
    address,
    date: new Date().toISOString().slice(0, 10),
    dailySpent: 0,
    sessionSpent: 0,
    transactions: [],
  };
}

describe("defaultSpendingPolicy", () => {
  it("defaults to dryRun true", () => {
    const policy = defaultSpendingPolicy();
    expect(policy.dryRun).toBe(true);
    expect(policy.requireConfirmation).toBe(true);
    expect(policy.dailyCapDem).toBe(10);
    expect(policy.sessionCapDem).toBe(5);
  });
});

describe("canSpend", () => {
  it("allows spend in dry-run mode", () => {
    const policy = defaultSpendingPolicy();
    const result = canSpend(1, "0xrecipient", policy, freshLedger());
    expect(result.allowed).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  it("rejects when daily cap exceeded", () => {
    const policy: SpendingPolicyConfig = { ...defaultSpendingPolicy(), dryRun: false };
    const ledger = freshLedger();
    ledger.dailySpent = 9;
    const result = canSpend(2, "0xrecipient", policy, ledger);
    expect(result.allowed).toBe(false);
    expect(result.reason.toLowerCase()).toContain("daily");
  });

  it("rejects when session cap exceeded", () => {
    const policy: SpendingPolicyConfig = { ...defaultSpendingPolicy(), dryRun: false };
    const ledger = freshLedger();
    ledger.sessionSpent = 4;
    const result = canSpend(2, "0xrecipient", policy, ledger);
    expect(result.allowed).toBe(false);
    expect(result.reason.toLowerCase()).toContain("session");
  });

  it("rejects amount below minimum", () => {
    const policy: SpendingPolicyConfig = { ...defaultSpendingPolicy(), dryRun: false };
    const result = canSpend(0.5, "0xrecipient", policy, freshLedger());
    expect(result.allowed).toBe(false);
  });

  it("rejects amount above maximum", () => {
    const policy: SpendingPolicyConfig = { ...defaultSpendingPolicy(), dryRun: false };
    const result = canSpend(11, "0xrecipient", policy, freshLedger());
    expect(result.allowed).toBe(false);
  });
});

describe("recordSpend", () => {
  it("updates totals and adds transaction", () => {
    const ledger = freshLedger();
    const updated = recordSpend(
      { timestamp: new Date().toISOString(), amount: 3, recipient: "0xr", postTxHash: "tx1", type: "tip", dryRun: false, agent: "sentinel" },
      ledger
    );
    expect(updated.dailySpent).toBe(3);
    expect(updated.sessionSpent).toBe(3);
    expect(updated.transactions).toHaveLength(1);
  });
});
