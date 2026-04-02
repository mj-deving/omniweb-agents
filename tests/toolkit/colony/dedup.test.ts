import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";

import { checkClaimDedup, checkSelfDedup } from "../../../src/toolkit/colony/dedup.js";
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

    it("returns duplicate when similar post exists within window", () => {
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
  });
});
