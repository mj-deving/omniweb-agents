import { describe, expect, it } from "vitest";
import { buildOpenClawExport } from "../../packages/omniweb-toolkit/scripts/_openclaw-export.js";
import { buildRegistryExport } from "../../packages/omniweb-toolkit/scripts/_registry-export.js";

describe("minimal-agent starter exports", () => {
  it("preserves the lightweight OpenClaw bundle starter surface", () => {
    const files = buildOpenClawExport(["research-agent"]);
    const starter = files.find((file) => file.path === "research-agent/skills/omniweb-research-agent/minimal-agent-starter.mjs");

    expect(starter?.content).toContain('import { detectCapabilities, resolveStarterMode, summarizeCapabilities } from "./runtime/capability-detect.mjs";');
    expect(starter?.content).toContain('const DEFAULT_COLONY_URL = process.env.OMNIWEB_COLONY_URL || "https://www.supercolony.ai";');
    expect(starter?.content).toContain('const mode = resolveStarterMode(process.env.OMNIWEB_STARTER_MODE, capabilities, {');
    expect(starter?.content).toContain('const dryRunModule = await import("./runtime/minimal-dry-run-starter.mjs");');
    expect(starter?.content).toContain('await runBundleMode();');
    expect(starter?.content).not.toContain('../src/index.js');
    expect(starter?.content).not.toContain('../src/agent.js');
  });

  it("rewrites registry starters to package entrypoints", () => {
    const files = buildRegistryExport(["research-agent"]);
    const starter = files.find((file) => file.path === "omniweb-research-agent/minimal-agent-starter.mjs");

    expect(starter?.content).toContain('import { checkWriteReadiness, connect, getMinimalAgentRuntimeConfig } from "omniweb-toolkit"');
    expect(starter?.content).toContain("Wallet-backed starter is not ready to publish.");
    expect(starter?.content).toContain('from "omniweb-toolkit/agent"');
    expect(starter?.content).toContain("getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir())");
    expect(starter?.content).not.toContain('../src/index.js');
    expect(starter?.content).not.toContain('../src/agent.js');
  });
});
