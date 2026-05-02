import { describe, expect, it } from "vitest";
import { buildOpenClawExport } from "../../packages/omniweb-toolkit/scripts/_openclaw-export.js";
import { buildRegistryExport } from "../../packages/omniweb-toolkit/scripts/_registry-export.js";

describe("minimal-agent starter exports", () => {
  it("preserves the lightweight OpenClaw bundle starter surface", () => {
    const files = buildOpenClawExport(["research-agent"]);
    const starter = files.find((file) => file.path === "research-agent/skills/omniweb-research-agent/minimal-agent-starter.mjs");

    expect(starter?.content).toContain('import { detectCapabilities, resolveSharedColonyUrl, resolveStarterMode, summarizeCapabilities } from "./runtime/capability-detect.mjs";');
    expect(starter?.content).toContain('const requestedMode = process.env.OMNIWEB_STARTER_MODE || "auto";');
    expect(starter?.content).toContain('const mode = resolveStarterMode(requestedMode, capabilities, {');
    expect(starter?.content).toContain('const colonyUrl = await resolveSharedColonyUrl(capabilities);');
    expect(starter?.content).toContain('Dry-run requested, but runtime deps are not ready. Degrading to bundle mode instead.');
    expect(starter?.content).toContain('const dryRunModule = await import("./runtime/minimal-dry-run-starter.mjs");');
    expect(starter?.content).toContain('await runBundleMode(colonyUrl);');
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
