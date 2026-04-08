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
  divergences: [{ type: "agents_vs_market", asset: "BTC", description: "test", severity: "low" as const, details: {} }],
};

const VALID_PRICES = [
  { ticker: "BTC", priceUsd: 68000, fetchedAt: Date.now(), source: "coingecko" },
  { ticker: "ETH", priceUsd: 3400, fetchedAt: Date.now(), source: "coingecko" },
];

const VALID_SIGNALS = [
  { topic: "BTC", agentCount: 3, totalAgents: 10, confidence: 75, text: "bullish", trending: true, direction: "bullish", consensus: true },
];

const VALID_POOL = {
  asset: "BTC", horizon: "1h", totalBets: 4, totalDem: 20,
  poolAddress: "0xpool", roundEnd: Date.now() + 3600000,
  bets: [{ txHash: "0xtx1", bettor: "0xbet1", predictedPrice: 70000, amount: 5, roundEnd: Date.now() + 3600000, horizon: "1h" }],
};

function createMockToolkit(overrides: Partial<Record<string, (() => Promise<unknown>)>> = {}): Toolkit {
  const ok = <T>(data: T) => Promise.resolve({ ok: true as const, data });
  return {
    agents: { list: overrides.agents ?? (() => ok(VALID_AGENTS)) },
    scores: { getLeaderboard: overrides.leaderboard ?? (() => ok(VALID_LEADERBOARD)) },
    oracle: { get: overrides.oracle ?? (() => ok(VALID_ORACLE)) },
    prices: { get: overrides.prices ?? (() => ok(VALID_PRICES)) },
    intelligence: { getSignals: overrides.signals ?? (() => ok(VALID_SIGNALS)) },
    ballot: { getPool: overrides.pool ?? (() => ok(VALID_POOL)) },
  } as unknown as Toolkit;
}

describe("fetchApiEnrichment", () => {
  it("returns enrichment data from all 6 API feeds with schema-valid payloads", async () => {
    const observe = vi.fn();
    const result = await fetchApiEnrichment(createMockToolkit(), undefined, observe);

    expect(result).toBeDefined();
    expect(result!.agentCount).toBe(2);
    expect(result!.leaderboard).toMatchObject({ agents: expect.any(Array), count: 1, globalAvg: 60 });
    expect(result!.oracle).toMatchObject({ divergences: expect.any(Array) });
    expect(result!.prices).toHaveLength(2);
    expect(result!.prices![0]).toMatchObject({ ticker: "BTC", priceUsd: 68000 });
    expect(result!.signals).toHaveLength(1);
    expect(result!.signals![0]).toMatchObject({ topic: "BTC", consensus: true });
    expect(result!.bettingPool).toMatchObject({ asset: "BTC", totalBets: 4 });
  });

  it("returns partial enrichment when some feeds return ok:false", async () => {
    const observe = vi.fn();
    const toolkit = createMockToolkit({
      oracle: () => Promise.resolve({ ok: false, error: "timeout" }),
      pool: () => Promise.resolve({ ok: false, error: "not found" }),
    });
    const result = await fetchApiEnrichment(toolkit, undefined, observe);

    expect(result).toBeDefined();
    expect(result!.agentCount).toBe(2);
    expect(result!.leaderboard).toBeDefined();
    expect(result!.prices).toHaveLength(2);
    expect(result!.signals).toHaveLength(1);
    expect(result!.oracle).toBeUndefined();
    expect(result!.bettingPool).toBeUndefined();
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
});
