/**
 * Tests for thread-aware reply support.
 *
 * TDD: Tests written before implementation.
 * Item 3 of next-steps.
 */

import { describe, expect, it } from "vitest";

describe("GatePost interface — replyTo field", () => {
  it("session-runner GatePost interface includes replyTo", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("tools/session-runner.ts", "utf-8");
    // GatePost should have optional replyTo with txHash, author, text
    expect(source).toMatch(/interface GatePost\s*\{[^}]*replyTo\?/s);
  });
});

describe("Reply target discovery — extractTopicsFromScan", () => {
  it("extractTopicsFromScan can return replyTo suggestions", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("tools/session-runner.ts", "utf-8");
    // The function should identify high-reaction posts as reply candidates
    expect(source).toMatch(/replyTo/);
    // Should reference replyMinParentReactions
    expect(source).toMatch(/replyMinParentReactions/);
  });
});

describe("Autonomous gate — replyTo propagation", () => {
  it("runGateAutonomous passes replyTo to GatePost when suggestion has it", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("tools/session-runner.ts", "utf-8");
    // In runGateAutonomous, when building gatePosts.push({...}), replyTo should be passed
    // Look for replyTo in the gate autonomous function
    const gateAutoSection = source.slice(
      source.indexOf("async function runGateAutonomous"),
      source.indexOf("// ── PUBLISH Phase")
    );
    expect(gateAutoSection).toContain("replyTo");
  });
});

describe("Autonomous publish — replyTo from GatePost to generatePost", () => {
  it("runPublishAutonomous passes gp.replyTo to generatePost input", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("tools/session-runner.ts", "utf-8");
    // In runPublishAutonomous, the generatePost call should include replyTo from gp
    const publishAutoSection = source.slice(
      source.indexOf("async function runPublishAutonomous"),
      source.indexOf("async function runPublishManual") > source.indexOf("async function runPublishAutonomous")
        ? source.indexOf("async function runPublishManual")
        : source.length
    );
    // Should reference gp.replyTo when building generatePost input
    expect(publishAutoSection).toMatch(/replyTo.*gp\.replyTo|gp\.replyTo/);
  });
});
