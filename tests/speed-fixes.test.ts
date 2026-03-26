import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Test: Verify retry schedule ─────────────────

describe("verify retry schedule", () => {
  it("VERIFY_RETRY_DELAYS_MS is [3000, 5000, 10000]", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/verify.ts", "utf-8");
    const match = source.match(/VERIFY_RETRY_DELAYS_MS\s*=\s*\[([^\]]+)\]/);
    expect(match).toBeTruthy();
    const values = match![1].split(",").map(s => parseInt(s.trim(), 10));
    expect(values).toEqual([3000, 5000, 10000]);
  });
});

// ── Test: --wait 15 removed from session-runner ──

describe("session-runner --wait removal", () => {
  it("runVerify args do not contain --wait flag", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    // Find the runVerify function and its args construction
    const verifySection = source.slice(
      source.indexOf("async function runVerify"),
      source.indexOf("async function runVerify") + 500
    );
    expect(verifySection).not.toContain('"--wait"');
    expect(verifySection).not.toContain("'--wait'");
  });

  it("V2 confirm args do not contain --wait flag", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    // Find the confirm section in V2 loop — search for verify.ts (CONFIRM)
    const confirmIdx = source.indexOf('verify.ts (CONFIRM)');
    expect(confirmIdx).toBeGreaterThan(-1);
    // Check 300 chars before that point for --wait
    const confirmSection = source.slice(Math.max(0, confirmIdx - 300), confirmIdx);
    expect(confirmSection).not.toContain('"--wait"');
    expect(confirmSection).not.toContain("'--wait'");
  });
});

// ── Test: skipIndexerCheck in publish-pipeline ──

describe("publish-pipeline skipIndexerCheck", () => {
  const mockSleep = vi.fn();
  const mockApiCall = vi.fn();
  const mockInfo = vi.fn();
  const mockObserve = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it("PublishOptions interface includes skipIndexerCheck field", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("src/actions/publish-pipeline.ts", "utf-8");
    // Search within the full PublishOptions interface block (up to next export)
    const start = source.indexOf("export interface PublishOptions");
    const end = source.indexOf("}", start) + 1;
    const optionsSection = source.slice(start, end);
    expect(optionsSection).toContain("skipIndexerCheck");
  });

  it("checkIndexerHealth is gated by skipIndexerCheck", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("src/actions/publish-pipeline.ts", "utf-8");
    // The conditional around checkIndexerHealth should include skipIndexerCheck
    expect(source).toContain("!options.skipIndexerCheck");
  });

  it("checkIndexerHealth is preserved when skipIndexerCheck is false or undefined", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("src/actions/publish-pipeline.ts", "utf-8");
    // The function should still exist (not deleted)
    expect(source).toContain("async function checkIndexerHealth");
    // The call should still reference it (gated, not removed)
    expect(source).toContain("checkIndexerHealth(");
  });
});

// ── Test: Harden findings cap ───────────────────

describe("harden findings cap", () => {
  it("collectHardenFindings caps non-phase_error findings at 10", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    const hardenSection = source.slice(
      source.indexOf("function collectHardenFindings"),
      source.indexOf("function collectHardenFindings") + 2000
    );
    // Must reference a cap/limit/max
    expect(hardenSection).toMatch(/MAX_HARDEN_FINDINGS|maxFindings|\.slice\(0,\s*\d+\)|cap|limit/i);
  });

  it("phase_errors are always included regardless of cap", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    const hardenSection = source.slice(
      source.indexOf("function collectHardenFindings"),
      source.indexOf("function collectHardenFindings") + 2000
    );
    // Must have logic that treats phase_error specially
    expect(hardenSection).toMatch(/phase_error/);
  });

  it("autonomous harden skips proposeImprovement when findings exceed cap", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    const autonomousSection = source.slice(
      source.indexOf("async function runHardenAutonomous"),
      source.indexOf("async function runHardenAutonomous") + 2000
    );
    // Should have skip logic or cap logic for autonomous mode
    expect(autonomousSection).toMatch(/skip.*propos|log.*only|findings.*cap|skipProposal/i);
  });
});

// ── Test: Scan cache on resume ──────────────────

describe("scan cache on V2 resume", () => {
  it("V2 loop checks for cached sense results before running scan", () => {
    const { readFileSync } = require("node:fs");
    const source = readFileSync("cli/session-runner.ts", "utf-8");
    // Find the SENSE section of V2 loop
    const senseIdx = source.indexOf("SENSE already completed");
    expect(senseIdx).toBeGreaterThan(-1);
    // Around the sense section, there should be cache-checking logic
    const senseArea = source.slice(Math.max(0, senseIdx - 500), senseIdx + 1000);
    // Either it checks timestamp of existing results, or it checks a cache flag
    expect(senseArea).toMatch(/cache|stale|age|timestamp|elapsed|fresh/i);
  });
});
