import { describe, it, expect } from "vitest";
import { createSkillDojoPlugin } from "../../../src/adapters/skill-dojo/plugin.js";
import { createPluginRegistry } from "../../../src/types.js";
import { createMockClient } from "./mock-client.js";

describe("createSkillDojoPlugin", () => {
  it("returns a FrameworkPlugin with correct metadata", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);

    expect(plugin.name).toBe("skill-dojo");
    expect(plugin.version).toBe("1.0.0");
    expect(plugin.description).toContain("15 skills");
  });

  it("has 11 data providers", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);

    expect(plugin.providers).toHaveLength(11);

    const names = plugin.providers!.map((p) => p.name);
    expect(names).toContain("skill-dojo:defi-agent");
    expect(names).toContain("skill-dojo:prediction-market");
    expect(names).toContain("skill-dojo:network-monitor");
    expect(names).toContain("skill-dojo:address-monitoring");
    expect(names).toContain("skill-dojo:chain-operations");
    expect(names).toContain("skill-dojo:solana-operations");
    expect(names).toContain("skill-dojo:ton-operations");
    expect(names).toContain("skill-dojo:near-operations");
    expect(names).toContain("skill-dojo:bitcoin-operations");
    expect(names).toContain("skill-dojo:cosmos-operations");
    expect(names).toContain("skill-dojo:sdk-setup");
  });

  it("has 4 actions", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);

    expect(plugin.actions).toHaveLength(4);

    const names = plugin.actions!.map((a) => a.name);
    expect(names).toContain("skill-dojo:identity-agent");
    expect(names).toContain("skill-dojo:tlsnotary-attestation");
    expect(names).toContain("skill-dojo:multi-step-operations");
    expect(names).toContain("skill-dojo:demos-wallet");
  });

  it("all provider names are unique", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);

    const allNames = [
      ...plugin.providers!.map((p) => p.name),
      ...plugin.actions!.map((a) => a.name),
    ];
    const unique = new Set(allNames);
    expect(unique.size).toBe(allNames.length);
  });

  it("all providers have description and fetch method", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);

    for (const provider of plugin.providers!) {
      expect(provider.description).toBeTruthy();
      expect(typeof provider.fetch).toBe("function");
    }
  });

  it("all actions have description, validate, and execute methods", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);

    for (const action of plugin.actions!) {
      expect(action.description).toBeTruthy();
      expect(typeof action.validate).toBe("function");
      expect(typeof action.execute).toBe("function");
    }
  });

  it("integrates with PluginRegistry", () => {
    const client = createMockClient();
    const plugin = createSkillDojoPlugin(client);
    const registry = createPluginRegistry();

    registry.register(plugin);

    expect(registry.get("skill-dojo")).toBe(plugin);
    expect(registry.getProviders()).toHaveLength(11);
    expect(registry.getActions()).toHaveLength(4);
  });
});
