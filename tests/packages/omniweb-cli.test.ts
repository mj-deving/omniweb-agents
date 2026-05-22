import { describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../packages/omniweb-toolkit/src/cli/args.js";
import type { OmniWeb } from "../../packages/omniweb-toolkit/src/colony.js";
import { runCli } from "../../packages/omniweb-toolkit/src/cli/commands.js";
import {
  buildStyleBrief,
  buildTopReplyBrief,
  normalizeFeedPost,
  normalizeTopPost,
  selectExemplars,
  selectReplyTarget,
  type NormalizedPost,
} from "../../packages/omniweb-toolkit/src/cli/top-reply.js";
import type {
  ColonyPost,
  FeedResponse,
  OmniwebReadClient,
  ScoresResponse,
  SignalsResponse,
  TopPostsResponse,
} from "../../packages/omniweb-toolkit/src/read-types.js";

const NOW = new Date("2026-05-21T12:00:00.000Z");

function feedPost(opts: {
  txHash: string;
  score: number;
  text: string;
  timestamp?: number;
  reactions?: { agree: number; disagree: number; flag: number };
  cat?: string;
}): ColonyPost {
  return {
    txHash: opts.txHash,
    author: "0xagent",
    timestamp: opts.timestamp ?? NOW.getTime(),
    payload: {
      v: 1,
      cat: opts.cat ?? "ANALYSIS",
      text: opts.text,
      sourceAttestations: [{ url: "https://example.com", txHash: "0xattest" }],
    },
    score: opts.score,
    reactions: opts.reactions,
  };
}

function topPost(opts: {
  txHash: string;
  score: number;
  text: string;
  timestamp?: number;
  category?: string;
}): ColonyPost {
  return {
    txHash: opts.txHash,
    author: "0xagent",
    payload: { cat: opts.category ?? "ANALYSIS", text: opts.text },
    score: opts.score,
    timestamp: opts.timestamp ?? NOW.getTime(),
    blockNumber: 123,
  };
}

function feed(posts: ColonyPost[]): FeedResponse {
  return { posts, hasMore: false, meta: { totalIndexed: posts.length, lastBlock: 10, publishers: 2, categories: { ANALYSIS: posts.length } } };
}

function topPosts(posts: ColonyPost[]): TopPostsResponse {
  return { posts, count: posts.length };
}

function fakeClient(overrides: {
  getFeed?: (params?: { limit?: number }) => Promise<FeedResponse>;
  getTopPosts?: (params?: { limit?: number; minScore?: number }) => Promise<TopPostsResponse>;
  getSignals?: () => Promise<SignalsResponse>;
  getAgentScores?: (params?: { limit?: number }) => Promise<ScoresResponse>;
}): OmniwebReadClient {
  const client = {
    getFeed: vi.fn(overrides.getFeed ?? (() => Promise.resolve(feed([])))),
    getTopPosts: vi.fn(overrides.getTopPosts ?? (() => Promise.resolve(topPosts([])))),
    getSignals: vi.fn(overrides.getSignals ?? (() => Promise.resolve({ consensusAnalysis: [] }))),
    getAgentScores: vi.fn(overrides.getAgentScores ?? (() => Promise.resolve({ agents: [], count: 0, globalAvg: 0 }))),
  };
  return client as unknown as OmniwebReadClient;
}

function fakeConnect(colony: Record<string, unknown>): () => Promise<Pick<OmniWeb, "colony">> {
  return async () => ({ colony } as unknown as Pick<OmniWeb, "colony">);
}

describe("omniweb CLI foundation", () => {
  it("parses top-reply arguments without heavy dependencies", () => {
    const parsed = parseArgs(["colony", "brief", "top-reply", "--min-score", "90", "--exemplars=5", "--feed-limit", "100"]);
    expect(parsed.commandPath).toEqual(["colony", "brief", "top-reply"]);
    expect(parsed.options).toEqual({ "min-score": "90", exemplars: "5", "feed-limit": "100" });
  });

  it("returns the standard JSON envelope for successful read commands", async () => {
    const getFeed = vi.fn().mockResolvedValue(feed([feedPost({ txHash: "0xtarget", score: 91, text: "Strong 91 point post" })]));
    const envelope = await runCli(["colony", "feed", "--limit", "7"], {
      createClient: () => fakeClient({ getFeed }),
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({ ok: true, command: "colony feed", version: "test-version", startedAt: NOW.toISOString(), finishedAt: NOW.toISOString() });
    expect(getFeed).toHaveBeenCalledWith({ limit: 7 });
  });

  it.each([
    {
      command: "colony search",
      argv: ["colony", "search", "--text", "BTC", "--category", "ANALYSIS", "--limit", "3"],
      method: "search",
      expectedArgs: [{ text: "BTC", category: "ANALYSIS", limit: 3 }],
    },
    {
      command: "colony post",
      argv: ["colony", "post", "--tx-hash", "0xpost"],
      method: "getPostDetail",
      expectedArgs: ["0xpost"],
    },
    {
      command: "colony convergence",
      argv: ["colony", "convergence"],
      method: "getConvergence",
      expectedArgs: [],
    },
    {
      command: "colony report",
      argv: ["colony", "report", "--id", "daily"],
      method: "getReport",
      expectedArgs: [{ id: "daily" }],
    },
    {
      command: "colony oracle",
      argv: ["colony", "oracle", "--assets", "BTC,ETH"],
      method: "getOracle",
      expectedArgs: [{ assets: ["BTC", "ETH"] }],
    },
    {
      command: "colony prices",
      argv: ["colony", "prices", "--assets", "BTC,ETH"],
      method: "getPrices",
      expectedArgs: [["BTC", "ETH"]],
    },
    {
      command: "colony price-history",
      argv: ["colony", "price-history", "--asset", "BTC", "--periods", "24"],
      method: "getPriceHistory",
      expectedArgs: ["BTC", 24],
    },
    {
      command: "colony markets",
      argv: ["colony", "markets", "--category", "crypto", "--limit", "2"],
      method: "getMarkets",
      expectedArgs: [{ category: "crypto", limit: 2 }],
    },
    {
      command: "colony predictions",
      argv: ["colony", "predictions", "--status", "open", "--asset", "BTC", "--agent", "0xagent"],
      method: "getPredictions",
      expectedArgs: [{ status: "open", asset: "BTC", agent: "0xagent" }],
    },
    {
      command: "colony pool",
      argv: ["colony", "pool", "--asset", "BTC", "--horizon", "30m"],
      method: "getPool",
      expectedArgs: [{ asset: "BTC", horizon: "30m" }],
    },
    {
      command: "colony higher-lower-pool",
      argv: ["colony", "higher-lower-pool", "--asset", "BTC", "--horizon", "24h"],
      method: "getHigherLowerPool",
      expectedArgs: [{ asset: "BTC", horizon: "24h" }],
    },
    {
      command: "colony binary-pools",
      argv: ["colony", "binary-pools", "--category", "crypto", "--limit", "2"],
      method: "getBinaryPools",
      expectedArgs: [{ category: "crypto", limit: 2 }],
    },
    {
      command: "colony reactions",
      argv: ["colony", "reactions", "--tx-hash", "0xpost"],
      method: "getReactions",
      expectedArgs: ["0xpost"],
    },
    {
      command: "colony tip-stats",
      argv: ["colony", "tip-stats", "--tx-hash", "0xpost"],
      method: "getTipStats",
      expectedArgs: ["0xpost"],
    },
  ])("maps $command to the runtime read method", async ({ argv, method, expectedArgs }) => {
    const read = vi.fn().mockResolvedValue({ ok: true, data: { method } });
    const envelope = await runCli(argv, {
      connect: fakeConnect({ [method]: read }),
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({ ok: true, data: { method } });
    expect(read).toHaveBeenCalledWith(...expectedArgs);
  });

  it("returns structured INVALID_ARGUMENT errors for missing required read options", async () => {
    const envelope = await runCli(["colony", "post"], {
      connect: fakeConnect({ getPostDetail: vi.fn() }),
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({
      ok: false,
      command: "colony post",
      error: { code: "INVALID_ARGUMENT", retryable: false },
    });
    expect(envelope.ok ? "" : envelope.error.message).toContain("--tx-hash is required");
  });

  it("does not accept write execution commands from the JSON CLI", async () => {
    const envelope = await runCli(["colony", "publish", "--text", "No writes here"], {
      connect: fakeConnect({ publish: vi.fn() }),
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({
      ok: false,
      command: "colony publish",
      error: { code: "INVALID_ARGUMENT", retryable: false },
    });
    expect(envelope.ok ? "" : envelope.error.message).toContain("Write execution is intentionally not exposed");
  });

  it("lists expanded read commands and the no-write policy in help output", async () => {
    const envelope = await runCli(["help"], {
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({ ok: true, command: "help" });
    expect(envelope.ok ? envelope.data : null).toMatchObject({
      commands: expect.arrayContaining(["colony search", "colony price-history", "colony tip-stats"]),
      writeExecution: expect.stringContaining("intentionally not exposed"),
    });
  });

  it("returns a structured retryable error envelope for upstream read failures", async () => {
    const getFeed = vi.fn().mockRejectedValue(new Error("down"));
    const envelope = await runCli(["colony", "feed"], {
      createClient: () => fakeClient({ getFeed }),
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({ ok: false, error: { code: "CLI_ERROR", retryable: true } });
  });

  it("selects reply targets by score, reaction total, then newest timestamp", () => {
    const posts = [
      normalizeFeedPost(feedPost({ txHash: "0xold", score: 95, text: "old", timestamp: 1, reactions: { agree: 1, disagree: 0, flag: 0 } })),
      normalizeFeedPost(feedPost({ txHash: "0xpopular", score: 95, text: "popular", timestamp: 2, reactions: { agree: 3, disagree: 0, flag: 0 } })),
      normalizeFeedPost(feedPost({ txHash: "0xlow", score: 89, text: "low", timestamp: 3, reactions: { agree: 9, disagree: 0, flag: 0 } })),
    ].filter((post): post is NormalizedPost => post !== null);
    expect(selectReplyTarget(posts, 90)?.txHash).toBe("0xpopular");
  });

  it("selects high-score exemplars and excludes the target when possible", () => {
    const posts = ["0xtarget", "0xa", "0xb", "0xc", "0xd", "0xe"]
      .map((txHash, index) => normalizeTopPost(topPost({ txHash, score: 96 - index, text: `Example ${index} has 42% evidence` })))
      .filter((post): post is NormalizedPost => post !== null);
    const exemplars = selectExemplars(posts, "0xtarget", 90, 5);
    expect(exemplars).toHaveLength(5);
    expect(exemplars.map((post) => post.txHash)).not.toContain("0xtarget");
  });

  it("extracts a style brief and marks source text as untrusted", () => {
    const exemplars = [
      normalizeTopPost(topPost({ txHash: "0xa", score: 99, text: "BTC moved 4% higher as liquidity rose. https://example.com" })),
      normalizeTopPost(topPost({ txHash: "0xb", score: 98, text: "Watch ETH if funding drops 2% because risk could flip." })),
    ].filter((post): post is NormalizedPost => post !== null);
    const style = buildStyleBrief(exemplars);
    expect(style.evidenceAndNumericDensity.postsWithNumbers).toBe(2);
    expect(style.untrustedContentHandling).toContain("untrusted");
  });

  it("builds a ready top-reply decision packet with target, five exemplars, style brief, and future write shape", async () => {
    const target = feedPost({ txHash: "0xtarget", score: 94, text: "Target asks for a concrete follow-up on BTC liquidity.", reactions: { agree: 2, disagree: 0, flag: 0 } });
    const exemplarPosts = [0, 1, 2, 3, 4].map((index) => topPost({
      txHash: `0xex${index}`,
      score: 99 - index,
      text: `Exemplar ${index} cites ${index + 1}% flow change and explains why it matters.`,
    }));
    const brief = buildTopReplyBrief({
      feed: feed([target]),
      topPosts: topPosts(exemplarPosts),
      signals: { consensusAnalysis: [{ topic: "BTC liquidity", text: "topic", direction: "mixed", consensus: true, confidence: 81, agentCount: 4, totalAgents: 5 }] },
      leaderboard: { agents: [{ address: "0x1", name: "murrow", totalPosts: 10, avgScore: 88, bayesianScore: 91, topScore: 99, lowScore: 50, lastActiveAt: 1 }], count: 1, globalAvg: 80 },
      minScore: 90,
      exemplarCount: 5,
      feedLimit: 100,
    });
    expect(brief).toMatchObject({ status: "ready", target: { txHash: "0xtarget" }, nextWriteCommand: { status: "not_available_in_v1" } });
    expect(brief.status === "ready" ? brief.exemplars : []).toHaveLength(5);
  });

  it("returns an honest no-target skip when feed has no score-floor candidate", () => {
    const brief = buildTopReplyBrief({
      feed: feed([feedPost({ txHash: "0xlow", score: 80, text: "Below the floor" })]),
      topPosts: topPosts([0, 1, 2, 3, 4].map((index) => topPost({ txHash: `0xex${index}`, score: 95, text: `Example ${index}` }))),
      minScore: 90,
      exemplarCount: 5,
      feedLimit: 100,
    });
    expect(brief).toMatchObject({ status: "skipped", reason: "no_target" });
  });

  it("returns an honest insufficient-exemplars skip when fewer than five high-score examples exist", () => {
    const brief = buildTopReplyBrief({
      feed: feed([feedPost({ txHash: "0xtarget", score: 92, text: "Above the floor" })]),
      topPosts: topPosts([topPost({ txHash: "0xex", score: 95, text: "Only one example" })]),
      minScore: 90,
      exemplarCount: 5,
      feedLimit: 100,
    });
    expect(brief).toMatchObject({ status: "skipped", reason: "insufficient_exemplars" });
  });

  it("keeps top-reply preview read-only and degrades optional context failures to warnings", async () => {
    const target = feedPost({ txHash: "0xtarget", score: 94, text: "Target asks for a concrete follow-up." });
    const exemplarPosts = [0, 1, 2, 3, 4].map((index) => topPost({ txHash: `0xex${index}`, score: 99 - index, text: `Exemplar ${index} has ${index}% data.` }));
    const getSignals = vi.fn().mockRejectedValue(new Error("bad gateway"));
    const envelope = await runCli(["colony", "brief", "top-reply"], {
      createClient: () => fakeClient({
        getFeed: () => Promise.resolve(feed([target])),
        getTopPosts: () => Promise.resolve(topPosts(exemplarPosts)),
        getSignals,
      }),
      now: () => NOW,
      version: "test-version",
    });
    expect(envelope).toMatchObject({ ok: true, data: { status: "ready" }, warnings: [expect.stringContaining("colony signals threw")] });
    expect(getSignals).toHaveBeenCalledTimes(1);
  });
});
