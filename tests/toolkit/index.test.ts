/**
 * Tests for barrel export — verifies all 10 tools are exported from single entry point.
 */

import { describe, it, expect } from "vitest";
import * as toolkit from "../../src/toolkit/index.js";

describe("Barrel export", () => {
  it("exposes all 10 tools from single entry point", () => {
    // 10 tools per design doc
    expect(typeof toolkit.connect).toBe("function");
    expect(typeof toolkit.disconnect).toBe("function");
    expect(typeof toolkit.publish).toBe("function");
    expect(typeof toolkit.reply).toBe("function");
    expect(typeof toolkit.react).toBe("function");
    expect(typeof toolkit.tip).toBe("function");
    expect(typeof toolkit.scan).toBe("function");
    expect(typeof toolkit.verify).toBe("function");
    expect(typeof toolkit.attest).toBe("function");
    expect(typeof toolkit.discoverSources).toBe("function");
    expect(typeof toolkit.pay).toBe("function");
  });

  it("exports DemosSession class", () => {
    expect(toolkit.DemosSession).toBeDefined();
    expect(typeof toolkit.DemosSession).toBe("function");
  });

  it("exports FileStateStore class", () => {
    expect(toolkit.FileStateStore).toBeDefined();
    expect(typeof toolkit.FileStateStore).toBe("function");
  });

  it("exports helper functions (ok, err, demosError)", () => {
    expect(typeof toolkit.ok).toBe("function");
    expect(typeof toolkit.err).toBe("function");
    expect(typeof toolkit.demosError).toBe("function");
  });

  it("exports guard functions", () => {
    expect(typeof toolkit.checkWriteRateLimit).toBe("function");
    expect(typeof toolkit.recordWrite).toBe("function");
    expect(typeof toolkit.checkTipSpendCap).toBe("function");
    expect(typeof toolkit.recordTip).toBe("function");
    expect(typeof toolkit.checkPaySpendCap).toBe("function");
    expect(typeof toolkit.recordPayment).toBe("function");
    expect(typeof toolkit.checkDedup).toBe("function");
    expect(typeof toolkit.recordPublish).toBe("function");
    expect(typeof toolkit.withBackoff).toBe("function");
    expect(typeof toolkit.makeIdempotencyKey).toBe("function");
    expect(typeof toolkit.checkPayReceipt).toBe("function");
    expect(typeof toolkit.recordPayReceipt).toBe("function");
  });

  it("does not export any loops or strategy machinery", () => {
    // Anti-criterion: no loops in toolkit
    const exports = Object.keys(toolkit);
    const loopRelated = exports.filter(
      (k) => k.toLowerCase().includes("loop") || k.toLowerCase().includes("strategy"),
    );
    expect(loopRelated).toEqual([]);
  });

  it("does not export any types", () => {
    // Runtime exports should be functions and classes, not type-only
    const exports = Object.keys(toolkit);
    for (const key of exports) {
      const val = (toolkit as Record<string, unknown>)[key];
      expect(typeof val === "function" || typeof val === "object").toBe(true);
    }
  });
});
