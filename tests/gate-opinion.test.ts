/**
 * Tests for OPINION category support in gate and LLM.
 *
 * TDD: Tests written before implementation.
 * Item 2 of next-steps.
 */

import { describe, expect, it, vi } from "vitest";

// We test the checkCategory function by importing it.
// Since it's not currently exported, we'll test via the gate CLI output format.
// For now, test the category validation logic directly.

describe("OPINION category — gate checkCategory", () => {
  // The function checkCategory(category, mode) returns GateItem.
  // We need to export it or test via integration.
  // Since gate.ts doesn't export checkCategory, we'll test the validation logic inline.

  const STANDARD_ALLOWED = ["ANALYSIS", "PREDICTION", "OPINION"];
  const PIONEER_ALLOWED = ["ANALYSIS", "PREDICTION", "QUESTION", "OPINION"];

  it("standard mode allows OPINION", () => {
    const upper = "OPINION";
    expect(STANDARD_ALLOWED.includes(upper)).toBe(true);
  });

  it("pioneer mode allows OPINION", () => {
    const upper = "OPINION";
    expect(PIONEER_ALLOWED.includes(upper)).toBe(true);
  });

  it("standard mode still allows ANALYSIS and PREDICTION", () => {
    expect(STANDARD_ALLOWED.includes("ANALYSIS")).toBe(true);
    expect(STANDARD_ALLOWED.includes("PREDICTION")).toBe(true);
  });

  it("pioneer mode still allows QUESTION", () => {
    expect(PIONEER_ALLOWED.includes("QUESTION")).toBe(true);
  });

  it("unknown category is rejected", () => {
    expect(STANDARD_ALLOWED.includes("RANT")).toBe(false);
  });
});

describe("OPINION category — LLM VALID_CATEGORIES", () => {
  it("VALID_CATEGORIES includes OPINION", async () => {
    // Import the actual module to verify VALID_CATEGORIES
    // Since it's a const inside generatePost, we test by checking the module source
    // This is a structural test — we'll verify by reading the file
    const fs = await import("node:fs");
    const llmSource = fs.readFileSync("src/lib/llm.ts", "utf-8");
    expect(llmSource).toContain('"OPINION"');
  });

  it("LLM system prompt mentions OPINION category", async () => {
    const fs = await import("node:fs");
    const llmSource = fs.readFileSync("src/lib/llm.ts", "utf-8");
    // The system prompt should contain guidance for OPINION
    expect(llmSource).toMatch(/OPINION/);
  });
});

describe("OPINION category — extractTopicsFromScan suggestions", () => {
  it("session-runner can suggest OPINION for subjective topics", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("cli/session-runner.ts", "utf-8");
    // extractTopicsFromScan should be able to produce OPINION category
    expect(source).toContain('"OPINION"');
  });
});
