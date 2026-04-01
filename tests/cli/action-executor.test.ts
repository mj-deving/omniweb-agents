import { describe, expect, it, vi } from "vitest";

import {
  executeStrategyActions,
  type ActionExecutorDeps,
} from "../../cli/action-executor.js";
import type { StrategyAction } from "../../src/toolkit/strategy/types.js";

function makeAction(overrides: Partial<StrategyAction> = {}): StrategyAction {
  return {
    type: "ENGAGE",
    priority: 100,
    reason: "test action",
    ...overrides,
  };
}

function createDeps(overrides: Partial<ActionExecutorDeps> = {}): ActionExecutorDeps {
  return {
    bridge: {
      apiCall: vi.fn().mockResolvedValue({ ok: true, status: 200, data: { success: true } }),
      publishHivePost: vi.fn().mockResolvedValue({ txHash: "0xpost" }),
      transferDem: vi.fn().mockResolvedValue({ txHash: "0xtip" }),
    },
    generateText: vi.fn().mockResolvedValue("generated text"),
    dryRun: false,
    observe: vi.fn(),
    ...overrides,
  };
}

describe("executeStrategyActions", () => {
  it("routes ENGAGE actions to API react endpoint", async () => {
    const deps = createDeps();
    const action = makeAction({ type: "ENGAGE", target: "0xabc" });

    const result = await executeStrategyActions([action], deps);

    expect(deps.bridge.apiCall).toHaveBeenCalledWith(
      "/api/feed/0xabc/react",
      { method: "POST", body: JSON.stringify({ type: "agree" }) },
    );
    expect(result.executed).toEqual([
      { action, success: true },
    ]);
    expect(result.skipped).toEqual([]);
  });

  it("routes REPLY actions through generateText and publishHivePost", async () => {
    const deps = createDeps();
    const action = makeAction({ type: "REPLY", target: "0xparent" });

    const result = await executeStrategyActions([action], deps);

    expect(deps.generateText).toHaveBeenCalledWith(action);
    expect(deps.bridge.publishHivePost).toHaveBeenCalledWith({
      text: "generated text",
      category: "discussion",
      replyTo: "0xparent",
    });
    expect(result.executed).toEqual([
      { action, success: true, txHash: "0xpost" },
    ]);
  });

  it("routes PUBLISH actions through generateText and publishHivePost", async () => {
    const deps = createDeps();
    const action = makeAction({ type: "PUBLISH" });

    const result = await executeStrategyActions([action], deps);

    expect(deps.generateText).toHaveBeenCalledWith(action);
    expect(deps.bridge.publishHivePost).toHaveBeenCalledWith({
      text: "generated text",
      category: "analysis",
    });
    expect(result.executed).toEqual([
      { action, success: true, txHash: "0xpost" },
    ]);
  });

  it("routes TIP actions to transferDem", async () => {
    const deps = createDeps();
    const action = makeAction({
      type: "TIP",
      target: "demos1tippee",
      metadata: { amount: 4 },
    });

    const result = await executeStrategyActions([action], deps);

    expect(deps.bridge.transferDem).toHaveBeenCalledWith("demos1tippee", 4);
    expect(result.executed).toEqual([
      { action, success: true, txHash: "0xtip" },
    ]);
  });

  it("does not call bridge methods in dryRun mode", async () => {
    const deps = createDeps({ dryRun: true });
    const actions = [
      makeAction({ type: "ENGAGE", target: "0xengage" }),
      makeAction({ type: "REPLY", target: "0xreply" }),
      makeAction({ type: "PUBLISH" }),
      makeAction({ type: "TIP", target: "demos1tippee", metadata: { amount: 7 } }),
    ];

    const result = await executeStrategyActions(actions, deps);

    expect(deps.generateText).not.toHaveBeenCalled();
    expect(deps.bridge.apiCall).not.toHaveBeenCalled();
    expect(deps.bridge.publishHivePost).not.toHaveBeenCalled();
    expect(deps.bridge.transferDem).not.toHaveBeenCalled();
    expect(result.executed).toEqual([
      { action: actions[0], success: true },
      { action: actions[1], success: true },
      { action: actions[2], success: true },
      { action: actions[3], success: true },
    ]);
    expect(result.skipped).toEqual([]);
  });

  it("clamps TIP amounts to the 1-10 DEM range", async () => {
    const deps = createDeps();
    const actions = [
      makeAction({ type: "TIP", target: "demos1low", metadata: { amount: 0 } }),
      makeAction({ type: "TIP", target: "demos1high", metadata: { amount: 42 } }),
      makeAction({ type: "TIP", target: "demos1bad", metadata: { amount: Number.NaN } }),
    ];

    await executeStrategyActions(actions, deps);

    expect(deps.bridge.transferDem).toHaveBeenNthCalledWith(1, "demos1low", 1);
    expect(deps.bridge.transferDem).toHaveBeenNthCalledWith(2, "demos1high", 10);
    expect(deps.bridge.transferDem).toHaveBeenNthCalledWith(3, "demos1bad", 1);
  });

  it("skips REPLY actions when no text generator is available", async () => {
    const deps = createDeps({ generateText: undefined });
    const action = makeAction({ type: "REPLY", target: "0xparent" });

    const result = await executeStrategyActions([action], deps);

    expect(deps.bridge.publishHivePost).not.toHaveBeenCalled();
    expect(result.executed).toEqual([]);
    expect(result.skipped).toEqual([
      { action, reason: "no text generator" },
    ]);
  });

  it("skips PUBLISH actions when no text generator is available", async () => {
    const deps = createDeps({ generateText: undefined });
    const action = makeAction({ type: "PUBLISH" });

    const result = await executeStrategyActions([action], deps);

    expect(deps.bridge.publishHivePost).not.toHaveBeenCalled();
    expect(result.executed).toEqual([]);
    expect(result.skipped).toEqual([
      { action, reason: "no text generator" },
    ]);
  });

  it("continues after a failed action and executes subsequent actions", async () => {
    const deps = createDeps({
      bridge: {
        apiCall: vi.fn().mockResolvedValue({ ok: false, status: 500, data: "error" }),
        publishHivePost: vi.fn().mockResolvedValue({ txHash: "0xpost" }),
        transferDem: vi.fn().mockResolvedValue({ txHash: "0xtip" }),
      },
    });
    const actions = [
      makeAction({ type: "ENGAGE", target: "0xfail" }),
      makeAction({ type: "PUBLISH", reason: "second action" }),
      makeAction({ type: "TIP", target: "demos1tippee", metadata: { amount: 2 } }),
    ];

    const result = await executeStrategyActions(actions, deps);

    expect(result.executed).toEqual([
      { action: actions[0], success: false, error: "Reaction API returned 500" },
      { action: actions[1], success: true, txHash: "0xpost" },
      { action: actions[2], success: true, txHash: "0xtip" },
    ]);
    expect(deps.bridge.publishHivePost).toHaveBeenCalledTimes(1);
    expect(deps.bridge.transferDem).toHaveBeenCalledTimes(1);
  });

  it("returns empty results for an empty action list", async () => {
    const deps = createDeps();

    const result = await executeStrategyActions([], deps);

    expect(result).toEqual({ executed: [], skipped: [] });
  });

  it("skips unknown action types", async () => {
    const deps = createDeps();
    const action = {
      ...makeAction(),
      type: "UNKNOWN",
    } as StrategyAction;

    const result = await executeStrategyActions([action], deps);

    expect(deps.bridge.apiCall).not.toHaveBeenCalled();
    expect(deps.bridge.publishHivePost).not.toHaveBeenCalled();
    expect(deps.bridge.transferDem).not.toHaveBeenCalled();
    expect(result.executed).toEqual([]);
    expect(result.skipped).toEqual([
      { action, reason: "unknown action type" },
    ]);
  });
});
