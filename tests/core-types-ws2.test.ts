/**
 * Tests for WS2 core type additions — Action, EventPlugin, event types.
 *
 * Validates:
 * - Action interface works with PluginRegistry
 * - EventPlugin registration and retrieval
 * - EvaluatorInput uses context map (not topic/category)
 * - PluginRegistry new methods (getActions, getEventSources, getEventHandlers)
 */

import { describe, it, expect } from "vitest";
import {
  createPluginRegistry,
  type FrameworkPlugin,
  type Action,
  type ActionInput,
  type ActionResult,
  type EventPlugin,
  type EventSource,
  type EventHandler,
  type AgentEvent,
  type EventAction,
  type EvaluatorInput,
  type Evaluator,
} from "../core/types.js";

// ── Action Interface ────────────────────────────────

describe("Action interface", () => {
  const mockAction: Action = {
    name: "test-action",
    description: "A test action",
    aliases: ["test", "ta"],
    validate: async (input: ActionInput) => !!input.context.text,
    execute: async (input: ActionInput) => ({
      success: true,
      data: { echoed: input.context.text },
      text: `Processed: ${input.context.text}`,
    }),
  };

  it("validates input and returns boolean", async () => {
    expect(await mockAction.validate({ context: { text: "hello" } })).toBe(true);
    expect(await mockAction.validate({ context: {} })).toBe(false);
  });

  it("executes and returns ActionResult", async () => {
    const result = await mockAction.execute({ context: { text: "hello" } });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ echoed: "hello" });
    expect(result.text).toBe("Processed: hello");
  });

  it("has optional aliases", () => {
    expect(mockAction.aliases).toEqual(["test", "ta"]);
  });

  it("ActionResult supports error field", () => {
    const errorResult: ActionResult = { success: false, error: "Something failed" };
    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe("Something failed");
  });
});

// ── FrameworkPlugin with actions ────────────────────

describe("FrameworkPlugin.actions", () => {
  it("registers plugin with actions", () => {
    const registry = createPluginRegistry();
    const plugin: FrameworkPlugin = {
      name: "action-plugin",
      version: "1.0.0",
      actions: [
        {
          name: "publish",
          description: "Publish a post",
          validate: async () => true,
          execute: async () => ({ success: true }),
        },
        {
          name: "react",
          description: "React to a post",
          validate: async () => true,
          execute: async () => ({ success: true }),
        },
      ],
    };

    registry.register(plugin);
    expect(registry.getActions()).toHaveLength(2);
    expect(registry.getActions()[0].name).toBe("publish");
  });

  it("getActions() aggregates across multiple plugins", () => {
    const registry = createPluginRegistry();
    registry.register({
      name: "p1",
      version: "1.0.0",
      actions: [{ name: "a1", description: "a1", validate: async () => true, execute: async () => ({ success: true }) }],
    });
    registry.register({
      name: "p2",
      version: "1.0.0",
      actions: [{ name: "a2", description: "a2", validate: async () => true, execute: async () => ({ success: true }) }],
    });
    expect(registry.getActions()).toHaveLength(2);
  });

  it("getActions() returns empty array for plugins without actions", () => {
    const registry = createPluginRegistry();
    registry.register({ name: "no-actions", version: "1.0.0" });
    expect(registry.getActions()).toEqual([]);
  });
});

// ── EvaluatorInput genericization ───────────────────

describe("EvaluatorInput uses context map", () => {
  it("accepts context with SuperColony fields", async () => {
    const evaluator: Evaluator = {
      name: "sc-evaluator",
      description: "SuperColony-style evaluator",
      evaluate: async (input: EvaluatorInput) => ({
        pass: true,
        score: 80,
        reason: `topic: ${input.context.topic}, category: ${input.context.category}`,
      }),
    };

    const result = await evaluator.evaluate({
      text: "test post",
      context: { topic: "defi", category: "ANALYSIS" },
    });
    expect(result.pass).toBe(true);
    expect(result.reason).toContain("defi");
  });

  it("accepts context with Eliza-style fields", async () => {
    const evaluator: Evaluator = {
      name: "eliza-evaluator",
      description: "Eliza-style evaluator",
      evaluate: async (input: EvaluatorInput) => ({
        pass: true,
        reason: `room: ${input.context.roomId}`,
      }),
    };

    const result = await evaluator.evaluate({
      text: "hello",
      context: { roomId: "room-123", entityId: "user-456" },
    });
    expect(result.reason).toContain("room-123");
  });

  it("works with empty context", async () => {
    const evaluator: Evaluator = {
      name: "minimal",
      description: "Minimal evaluator",
      evaluate: async (input) => ({
        pass: input.text.length > 0,
        reason: "text present",
      }),
    };

    const result = await evaluator.evaluate({ text: "hi", context: {} });
    expect(result.pass).toBe(true);
  });
});

// ── EventPlugin ─────────────────────────────────────

describe("EventPlugin registration", () => {
  const mockSource: EventSource = {
    id: "social:replies",
    description: "Detects replies to agent posts",
    eventTypes: ["reply"],
    poll: async () => ({ items: [] }),
    diff: (prev, curr) => [],
    extractWatermark: (s) => null,
  };

  const mockHandler: EventHandler = {
    name: "reply-handler",
    eventTypes: ["reply"],
    handle: async (event: AgentEvent) => ({
      type: "react" as const,
      params: { txHash: event.payload, reaction: "agree" },
    }),
  };

  it("registers event plugin via registerEvent()", () => {
    const registry = createPluginRegistry();
    const eventPlugin: EventPlugin = {
      name: "social-reactive",
      version: "1.0.0",
      sources: [mockSource],
      handlers: [mockHandler],
    };
    registry.registerEvent(eventPlugin);
    expect(registry.getAllEvents()).toHaveLength(1);
  });

  it("getEventSources() returns all sources across event plugins", () => {
    const registry = createPluginRegistry();
    registry.registerEvent({
      name: "ep1",
      version: "1.0.0",
      sources: [mockSource],
    });
    registry.registerEvent({
      name: "ep2",
      version: "1.0.0",
      sources: [{ ...mockSource, id: "social:mentions" }],
    });
    expect(registry.getEventSources()).toHaveLength(2);
  });

  it("getEventHandlers() returns all handlers across event plugins", () => {
    const registry = createPluginRegistry();
    registry.registerEvent({
      name: "ep1",
      version: "1.0.0",
      handlers: [mockHandler],
    });
    expect(registry.getEventHandlers()).toHaveLength(1);
    expect(registry.getEventHandlers()[0].name).toBe("reply-handler");
  });

  it("event plugins coexist with session plugins", () => {
    const registry = createPluginRegistry();
    registry.register({ name: "session-plugin", version: "1.0.0" });
    registry.registerEvent({ name: "event-plugin", version: "1.0.0", sources: [mockSource] });
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAllEvents()).toHaveLength(1);
    expect(registry.getEventSources()).toHaveLength(1);
  });

  it("EventPlugin eventHooks are callable and functional", async () => {
    const onEventCalled: string[] = [];
    const plugin: EventPlugin = {
      name: "hooks-test",
      version: "1.0.0",
      eventHooks: {
        onEvent: async (event) => { onEventCalled.push(event.id); },
        beforeAction: async () => true,
        afterAction: async () => {},
        onError: async () => {},
      },
    };
    expect(plugin.eventHooks?.onEvent).toBeDefined();
    expect(plugin.eventHooks?.beforeAction).toBeDefined();

    // Actually invoke the hook and verify side effect
    const testEvent: AgentEvent = {
      id: "test-evt-1", sourceId: "test", type: "test",
      detectedAt: Date.now(), payload: null, watermark: null,
    };
    await plugin.eventHooks!.onEvent!(testEvent);
    expect(onEventCalled).toEqual(["test-evt-1"]);

    const shouldProceed = await plugin.eventHooks!.beforeAction!(testEvent, { type: "log_only", params: {} });
    expect(shouldProceed).toBe(true);
  });
});

// ── AgentEvent & EventAction types ──────────────────

describe("AgentEvent and EventAction", () => {
  it("creates a well-typed AgentEvent", () => {
    const event: AgentEvent<{ txHash: string; text: string }> = {
      id: "social:replies:1710000000000:abc123",
      sourceId: "social:replies",
      type: "reply",
      detectedAt: Date.now(),
      payload: { txHash: "abc123", text: "I agree with your analysis" },
      watermark: { txHash: "abc123", timestamp: 1710000000000 },
    };
    expect(event.sourceId).toBe("social:replies");
    expect(event.payload.txHash).toBe("abc123");
  });

  it("EventAction covers all action types", () => {
    const actions: EventAction[] = [
      { type: "publish", params: { text: "hello" } },
      { type: "reply", params: { parentTx: "abc", text: "response" } },
      { type: "react", params: { txHash: "abc", reaction: "agree" } },
      { type: "tip", params: { address: "0x...", amount: 5 } },
      { type: "log_only", params: { reason: "budget exhausted" } },
    ];
    expect(actions).toHaveLength(5);
    expect(actions.map(a => a.type)).toEqual(["publish", "reply", "react", "tip", "log_only"]);
  });
});
