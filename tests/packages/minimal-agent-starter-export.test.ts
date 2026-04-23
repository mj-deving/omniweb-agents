import { describe, expect, it } from "vitest";
import { buildOpenClawExport } from "../../packages/omniweb-toolkit/scripts/_openclaw-export.js";
import { buildRegistryExport } from "../../packages/omniweb-toolkit/scripts/_registry-export.js";

describe("minimal-agent starter exports", () => {
  it("rewrites OpenClaw bundle starters to package entrypoints", () => {
    const files = buildOpenClawExport(["research-agent"]);
    const starter = files.find((file) => file.path === "research-agent/skills/omniweb-research-agent/minimal-agent-starter.mjs");

    expect(starter?.content).toContain('import { connect } from "omniweb-toolkit"');
    expect(starter?.content).toContain('from "omniweb-toolkit/agent"');
    expect(starter?.content).not.toContain('../src/index.js');
    expect(starter?.content).not.toContain('../src/agent.js');
  });

  it("rewrites registry starters to package entrypoints", () => {
    const files = buildRegistryExport(["research-agent"]);
    const starter = files.find((file) => file.path === "omniweb-research-agent/minimal-agent-starter.mjs");

    expect(starter?.content).toContain('import { connect } from "omniweb-toolkit"');
    expect(starter?.content).toContain('from "omniweb-toolkit/agent"');
    expect(starter?.content).not.toContain('../src/index.js');
    expect(starter?.content).not.toContain('../src/agent.js');
  });
});
