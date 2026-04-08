import { describe, it, expect, vi } from "vitest";
import { fetchApiEnrichment } from "../../src/toolkit/api-enrichment.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";

/** Schema-valid mock data matching Zod schemas in api-schemas.ts */
const VALID_AGENTS = { agents: [
  { address: "0x1", name: "alice", postCount: 5 },
  { address: "0x2", name: "bob", postCount: 3 },
] };

const VALID_LEADERBOARD = {
  agents: [{ address: "0x1", name: "alice", bayesianScore: 80, totalPosts: 5, avgScore: 72, topScore: 95, lowScore: 40, lastActiveAt: Date.now() }],
  count: 1, globalAvg: 60, confidenceThreshold: 40,
};

const VALID_ORACLE = {
  overallSentiment: { direction: "neutral", score: 50, agentCount: 5, topAssets: ["BTC", "ETH"] },
  assets: [
    {
      ticker: "BTC",
      postCount: 12,
      price: { usd: 68000, change24h: 2.1, high24h: 69000, low24h: 67000 },
    },
    {
      ticker: "ETH",
      postCount: 8,
      price: { usd: 3400, change24h: 1.4, high24h: 3500, low24h: 3300 },
    },
    {
      ticker: "SOL",
      postCount: 6,
      price: { usd: 150, change24h: -0.8, high24h: 155, low24h: 145 },
    },
  ],
  divergences: [{ type: "agents_vs_market", asset: "BTC", description: "test", severity: "low" as const, details: {} }],
};

const VALID_PRICES = [
  { ticker: "BTC", priceUsd: 68000, fetchedAt: Date.now(), source: "coingecko" },
  { ticker: "ETH", priceUsd: 3400, fetchedAt: Date.now(), source: "coingecko" },
];

const VALID_SIGNALS = [
  { topic: "BTC", agentCount: 3, totalAgents: 10, confidence: 75, text: "bullish", trending: true, direction: "bullish", consensus: true },
];

function makeValidPool(asset = "BTC", overrides: Partial<{
  totalBets: number;
  totalDem: number;
  poolAddress: string;
}> = {}) {
  return {
    asset,
    horizon: "1h",
    totalBets: 4,
    totalDem: 20,
    poolAddress: `0xpool-${asset.toLowerCase()}`,
    roundEnd: Date.now() + 3600000,
    bets: [{ txHash: `0xtx-${asset.toLowerCase()}`, bettor: "0xbet1", predictedPrice: 70000, amount: 5, roundEnd: Date.now() + 3600000, horizon: "1h" }],
    ...overrides,
  };
}

type ToolkitOverrides = {
  agents?: Toolkit["agents"]["list"];
  leaderboard?: Toolkit["scores"]["getLeaderboard"];
  oracle?: Toolkit["oracle"]["get"];
  prices?: Toolkit["prices"]["get"];
  signals?: Toolkit["intelligence"]["getSignals"];
  pool?: Toolkit["ballot"]["getPool"];
};

function createMockToolkit(overrides: ToolkitOverrides = {}): Toolkit {
  const ok = <T>(data: T) => Promise.resolve({ ok: true as const, data });
  return {
    agents: { list: overrides.agents ?? (() => ok(VALID_AGENTS)) },
    scores: { getLeaderboard: overrides.leaderboard ?? (() => ok(VALID_LEADERBOARD)) },
    oracle: { get: overrides.oracle ?? (() => ok(VALID_ORACLE)) },
    prices: { get: overrides.prices ?? (() => ok(VALID_PRICES)) },
    intelligence: { getSignals: overrides.signals ?? (() => ok(VALID_SIGNALS)) },
    ballot: {
      getPool: overrides.pool ?? ((opts) => {
        const asset = opts?.asset ?? "BTC";
        return ok(makeValidPool(asset, asset === "SOL" ? { totalBets: 2, totalDem: 8 } : {}));
      }),
    },
  } as unknown as Toolkit;
}

describe("fetchApiEnrichment", () => {
  it("discovers qualifying betting pools from oracle assets and keeps the first pool alias", async () => {
    const observe = vi.fn();
    const getPool = vi.fn((opts?: { asset?: string }) => {
      const asset = opts?.asset ?? "BTC";
      return Promise.resolve({
        ok: true as const,
        data: makeValidPool(asset, asset === "SOL" ? { totalBets: 2, totalDem: 8 } : {}),
      });
    });
    const result = await fetchApiEnrichment(createMockToolkit({ pool: getPool }), undefined, observe);

    expect(result).toBeDefined();
    expect(result!.agentCount).toBe(2);
    expect(result!.leaderboard).toMatchObject({ agents: expect.any(Array), count: 1, globalAvg: 60 });
    expect(result!.oracle).toMatchObject({ divergences: expect.any(Array) });
    expect(result!.prices).toHaveLength(2);
    expect(result!.prices![0]).toMatchObject({ ticker: "BTC", priceUsd: 68000 });
    expect(result!.signals).toHaveLength(1);
    expect(result!.signals![0]).toMatchObject({ topic: "BTC", consensus: true });
    expect(getPool).toHaveBeenNthCalledWith(1, { asset: "BTC" });
    expect(getPool).toHaveBeenNthCalledWith(2, { asset: "ETH" });
    expect(getPool).toHaveBeenNthCalledWith(3, { asset: "SOL" });
    expect(result!.bettingPools).toHaveLength(2);
    expect(result!.bettingPools).toEqual([
      expect.objectContaining({ asset: "BTC", totalBets: 4 }),
      expect.objectContaining({ asset: "ETH", totalBets: 4 }),
    ]);
    expect(result!.bettingPool).toMatchObject({ asset: "BTC", totalBets: 4 });
  });

  it("returns partial enrichment when some feeds return ok:false", async () => {
    const observe = vi.fn();
    const getPool = vi.fn().mockResolvedValue({ ok: false, error: "not found" });
    const toolkit = createMockToolkit({
      oracle: () => Promise.resolve({ ok: false, error: "timeout" }),
      pool: getPool,
    });
    const result = await fetchApiEnrichment(toolkit, undefined, observe);

    expect(result).toBeDefined();
    expect(result!.agentCount).toBe(2);
    expect(result!.leaderboard).toBeDefined();
    expect(result!.prices).toHaveLength(2);
    expect(result!.signals).toHaveLength(1);
    expect(result!.oracle).toBeUndefined();
    expect(result!.bettingPool).toBeUndefined();
    expect(result!.bettingPools).toBeUndefined();
    expect(getPool).toHaveBeenNthCalledWith(1, { asset: "BTC" });
    expect(getPool).toHaveBeenNthCalledWith(2, { asset: "ETH" });
  });

  it("drops feeds that fail Zod validation and logs a warning", async () => {
    const observe = vi.fn();
    const toolkit = createMockToolkit({
      // Missing required 'source' field — should fail PriceDataSchema validation
      prices: () => Promise.resolve({ ok: true, data: [{ ticker: "BTC", priceUsd: 68000 }] }),
    });
    const result = await fetchApiEnrichment(toolkit, undefined, observe);

    expect(result).toBeDefined();
    expect(result!.prices).toBeUndefined();
    expect(observe).toHaveBeenCalledWith(
      "warning",
      expect.stringContaining("prices"),
      expect.objectContaining({ source: "apiEnrichment" }),
    );
  });

  it("returns undefined when the entire batch throws", async () => {
    const observe = vi.fn();
    const toolkit = {
      agents: { list: () => { throw new Error("network down"); } },
      scores: { getLeaderboard: () => { throw new Error("network down"); } },
      oracle: { get: () => { throw new Error("network down"); } },
      prices: { get: () => { throw new Error("network down"); } },
      intelligence: { getSignals: () => { throw new Error("network down"); } },
      ballot: { getPool: () => { throw new Error("network down"); } },
    } as unknown as Toolkit;

    const result = await fetchApiEnrichment(toolkit, undefined, observe);
    expect(result).toBeUndefined();
    expect(observe).toHaveBeenCalledWith(
      "warning",
      expect.stringContaining("network down"),
      expect.any(Object),
    );
  });

  it("logs enrichment feed count on success", async () => {
    const observe = vi.fn();
    await fetchApiEnrichment(createMockToolkit(), undefined, observe);

    expect(observe).toHaveBeenCalledWith(
      "insight",
      expect.stringContaining("feeds"),
      expect.objectContaining({ source: "apiEnrichment" }),
    );
  });

  it("respects leaderboard limit from config", async () => {
    const observe = vi.fn();
    const getLeaderboard = vi.fn().mockResolvedValue({ ok: true, data: VALID_LEADERBOARD });
    const toolkit = createMockToolkit({ leaderboard: getLeaderboard });

    await fetchApiEnrichment(toolkit, { leaderboardLimit: 50 }, observe);

    expect(getLeaderboard).toHaveBeenCalledWith({ limit: 50 });
  });

  it("passes oracle window parameter from limits config", async () => {
    const observe = vi.fn();
    const getOracle = vi.fn().mockResolvedValue({ ok: true, data: VALID_ORACLE });
    const toolkit = createMockToolkit({ oracle: getOracle });

    await fetchApiEnrichment(toolkit, { oracleWindow: "7d" } as any, observe);

    expect(getOracle).toHaveBeenCalledWith({ window: "7d" });
  });

  it("extracts polymarket data from oracle response", async () => {
    const observe = vi.fn();
    const oracleWithPolymarket = {
      ...VALID_ORACLE,
      polymarket: { "btc-100k": { yes: 0.65, no: 0.35 } },
    };
    const toolkit = createMockToolkit({
      oracle: vi.fn().mockResolvedValue({ ok: true, data: oracleWithPolymarket }),
    });

    const result = await fetchApiEnrichment(toolkit, undefined, observe);

    expect(result?.polymarket).toEqual({ "btc-100k": { yes: 0.65, no: 0.35 } });
  });

  it("extracts per-asset sentiment from oracle", async () => {
    const observe = vi.fn();
    const oracleWithSentiment = {
      ...VALID_ORACLE,
      assets: [
        { ticker: "BTC", postCount: 12, price: { usd: 68000, change24h: 2.1, high24h: 69000, low24h: 67000 }, sentiment: { direction: "bullish", score: 75 } },
        { ticker: "ETH", postCount: 8, price: { usd: 3400, change24h: 1.4, high24h: 3500, low24h: 3300 } },
      ],
      divergences: [],
    };
    const toolkit = createMockToolkit({
      oracle: vi.fn().mockResolvedValue({ ok: true, data: oracleWithSentiment }),
    });

    const result = await fetchApiEnrichment(toolkit, undefined, observe);

    expect(result?.assetSentiments).toHaveLength(1);
    expect(result?.assetSentiments?.[0]).toEqual({
      ticker: "BTC", direction: "bullish", score: 75, posts: 12,
    });
  });

  it("extracts price attestation hashes from oracle", async () => {
    const observe = vi.fn();
    const oracleWithDahr = {
      ...VALID_ORACLE,
      assets: [
        { ticker: "BTC", postCount: 12, price: { usd: 68000, change24h: 2.1, high24h: 69000, low24h: 67000, dahrTxHash: "0xproof1" } },
        { ticker: "ETH", postCount: 8, price: { usd: 3400, change24h: 1.4, high24h: 3500, low24h: 3300 } },
      ],
      divergences: [],
    };
    const toolkit = createMockToolkit({
      oracle: vi.fn().mockResolvedValue({ ok: true, data: oracleWithDahr }),
    });

    const result = await fetchApiEnrichment(toolkit, undefined, observe);

    expect(result?.priceAttestations).toHaveLength(1);
    expect(result?.priceAttestations?.[0]).toEqual({ ticker: "BTC", dahrTxHash: "0xproof1" });
  });
});
