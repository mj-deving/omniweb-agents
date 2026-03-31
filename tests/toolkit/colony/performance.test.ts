import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computePerformanceScores } from "../../../src/toolkit/colony/performance.js";
import { insertPost } from "../../../src/toolkit/colony/posts.js";
import { upsertReaction } from "../../../src/toolkit/colony/reactions.js";
import { initColonyCache } from "../../../src/toolkit/colony/schema.js";
import type { StrategyConfig } from "../../../src/toolkit/strategy/types.js";

const performanceConfig: StrategyConfig["performance"] = {
  engagement: 40,
  discussion: 5,
  replyBase: 10,
  replyDeep: 10,
  threadDepth: 5,
  economic: 20,
  tipBase: 10,
  tipCap: 10,
  tipMultiplier: 2,
  controversy: 7,
  ageHalfLife: 48,
};

describe("colony performance scoring", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("computes scores for our posts using engagement, discussion, and economic signals", () => {
    insertPost(db, {
      txHash: "0xours-1",
      author: "demos1loop",
      blockNumber: 1,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["defi"],
      text: "Our strong post",
      rawData: { id: 1 },
    });
    insertPost(db, {
      txHash: "0xours-2",
      author: "demos1loop",
      blockNumber: 2,
      timestamp: "2026-03-31T11:00:00.000Z",
      replyTo: null,
      tags: ["macro"],
      text: "Our quiet post",
      rawData: { id: 2 },
    });
    insertPost(db, {
      txHash: "0xother",
      author: "alice",
      blockNumber: 3,
      timestamp: "2026-03-31T11:30:00.000Z",
      replyTo: null,
      tags: ["defi"],
      text: "Someone else",
      rawData: { id: 3 },
    });
    insertPost(db, {
      txHash: "0xreply-1",
      author: "alice",
      blockNumber: 4,
      timestamp: "2026-03-31T10:30:00.000Z",
      replyTo: "0xours-1",
      tags: ["defi"],
      text: "Direct reply",
      rawData: { id: 4 },
    });
    insertPost(db, {
      txHash: "0xreply-2",
      author: "bob",
      blockNumber: 5,
      timestamp: "2026-03-31T10:45:00.000Z",
      replyTo: "0xreply-1",
      tags: ["defi"],
      text: "Nested reply",
      rawData: { id: 5 },
    });

    upsertReaction(db, {
      postTxHash: "0xours-1",
      agrees: 6,
      disagrees: 2,
      tipsCount: 2,
      tipsTotalDem: 4,
      replyCount: 2,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });
    upsertReaction(db, {
      postTxHash: "0xours-2",
      agrees: 1,
      disagrees: 0,
      tipsCount: 0,
      tipsTotalDem: 0,
      replyCount: 0,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });
    upsertReaction(db, {
      postTxHash: "0xother",
      agrees: 3,
      disagrees: 0,
      tipsCount: 0,
      tipsTotalDem: 0,
      replyCount: 1,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });

    const scores = computePerformanceScores(
      db,
      "demos1loop",
      performanceConfig,
      new Date("2026-03-31T12:00:00.000Z"),
    );

    const strong = scores.find((entry) => entry.txHash === "0xours-1");
    const quiet = scores.find((entry) => entry.txHash === "0xours-2");

    expect(scores).toHaveLength(2);
    expect(strong?.breakdown.engagement).toBeGreaterThan(0);
    expect(strong?.breakdown.discussion).toBeGreaterThan(0);
    expect(strong?.breakdown.economic).toBeGreaterThan(0);
    expect((strong?.rawScore ?? 0)).toBeGreaterThan(quiet?.rawScore ?? 0);
  });

  it("applies age decay so a 48 hour old post scores half of raw", () => {
    insertPost(db, {
      txHash: "0xold",
      author: "demos1loop",
      blockNumber: 1,
      timestamp: "2026-03-29T12:00:00.000Z",
      replyTo: null,
      tags: ["defi"],
      text: "Old post",
      rawData: { id: 1 },
    });
    upsertReaction(db, {
      postTxHash: "0xold",
      agrees: 4,
      disagrees: 0,
      tipsCount: 0,
      tipsTotalDem: 0,
      replyCount: 0,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });

    const [score] = computePerformanceScores(
      db,
      "demos1loop",
      performanceConfig,
      new Date("2026-03-31T12:00:00.000Z"),
    );

    expect(score.rawScore).toBeGreaterThan(0);
    expect(score.decayedScore).toBeCloseTo(score.rawScore / 2, 6);
  });

  it("only awards controversy when a thread has both agreement, disagreement, and depth above one", () => {
    insertPost(db, {
      txHash: "0xflat",
      author: "demos1loop",
      blockNumber: 1,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["macro"],
      text: "Flat thread",
      rawData: { id: 1 },
    });
    insertPost(db, {
      txHash: "0xdeep",
      author: "demos1loop",
      blockNumber: 2,
      timestamp: "2026-03-31T10:05:00.000Z",
      replyTo: null,
      tags: ["macro"],
      text: "Deep thread",
      rawData: { id: 2 },
    });
    insertPost(db, {
      txHash: "0xflat-reply",
      author: "alice",
      blockNumber: 3,
      timestamp: "2026-03-31T10:10:00.000Z",
      replyTo: "0xflat",
      tags: ["macro"],
      text: "One reply",
      rawData: { id: 3 },
    });
    insertPost(db, {
      txHash: "0xdeep-reply-1",
      author: "alice",
      blockNumber: 4,
      timestamp: "2026-03-31T10:15:00.000Z",
      replyTo: "0xdeep",
      tags: ["macro"],
      text: "Reply one",
      rawData: { id: 4 },
    });
    insertPost(db, {
      txHash: "0xdeep-reply-2",
      author: "bob",
      blockNumber: 5,
      timestamp: "2026-03-31T10:20:00.000Z",
      replyTo: "0xdeep-reply-1",
      tags: ["macro"],
      text: "Reply two",
      rawData: { id: 5 },
    });

    upsertReaction(db, {
      postTxHash: "0xflat",
      agrees: 2,
      disagrees: 1,
      tipsCount: 0,
      tipsTotalDem: 0,
      replyCount: 1,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });
    upsertReaction(db, {
      postTxHash: "0xdeep",
      agrees: 2,
      disagrees: 1,
      tipsCount: 0,
      tipsTotalDem: 0,
      replyCount: 2,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });

    const scores = computePerformanceScores(
      db,
      "demos1loop",
      performanceConfig,
      new Date("2026-03-31T12:00:00.000Z"),
    );

    expect(scores.find((entry) => entry.txHash === "0xflat")?.breakdown.controversy).toBe(0);
    expect(scores.find((entry) => entry.txHash === "0xdeep")?.breakdown.controversy).toBe(7);
  });

  it("caps controversy at the configured maximum", () => {
    insertPost(db, {
      txHash: "0xcontroversial",
      author: "demos1loop",
      blockNumber: 1,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["governance"],
      text: "Hot take",
      rawData: { id: 1 },
    });
    insertPost(db, {
      txHash: "0xcontroversial-r1",
      author: "alice",
      blockNumber: 2,
      timestamp: "2026-03-31T10:10:00.000Z",
      replyTo: "0xcontroversial",
      tags: ["governance"],
      text: "Counterpoint",
      rawData: { id: 2 },
    });
    insertPost(db, {
      txHash: "0xcontroversial-r2",
      author: "bob",
      blockNumber: 3,
      timestamp: "2026-03-31T10:20:00.000Z",
      replyTo: "0xcontroversial-r1",
      tags: ["governance"],
      text: "Escalation",
      rawData: { id: 3 },
    });
    upsertReaction(db, {
      postTxHash: "0xcontroversial",
      agrees: 50,
      disagrees: 40,
      tipsCount: 0,
      tipsTotalDem: 0,
      replyCount: 12,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });

    const [score] = computePerformanceScores(
      db,
      "demos1loop",
      performanceConfig,
      new Date("2026-03-31T12:00:00.000Z"),
    );

    expect(score.breakdown.controversy).toBe(7);
  });

  it("returns an empty list when we have no posts", () => {
    const scores = computePerformanceScores(
      db,
      "demos1loop",
      performanceConfig,
      new Date("2026-03-31T12:00:00.000Z"),
    );

    expect(scores).toEqual([]);
  });

  it("includes economic scoring from tips with the configured cap", () => {
    insertPost(db, {
      txHash: "0xtipped",
      author: "demos1loop",
      blockNumber: 1,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["defi"],
      text: "Tipped post",
      rawData: { id: 1 },
    });
    upsertReaction(db, {
      postTxHash: "0xtipped",
      agrees: 1,
      disagrees: 0,
      tipsCount: 1,
      tipsTotalDem: 8,
      replyCount: 0,
      lastUpdatedAt: "2026-03-31T12:00:00.000Z",
    });

    const [score] = computePerformanceScores(
      db,
      "demos1loop",
      performanceConfig,
      new Date("2026-03-31T12:00:00.000Z"),
    );

    expect(score.breakdown.economic).toBe(40);
  });
});
