import { describe, it, expect } from "vitest";
import { scoreSignalAlignment, type SignalSnapshot, type SignalTopic } from "../tools/lib/signals.js";

function makeSignal(overrides: Partial<SignalTopic> = {}): SignalTopic {
  return {
    topic: "bitcoin",
    direction: "bullish",
    confidence: 75,
    agentCount: 5,
    evidenceQuality: "strong",
    divergence: false,
    ...overrides,
  };
}

function makeSnapshot(topics: SignalTopic[] = []): SignalSnapshot {
  return { fetchedAt: new Date().toISOString(), topics, alerts: [] };
}

describe("scoreSignalAlignment", () => {
  it("returns 0 for empty snapshot", () => {
    expect(scoreSignalAlignment("bitcoin", makeSnapshot(), "sentinel")).toBe(0);
  });

  it("returns positive for sentinel with strong convergent signal", () => {
    const snapshot = makeSnapshot([makeSignal({ topic: "bitcoin", direction: "bullish", evidenceQuality: "strong" })]);
    const score = scoreSignalAlignment("bitcoin", snapshot, "sentinel");
    expect(score).toBeGreaterThan(0);
  });

  it("returns positive for pioneer with divergence signal", () => {
    const snapshot = makeSnapshot([makeSignal({ topic: "bitcoin", divergence: true })]);
    const score = scoreSignalAlignment("bitcoin", snapshot, "pioneer");
    expect(score).toBeGreaterThan(0);
  });

  it("returns 0 for unrelated topic", () => {
    const snapshot = makeSnapshot([makeSignal({ topic: "ethereum" })]);
    expect(scoreSignalAlignment("quantum computing", snapshot, "sentinel")).toBe(0);
  });

  it("returns 0 for crawler (neutral)", () => {
    const snapshot = makeSnapshot([makeSignal({ topic: "bitcoin" })]);
    expect(scoreSignalAlignment("bitcoin", snapshot, "crawler")).toBe(0);
  });
});
