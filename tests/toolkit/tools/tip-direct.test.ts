/**
 * Direct test coverage for tip() tool.
 *
 * Tests: validation errors, spend cap exceeded, RPC resolution success,
 * feed API fallback when RPC unavailable.
 * Complements tip-chain-resolution.test.ts which focuses on resolution ordering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { tip } from "../../../src/toolkit/tools/tip.js";
import type { SdkBridge, ApiCallResult, D402SettlementResult } from "../../../src/toolkit/sdk-bridge.js";

// ── Helpers ──────────────────────────────────────────

const TARGET_TX = "AABBCCDD11223344DEADBEEF";
const AUTHOR_ADDR = "demos1postauthor";

function mockBridge(overrides?: Partial<SdkBridge>): SdkBridge {
  return {
    attestDahr: vi.fn(async () => ({ responseHash: "h", txHash: "t", data: {}, url: "" })),
    apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
      ok: true,
      status: 200,
      data: { posts: [{ txHash: TARGET_TX, sender: AUTHOR_ADDR, timestamp: Date.now(), reactions: { agree: 0, disagree: 0 }, payload: { text: "test", cat: "ANALYSIS", tags: [] } }] },
    })),
    publishHivePost: vi.fn(async () => ({ txHash: "p" })),
    transferDem: vi.fn(async () => ({ txHash: "tip-result-hash" })),
    getDemos: vi.fn(() => ({}) as any),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "d" })),
    queryTransaction: vi.fn(async () => ({ sender: AUTHOR_ADDR })),
    ...overrides,
  };
}

function createSession(tempDir: string, bridge: SdkBridge, tipPolicy?: { maxPerTip?: number; maxPerPost?: number; cooldownMs?: number }) {
  return new DemosSession({
    walletAddress: "demos1tiptest",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: { demos: {}, bridge },
    stateStore: new FileStateStore(tempDir),
    tipPolicy: tipPolicy ?? { maxPerTip: 10, maxPerPost: 5, cooldownMs: 0 },
  });
}

// ── Tests ────────────────────────────────────────────

describe("tip() direct tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-tip-direct-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("validation error case", () => {
    it("returns INVALID_INPUT when txHash is empty", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: "", amount: 2 });

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe("INVALID_INPUT");
      expect(result.error!.retryable).toBe(false);
    });

    it("returns INVALID_INPUT when txHash is whitespace only", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: "   ", amount: 2 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
    });

    it("returns INVALID_INPUT when amount is zero", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: 0 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
    });

    it("returns INVALID_INPUT when amount is negative", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: -5 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
    });

    it("returns INVALID_INPUT when amount is NaN", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: NaN });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
    });
  });

  describe("spend cap exceeded", () => {
    it("returns SPEND_LIMIT when amount exceeds maxPerTip", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge, { maxPerTip: 5, maxPerPost: 10, cooldownMs: 0 });

      const result = await tip(session, { txHash: TARGET_TX, amount: 6 });

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe("SPEND_LIMIT");
      expect(result.error!.message).toContain("5");
      expect(bridge.transferDem).not.toHaveBeenCalled();
    });

    it("returns SPEND_LIMIT when per-post tip count exceeded", async () => {
      const bridge = mockBridge();
      // Allow only 2 tips per post
      const session = createSession(tempDir, bridge, { maxPerTip: 10, maxPerPost: 2, cooldownMs: 0 });

      // First two tips should succeed
      const r1 = await tip(session, { txHash: TARGET_TX, amount: 1 });
      expect(r1.ok).toBe(true);
      const r2 = await tip(session, { txHash: TARGET_TX, amount: 1 });
      expect(r2.ok).toBe(true);

      // Third tip should be blocked
      const r3 = await tip(session, { txHash: TARGET_TX, amount: 1 });
      expect(r3.ok).toBe(false);
      expect(r3.error!.code).toBe("SPEND_LIMIT");
      expect(r3.error!.message).toContain("2");
    });
  });

  describe("success with RPC resolution", () => {
    it("tips successfully when RPC resolves sender address", async () => {
      const bridge = mockBridge({
        queryTransaction: vi.fn(async () => ({ sender: AUTHOR_ADDR })),
      });
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: 3 });

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.txHash).toBe("tip-result-hash");
      expect(bridge.transferDem).toHaveBeenCalledWith(
        AUTHOR_ADDR,
        3,
        `HIVE_TIP:${TARGET_TX}`,
      );
      expect(result.provenance.path).toBe("local");
      // Feed API should NOT be called when RPC succeeds
      expect(bridge.apiCall).not.toHaveBeenCalled();
    });
  });

  describe("feed API fallback when RPC unavailable", () => {
    it("falls back to feed API when bridge has no queryTransaction method", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bridge = mockBridge({
        queryTransaction: undefined,
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: {
            posts: [{
              txHash: TARGET_TX,
              sender: AUTHOR_ADDR,
              timestamp: Date.now(),
              reactions: { agree: 0, disagree: 0 },
              payload: { text: "test", cat: "ANALYSIS", tags: [] },
            }],
          },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: 2 });

      expect(result.ok).toBe(true);
      expect(result.data!.txHash).toBe("tip-result-hash");
      expect(bridge.transferDem).toHaveBeenCalledWith(
        AUTHOR_ADDR,
        2,
        `HIVE_TIP:${TARGET_TX}`,
      );
      expect(bridge.apiCall).toHaveBeenCalledWith(`/api/feed?limit=50`);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("feed API"));
      warnSpy.mockRestore();
    });

    it("returns NETWORK_ERROR when feed API also fails", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bridge = mockBridge({
        queryTransaction: vi.fn(async () => null),
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: false,
          status: 503,
          data: "Service Unavailable",
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: 2 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(result.error!.retryable).toBe(true);
      expect(bridge.transferDem).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns INVALID_INPUT when post not found in feed", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bridge = mockBridge({
        queryTransaction: vi.fn(async () => null),
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { posts: [{ txHash: "OTHER_TX", sender: "demos1other", timestamp: Date.now(), reactions: { agree: 0, disagree: 0 }, payload: { text: "other", cat: "ANALYSIS" } }] },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: 2 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
      expect(result.error!.message).toContain("not found in feed");
      expect(bridge.transferDem).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("returns INVALID_INPUT when post found but has no sender address", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bridge = mockBridge({
        queryTransaction: vi.fn(async () => null),
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: {
            posts: [{
              txHash: TARGET_TX,
              // no sender field — parseFeedPosts will set author to ""
              timestamp: Date.now(),
              reactions: { agree: 0, disagree: 0 },
              payload: { text: "test", cat: "ANALYSIS" },
            }],
          },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await tip(session, { txHash: TARGET_TX, amount: 2 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
      expect(result.error!.message).toContain("no sender address");
      expect(bridge.transferDem).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
