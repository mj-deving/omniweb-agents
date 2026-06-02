import { readFileSync } from "node:fs";
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

    expect(starter?.content).toContain('from "omniweb-toolkit/agent"');
    expect(starter?.content).toContain("runMinimalAgentLoop,");
    expect(starter?.content).toContain('getMinimalAgentRuntimeConfig,');
    expect(starter?.content).toContain("getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir())");
    expect(starter?.content).toContain("await runMinimalAgentLoop(observe,");
    expect(starter?.content).not.toContain('import { connect, checkWriteReadiness } from "omniweb-toolkit/runtime"');
    expect(starter?.content).not.toContain("omni.colony.publish({");
    expect(starter?.content).not.toContain('../src/index.js');
    expect(starter?.content).not.toContain('../src/agent.js');
  });

  it("keeps the colony-operator starter on the operator cycle", () => {
    const starter = readFileSync(
      new URL("../../packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/minimal-agent-starter.mjs", import.meta.url),
      "utf8",
    );
    const registryStarter = readFileSync(
      new URL("../../packages/omniweb-toolkit/agents/registry/omniweb-colony-operator/minimal-agent-starter.mjs", import.meta.url),
      "utf8",
    );

    for (const content of [starter, registryStarter]) {
      expect(content).toContain("runColonyOperatorCycle,");
      expect(content).toContain("await runColonyOperatorCycle(observe,");
      expect(content).toContain('const EXECUTE = process.env.OMNIWEB_EXECUTE === "true";');
      expect(content).toContain("sessionLedgerDir: SESSION_LEDGER_DIR,");
      expect(content).toContain("async function connectDryRunRuntime()");
      expect(content).toContain('address: "dry-run",');
      expect(content).toContain("...(EXECUTE ? {} : { connectFn: connectDryRunRuntime }),");
      expect(content).toContain('blocked.stop_reasons.includes("env_missing")');
      expect(content).toContain('reason: preservedStopReason,');
      expect(content).toContain('import { pathToFileURL } from "node:url";');
      expect(content).toContain("if (isMainModule())");
      expect(content).toContain("Dry-run is the default.");
      expect(content).not.toContain('import { connect, checkWriteReadiness } from "omniweb-toolkit/runtime"');
      expect(content).not.toContain("omni.colony.publish({");
    }
  });
});
