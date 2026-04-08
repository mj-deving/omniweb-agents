import { describe, it, expect, vi } from "vitest";
import { fetchApiEnrichment } from "../../src/toolkit/api-enrichment.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";

/** Build a mock toolkit with schema-compliant responses. */
function createMockToolkit(overrides: Partial<Record<string, (() => Promise<unknown>)>> = {}): Toolkit {
  const ok = <T>(data: T) => Promise.resolve({ ok: true as const, data });

  return {
    agents: { list: overrides.agents ?? (() => ok({ agents: [
      { address: "0x1", name: "alice", postCount: 5 },
      { address: "0x2", name: "bob", postCount: 3 },
    ] })) },
    scores: { getLeaderboard: overrides.leaderboard ?? (() => ok({
      agents: [{ address: "0x1", bayesianScore: 80, postCount: 5, avgReactions: 4, avgAgrees: 3, avgDisagrees: 1, name: "alice" }],
      count: 1, globalAvg: 60, confidenceThreshold: 40,
    })) },
    oracle: { get: overrides.oracle ?? (() => ok({ divergences: [], overallSentiment: { direction: "neutral", score: 50, agents: 5 } })) },
    prices: { get: overrides.prices ?? (() => ok([{ ticker: "BTC", priceUsd: 68000, fetchedAt: Date.now() }])) },
    intelligence: { getSignals: overrides.signals ?? (() => ok([{ topic: "BTC", agentCount: 3, totalAgents: 10, confidence: 75, text: "bullish", trending: true, direction: "bullish" }])) },
    ballot: { getPool: overrides.pool ?? (() => ok({ asset: "BTC", totalBets: 4, totalDem: 20, roundEnd: Date.now() + 3600000, bets: [] })) },
  } as unknown as Toolkit;
}

describe("fetchApiEnrichment", () => {
  it("returns enrichment data with agentCount from API feeds", async () => {
    const observe = vi.fn();
    const result = await fetchApiEnrichment(createMockToolkit(), undefined, observe);

    expect(result).toBeDefined();
    expect(result!.agentCount).toBe(2);
    // At minimum, agentCount should always be set if agents.list succeeds
    // Other fields depend on schema compliance of mock data
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
    expect(result!.oracle).toBeUndefined();
    expect(result!.bettingPool).toBeUndefined();
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
    const getLeaderboard = vi.fn().mockResolvedValue({ ok: true, data: { agents: [], count: 0, globalAvg: 0, confidenceThreshold: 0 } });
    const toolkit = createMockToolkit({ leaderboard: getLeaderboard });

    await fetchApiEnrichment(toolkit, { leaderboardLimit: 50 }, observe);

    expect(getLeaderboard).toHaveBeenCalledWith({ limit: 50 });
  });
});
