/**
 * Tests for react() tool — API-only HIVE reactions.
 *
 * Reactions are tracked by SuperColony's backend, not on-chain.
 * Uses POST /api/feed/{txHash}/react with body { type }.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { react, getReactionCounts } from "../../../src/toolkit/tools/react.js";
import type { SdkBridge, ApiCallResult, D402SettlementResult, ApiAccessState } from "../../../src/toolkit/sdk-bridge.js";

function createMockBridge(overrides?: Partial<SdkBridge>): SdkBridge {
  return {
    attestDahr: vi.fn(async () => ({ responseHash: "h", txHash: "t", data: {}, url: "" })),
    apiCall: vi.fn(async (): Promise<ApiCallResult> => ({ ok: true, status: 200, data: { success: true } })),
    publishHivePost: vi.fn(async () => ({ txHash: "p" })),
    transferDem: vi.fn(async () => ({ txHash: "t" })),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "d" })),
    getDemos: vi.fn() as unknown as SdkBridge["getDemos"],
    apiAccess: "authenticated" as ApiAccessState,
    verifyTransaction: vi.fn(async () => null),
    getHivePosts: vi.fn(async () => []),
    resolvePostAuthor: vi.fn(async () => null),
    getHivePostsByAuthor: vi.fn(async () => []),
    getRepliesTo: vi.fn(async () => []),
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

  describe("API-based reactions", () => {
    it("sends agree reaction via API", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xabc123", type: "agree" });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(result.provenance.path).toBe("local");
      expect(bridge.apiCall).toHaveBeenCalledWith(
        "/api/feed/0xabc123/react",
        { method: "POST", body: JSON.stringify({ type: "agree" }) },
      );
    });

    it("sends disagree reaction via API", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xdef456", type: "disagree" });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(bridge.apiCall).toHaveBeenCalledWith(
        "/api/feed/0xdef456/react",
        { method: "POST", body: JSON.stringify({ type: "disagree" }) },
      );
    });

    it("sends flag reaction via API", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xflag123", type: "flag" });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(bridge.apiCall).toHaveBeenCalledWith(
        "/api/feed/0xflag123/react",
        { method: "POST", body: JSON.stringify({ type: "flag" }) },
      );
    });

    it("sends null (remove) reaction via API", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xremove1", type: null });

      expect(result.ok).toBe(true);
      expect(result.data!.success).toBe(true);
      expect(bridge.apiCall).toHaveBeenCalledWith(
        "/api/feed/0xremove1/react",
        { method: "POST", body: JSON.stringify({ type: null }) },
      );
    });

    it("URL-encodes txHash in API path", async () => {
      const bridge = createMockBridge();
      const session = createTestSession(tempDir, bridge);

      await react(session, { txHash: "0xhash/with/slashes", type: "agree" });

      expect(bridge.apiCall).toHaveBeenCalledWith(
        "/api/feed/0xhash%2Fwith%2Fslashes/react",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("API failure handling", () => {
    it("returns TX_FAILED when API returns error status", async () => {
      const bridge = createMockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: false,
          status: 500,
          data: "Internal Server Error",
        })),
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xfail", type: "agree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("TX_FAILED");
      expect(result.error!.message).toContain("500");
    });

    it("returns NETWORK_ERROR when API call throws", async () => {
      const bridge = createMockBridge({
        apiCall: vi.fn(async () => { throw new Error("Network timeout"); }),
      });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xthrow", type: "disagree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(result.error!.message).toContain("Network timeout");
    });

    it("returns NETWORK_ERROR in chain-only mode (no API)", async () => {
      const bridge = createMockBridge({ apiAccess: "none" as ApiAccessState });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xnoapi", type: "agree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(result.error!.message).toContain("chain-only mode");
      expect(bridge.apiCall).not.toHaveBeenCalled();
    });

    it("returns NETWORK_ERROR when apiAccess is configured but not authenticated", async () => {
      const bridge = createMockBridge({ apiAccess: "configured" as ApiAccessState });
      const session = createTestSession(tempDir, bridge);

      const result = await react(session, { txHash: "0xpending", type: "agree" });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(bridge.apiCall).not.toHaveBeenCalled();
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

describe("getReactionCounts()", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-react-counts-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns reaction counts from API", async () => {
    const bridge = createMockBridge({
      apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
        ok: true,
        status: 200,
        data: { agree: 5, disagree: 2, flag: 1 },
      })),
    });
    const session = createTestSession(tempDir, bridge);

    const counts = await getReactionCounts(session, "0xcounts");

    expect(counts).toEqual({ agree: 5, disagree: 2, flag: 1 });
    expect(bridge.apiCall).toHaveBeenCalledWith(
      "/api/feed/0xcounts/react",
      { method: "GET" },
    );
  });

  it("returns null when API is not authenticated", async () => {
    const bridge = createMockBridge({ apiAccess: "none" as ApiAccessState });
    const session = createTestSession(tempDir, bridge);

    const counts = await getReactionCounts(session, "0xnoapi");

    expect(counts).toBeNull();
  });

  it("returns null when API returns error", async () => {
    const bridge = createMockBridge({
      apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
        ok: false,
        status: 500,
        data: "error",
      })),
    });
    const session = createTestSession(tempDir, bridge);

    const counts = await getReactionCounts(session, "0xerr");

    expect(counts).toBeNull();
  });

  it("returns null when API call throws", async () => {
    const bridge = createMockBridge({
      apiCall: vi.fn(async () => { throw new Error("timeout"); }),
    });
    const session = createTestSession(tempDir, bridge);

    const counts = await getReactionCounts(session, "0xthrow");

    expect(counts).toBeNull();
  });

  it("defaults missing fields to zero", async () => {
    const bridge = createMockBridge({
      apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
        ok: true,
        status: 200,
        data: { agree: 3 },
      })),
    });
    const session = createTestSession(tempDir, bridge);

    const counts = await getReactionCounts(session, "0xpartial");

    expect(counts).toEqual({ agree: 3, disagree: 0, flag: 0 });
  });
});
