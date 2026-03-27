/**
 * Direct tests for state-helpers: safeParse(), stateKey(), loadState().
 *
 * Focused on safeParse security (prototype pollution), stateKey determinism,
 * and loadState corruption recovery — gaps not covered by the existing
 * state-helpers.test.ts which focuses on checkAndAppend integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { safeParse, stateKey, loadState } from "../../../src/toolkit/guards/state-helpers.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";

// ── safeParse() ──────────────────────────────────────

describe("safeParse()", () => {
  it("parses valid JSON objects", () => {
    const result = safeParse('{"count":42,"name":"test"}');
    expect(result).toEqual({ count: 42, name: "test" });
  });

  it("parses valid JSON arrays", () => {
    const result = safeParse('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses JSON primitives", () => {
    expect(safeParse('"hello"')).toBe("hello");
    expect(safeParse("42")).toBe(42);
    expect(safeParse("true")).toBe(true);
    expect(safeParse("null")).toBeNull();
  });

  it("strips __proto__ keys to prevent prototype pollution", () => {
    const result = safeParse('{"__proto__":{"polluted":true},"safe":"value"}') as Record<string, unknown>;
    expect(result.safe).toBe("value");
    // __proto__ key must not be an own property on the parsed object
    expect(Object.hasOwn(result, "__proto__")).toBe(false);
    // Verify Object.prototype was not polluted
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("strips constructor key as own property", () => {
    const result = safeParse('{"constructor":{"evil":true},"ok":"yes"}') as Record<string, unknown>;
    // constructor key must not be an own property (inherited Object.constructor still exists)
    expect(Object.hasOwn(result, "constructor")).toBe(false);
    expect(result.ok).toBe("yes");
  });

  it("strips prototype key", () => {
    const result = safeParse('{"prototype":{"bad":true},"good":"data"}') as Record<string, unknown>;
    expect(Object.hasOwn(result, "prototype")).toBe(false);
    expect(result.good).toBe("data");
  });

  it("strips nested pollution vectors", () => {
    const result = safeParse('{"outer":{"__proto__":{"attack":true},"keep":"this"}}') as Record<string, unknown>;
    const outer = result.outer as Record<string, unknown>;
    expect(outer.keep).toBe("this");
    // __proto__ key must not be an own property on the nested object
    expect(Object.hasOwn(outer, "__proto__")).toBe(false);
  });

  it("throws on corrupt JSON", () => {
    expect(() => safeParse("not-json{{{")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => safeParse("")).toThrow();
  });
});

// ── stateKey() ───────────────────────────────────────

describe("stateKey()", () => {
  it("is deterministic for same inputs", () => {
    const a = stateKey("rate-limit", "demos1wallet");
    const b = stateKey("rate-limit", "demos1wallet");
    expect(a).toBe(b);
  });

  it("produces prefix-hash format with 32-char hex hash", () => {
    const key = stateKey("dedup", "demos1abc");
    const parts = key.split("-");
    // prefix is "dedup", rest is 32-char hex
    expect(key).toMatch(/^dedup-[a-f0-9]{32}$/);
  });

  it("varies by wallet address", () => {
    const k1 = stateKey("guard", "demos1aaa");
    const k2 = stateKey("guard", "demos1bbb");
    expect(k1).not.toBe(k2);
  });

  it("varies by prefix", () => {
    const k1 = stateKey("rate", "demos1same");
    const k2 = stateKey("dedup", "demos1same");
    expect(k1).not.toBe(k2);
  });

  it("handles empty wallet address without throwing", () => {
    const key = stateKey("prefix", "");
    expect(key).toMatch(/^prefix-[a-f0-9]{32}$/);
  });
});

// ── loadState() ──────────────────────────────────────

describe("loadState()", () => {
  let tempDir: string;
  let store: FileStateStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-state-helpers-direct-"));
    store = new FileStateStore(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns deep clone of default when key is missing", async () => {
    const defaultVal = { entries: [], count: 0 };
    const result = await loadState(store, "nonexistent-key", defaultVal);

    expect(result).toEqual({ entries: [], count: 0 });
    // Verify it is a clone, not the same reference
    result.count = 99;
    expect(defaultVal.count).toBe(0);
  });

  it("returns parsed state for valid stored JSON", async () => {
    await store.set("valid-key", JSON.stringify({ entries: [{ timestamp: 1000 }], count: 5 }));
    const result = await loadState(store, "valid-key", { entries: [], count: 0 });

    expect(result).toEqual({ entries: [{ timestamp: 1000 }], count: 5 });
  });

  it("recovers from corrupt data by returning default", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await store.set("corrupt-key", "this is not json!!!");

    const result = await loadState(store, "corrupt-key", { entries: [], fallback: true });

    expect(result).toEqual({ entries: [], fallback: true });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain("State corruption detected");
    warnSpy.mockRestore();
  });

  it("strips prototype pollution from stored state", async () => {
    await store.set("polluted-key", '{"__proto__":{"hacked":true},"entries":[]}');
    const result = await loadState(store, "polluted-key", { entries: [] }) as Record<string, unknown>;

    expect(result.entries).toEqual([]);
    // __proto__ key must not be an own property
    expect(Object.hasOwn(result, "__proto__")).toBe(false);
    // Global prototype must not be polluted
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
  });

  it("returns default clone on corrupt data (mutation safe)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await store.set("bad-key", "{broken");

    const defaultVal = { items: [1, 2, 3] };
    const result = await loadState(store, "bad-key", defaultVal);

    // Mutate the result
    result.items.push(4);
    // Original default must be untouched
    expect(defaultVal.items).toEqual([1, 2, 3]);
    warnSpy.mockRestore();
  });
});
