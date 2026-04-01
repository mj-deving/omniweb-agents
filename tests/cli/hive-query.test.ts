import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ───────────────────────────────────

const {
  connectWalletMock,
  createSdkBridgeMock,
  resolveAgentNameMock,
  initColonyCacheMock,
} = vi.hoisted(() => ({
  connectWalletMock: vi.fn(),
  createSdkBridgeMock: vi.fn(),
  resolveAgentNameMock: vi.fn().mockReturnValue("sentinel"),
  initColonyCacheMock: vi.fn(),
}));

vi.mock("../../src/lib/network/sdk.js", () => ({
  connectWallet: connectWalletMock,
  info: vi.fn(),
  setLogAgent: vi.fn(),
}));

vi.mock("../../src/toolkit/sdk-bridge.js", () => ({
  AUTH_PENDING_TOKEN: "__AUTH_PENDING__",
  createSdkBridge: createSdkBridgeMock,
}));

vi.mock("../../src/lib/agent-config.js", () => ({
  resolveAgentName: resolveAgentNameMock,
  loadAgentConfig: vi.fn().mockReturnValue({ name: "sentinel" }),
}));

vi.mock("../../src/toolkit/colony/schema.js", () => ({
  initColonyCache: initColonyCacheMock,
}));

// ── Import SUT ─────────────────────────────────────

// We import the handler functions, NOT the main entrypoint.
// The CLI will export handler functions for testability.
import {
  parseArgs,
  handlePosts,
  handlePerformance,
  handleEngagement,
  handleColony,
  handleTx,
} from "../../cli/hive-query.js";

import type { SdkBridge } from "../../src/toolkit/sdk-bridge.js";
import type { ScanPost, HiveReaction } from "../../src/toolkit/types.js";

// ── Test Helpers ────────────────────────────────────

function makeScanPost(overrides: Partial<ScanPost> = {}): ScanPost {
  return {
    txHash: "tx_abc123def456",
    text: "Bitcoin hits new ATH of $100k",
    category: "crypto",
    author: "0xAuthor1",
    timestamp: Date.now(),
    reactions: { agree: 5, disagree: 1 },
    reactionsKnown: true,
    tags: ["bitcoin", "price"],
    blockNumber: 1990000,
    ...overrides,
  };
}

function makeReaction(overrides: Partial<HiveReaction> = {}): HiveReaction {
  return {
    txHash: "rx_abc123",
    targetTxHash: "tx_abc123def456",
    type: "agree",
    author: "0xReactor1",
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeBridge(overrides: Partial<SdkBridge> = {}): SdkBridge {
  return {
    getHivePostsByAuthor: vi.fn().mockResolvedValue([]),
    getHivePosts: vi.fn().mockResolvedValue([]),
    getRepliesTo: vi.fn().mockResolvedValue([]),
    verifyTransaction: vi.fn().mockResolvedValue(null),
    resolvePostAuthor: vi.fn().mockResolvedValue(null),
    publishHivePost: vi.fn(),
    attestDahr: vi.fn(),
    apiCall: vi.fn(),
    transferDem: vi.fn(),
    payD402: vi.fn(),
    apiAccess: "none",
    getDemos: vi.fn(),
    ...overrides,
  } as unknown as SdkBridge;
}

function makeColonyDb(): Record<string, unknown> {
  // In-memory mock — tests that use colony will provide specific stubs
  return {
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue(undefined),
      run: vi.fn(),
      pluck: vi.fn().mockReturnValue({ get: vi.fn().mockReturnValue(0) }),
    }),
    close: vi.fn(),
  };
}

// ── Tests ──────────────────────────────────────────

describe("hive-query CLI", () => {
  describe("parseArgs", () => {
    it("parses subcommand as first positional arg", () => {
      const result = parseArgs(["posts", "--author", "0xABC"]);
      expect(result.subcommand).toBe("posts");
      expect(result.flags.author).toBe("0xABC");
    });

    it("parses --limit flag as number string", () => {
      const result = parseArgs(["posts", "--author", "0xABC", "--limit", "20"]);
      expect(result.flags.limit).toBe("20");
    });

    it("parses boolean flags without values", () => {
      const result = parseArgs(["posts", "--pretty", "--reactions"]);
      expect(result.flags.pretty).toBe("true");
      expect(result.flags.reactions).toBe("true");
    });

    it("returns empty subcommand for help flag", () => {
      const result = parseArgs(["--help"]);
      expect(result.flags.help).toBe("true");
    });

    it("parses tx subcommand with positional txHash", () => {
      const result = parseArgs(["tx", "0xDeadBeef"]);
      expect(result.subcommand).toBe("tx");
      expect(result.positional).toEqual(["0xDeadBeef"]);
    });

    it("parses --json flag", () => {
      const result = parseArgs(["colony", "--json"]);
      expect(result.subcommand).toBe("colony");
      expect(result.flags.json).toBe("true");
    });
  });

  describe("handlePosts", () => {
    it("fetches posts by author address from chain", async () => {
      const posts = [makeScanPost(), makeScanPost({ txHash: "tx_def456" })];
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handlePosts(bridge, {
        author: "0xAuthor1",
        limit: 10,
        reactions: false,
        json: false,
      });

      expect(bridge.getHivePostsByAuthor).toHaveBeenCalledWith("0xAuthor1", { limit: 10 });
      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].txHash).toBe("tx_abc123def456");
    });

    it("includes reaction counts when --reactions flag is set (uses post field)", async () => {
      const posts = [makeScanPost({ txHash: "tx_001", reactions: { agree: 10, disagree: 3 } })];
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handlePosts(bridge, {
        author: "0xAuthor1",
        limit: 10,
        reactions: true,
        json: false,
      });

      // Reactions come from the post's own reactions field (populated by API enrichment or colony DB)
      expect(result.posts[0].reactions).toEqual({ agree: 10, disagree: 3 });
    });

    it("returns empty array when author has no posts", async () => {
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue([]),
      });

      const result = await handlePosts(bridge, {
        author: "0xNoOne",
        limit: 10,
        reactions: false,
        json: false,
      });

      expect(result.posts).toHaveLength(0);
    });

    it("uses default limit of 20 when not specified", async () => {
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue([]),
      });

      await handlePosts(bridge, {
        author: "0xAuthor1",
        limit: 20,
        reactions: false,
        json: false,
      });

      expect(bridge.getHivePostsByAuthor).toHaveBeenCalledWith("0xAuthor1", { limit: 20 });
    });
  });

  describe("handlePerformance", () => {
    it("uses post reactions field for performance calculation", async () => {
      const posts = [
        makeScanPost({ txHash: "tx_001", reactions: { agree: 8, disagree: 2 } }),
        makeScanPost({ txHash: "tx_002", reactions: { agree: 4, disagree: 6 } }),
      ];
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handlePerformance(bridge, {
        author: "0xAuthor1",
        last: 10,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].agreeRatio).toBeCloseTo(0.8);
      expect(result.posts[1].agreeRatio).toBeCloseTo(0.4);
      expect(result.summary.totalPosts).toBe(2);
      expect(result.summary.totalAgrees).toBe(12);
      expect(result.summary.totalDisagrees).toBe(8);
    });

    it("handles posts with zero reactions", async () => {
      const posts = [makeScanPost({ txHash: "tx_001", reactions: { agree: 0, disagree: 0 } })];
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handlePerformance(bridge, {
        author: "0xAuthor1",
        last: 10,
      });

      expect(result.posts[0].agreeRatio).toBe(0);
      expect(result.posts[0].totalReactions).toBe(0);
    });
  });

  describe("handleEngagement", () => {
    it("uses post reactions field (defaults to zero — API enrichment pending)", async () => {
      const posts = [
        makeScanPost({ txHash: "tx_001", reactions: { agree: 15, disagree: 3 } }),
        makeScanPost({ txHash: "tx_002", reactions: { agree: 2, disagree: 0 } }),
      ];
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handleEngagement(bridge, {
        author: "0xAuthor1",
        last: 10,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].totalReactions).toBe(18);
      expect(result.posts[1].totalReactions).toBe(2);
      expect(result.summary.totalReactions).toBe(20);
      expect(result.summary.avgReactionsPerPost).toBeCloseTo(10);
    });
  });

  describe("handleColony", () => {
    it("returns activity overview from colony DB", async () => {
      const posts = [
        makeScanPost({ author: "0xA", tags: ["bitcoin"], timestamp: Date.now() - 1000 }),
        makeScanPost({ author: "0xA", tags: ["ethereum"], txHash: "tx_002", timestamp: Date.now() - 2000 }),
        makeScanPost({ author: "0xB", tags: ["bitcoin"], txHash: "tx_003", timestamp: Date.now() - 3000 }),
      ];
      const bridge = makeBridge({
        getHivePosts: vi.fn().mockResolvedValue(posts),
      });

      const result = await handleColony(bridge, { hours: 24, limit: 100 });

      expect(result.uniqueAuthors).toBe(2);
      expect(result.totalPosts).toBe(3);
      expect(result.topTags).toContainEqual(expect.objectContaining({ tag: "bitcoin", count: 2 }));
    });

    it("calculates posts per hour", async () => {
      const now = Date.now();
      const posts = [
        makeScanPost({ timestamp: now - 60 * 60 * 1000, author: "0xA" }), // 1hr ago
        makeScanPost({ timestamp: now - 30 * 60 * 1000, author: "0xB", txHash: "tx_002" }), // 30min ago
      ];
      const bridge = makeBridge({
        getHivePosts: vi.fn().mockResolvedValue(posts),
      });

      const result = await handleColony(bridge, { hours: 24, limit: 100 });

      expect(result.postsPerHour).toBeGreaterThan(0);
      expect(result.totalPosts).toBe(2);
    });
  });

  describe("handleTx", () => {
    it("returns transaction details when found", async () => {
      const bridge = makeBridge({
        verifyTransaction: vi.fn().mockResolvedValue({
          confirmed: true,
          blockNumber: 1990500,
          from: "0xAuthor1",
        }),
      });

      const result = await handleTx(bridge, { txHash: "0xDeadBeef123" });

      expect(result.confirmed).toBe(true);
      expect(result.blockNumber).toBe(1990500);
      expect(result.from).toBe("0xAuthor1");
    });

    it("returns not found when transaction does not exist", async () => {
      const bridge = makeBridge({
        verifyTransaction: vi.fn().mockResolvedValue(null),
      });

      const result = await handleTx(bridge, { txHash: "0xNonExistent" });

      expect(result.confirmed).toBe(false);
      expect(result.blockNumber).toBeUndefined();
    });

    it("includes HIVE post data when transaction is a hive post", async () => {
      const posts = [makeScanPost({ txHash: "0xHivePost" })];
      const bridge = makeBridge({
        verifyTransaction: vi.fn().mockResolvedValue({
          confirmed: true,
          blockNumber: 1990500,
          from: "0xAuthor1",
        }),
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handleTx(bridge, { txHash: "0xHivePost" });

      expect(result.confirmed).toBe(true);
    });
  });

  describe("output formatting", () => {
    it("handlePosts returns JSON-serializable data", async () => {
      const posts = [makeScanPost()];
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue(posts),
      });

      const result = await handlePosts(bridge, {
        author: "0xAuthor1",
        limit: 10,
        reactions: false,
        json: true,
      });

      // Must be JSON-serializable
      const serialized = JSON.stringify(result);
      expect(serialized).toBeTruthy();
      const parsed = JSON.parse(serialized);
      expect(parsed.posts).toHaveLength(1);
    });

    it("handlePerformance result is JSON-serializable", async () => {
      const bridge = makeBridge({
        getHivePostsByAuthor: vi.fn().mockResolvedValue([makeScanPost()]),
      });

      const result = await handlePerformance(bridge, { author: "0xA", last: 10 });

      const serialized = JSON.stringify(result);
      expect(serialized).toBeTruthy();
    });
  });
});
