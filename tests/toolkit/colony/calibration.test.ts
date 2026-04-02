import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { computeCalibration } from "../../../src/toolkit/colony/performance.js";
import { initColonyCache, type ColonyDatabase } from "../../../src/toolkit/colony/schema.js";
import { insertPost, type CachedPost } from "../../../src/toolkit/colony/posts.js";

function createPost(author: string, i: number): CachedPost {
  return {
    txHash: `0x${author}-${i}`,
    author,
    blockNumber: 1000 + i,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    replyTo: null,
    tags: ["test"],
    text: `Test post ${i} from ${author}`,
    rawData: { category: "ANALYSIS" },
  };
}

const DEFAULT_PERF_CONFIG = {
  engagement: 40,
  discussion: 25,
  replyBase: 10,
  replyDeep: 10,
  threadDepth: 5,
  economic: 20,
  tipBase: 10,
  tipCap: 10,
  tipMultiplier: 2,
  controversy: 5,
  ageHalfLife: 48,
};

describe("computeCalibration", () => {
  let db: ColonyDatabase;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("returns offset 0 when post count < 5 (cold start)", () => {
    // Insert 3 posts (below MIN_POSTS_FOR_CALIBRATION)
    for (let i = 0; i < 3; i++) {
      insertPost(db, createPost("0xour-wallet", i));
    }

    const result = computeCalibration(db, "0xour-wallet", DEFAULT_PERF_CONFIG);

    expect(result.offset).toBe(0);
    expect(result.postCount).toBe(3);
    expect(result.computedAt).toBeTruthy();
  });

  it("computes calibration when sufficient posts exist", () => {
    // Insert 10 posts from us + some from others for colony baseline
    for (let i = 0; i < 10; i++) {
      insertPost(db, createPost("0xour-wallet", i));
    }
    for (let i = 0; i < 20; i++) {
      insertPost(db, createPost(`0xother-${i}`, i));
    }

    const result = computeCalibration(db, "0xour-wallet", DEFAULT_PERF_CONFIG);

    expect(result.postCount).toBe(10);
    expect(typeof result.ourAvgScore).toBe("number");
    expect(typeof result.colonyMedianScore).toBe("number");
    expect(typeof result.offset).toBe("number");
    expect(result.computedAt).toBeTruthy();
  });

  it("returns zero offset when no posts at all", () => {
    const result = computeCalibration(db, "0xour-wallet", DEFAULT_PERF_CONFIG);

    expect(result.offset).toBe(0);
    expect(result.postCount).toBe(0);
  });
});
