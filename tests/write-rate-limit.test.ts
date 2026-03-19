import { describe, it, expect } from "vitest";
import { canPublish, recordPublish, type WriteRateLedger } from "../src/lib/write-rate-limit.js";

function freshLedger(address = "0xtest"): WriteRateLedger {
  return {
    address,
    dailyWindowStart: new Date().toISOString().slice(0, 10),
    hourlyWindowStart: new Date().toISOString(),
    dailyCount: 0,
    hourlyCount: 0,
    entries: [],
  };
}

describe("canPublish", () => {
  it("allows publish on fresh ledger", () => {
    const result = canPublish(freshLedger());
    expect(result.allowed).toBe(true);
    expect(result.dailyRemaining).toBeGreaterThan(0);
    expect(result.hourlyRemaining).toBeGreaterThan(0);
  });

  it("rejects when daily limit reached", () => {
    const ledger = freshLedger();
    ledger.dailyCount = 14;
    const result = canPublish(ledger);
    expect(result.allowed).toBe(false);
    expect(result.reason.toLowerCase()).toContain("daily");
  });

  it("rejects when hourly limit reached", () => {
    const ledger = freshLedger();
    ledger.hourlyCount = 4;
    const result = canPublish(ledger);
    expect(result.allowed).toBe(false);
    expect(result.reason.toLowerCase()).toContain("hourly");
  });

  it("resets daily counter on new day", () => {
    const ledger = freshLedger();
    ledger.dailyCount = 14;
    ledger.dailyWindowStart = "2020-01-01"; // old date
    const result = canPublish(ledger);
    expect(result.allowed).toBe(true);
  });
});

describe("recordPublish", () => {
  it("increments counters", () => {
    let ledger = freshLedger();
    ledger = recordPublish(ledger, "sentinel", "tx123");
    expect(ledger.dailyCount).toBe(1);
    expect(ledger.hourlyCount).toBe(1);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].agent).toBe("sentinel");
    expect(ledger.entries[0].txHash).toBe("tx123");
  });
});
