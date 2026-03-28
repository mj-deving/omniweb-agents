/**
 * Tests for react() tool — on-chain HIVE reaction with API fallback.
 *
 * Chain-first: publishes HIVE reaction via publishHiveReaction.
 * Fallback: API POST when chain fails and apiAccess === "authenticated".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { react } from "../../../src/toolkit/tools/react.js";
import type { SdkBridge, ApiCallResult, D402SettlementResult, ApiAccessState } from "../../../src/toolkit/sdk-bridge.js";

function createMockBridge(overrides?: Partial<SdkBridge>): SdkBridge {
  return {
    attestDahr: vi.fn(async () => ({ responseHash: "h", txHash: "t", data: {}, url: "" })),
    apiCall: vi.fn(async (): Promise<ApiCallResult> => ({ ok: false, status: 0, data: "chain-only" })),
    publishHivePost: vi.fn(async () => ({ txHash: "p" })),
    transferDem: vi.fn(async () => ({ txHash: "t" })),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "d" })),
    getDemos: vi.fn() as unknown as SdkBridge["getDemos"],
    apiAccess: "none" as ApiAccessState,
    verifyTransaction: vi.fn(async () => null),
    getHivePosts: vi.fn(async () => []),
    resolvePostAuthor: vi.fn(async () => null),
    publishHiveReaction: vi.fn(async () => ({ txHash: "react-on-chain-hash" })),
    ...overrides,
  };
}

function createTestSession(tempDir: string, bridge: SdkBridge) {
  return new DemosSession({
    walletAddress: "demos1react",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: { bridge },
    stateStore: new FileStateStore(tempDir),
  });
}

describe("react()", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-react-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("on-chain primary path", () => {
    it("returns success with txHash on valid agree reaction", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xabc123", type: "agree" });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.data!.txHash).toBe("react-on-chain-hash");
      expect(result.provenance.path).toBe("local");
      expect(bridge.publishHiveReaction).toHaveBeenCalledWith("0xabc123", "agree");
    });

    it("returns success on valid disagree reaction", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xdef456", type: "disagree" });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(bridge.publishHiveReaction).toHaveBeenCalledWith("0xdef456", "disagree");
    });

    it("does not call apiCall when chain succeeds", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      await react(session, { txHash: "0xtest", type: "agree" });

      expect(bridge.apiCall).not.toHaveBeenCalled();
    });
  });

  describe("API fallback", () => {
    it("falls back to API when chain fails and apiAccess is authenticated", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bridge = createMockBridge({
        publishHiveReaction: vi.fn(async () => { throw new Error("Chain broadcast failed"); }),
        apiAccess: "authenticated" as ApiAccessState,
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { success: true },
        })),
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xfallback", type: "agree" });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(bridge.apiCall).toHaveBeenCalledWith("/api/react", expect.objectContaining({
        method: "POST",
      }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("API fallback"));
      warnSpy.mockRestore();
    });

    it("does NOT fall back to API when apiAccess is configured (not authenticated)", async () => {
      const bridge = createMockBridge({
        publishHiveReaction: vi.fn(async () => { throw new Error("Chain failed"); }),
        apiAccess: "configured" as ApiAccessState,
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xnofall", type: "agree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("TX_FAILED");
      expect(bridge.apiCall).not.toHaveBeenCalled();
    });

    it("does NOT fall back to API when apiAccess is none", async () => {
      const bridge = createMockBridge({
        publishHiveReaction: vi.fn(async () => { throw new Error("Chain failed"); }),
        apiAccess: "none" as ApiAccessState,
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xnoapi", type: "disagree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("TX_FAILED");
      expect(bridge.apiCall).not.toHaveBeenCalled();
    });

    it("returns TX_FAILED when both chain and API fail", async () => {
      const bridge = createMockBridge({
        publishHiveReaction: vi.fn(async () => { throw new Error("Chain failed"); }),
        apiAccess: "authenticated" as ApiAccessState,
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: false,
          status: 500,
          data: "Internal Server Error",
        })),
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xbothfail", type: "agree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("TX_FAILED");
      expect(result.error!.message).toContain("chain");
    });

    it("returns TX_FAILED when both chain and API throw", async () => {
      const bridge = createMockBridge({
        publishHiveReaction: vi.fn(async () => { throw new Error("Chain down"); }),
        apiAccess: "authenticated" as ApiAccessState,
        apiCall: vi.fn(async () => { throw new Error("API also down"); }),
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xbotherr", type: "disagree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("TX_FAILED");
      expect(result.error!.message).toContain("both chain and API");
    });
  });

  describe("validation", () => {
    it("returns INVALID_INPUT error for missing txHash", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "", type: "agree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
      expect(result.error!.retryable).toBe(false);
    });

    it("returns INVALID_INPUT error for invalid type", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      // @ts-expect-error — intentionally passing invalid type
      const result = await react(session, { txHash: "0xabc", type: "love" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
    });
  });
});
