import { describe, expect, it, vi } from "vitest";

import { createBalanceSource } from "../../src/reactive/event-sources/balance-source.js";

describe("createBalanceSource", () => {
  it("polls the balance provider and returns a timestamped snapshot", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_234);
    const fetchBalance = vi.fn().mockResolvedValue(42);
    const source = createBalanceSource({ lowBalanceThreshold: 10 }, fetchBalance);

    await expect(source.poll()).resolves.toEqual({ timestamp: 1_234, balance: 42 });
    expect(source.id).toBe("chain:balance");
    expect(source.eventTypes).toEqual(["low_balance", "income_received"]);
    expect(fetchBalance).toHaveBeenCalledTimes(1);
  });

  it("emits low-balance alerts once until the balance recovers, and detects income", () => {
    const source = createBalanceSource({ lowBalanceThreshold: 10 }, vi.fn());

    expect(source.diff(null, { timestamp: 100, balance: 9 })).toEqual([]);

    const firstLow = source.diff(
      { timestamp: 100, balance: 12 },
      { timestamp: 200, balance: 9 },
    );
    expect(firstLow).toHaveLength(1);
    expect(firstLow[0]).toMatchObject({
      type: "low_balance",
      payload: { balance: 9, threshold: 10, timestamp: 200 },
    });

    expect(
      source.diff(
        { timestamp: 200, balance: 9 },
        { timestamp: 300, balance: 8 },
      ),
    ).toEqual([]);

    expect(
      source.diff(
        { timestamp: 300, balance: 8 },
        { timestamp: 400, balance: 11 },
      ),
    ).toEqual([
      expect.objectContaining({
        type: "income_received",
        payload: { balance: 11, delta: 3, timestamp: 400 },
      }),
    ]);

    const secondLow = source.diff(
      { timestamp: 400, balance: 11 },
      { timestamp: 500, balance: 7 },
    );
    expect(secondLow).toHaveLength(1);
    expect(secondLow[0].type).toBe("low_balance");
  });

  it("propagates balance fetch failures", async () => {
    const source = createBalanceSource(
      { lowBalanceThreshold: 10 },
      vi.fn().mockRejectedValue(new Error("rpc down")),
    );

    await expect(source.poll()).rejects.toThrow("rpc down");
  });
});
