import { describe, expect, it, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────
// Mock all plugin files to avoid pulling in SDK transitive deps

vi.mock("../src/lib/sources/matcher.js", () => ({ match: vi.fn() }));
vi.mock("../src/lib/sources/policy.js", () => ({ preflight: vi.fn() }));
vi.mock("../src/lib/network/sdk.js", () => ({ apiCall: vi.fn(), info: vi.fn() }));

vi.mock("../src/plugins/calibrate-plugin.js", () => ({
  createCalibrateBeforeSense: vi.fn((runTool: any) => async () => {}),
}));

vi.mock("../src/plugins/predictions-plugin.js", () => ({
  predictionsBeforeSense: vi.fn(async () => {}),
  predictionsAfterConfirm: vi.fn(async () => {}),
}));

vi.mock("../src/plugins/tips-plugin.js", () => ({
  tipsBeforeSense: vi.fn(async () => {}),
  tipsAfterAct: vi.fn(async () => {}),
}));

vi.mock("../src/plugins/lifecycle-plugin.js", () => ({
  lifecycleBeforeSense: vi.fn(async () => {}),
}));

vi.mock("../src/plugins/sc-oracle-plugin.js", () => ({
  scOracleBeforeSense: vi.fn(async () => {}),
}));

vi.mock("../src/plugins/sc-prices-plugin.js", () => ({
  scPricesBeforeSense: vi.fn(async () => {}),
}));

import { loadExtensions } from "../src/lib/util/extensions.js";

// ── Tests ────────────────────────────────────────────

describe("loadExtensions", () => {
  const mockRunTool = vi.fn();

  it("returns empty registry for empty extension list", async () => {
    const registry = await loadExtensions({ enabledExtensions: [] });
    expect(registry.size).toBe(0);
  });

  it("loads observe with empty hooks", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["observe"] });
    expect(registry.size).toBe(1);
    expect(registry.get("observe")).toBeDefined();
    // Observe has no hook functions — it's inline
    const hooks = registry.get("observe")!;
    expect(hooks.beforeSense).toBeUndefined();
    expect(hooks.beforePublishDraft).toBeUndefined();
    expect(hooks.afterPublishDraft).toBeUndefined();
    expect(hooks.afterAct).toBeUndefined();
    expect(hooks.afterConfirm).toBeUndefined();
  });

  it("loads calibrate with runTool dependency", async () => {
    const registry = await loadExtensions({
      enabledExtensions: ["calibrate"],
      runTool: mockRunTool,
    });
    expect(registry.size).toBe(1);
    const hooks = registry.get("calibrate")!;
    expect(hooks.beforeSense).toBeDefined();
    expect(typeof hooks.beforeSense).toBe("function");
  });

  it("throws when calibrate enabled without runTool", async () => {
    await expect(
      loadExtensions({ enabledExtensions: ["calibrate"] })
    ).rejects.toThrow("calibrate extension requires runTool dependency");
  });

  it("loads sources with beforePublishDraft and afterPublishDraft hooks", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["sources"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("sources")!;
    expect(hooks.beforePublishDraft).toBeDefined();
    expect(hooks.afterPublishDraft).toBeDefined();
  });

  it("loads signals with empty hooks (deprecated plugin removed)", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["signals"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("signals")!;
    expect(hooks.beforeSense).toBeUndefined();
  });

  it("loads predictions with beforeSense and afterConfirm hooks", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["predictions"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("predictions")!;
    expect(hooks.beforeSense).toBeDefined();
    expect(hooks.afterConfirm).toBeDefined();
  });

  it("loads tips with beforeSense and afterAct hooks", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["tips"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("tips")!;
    expect(hooks.beforeSense).toBeDefined();
    expect(hooks.afterAct).toBeDefined();
  });

  it("loads lifecycle with beforeSense hook", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["lifecycle"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("lifecycle")!;
    expect(hooks.beforeSense).toBeDefined();
  });

  it("loads sc-oracle with beforeSense hook", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["sc-oracle"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("sc-oracle")!;
    expect(hooks.beforeSense).toBeDefined();
  });

  it("loads sc-prices with beforeSense hook", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["sc-prices"] });
    expect(registry.size).toBe(1);
    const hooks = registry.get("sc-prices")!;
    expect(hooks.beforeSense).toBeDefined();
  });

  it("preserves order of enabled extensions", async () => {
    const registry = await loadExtensions({
      enabledExtensions: ["observe", "signals", "sources"],
    });
    expect(registry.size).toBe(3);
    const keys = [...registry.keys()];
    expect(keys).toEqual(["observe", "signals", "sources"]);
  });

  it("silently skips unknown extensions", async () => {
    const registry = await loadExtensions({
      enabledExtensions: ["signals", "unknown-ext", "observe"],
    });
    expect(registry.size).toBe(2);
    expect(registry.has("unknown-ext")).toBe(false);
  });

  it("loads multiple extensions together", async () => {
    const registry = await loadExtensions({
      enabledExtensions: ["calibrate", "sources", "observe", "signals", "predictions", "tips", "lifecycle", "sc-oracle", "sc-prices"],
      runTool: mockRunTool,
    });
    expect(registry.size).toBe(9);
  });

  it("returns a ReadonlyMap (Map instance)", async () => {
    const registry = await loadExtensions({ enabledExtensions: ["observe"] });
    expect(registry).toBeInstanceOf(Map);
  });
});
