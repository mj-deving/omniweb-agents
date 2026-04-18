import { describe, expect, it } from "vitest";
import { buildResearchColonySubstrate } from "../../packages/omniweb-toolkit/src/research-colony-substrate.js";
import type { ResearchOpportunity } from "../../packages/omniweb-toolkit/src/research-opportunities.js";
import type { ResearchSourceProfile } from "../../packages/omniweb-toolkit/src/research-source-profile.js";

function makeOpportunity(): ResearchOpportunity {
  const sourceProfile: ResearchSourceProfile = {
    family: "stablecoin-supply",
    topic: "usdt ath stablecoin risk",
    asset: { asset: "tether", symbol: "USDT" },
    supported: true,
    reason: null,
    primarySourceIds: ["defillama-stablecoins"],
    supportingSourceIds: ["coingecko-2a7ea372"],
    expectedMetrics: ["circulatingUsd", "circulatingPrevWeekUsd", "priceUsd"],
  };

  return {
    kind: "coverage_gap",
    topic: "usdt ath stablecoin risk",
    score: 88,
    rationale: "High-confidence stablecoin topic is under-covered.",
    sourceProfile,
    matchedSignal: {
      topic: "usdt ath stablecoin risk",
      shortTopic: "USDT ATH Stablecoin Risk",
      confidence: 70,
      direction: "mixed",
      text: "USDT supply at ATH while macro stress could challenge BTC absorption and peg resilience.",
      keyInsight: "USDT ATH coexisting with macro stress creates a tension between liquidity and fragility.",
      agentCount: 4,
      totalAgents: 4,
      consensus: true,
      consensusScore: 100,
      assets: ["BTC"],
      tags: ["USDT", "stablecoin", "peg"],
      sourcePostData: [
        {
          txHash: "0xsource1",
          author: "0xagent1",
          text: "New USDT supply is still being absorbed cleanly into crypto liquidity.",
          category: "ANALYSIS",
          timestamp: Date.UTC(2026, 3, 18, 10, 0, 0),
          confidence: 82,
          dissents: false,
          reactions: { agree: 3, disagree: 0, flag: 0 },
        },
      ],
      crossReferences: [
        {
          type: "cross_asset",
          description: "USDT supply ATH is linked to BTC absorption capacity and dollar-liquidity pressure.",
          assets: ["BTC", "DXY"],
        },
      ],
      reactionSummary: {
        totalAgrees: 3,
        totalDisagrees: 0,
        totalFlags: 0,
      },
      divergence: {
        agent: "0xagent2",
        direction: "bearish",
        reasoning: "If dollar liquidity tightens, the same issuance can turn into peg and absorption stress.",
      },
    },
    matchingFeedPosts: [],
    lastSeenAt: null,
    contradictionSignals: [],
    attestationPlan: {
      topic: "usdt ath stablecoin risk",
      agent: "sentinel",
      catalogPath: "/tmp/catalog.json",
      ready: true,
      reason: "ready",
      primary: {
        sourceId: "defillama-stablecoins",
        name: "defillama-stablecoins-list",
        provider: "defillama",
        status: "active",
        trustTier: "established",
        responseFormat: "json",
        ratingOverall: 80,
        dahrSafe: true,
        tlsnSafe: false,
        url: "https://stablecoins.llama.fi/stablecoins?includePrices=true",
        score: 19,
      },
      supporting: [],
      fallbacks: [],
      warnings: [],
    },
  };
}

describe("buildResearchColonySubstrate", () => {
  it("preserves the full signal summary and derives compact support, dissent, and related context", () => {
    const substrate = buildResearchColonySubstrate({
      opportunity: makeOpportunity(),
      allPosts: [
        {
          txHash: "0xfeed1",
          author: "0xfeedA",
          category: "ANALYSIS",
          score: 91,
          text: "BTC absorption still looks fine even with USDT growth picking up again.",
          timestamp: Date.UTC(2026, 3, 18, 11, 0, 0),
        },
        {
          txHash: "0xfeed2",
          author: "0xfeedB",
          category: "ANALYSIS",
          score: 84,
          text: "Dollar liquidity is tightening and stablecoin pegs may feel it before BTC does.",
          timestamp: Date.UTC(2026, 3, 18, 11, 5, 0),
        },
        {
          txHash: "0xfeed3",
          author: "0xfeedC",
          category: "ANALYSIS",
          score: 72,
          text: "An unrelated energy macro post that should not rank highly here.",
          timestamp: Date.UTC(2026, 3, 18, 11, 10, 0),
        },
      ],
    });

    expect(substrate.signalSummary.shortTopic).toBe("USDT ATH Stablecoin Risk");
    expect(substrate.supportingTakes[0]?.textSnippet).toContain("absorbed cleanly");
    expect(substrate.dissentingTake?.textSnippet).toContain("tightens");
    expect(substrate.crossReferences[0]?.description).toContain("BTC absorption");
    expect(substrate.recentRelatedPosts).toHaveLength(2);
    expect(substrate.recentRelatedPosts[0]?.matchedOn.length).toBeGreaterThan(0);
  });
});
