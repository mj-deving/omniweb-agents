/**
 * Tests for BalanceSource event source.
 */

import { describe, it, expect, vi } from "vitest";
import { createBalanceSource, type BalanceSnapshot } from "../src/reactive/event-sources/balance-source.js";

describe("BalanceSource", () => {
  it("poll returns balance snapshot", async () => {
    const src = createBalanceSource(
      { lowBalanceThreshold: 100 },
      vi.fn().mockResolvedValue(500),
    );
    const snap = await src.poll();
    expect(snap.balance).toBe(500);
    expect(snap.timestamp).toBeGreaterThan(0);
  });

  it("returns empty on first poll (warm-up)", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 100 }, vi.fn());
    const curr: BalanceSnapshot = { timestamp: 1000, balance: 500 };
    expect(src.diff(null, curr)).toHaveLength(0);
  });

  it("emits low_balance when below threshold", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 100 }, vi.fn());
    const prev: BalanceSnapshot = { timestamp: 1000, balance: 200 };
    const curr: BalanceSnapshot = { timestamp: 2000, balance: 50 };

    const events = src.diff(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("low_balance");
    expect(events[0].payload.balance).toBe(50);
    expect(events[0].payload.threshold).toBe(100);
  });

  it("emits low_balance only once (no repeat)", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 100 }, vi.fn());
    const snap1: BalanceSnapshot = { timestamp: 1000, balance: 200 };
    const snap2: BalanceSnapshot = { timestamp: 2000, balance: 50 };
    const snap3: BalanceSnapshot = { timestamp: 3000, balance: 30 };

    src.diff(snap1, snap2); // triggers alert
    const events = src.diff(snap2, snap3); // still below — no repeat
    const lowBalance = events.filter(e => e.type === "low_balance");
    expect(lowBalance).toHaveLength(0);
  });

  it("re-emits low_balance after recovery", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 100 }, vi.fn());
    const snap1: BalanceSnapshot = { timestamp: 1000, balance: 200 };
    const snap2: BalanceSnapshot = { timestamp: 2000, balance: 50 };  // alert
    const snap3: BalanceSnapshot = { timestamp: 3000, balance: 150 }; // recovery
    const snap4: BalanceSnapshot = { timestamp: 4000, balance: 40 };  // alert again

    src.diff(snap1, snap2);
    src.diff(snap2, snap3); // recovery clears alert
    const events = src.diff(snap3, snap4);
    const lowBalance = events.filter(e => e.type === "low_balance");
    expect(lowBalance).toHaveLength(1);
  });

  it("emits income_received when balance increases", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 10 }, vi.fn());
    const prev: BalanceSnapshot = { timestamp: 1000, balance: 100 };
    const curr: BalanceSnapshot = { timestamp: 2000, balance: 150 };

    const events = src.diff(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("income_received");
    expect(events[0].payload.delta).toBe(50);
  });

  it("no events when balance unchanged", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 10 }, vi.fn());
    const prev: BalanceSnapshot = { timestamp: 1000, balance: 100 };
    const curr: BalanceSnapshot = { timestamp: 2000, balance: 100 };

    expect(src.diff(prev, curr)).toHaveLength(0);
  });

  it("no income event when balance decreases", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 10 }, vi.fn());
    const prev: BalanceSnapshot = { timestamp: 1000, balance: 100 };
    const curr: BalanceSnapshot = { timestamp: 2000, balance: 80 };

    expect(src.diff(prev, curr)).toHaveLength(0);
  });

  it("extractWatermark includes timestamp and balance", () => {
    const src = createBalanceSource({ lowBalanceThreshold: 10 }, vi.fn());
    const snap: BalanceSnapshot = { timestamp: 5000, balance: 200 };
    const wm = src.extractWatermark(snap) as any;
    expect(wm.timestamp).toBe(5000);
    expect(wm.balance).toBe(200);
  });
});
