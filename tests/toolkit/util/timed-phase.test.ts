import { describe, expect, it, vi } from "vitest";
import { withBudget } from "../../../src/toolkit/util/timed-phase.js";

describe("withBudget", () => {
  it("returns the result of the wrapped function", async () => {
    const result = await withBudget(5000, "test", async () => 42);
    expect(result.result).toBe(42);
  });

  it("measures elapsed time", async () => {
    const result = await withBudget(5000, "test", async () => {
      await new Promise((r) => setTimeout(r, 100));
      return "done";
    });
    expect(result.elapsedMs).toBeGreaterThanOrEqual(80);
    expect(result.elapsedMs).toBeLessThan(2000);
  });

  it("reports within budget when under limit", async () => {
    const result = await withBudget(5000, "fast-op", async () => "ok");
    expect(result.overBudget).toBe(false);
    expect(result.overagePercent).toBe(0);
    expect(result.budgetMs).toBe(5000);
  });

  it("reports over budget with correct overage percent", async () => {
    const result = await withBudget(50, "slow-op", async () => {
      await new Promise((r) => setTimeout(r, 150));
      return "late";
    });
    expect(result.overBudget).toBe(true);
    expect(result.overagePercent).toBeGreaterThan(0);
    expect(result.result).toBe("late");
  });

  it("calls observe with inefficiency when over budget", async () => {
    const observe = vi.fn();
    await withBudget(
      50,
      "slow-phase",
      async () => {
        await new Promise((r) => setTimeout(r, 150));
        return "done";
      },
      observe,
    );
    expect(observe).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledWith(
      "inefficiency",
      expect.stringContaining("slow-phase"),
      expect.objectContaining({
        phase: "slow-phase",
        budgetMs: 50,
        overagePercent: expect.any(Number),
        durationMs: expect.any(Number),
      }),
    );
  });

  it("does not call observe when within budget", async () => {
    const observe = vi.fn();
    await withBudget(5000, "fast", async () => "ok", observe);
    expect(observe).not.toHaveBeenCalled();
  });

  it("propagates errors from the wrapped function", async () => {
    await expect(
      withBudget(5000, "fail", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });

  it("works without an observe callback", async () => {
    const result = await withBudget(50, "no-observer", async () => {
      await new Promise((r) => setTimeout(r, 100));
      return "done";
    });
    // Should not throw even when over budget with no observer
    expect(result.overBudget).toBe(true);
    expect(result.result).toBe("done");
  });

  it("calculates overage percent correctly", async () => {
    // With a 100ms budget and ~200ms execution, overage should be ~100%
    const result = await withBudget(100, "calc", async () => {
      await new Promise((r) => setTimeout(r, 200));
      return "x";
    });
    expect(result.overagePercent).toBeGreaterThanOrEqual(50);
    expect(result.overagePercent).toBeLessThan(500);
  });
});
