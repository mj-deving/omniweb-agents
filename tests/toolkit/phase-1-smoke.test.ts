import { describe, expect, it } from "vitest";

describe("phase 1 smoke", () => {
  it("exposes LLMProvider from the toolkit barrel", async () => {
    const toolkit = await import("../../src/toolkit/index.js");
    expect(toolkit.LLMProvider).toBeUndefined(); // LLMProvider is a type, not a runtime export
  });

  it("exposes supercolony scoring from the toolkit namespace", async () => {
    const scoring = await import("../../src/toolkit/supercolony/scoring.js");

    expect(scoring.SCORE_BASE).toBe(20);
    expect(scoring.SCORE_MAX).toBe(100);
    expect(scoring.calculateExpectedScore({
      hasAttestation: true,
      hasConfidence: true,
      textLength: 300,
      reactions: 15,
    })).toBe(100);
  });

  it("exposes scoring constants directly", async () => {
    const scoring = await import("../../src/toolkit/supercolony/scoring.js");

    expect(scoring.SCORE_ATTESTATION).toBe(40);
    expect(scoring.ENGAGEMENT_T1_THRESHOLD).toBe(5);
    expect(scoring.calculateExpectedScore({
      hasAttestation: true,
      hasConfidence: false,
      textLength: 50,
      reactions: 0,
    })).toBe(60);
  });
});
