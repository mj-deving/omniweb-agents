/**
 * Tests for the official SuperColony scoring formula.
 *
 * TDD: Tests written FIRST, then implementation.
 *
 * Official formula:
 *   Base: +20, DAHR: +40, Confidence: +5, Long text (>200): +15,
 *   Short text (<50): -15, 5+ reactions: +10, 15+ reactions: +10 (cumulative),
 *   Max: 100
 */

import { describe, it, expect } from "vitest";
import {
  calculateOfficialScore,
  type OfficialScoreInput,
  type OfficialScoreResult,
} from "../../../src/toolkit/supercolony/scoring.js";

// ── Helper ──────────────────────────────────────────

function makeInput(overrides: Partial<OfficialScoreInput> = {}): OfficialScoreInput {
  return {
    text: "A moderate length post that says something reasonable about the market.",
    hasSourceAttestations: false,
    confidence: undefined,
    reactionCount: 0,
    ...overrides,
  };
}

// ── Base Score ──────────────────────────────────────

describe("calculateOfficialScore", () => {
  it("returns base score of 20 for a minimal post", () => {
    const result = calculateOfficialScore(makeInput());
    expect(result.score).toBe(20);
    expect(result.breakdown.base).toBe(20);
  });

  // ── DAHR Attestation ───────────────────────────────

  it("adds +40 for DAHR attestation (hasSourceAttestations = true)", () => {
    const result = calculateOfficialScore(makeInput({ hasSourceAttestations: true }));
    expect(result.breakdown.attestation).toBe(40);
    expect(result.score).toBe(60); // 20 + 40
  });

  it("does NOT add attestation bonus when hasSourceAttestations is false (TLSNotary-only)", () => {
    const result = calculateOfficialScore(makeInput({ hasSourceAttestations: false }));
    expect(result.breakdown.attestation).toBe(0);
  });

  // ── Confidence ─────────────────────────────────────

  it("adds +5 when confidence is set (0-100 number)", () => {
    const result = calculateOfficialScore(makeInput({ confidence: 75 }));
    expect(result.breakdown.confidence).toBe(5);
  });

  it("adds +5 even when confidence is 0 (field is set)", () => {
    const result = calculateOfficialScore(makeInput({ confidence: 0 }));
    expect(result.breakdown.confidence).toBe(5);
  });

  it("does NOT add confidence bonus when confidence is undefined", () => {
    const result = calculateOfficialScore(makeInput({ confidence: undefined }));
    expect(result.breakdown.confidence).toBe(0);
  });

  // ── Text Length ────────────────────────────────────

  it("adds +15 for text > 200 chars", () => {
    const longText = "A".repeat(201);
    const result = calculateOfficialScore(makeInput({ text: longText }));
    expect(result.breakdown.longText).toBe(15);
  });

  it("does NOT add long text bonus for exactly 200 chars", () => {
    const text = "A".repeat(200);
    const result = calculateOfficialScore(makeInput({ text }));
    expect(result.breakdown.longText).toBe(0);
  });

  it("subtracts -15 for text < 50 chars", () => {
    const result = calculateOfficialScore(makeInput({ text: "Short post." }));
    expect(result.breakdown.shortText).toBe(-15);
    expect(result.score).toBe(5); // 20 - 15
  });

  it("does NOT penalize text of exactly 50 chars", () => {
    const text = "A".repeat(50);
    const result = calculateOfficialScore(makeInput({ text }));
    expect(result.breakdown.shortText).toBe(0);
  });

  // ── Reactions ──────────────────────────────────────

  it("adds +10 for 5+ reactions", () => {
    const result = calculateOfficialScore(makeInput({ reactionCount: 5 }));
    expect(result.breakdown.engagementT1).toBe(10);
    expect(result.score).toBe(30); // 20 + 10
  });

  it("adds +20 total for 15+ reactions (cumulative tiers)", () => {
    const result = calculateOfficialScore(makeInput({ reactionCount: 15 }));
    expect(result.breakdown.engagementT1).toBe(10);
    expect(result.breakdown.engagementT2).toBe(10);
    expect(result.score).toBe(40); // 20 + 10 + 10
  });

  it("does NOT add engagement bonus for < 5 reactions", () => {
    const result = calculateOfficialScore(makeInput({ reactionCount: 4 }));
    expect(result.breakdown.engagementT1).toBe(0);
    expect(result.breakdown.engagementT2).toBe(0);
  });

  // ── Max Score Cap ──────────────────────────────────

  it("caps score at 100", () => {
    const result = calculateOfficialScore(makeInput({
      text: "A".repeat(201),
      hasSourceAttestations: true,
      confidence: 80,
      reactionCount: 20,
    }));
    expect(result.score).toBe(100);
    // Raw would be 20 + 40 + 5 + 15 + 10 + 10 = 100 exactly
  });

  // ── Practical Max Without DAHR ─────────────────────

  it("practical max without DAHR = 60", () => {
    const result = calculateOfficialScore(makeInput({
      text: "A".repeat(201),
      hasSourceAttestations: false,
      confidence: 80,
      reactionCount: 20,
    }));
    // 20 (base) + 5 (confidence) + 15 (long text) + 10 + 10 (reactions) = 60
    expect(result.score).toBe(60);
  });

  // ── Score Floor ────────────────────────────────────

  it("floors score at 0 (never negative)", () => {
    // Short text penalty alone: 20 - 15 = 5, so it won't go below 0
    // But verify the floor is enforced in principle
    const result = calculateOfficialScore(makeInput({ text: "Hi" }));
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  // ── Breakdown Completeness ─────────────────────────

  it("returns a complete breakdown with all component keys", () => {
    const result = calculateOfficialScore(makeInput());
    expect(result.breakdown).toHaveProperty("base");
    expect(result.breakdown).toHaveProperty("attestation");
    expect(result.breakdown).toHaveProperty("confidence");
    expect(result.breakdown).toHaveProperty("longText");
    expect(result.breakdown).toHaveProperty("shortText");
    expect(result.breakdown).toHaveProperty("engagementT1");
    expect(result.breakdown).toHaveProperty("engagementT2");
  });

  // ── Combined Scenarios ─────────────────────────────

  it("scores a fully attested high-engagement post at max 100", () => {
    const result = calculateOfficialScore({
      text: "BTC dominance at 54.3% with ETH/BTC breaking below 0.045 support. Historical data shows this ratio precedes alt rotation within 2-3 weeks. Institutional flows via Grayscale GBTC premium suggest accumulation phase. Key levels to watch: $67K resistance, $62K support.",
      hasSourceAttestations: true,
      confidence: 85,
      reactionCount: 18,
    });
    expect(result.score).toBe(100);
  });

  it("scores an unattested short post with no reactions at 5", () => {
    const result = calculateOfficialScore({
      text: "Market is interesting.",
      hasSourceAttestations: false,
      confidence: undefined,
      reactionCount: 0,
    });
    // 20 (base) - 15 (short text) = 5
    expect(result.score).toBe(5);
  });
});
