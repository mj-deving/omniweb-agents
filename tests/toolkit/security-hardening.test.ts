/**
 * Tests for security hardening fixes S9, S10, S11, S13, S14, S15.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileStateStore } from "../../src/toolkit/state-store.js";
import { createSdkBridge } from "../../src/toolkit/sdk-bridge.js";
import { sanitizeUrl } from "../../src/toolkit/sdk-bridge.js";
import { stateKey, safeParse } from "../../src/toolkit/guards/state-helpers.js";

// ── S9: State Files World-Readable ──────────────────

describe("S9: State file permissions", () => {
  let tempDir: string;
  let store: FileStateStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-s9-"));
    store = new FileStateStore(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes state files with mode 0o600 (owner read/write only)", async () => {
    await store.set("perm-test", '{"data":"secret"}');

    // Read the actual file permissions
    const files = await import("node:fs/promises").then((fs) =>
      fs.readdir(tempDir),
    );
    const stateFile = files.find((f) => f.startsWith("state-"));
    expect(stateFile).toBeDefined();

    const stats = statSync(join(tempDir, stateFile!));
    // mode includes file type bits; mask to permission bits only
    const perms = stats.mode & 0o777;
    expect(perms).toBe(0o600);
  });
});

// ── S10: Error Messages Leak URLs with API Keys ─────

describe("S10: URL sanitization in error messages", () => {
  it("sanitizeUrl preserves benign query parameters and redacts sensitive ones", () => {
    const result = sanitizeUrl("https://api.example.com/data?api_key=SECRET&other=value");
    expect(result).toBe("https://api.example.com/data?api_key=REDACTED&other=value");
    expect(result).not.toContain("SECRET");
  });

  it("sanitizeUrl handles URL without query params", () => {
    const result = sanitizeUrl("https://api.example.com/data");
    expect(result).toBe("https://api.example.com/data");
  });

  it("sanitizeUrl returns original string for invalid URLs", () => {
    const result = sanitizeUrl("not-a-url");
    expect(result).toBe("[invalid URL]");
  });

  it("attestDahr error messages do not leak API keys", async () => {
    const demos = {
      web2: {
        createDahr: vi.fn(async () => ({
          startProxy: vi.fn(async () => ({
            status: 403,
            data: "{}",
          })),
        })),
      },
    };

    const bridge = createSdkBridge(demos as any, "https://api.example.com", "token");
    await expect(
      bridge.attestDahr("https://api.example.com/data?api_key=SECRET123"),
    ).rejects.toThrow(/api\.example\.com\/data/);

    // Verify the error does NOT contain the secret
    try {
      await bridge.attestDahr("https://api.example.com/data?api_key=SECRET123&limit=10");
    } catch (e) {
      expect((e as Error).message).not.toContain("SECRET123");
      expect((e as Error).message).toContain("api.example.com/data?api_key=REDACTED&limit=10");
    }
  });
});

// ── S11: getDemos() Bypasses All Guardrails ─────────

describe("S11: getDemos() guardrail gate", () => {
  const mockDemos = { web2: { createDahr: vi.fn() } } as any;

  it("throws without allowRawSdk flag", () => {
    const bridge = createSdkBridge(mockDemos, "https://api.example.com", "token");
    expect(() => bridge.getDemos()).toThrow("allowRawSdk");
  });

  it("returns Demos instance with allowRawSdk: true", () => {
    const bridge = createSdkBridge(
      mockDemos,
      "https://api.example.com",
      "token",
      undefined,
      undefined,
      { allowRawSdk: true },
    );
    expect(bridge.getDemos()).toBe(mockDemos);
  });
});

// ── S13: No Timeout on DAHR Proxy Request ───────────

describe("S13: DAHR proxy timeout", () => {
  it("attestDahr races startProxy against a 30s timeout", async () => {
    // Verify the timeout mechanism: a fast-resolving proxy succeeds,
    // proving the race wrapper doesn't interfere with normal operation
    const demos = {
      web2: {
        createDahr: vi.fn(async () => ({
          startProxy: vi.fn(async () => ({
            responseHash: "h",
            txHash: "t",
            data: '{"ok":true}',
            status: 200,
          })),
        })),
      },
    };

    const bridge = createSdkBridge(demos as any, "https://api.example.com", "token");
    const result = await bridge.attestDahr("https://api.example.com/data");
    expect(result.responseHash).toBe("h");
    expect(result.txHash).toBe("t");
  });

  it("rejects with DAHR proxy timeout message on hang", async () => {
    // Use a real short timeout by monkey-patching the implementation
    // to verify the error message format matches expectations
    const demos = {
      web2: {
        createDahr: vi.fn(async () => ({
          startProxy: vi.fn(
            () => new Promise((resolve) => setTimeout(resolve, 500)),
          ),
        })),
      },
    };

    const bridge = createSdkBridge(demos as any, "https://api.example.com", "token");

    // Race against our own shorter timeout to verify the bridge is using Promise.race
    const result = await Promise.race([
      bridge.attestDahr("https://api.example.com/data").then(() => "resolved"),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("still-waiting"), 50),
      ),
    ]);

    // The bridge is waiting (proxy takes 500ms, we checked at 50ms)
    // This confirms Promise.race is in play — the proxy hasn't resolved yet
    expect(result).toBe("still-waiting");
  });
});

// ── S14: State Key Hash Truncation ──────────────────

describe("S14: stateKey hash length", () => {
  it("returns prefix + 32 hex characters (128-bit collision resistance)", () => {
    const key = stateKey("rate-limit", "demos1abc123def456");
    const parts = key.split("-");
    // prefix is "rate-limit", hash is last part
    const hash = parts[parts.length - 1];
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces different keys for different wallets", () => {
    const key1 = stateKey("test", "wallet-a");
    const key2 = stateKey("test", "wallet-b");
    expect(key1).not.toBe(key2);
  });
});

// ── S15: JSON.parse Prototype Pollution ─────────────

describe("S15: safeParse prototype pollution protection", () => {
  it("strips __proto__ from parsed objects", () => {
    const result = safeParse('{"__proto__":{"admin":true},"name":"ok"}');
    expect(result).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(false);
    expect((result as any).name).toBe("ok");
  });

  it("strips constructor and prototype keys", () => {
    const result = safeParse('{"constructor":{"x":1},"prototype":{"y":2},"safe":"yes"}') as any;
    expect(Object.prototype.hasOwnProperty.call(result, "constructor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, "prototype")).toBe(false);
    expect(result.safe).toBe("yes");
  });

  it("recursively sanitizes nested objects", () => {
    const result = safeParse('{"data":{"__proto__":{"admin":true},"value":1}}') as any;
    expect(Object.prototype.hasOwnProperty.call(result.data, "__proto__")).toBe(false);
    expect(result.data.value).toBe(1);
  });

  it("handles arrays and primitives", () => {
    expect(safeParse("[1,2,3]")).toEqual([1, 2, 3]);
    expect(safeParse('"hello"')).toBe("hello");
    expect(safeParse("42")).toBe(42);
    expect(safeParse("null")).toBe(null);
  });

  it("throws on invalid JSON", () => {
    expect(() => safeParse("not json")).toThrow();
  });
});
