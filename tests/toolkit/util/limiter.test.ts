import { describe, expect, it } from "vitest";
import { createLimiter } from "../../../src/toolkit/util/limiter.js";

describe("createLimiter", () => {
  it("limits concurrency to the specified number", async () => {
    const limit = createLimiter(2);
    let active = 0;
    let maxActive = 0;

    const task = () =>
      limit(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 50));
        active--;
      });

    await Promise.all([task(), task(), task(), task(), task()]);

    expect(maxActive).toBe(2);
  });

  it("returns the value from the wrapped function", async () => {
    const limit = createLimiter(1);
    const result = await limit(async () => 42);
    expect(result).toBe(42);
  });

  it("propagates errors from the wrapped function", async () => {
    const limit = createLimiter(1);
    await expect(limit(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
  });

  it("releases the slot on error so subsequent tasks run", async () => {
    const limit = createLimiter(1);
    await limit(async () => { throw new Error("fail"); }).catch(() => {});
    const result = await limit(async () => "ok");
    expect(result).toBe("ok");
  });
});
