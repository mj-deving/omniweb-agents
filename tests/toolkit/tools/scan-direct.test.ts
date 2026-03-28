/**
 * Direct test coverage for scan() tool.
 *
 * Chain-first: scan uses bridge.getHivePosts (paginated chain scan).
 * Tests: success case, validation errors, chain failure, domain filtering,
 * reactionsKnown behavior, API enrichment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DemosSession } from "../../../src/toolkit/session.js";
import { FileStateStore } from "../../../src/toolkit/state-store.js";
import { scan } from "../../../src/toolkit/tools/scan.js";
import type { SdkBridge, ApiCallResult, D402SettlementResult, ApiAccessState } from "../../../src/toolkit/sdk-bridge.js";
import type { ScanPost } from "../../../src/toolkit/types.js";

// ── Helpers ──────────────────────────────────────────

function makeChainPost(overrides?: Partial<ScanPost>): ScanPost {
  return {
    txHash: overrides?.txHash ?? "0xabc123",
    text: overrides?.text ?? "A".repeat(150),
    category: overrides?.category ?? "ANALYSIS",
    author: overrides?.author ?? "demos1author",
    timestamp: overrides?.timestamp ?? Date.now(),
    reactions: overrides?.reactions ?? { agree: 0, disagree: 0 },
    reactionsKnown: overrides?.reactionsKnown ?? false,
    tags: overrides?.tags ?? ["defi"],
  };
}

function mockBridge(overrides?: Partial<SdkBridge>): SdkBridge {
  return {
    attestDahr: vi.fn(async () => ({ responseHash: "h", txHash: "t", data: {}, url: "" })),
    apiCall: vi.fn(async (): Promise<ApiCallResult> => ({ ok: false, status: 0, data: "chain-only mode" })),
    publishHivePost: vi.fn(async () => ({ txHash: "p" })),
    transferDem: vi.fn(async () => ({ txHash: "tip-tx" })),
    getDemos: vi.fn(() => ({}) as any),
    payD402: vi.fn(async (): Promise<D402SettlementResult> => ({ success: true, hash: "d" })),
    apiAccess: "none" as ApiAccessState,
    verifyTransaction: vi.fn(async () => null),
    getHivePosts: vi.fn(async () => []),
    resolvePostAuthor: vi.fn(async () => null),
    publishHiveReaction: vi.fn(async () => ({ txHash: "r" })),
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

// ── Tests ────────────────────────────────────────────

describe("scan() direct tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "demos-scan-direct-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("chain-first success case", () => {
    it("returns posts from chain with content-only opportunities", async () => {
      const chainPosts = [
        makeChainPost({ txHash: "0x001", text: "B".repeat(150) }),
        makeChainPost({ txHash: "0x002", text: "short" }),
      ];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(2);
      expect(result.data!.posts[0].txHash).toBe("0x001");
      // Substantive post → reply opportunity (chain-only mode uses content heuristic)
      expect(result.data!.opportunities).toHaveLength(1);
      expect(result.data!.opportunities[0].type).toBe("reply");
      expect(result.data!.opportunities[0].post.txHash).toBe("0x001");
      expect(result.provenance.path).toBe("local");
    });

    it("does not call apiCall when apiAccess is none", async () => {
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => [makeChainPost()]),
      });
      const session = createSession(tempDir, bridge);

      await scan(session);

      expect(bridge.apiCall).not.toHaveBeenCalled();
    });

    it("uses default limit of 50 when not specified", async () => {
      const getHivePostsSpy = vi.fn(async () => []);
      const bridge = mockBridge({ getHivePosts: getHivePostsSpy });
      const session = createSession(tempDir, bridge);

      await scan(session);

      expect(getHivePostsSpy).toHaveBeenCalledWith(50);
    });

    it("passes limit option to getHivePosts", async () => {
      const getHivePostsSpy = vi.fn(async () => []);
      const bridge = mockBridge({ getHivePosts: getHivePostsSpy });
      const session = createSession(tempDir, bridge);

      await scan(session, { limit: 25 });

      expect(getHivePostsSpy).toHaveBeenCalledWith(25);
    });
  });

  describe("reactionsKnown behavior", () => {
    it("skips reaction-dependent heuristics when reactionsKnown is false", async () => {
      // Chain posts with reactionsKnown: false — should use content-only heuristic
      const chainPosts = [
        makeChainPost({ txHash: "0x001", text: "B".repeat(150), reactionsKnown: false }),
      ];
      const bridge = mockBridge({ getHivePosts: vi.fn(async () => chainPosts) });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.opportunities).toHaveLength(1);
      expect(result.data!.opportunities[0].reason).toContain("unavailable");
    });

    it("uses reaction heuristics when reactionsKnown is true", async () => {
      // API-enriched posts with real reactions
      const enrichedPosts = [
        makeChainPost({
          txHash: "0xtrend",
          text: "C".repeat(200),
          reactions: { agree: 15, disagree: 6 },
          reactionsKnown: true,
        }),
      ];
      const bridge = mockBridge({ getHivePosts: vi.fn(async () => enrichedPosts) });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.opportunities).toHaveLength(1);
      expect(result.data!.opportunities[0].type).toBe("trending");
    });

    it("identifies reply opportunities with low reactions when reactionsKnown is true", async () => {
      const enrichedPosts = [
        makeChainPost({
          txHash: "0xlow",
          text: "D".repeat(150),
          reactions: { agree: 1, disagree: 0 },
          reactionsKnown: true,
        }),
      ];
      const bridge = mockBridge({ getHivePosts: vi.fn(async () => enrichedPosts) });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.opportunities).toHaveLength(1);
      expect(result.data!.opportunities[0].type).toBe("reply");
      expect(result.data!.opportunities[0].reason).toContain("Low engagement");
    });
  });

  describe("API enrichment", () => {
    it("merges reaction counts when apiAccess is authenticated", async () => {
      const chainPosts = [makeChainPost({ txHash: "0xabc", reactionsKnown: false })];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
        apiAccess: "authenticated" as ApiAccessState,
        apiCall: vi.fn(async (): Promise<ApiCallResult> => ({
          ok: true,
          status: 200,
          data: {
            posts: [{
              txHash: "0xabc",
              sender: "demos1a",
              timestamp: Date.now(),
              reactions: { agree: 5, disagree: 2 },
              payload: { text: "test", cat: "ANALYSIS", tags: [] },
            }],
          },
        })),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.posts[0].reactionsKnown).toBe(true);
      expect(result.data!.posts[0].reactions.agree).toBe(5);
      expect(result.data!.posts[0].reactions.disagree).toBe(2);
    });

    it("does not enrich when apiAccess is configured (not authenticated)", async () => {
      const chainPosts = [makeChainPost({ txHash: "0xabc" })];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
        apiAccess: "configured" as ApiAccessState,
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(bridge.apiCall).not.toHaveBeenCalled();
      expect(result.data!.posts[0].reactionsKnown).toBe(false);
    });

    it("gracefully handles API enrichment failure", async () => {
      const chainPosts = [makeChainPost({ txHash: "0xabc" })];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
        apiAccess: "authenticated" as ApiAccessState,
        apiCall: vi.fn(async () => { throw new Error("API down"); }),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      // Falls back to chain-only data
      expect(result.data!.posts[0].reactionsKnown).toBe(false);
    });
  });

  describe("validation error case", () => {
    it("returns INVALID_INPUT when limit is negative", async () => {
      const bridge = mockBridge();
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { limit: -1 });

      expect(result.ok).toBe(false);
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

  describe("chain scan failure", () => {
    it("returns NETWORK_ERROR when getHivePosts throws", async () => {
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => { throw new Error("RPC connection refused"); }),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(false);
      expect(result.error!.code).toBe("NETWORK_ERROR");
      expect(result.error!.retryable).toBe(true);
      expect(result.error!.message).toContain("connection refused");
    });
  });

  describe("domain filtering", () => {
    it("filters posts by domain tag", async () => {
      const chainPosts = [
        makeChainPost({ txHash: "0xdefi", tags: ["defi", "markets"] }),
        makeChainPost({ txHash: "0xinfra", tags: ["infrastructure"] }),
        makeChainPost({ txHash: "0xdefi2", tags: ["defi"] }),
      ];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { domain: "defi" });

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(2);
      expect(result.data!.posts.map(p => p.txHash)).toEqual(["0xdefi", "0xdefi2"]);
    });

    it("returns empty posts when no posts match domain", async () => {
      const chainPosts = [
        makeChainPost({ txHash: "0xinfra", tags: ["infrastructure"] }),
      ];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session, { domain: "defi" });

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(0);
    });

    it("returns all posts when domain is not specified", async () => {
      const chainPosts = [
        makeChainPost({ txHash: "0x1", tags: ["defi"] }),
        makeChainPost({ txHash: "0x2", tags: ["infrastructure"] }),
      ];
      const bridge = mockBridge({
        getHivePosts: vi.fn(async () => chainPosts),
      });
      const session = createSession(tempDir, bridge);

      const result = await scan(session);

      expect(result.ok).toBe(true);
      expect(result.data!.posts).toHaveLength(2);
    });
  });
});
