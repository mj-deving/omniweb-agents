/**
 * Direct test coverage for scan() tool.
 *
 * Tests: success case, validation errors, feed API failure, domain filtering.
 * These complement scan-opportunities.test.ts which focuses on boundary conditions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { scan } from "../../../src/toolkit/tools/scan.js";
import type { SdkBridge, ApiCallResult, D402SettlementResult } from "../../../src/toolkit/sdk-bridge.js";

// ── Helpers ──────────────────────────────────────────

function mockBridge(overrides?: Partial<SdkBridge>): SdkBridge {
  return {
    attestDahr: vi.fn(async () => ({ responseHash: "h", txHash: "t", data: {}, url: "" })),
    apiCall: vi.fn(async (): Promise<ApiCallResult> => ({ ok: true, status: 200, data: { posts: [] } })),
    publishHivePost: vi.fn(async () => ({ txHash: "p" })),
    transferDem: vi.fn(async () => ({ txHash: "tip-tx" })),
    getDemos: vi.fn(() => ({}) as any),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "d" })),
    queryTransaction: vi.fn(async () => null),
    ...overrides,
  };
}

function createSession(tempDir: string, bridge: SdkBridge) {
  return new DemosSession({
    walletAddress: "demos1scantest",
    rpcUrl: "https://demosnode.discus.sh",
    algorithm: "falcon",
    authToken: "test-token",
    signingHandle: { demos: {}, bridge },
    stateStore: new FileStateStore(tempDir),
  });
}

function makeFeedPost(overrides?: Partial<{
  txHash: string;
  sender: string;
  text: string;
  cat: string;
  tags: string[];
  agree: number;
  disagree: number;
}>) {
  return {
    txHash: overrides?.txHash ?? "0xabc123",
    sender: overrides?.sender ?? "demos1author",
    timestamp: Date.now(),
    reactions: {
      agree: overrides?.agree ?? 1,
      disagree: overrides?.disagree ?? 0,
    },
    payload: {
      text: overrides?.text ?? "A".repeat(150),
      cat: overrides?.cat ?? "ANALYSIS",
      tags: overrides?.tags ?? ["defi"],
    },
  };
}

// ── Tests ────────────────────────────────────────────

describe("scan() direct tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-scan-direct-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("success case", () => {
    it("returns posts and identifies reply opportunities for low-engagement substantive posts", async () => {
      const feedPosts = [
        makeFeedPost({ txHash: "0x001", agree: 1, disagree: 0, text: "B".repeat(150) }),
        makeFeedPost({ txHash: "0x002", agree: 10, disagree: 0, text: "short" }),
      ];
      const bridge = mockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { posts: feedPosts },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.posts).toHaveLength(2);
      expect(result.data!.posts[0].txHash).toBe("0x001");
      expect(result.data!.posts[1].txHash).toBe("0x002");
      // First post: low engagement + substantive -> reply opportunity
      // Second post: high engagement but short text -> no opportunity
      expect(result.data!.opportunities).toHaveLength(1);
      expect(result.data!.opportunities[0].type).toBe("reply");
      expect(result.data!.opportunities[0].post.txHash).toBe("0x001");
      expect(result.provenance.path).toBe("local");
    });

    it("identifies trending opportunities for high-engagement substantive posts", async () => {
      const feedPosts = [
        makeFeedPost({ txHash: "0xtrend", agree: 15, disagree: 6, text: "C".repeat(200) }),
      ];
      const bridge = mockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { posts: feedPosts },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.opportunities).toHaveLength(1);
      expect(result.data!.opportunities[0].type).toBe("trending");
      expect(result.data!.opportunities[0].score).toBe(0.5);
    });

    it("passes limit option to feed API", async () => {
      const apiCallSpy = vi.fn(async (): Promise<ApiCallResult> => ({
        ok: true,
        status: 200,
        data: { posts: [] },
      }));
      const bridge = mockBridge({ apiCall: apiCallSpy });
      const session = createSession(tempDir, bridge);

      await scan(session, { limit: 25 });

      expect(apiCallSpy).toHaveBeenCalledWith("/api/feed?limit=25");
    });

    it("uses default limit of 50 when not specified", async () => {
      const apiCallSpy = vi.fn(async (): Promise<ApiCallResult> => ({
        ok: true,
        status: 200,
        data: { posts: [] },
      }));
      const bridge = mockBridge({ apiCall: apiCallSpy });
      const session = createSession(tempDir, bridge);

      await scan(session);

      expect(apiCallSpy).toHaveBeenCalledWith("/api/feed?limit=50");
    });
  });

  describe("validation error case", () => {
    it("returns INVALID_INPUT when limit is negative", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { limit: -1 });

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe("INVALID_INPUT");
      expect(result.error!.retryable).toBe(false);
    });

    it("returns INVALID_INPUT when limit is not an integer", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { limit: 2.5 });

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("INVALID_INPUT");
    });

    it("accepts undefined opts (all optional)", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
    });
  });

  describe("feed API failure", () => {
    it("returns err with NETWORK_ERROR when feed API returns non-ok", async () => {
      const bridge = mockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: false,
          status: 500,
          data: "Internal Server Error",
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(result.error!.retryable).toBe(true);
      expect(result.error!.message).toContain("500");
    });

    it("returns err with NETWORK_ERROR when apiCall throws", async () => {
      const bridge = mockBridge({
        apiCall: vi.fn(async () => { throw new Error("Connection refused"); }),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(result.error!.retryable).toBe(true);
      expect(result.error!.message).toContain("Connection refused");
    });
  });

  describe("domain filtering", () => {
    it("filters posts by domain tag", async () => {
      const feedPosts = [
        makeFeedPost({ txHash: "0xdefi", tags: ["defi", "markets"] }),
        makeFeedPost({ txHash: "0xinfra", tags: ["infrastructure"] }),
        makeFeedPost({ txHash: "0xdefi2", tags: ["defi"] }),
      ];
      const bridge = mockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { posts: feedPosts },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { domain: "defi" });

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(2);
      expect(result.data!.posts.map(p => p.txHash)).toEqual(["0xdefi", "0xdefi2"]);
    });

    it("returns empty posts when no posts match domain", async () => {
      const feedPosts = [
        makeFeedPost({ txHash: "0xinfra", tags: ["infrastructure"] }),
      ];
      const bridge = mockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { posts: feedPosts },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { domain: "defi" });

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(0);
      expect(result.data!.opportunities).toHaveLength(0);
    });

    it("returns all posts when domain is not specified", async () => {
      const feedPosts = [
        makeFeedPost({ txHash: "0x1", tags: ["defi"] }),
        makeFeedPost({ txHash: "0x2", tags: ["infrastructure"] }),
      ];
      const bridge = mockBridge({
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: { posts: feedPosts },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(2);
    });
  });
});
