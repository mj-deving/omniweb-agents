import { describe, it, expect } from "vitest";

// We need to test parseFlexibleDeadline — it's not exported, so we test via
// the module's public API or extract it. For now, test the public functions.
// TODO: export parseFlexibleDeadline for direct testing or refactor.

// Direct import of the module to test internal logic via its effects
import { loadPredictions, getCalibrationAdjustment } from "../tools/lib/predictions.js";

describe("loadPredictions", () => {
  it("returns empty store for non-existent agent", () => {
    const store = loadPredictions("test-nonexistent-agent-xxx");
    expect(store.version).toBe(1);
    expect(store.agent).toBe("test-nonexistent-agent-xxx");
    expect(Object.keys(store.predictions)).toHaveLength(0);
  });
});

describe("getCalibrationAdjustment", () => {
  it("returns 0 with insufficient data", () => {
    const store = loadPredictions("test-nonexistent-agent-xxx");
    expect(getCalibrationAdjustment(store)).toBe(0);
  });

  it("returns +1 when mostly correct (>60%)", () => {
    const store = {
      version: 1 as const,
      agent: "test",
      updatedAt: new Date().toISOString(),
      predictions: {
        tx1: { txHash: "tx1", topic: "a", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "correct" as const, agent: "test", manualReviewRequired: false },
        tx2: { txHash: "tx2", topic: "b", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "correct" as const, agent: "test", manualReviewRequired: false },
        tx3: { txHash: "tx3", topic: "c", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "correct" as const, agent: "test", manualReviewRequired: false },
        tx4: { txHash: "tx4", topic: "d", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "correct" as const, agent: "test", manualReviewRequired: false },
        tx5: { txHash: "tx5", topic: "e", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "incorrect" as const, agent: "test", manualReviewRequired: false },
      },
    };
    expect(getCalibrationAdjustment(store)).toBe(1);
  });

  it("returns -1 when mostly incorrect (<40%)", () => {
    const store = {
      version: 1 as const,
      agent: "test",
      updatedAt: new Date().toISOString(),
      predictions: {
        tx1: { txHash: "tx1", topic: "a", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "incorrect" as const, agent: "test", manualReviewRequired: false },
        tx2: { txHash: "tx2", topic: "b", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "incorrect" as const, agent: "test", manualReviewRequired: false },
        tx3: { txHash: "tx3", topic: "c", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "incorrect" as const, agent: "test", manualReviewRequired: false },
        tx4: { txHash: "tx4", topic: "d", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "incorrect" as const, agent: "test", manualReviewRequired: false },
        tx5: { txHash: "tx5", topic: "e", category: "PREDICTION" as const, text: "", confidence: 80, publishedAt: "", status: "correct" as const, agent: "test", manualReviewRequired: false },
      },
    };
    expect(getCalibrationAdjustment(store)).toBe(-1);
  });
});
