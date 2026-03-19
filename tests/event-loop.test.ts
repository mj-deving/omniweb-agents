/**
 * Tests for EventLoop — adaptive interval + integration tests.
 *
 * Pure function tests use direct calls.
 * Integration tests use real timers with short intervals.
 */

import { describe, it, expect, vi } from "vitest";
import {
  startEventLoop,
  nextInterval,
  type AdaptiveInterval,
} from "../src/lib/event-loop.js";
import { createMemoryWatermarkStore } from "../src/lib/watermark-store.js";
import type { AgentEvent, EventAction, EventSource, EventHandler } from "../src/types.js";

// ── Adaptive Interval (pure function) ───────────────

describe("nextInterval", () => {
  const base: AdaptiveInterval = {
    current: 30000,
    base: 30000,
    min: 10000,
    max: 900000,
    backoffFactor: 1.5,
    consecutiveEmpty: 0,
  };

  it("resets to base when events found", () => {
    const backed = { ...base, current: 60000, consecutiveEmpty: 3 };
    const result = nextInterval(backed, true);
    expect(result.current).toBe(30000);
    expect(result.consecutiveEmpty).toBe(0);
  });

  it("backs off when no events", () => {
    const result = nextInterval(base, false);
    expect(result.current).toBe(45000); // 30000 * 1.5^1
    expect(result.consecutiveEmpty).toBe(1);
  });

  it("continues backing off on successive empty polls", () => {
    let state = base;
    state = nextInterval(state, false); // 45000
    state = nextInterval(state, false); // 30000 * 1.5^2 = 67500
    expect(state.current).toBe(67500);
    expect(state.consecutiveEmpty).toBe(2);
  });

  it("clamps to max ceiling", () => {
    const small: AdaptiveInterval = { ...base, max: 50000 };
    let state = small;
    for (let i = 0; i < 20; i++) state = nextInterval(state, false);
    expect(state.current).toBe(50000);
  });

  it("resets overrides floor (base can be below min)", () => {
    const state: AdaptiveInterval = { ...base, base: 5000, min: 10000, current: 60000, consecutiveEmpty: 5 };
    const result = nextInterval(state, true);
    expect(result.current).toBe(5000); // Reset goes to base, not clamped to min
  });

  it("empty backoff respects floor", () => {
    const state: AdaptiveInterval = { ...base, base: 8000, min: 10000, consecutiveEmpty: 0 };
    const result = nextInterval(state, false);
    // 8000 * 1.5^1 = 12000 > min, so 12000
    expect(result.current).toBe(12000);
  });

  it("returns immutable copy", () => {
    const result = nextInterval(base, false);
    expect(result).not.toBe(base);
    expect(base.consecutiveEmpty).toBe(0); // original unchanged
  });
});

// ── EventLoop Integration (real timers, short intervals) ────

describe("startEventLoop", () => {
  function makeEvent(id: string): AgentEvent {
    return {
      id,
      sourceId: "test-source",
      type: "test-event",
      detectedAt: Date.now(),
      payload: { data: id },
      watermark: id,
    };
  }

  it("starts and stops without error", async () => {
    const source: EventSource = {
      id: "noop",
      description: "No-op source",
      eventTypes: [],
      poll: async () => null,
      diff: () => [],
      extractWatermark: () => null,
    };
    const store = createMemoryWatermarkStore();
    const actionFn = vi.fn().mockResolvedValue(undefined);

    const loop = startEventLoop(
      { agent: "test" },
      [{ source, intervalMs: 50 }],
      [],
      store,
      actionFn,
    );

    expect(loop.stats().totalEvents).toBe(0);
    await loop.stop();
  });

  it("polls source and dispatches events to handler", async () => {
    // Source emits one event on every poll where prev differs from curr
    let pollCount = 0;
    const source: EventSource<number> = {
      id: "counter",
      description: "Counter source",
      eventTypes: ["tick"],
      poll: async () => ++pollCount,
      diff: (prev, curr) => {
        // Always emit when counter advances (prev !== curr)
        if (prev === null || prev !== curr) {
          return [{
            id: `tick-${curr}`,
            sourceId: "counter",
            type: "tick",
            detectedAt: Date.now(),
            payload: curr,
            watermark: curr,
          }];
        }
        return [];
      },
      extractWatermark: (s) => s,
    };

    const handled: string[] = [];
    const handler: EventHandler = {
      name: "ticker",
      eventTypes: ["tick"],
      handle: async (event) => {
        handled.push(event.id);
        return { type: "log_only", params: {} };
      },
    };

    const store = createMemoryWatermarkStore();
    const actionFn = vi.fn().mockResolvedValue(undefined);

    const loop = startEventLoop(
      { agent: "test" },
      [{ source, intervalMs: 30, minIntervalMs: 30, maxIntervalMs: 200 }],
      [handler],
      store,
      actionFn,
    );

    // Wait for several poll cycles
    await new Promise(r => setTimeout(r, 300));

    expect(handled.length).toBeGreaterThan(0);
    expect(actionFn).toHaveBeenCalled();
    expect(loop.stats().totalEvents).toBeGreaterThan(0);
    expect(loop.stats().totalActions).toBeGreaterThan(0);

    await loop.stop();
  });

  it("saves watermarks when events are detected", async () => {
    // Source emits one event on first poll (prev=null), then no more
    const source: EventSource<number> = {
      id: "wm-test",
      description: "Watermark test",
      eventTypes: ["wm-evt"],
      poll: async () => 42,
      diff: (prev) => prev === null ? [{
        id: "wm-1", sourceId: "wm-test", type: "wm-evt",
        detectedAt: Date.now(), payload: null, watermark: 42,
      }] : [],
      extractWatermark: (s) => s,
    };

    const store = createMemoryWatermarkStore();
    const handler: EventHandler = {
      name: "wm-h", eventTypes: ["wm-evt"],
      handle: async () => ({ type: "log_only" as const, params: {} }),
    };
    const actionFn = vi.fn().mockResolvedValue(undefined);

    const loop = startEventLoop(
      { agent: "test" },
      [{ source, intervalMs: 50, minIntervalMs: 50, maxIntervalMs: 200 }],
      [handler],
      store,
      actionFn,
    );

    await new Promise(r => setTimeout(r, 300));
    const wm = await store.load("wm-test");
    expect(wm).toBe(42);
    await loop.stop();
  });

  it("does not save watermark when no events detected", async () => {
    const source: EventSource<number> = {
      id: "no-save",
      description: "No events source",
      eventTypes: [],
      poll: async () => 0,
      diff: () => [],
      extractWatermark: (s) => s,
    };

    const store = createMemoryWatermarkStore();
    const actionFn = vi.fn().mockResolvedValue(undefined);

    const loop = startEventLoop(
      { agent: "test" },
      [{ source, intervalMs: 50, minIntervalMs: 50, maxIntervalMs: 200 }],
      [],
      store,
      actionFn,
    );

    await new Promise(r => setTimeout(r, 200));
    const wm = await store.load("no-save");
    expect(wm).toBeNull(); // No events = no watermark save
    await loop.stop();
  });

  it("calls onError for handler failures without crashing", async () => {
    const source: EventSource<number> = {
      id: "err-src",
      description: "Error source",
      eventTypes: ["err"],
      poll: async () => 1,
      diff: (prev, curr) => prev === null ? [makeEvent("err-1")] : [],
      extractWatermark: () => 1,
    };

    const failHandler: EventHandler = {
      name: "fail",
      eventTypes: ["err", "test-event"],
      handle: async () => { throw new Error("boom"); },
    };

    const errors: Error[] = [];
    const store = createMemoryWatermarkStore();
    const actionFn = vi.fn().mockResolvedValue(undefined);

    const loop = startEventLoop(
      { agent: "test" },
      [{ source, intervalMs: 50, minIntervalMs: 50, maxIntervalMs: 200 }],
      [failHandler],
      store,
      actionFn,
      (event, err) => errors.push(err),
    );

    await new Promise(r => setTimeout(r, 200));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toBe("boom");
    expect(loop.stats().totalErrors).toBeGreaterThan(0);
    await loop.stop();
  });

  it("only dispatches to handlers matching event type", async () => {
    const source: EventSource<number> = {
      id: "typed-src",
      description: "Typed source",
      eventTypes: ["alpha"],
      poll: async () => 1,
      diff: (prev) => prev === null ? [{
        id: "a1", sourceId: "typed-src", type: "alpha",
        detectedAt: Date.now(), payload: null, watermark: 1,
      }] : [],
      extractWatermark: () => 1,
    };

    const alphaHandler: EventHandler = {
      name: "alpha-h",
      eventTypes: ["alpha"],
      handle: async () => ({ type: "log_only" as const, params: {} }),
    };
    const betaHandler: EventHandler = {
      name: "beta-h",
      eventTypes: ["beta"],
      handle: vi.fn().mockResolvedValue(null),
    };

    const store = createMemoryWatermarkStore();
    const actionFn = vi.fn().mockResolvedValue(undefined);

    const loop = startEventLoop(
      { agent: "test" },
      [{ source, intervalMs: 50, minIntervalMs: 50, maxIntervalMs: 200 }],
      [alphaHandler, betaHandler],
      store,
      actionFn,
    );

    await new Promise(r => setTimeout(r, 200));
    expect(betaHandler.handle).not.toHaveBeenCalled();
    await loop.stop();
  });
});
