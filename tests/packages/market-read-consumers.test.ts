import { describe, expect, it, vi } from "vitest";
import {
  MARKET_READ_SURFACE,
  classifyMarketReadShape,
  createClient,
  summarizeMarketReadCoverage,
} from "../../packages/omniweb-toolkit/src/index.js";

describe("market read consumers", () => {
  it("keeps the market read matrix no-spend while surfacing live deployment drift", () => {
    const summary = summarizeMarketReadCoverage();

    expect(summary.ok).toBe(true);
    expect(summary.coveredFamilies).toEqual(expect.arrayContaining([
      "fixed-price",
      "higher-lower",
      "binary",
      "eth-winners",
      "eth-binary",
      "sports-markets",
      "sports-pool",
      "sports-winners",
      "commodity",
      "prediction-intelligence",
      "prediction-recommendations",
      "prediction-scoring",
    ]));
    expect(summary.driftedFamilies).toEqual(["eth-fixed-price", "eth-higher-lower", "graduation"]);
    expect(MARKET_READ_SURFACE.every((entry) => entry.noSpend && entry.noMutation)).toBe(true);
    expect(MARKET_READ_SURFACE.find((entry) => entry.family === "fixed-price")?.timeParameters).toEqual([
      expect.objectContaining({
        name: "horizon",
        defaultValue: "30m",
        examples: expect.arrayContaining(["30m", "1h", "4h", "12h", "24h"]),
      }),
    ]);
    expect(MARKET_READ_SURFACE.find((entry) => entry.family === "commodity")?.timeParameters).toEqual([
      expect.objectContaining({
        name: "horizon",
        defaultValue: "30m",
      }),
    ]);
  });

  it("classifies family-specific shapes instead of treating one pool as proof for all markets", () => {
    expect(classifyMarketReadShape("fixed-price", {
      asset: "BTC",
      horizon: "30m",
      totalBets: 0,
      totalDem: 0,
      poolAddress: "0xpool",
      roundEnd: 1779130800000,
      bets: [],
    })).toMatchObject({ verdict: "pass", missingKeys: [] });

    expect(classifyMarketReadShape("sports-markets", {
      markets: [{ fixtureId: "football_espn_740956" }],
      poolAddress: "0xpool",
    })).toMatchObject({ verdict: "pass", missingKeys: [] });

    expect(classifyMarketReadShape("eth-fixed-price", {
      error: "ETH betting not enabled (contract not deployed)",
    })).toMatchObject({
      verdict: "expected_error_shape",
      status: "live_shape_drifted",
      error: "ETH betting not enabled (contract not deployed)",
    });
  });

  it("routes root client market methods to each maintained read endpoint", async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({
        ok: true,
        pools: {},
        markets: [],
        winners: [],
        predictions: [],
        recommendations: [],
        scores: [],
        count: 0,
        enabled: false,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = createClient({
      baseUrl: "https://example.test",
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.getPool({ asset: "BTC", horizon: "30m" });
    await client.getHigherLowerPool({ asset: "BTC", horizon: "30m" });
    await client.getBinaryPools({ category: "macro", limit: 2 });
    await client.getEthPool({ asset: "BTC", horizon: "30m" });
    await client.getEthWinners({ asset: "BTC" });
    await client.getEthHigherLowerPool({ asset: "BTC", horizon: "30m" });
    await client.getEthBinaryPools();
    await client.getSportsMarkets({ status: "upcoming" });
    await client.getSportsPool("football_espn_740956");
    await client.getSportsWinners("football_espn_740956");
    await client.getCommodityPool({ asset: "XAU", horizon: "30m" });
    await client.getGraduationMarkets({ limit: 2, status: "active" });

    expect(calls).toEqual([
      "https://example.test/api/bets/pool?asset=BTC&horizon=30m",
      "https://example.test/api/bets/higher-lower/pool?asset=BTC&horizon=30m",
      "https://example.test/api/bets/binary/pools?category=macro&limit=2",
      "https://example.test/api/bets/eth/pool?asset=BTC&horizon=30m",
      "https://example.test/api/bets/eth/winners?asset=BTC",
      "https://example.test/api/bets/eth/hl/pool?asset=BTC&horizon=30m",
      "https://example.test/api/bets/eth/binary/pools",
      "https://example.test/api/bets/sports/markets?status=upcoming",
      "https://example.test/api/bets/sports/pool?fixtureId=football_espn_740956",
      "https://example.test/api/bets/sports/winners?fixtureId=football_espn_740956",
      "https://example.test/api/bets/commodity/pool?asset=XAU&horizon=30m",
      "https://example.test/api/bets/graduation/markets?limit=2&status=active",
    ]);
    expect(fetch).toHaveBeenCalledTimes(12);
  });
});
