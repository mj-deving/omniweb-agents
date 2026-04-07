import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  checkClaimDedup,
  checkSelfDedup,
  computeTopicSimilarity,
} from "../../../src/toolkit/colony/dedup.js";
import { initColonyCache, type ColonyDatabase } from "../../../src/toolkit/colony/schema.js";
import { insertPost, type CachedPost } from "../../../src/toolkit/colony/posts.js";

function createTestPost(overrides: Partial<CachedPost> = {}): CachedPost {
  return {
    txHash: `0x${Math.random().toString(16).slice(2, 10)}`,
    author: "0xalice",
    blockNumber: 1000,
    timestamp: new Date().toISOString(),
    replyTo: null,
    tags: ["defi"],
    text: "DeFi protocol shows strong growth in total value locked across multiple chains",
    rawData: { category: "ANALYSIS" },
    ...overrides,
  };
}

describe("computeTopicSimilarity", () => {
  it("returns 0 for completely different topics", () => {
    const score = computeTopicSimilarity(
      "Quantum computing breakthroughs in Europe",
      "Tropical fish breeding techniques underwater",
    );
    expect(score).toBeLessThan(0.1);
  });

  it("returns 1 for identical topics", () => {
    const score = computeTopicSimilarity(
      "Bitcoin mining economics",
      "Bitcoin mining economics",
    );
    expect(score).toBe(1.0);
  });

  it("BTC Macro vs PBOC Yuan are NOT duplicates (< 0.4)", () => {
    const score = computeTopicSimilarity(
      "BTC Macro Pressure from Geopolitics PBOC",
      "China PBOC Yuan Defense and Crypto Capital Inflow",
    );
    expect(score).toBeLessThan(0.4);
  });

  it("DXY USD vs BTC Macro are NOT duplicates (< 0.4)", () => {
    const score = computeTopicSimilarity(
      "DXY USD Liquidity Tightening",
      "BTC Macro Pressure",
    );
    expect(score).toBeLessThan(0.4);
  });

  it("PBOC Yuan Defense vs PBOC Yuan Defense Mechanisms ARE duplicates (>= 0.4)", () => {
    const score = computeTopicSimilarity(
      "China PBOC Yuan Defense",
      "PBOC Yuan Defense Mechanisms and Capital Controls",
    );
    expect(score).toBeGreaterThanOrEqual(0.4);
  });

  it("Aave DeFi vs Aave Vulnerability ARE duplicates (>= 0.4)", () => {
    const score = computeTopicSimilarity(
      "Aave DeFi Smart Contract Risk",
      "Aave Smart Contract Vulnerability Assessment",
    );
    expect(score).toBeGreaterThanOrEqual(0.4);
  });

  it("Bitcoin mining economics vs analysis ARE duplicates (>= 0.4)", () => {
    const score = computeTopicSimilarity(
      "Bitcoin mining economics",
      "Bitcoin mining economics analysis",
    );
    expect(score).toBeGreaterThanOrEqual(0.4);
  });

  it("handles empty strings", () => {
    expect(computeTopicSimilarity("", "")).toBe(0);
    expect(computeTopicSimilarity("hello world", "")).toBe(0);
    expect(computeTopicSimilarity("", "hello world")).toBe(0);
  });

  it("is case-insensitive", () => {
    const score = computeTopicSimilarity(
      "Bitcoin Mining Economics",
      "bitcoin mining economics",
    );
    expect(score).toBe(1.0);
  });
});

describe("dedup", () => {
  let db: ColonyDatabase;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  describe("checkClaimDedup", () => {
    it("returns not duplicate when no matching posts exist", () => {
      const result = checkClaimDedup(db, "completely novel topic about quantum computing");

      expect(result.isDuplicate).toBe(false);
      expect(result.matches).toEqual([]);
    });

    it("returns duplicate when very similar post exists within window", () => {
      insertPost(db, createTestPost({
        text: "DeFi protocol shows strong growth in total value locked",
        timestamp: new Date().toISOString(),
      }));

      const result = checkClaimDedup(db, "DeFi protocol strong growth total value locked");

      expect(result.isDuplicate).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      expect(result.reason).toMatch(/similar content/i);
    });

    it("returns not duplicate when similar post is outside window", () => {
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      insertPost(db, createTestPost({
        text: "DeFi protocol shows strong growth in total value locked",
        timestamp: oldTimestamp,
      }));

      const result = checkClaimDedup(db, "DeFi protocol strong growth total value locked", {
        windowHours: 24,
      });

      expect(result.isDuplicate).toBe(false);
    });

    it("handles empty claim gracefully", () => {
      const result = checkClaimDedup(db, "");

      expect(result.isDuplicate).toBe(false);
      expect(result.matches).toEqual([]);
    });

    it("handles claims with special characters", () => {
      const result = checkClaimDedup(db, "price $100+ (up 50%)!");

      expect(result.isDuplicate).toBe(false);
    });

    it("does NOT false-positive on single shared keyword (PBOC fix)", () => {
      // This was the core bug: sharing just "Macro" caused false positive
      insertPost(db, createTestPost({
        text: "China PBOC Yuan Defense and Crypto Capital Inflow analysis with detailed macro perspective",
        timestamp: new Date().toISOString(),
      }));

      const result = checkClaimDedup(
        db,
        "BTC Macro Pressure from Geopolitics PBOC",
      );

      // These are different topics — should NOT be flagged as duplicate
      expect(result.isDuplicate).toBe(false);
    });

    it("catches true duplicates with phrase overlap", () => {
      insertPost(db, createTestPost({
        text: "PBOC Yuan Defense Mechanisms and Capital Controls detailed analysis",
        timestamp: new Date().toISOString(),
      }));

      const result = checkClaimDedup(db, "China PBOC Yuan Defense");

      expect(result.isDuplicate).toBe(true);
    });
  });

  describe("checkSelfDedup", () => {
    it("returns duplicate when we posted on same topic recently", () => {
      insertPost(db, createTestPost({
        author: "0xour-wallet",
        text: "Bitcoin analysis showing bullish momentum on daily chart",
        timestamp: new Date().toISOString(),
      }));

      const result = checkSelfDedup(db, "Bitcoin bullish momentum daily chart", "0xour-wallet");

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toMatch(/we already posted/i);
    });

    it("returns not duplicate when another agent posted but we didn't", () => {
      insertPost(db, createTestPost({
        author: "0xother-agent",
        text: "Bitcoin analysis showing bullish momentum on daily chart",
        timestamp: new Date().toISOString(),
      }));

      const result = checkSelfDedup(db, "Bitcoin bullish momentum daily chart", "0xour-wallet");

      expect(result.isDuplicate).toBe(false);
    });

    it("handles empty address gracefully", () => {
      const result = checkSelfDedup(db, "some topic", "");

      expect(result.isDuplicate).toBe(false);
    });

    it("does NOT false-positive on single shared keyword (self dedup)", () => {
      insertPost(db, createTestPost({
        author: "0xour-wallet",
        text: "DXY USD Liquidity Tightening impact on global markets",
        timestamp: new Date().toISOString(),
      }));

      const result = checkSelfDedup(
        db,
        "BTC Macro Pressure from Geopolitics",
        "0xour-wallet",
      );

      // Completely different topics — should NOT match
      expect(result.isDuplicate).toBe(false);
    });
  });
});
