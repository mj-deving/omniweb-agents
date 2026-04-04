import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getPost, getPostsByAuthor, getRecentPosts, getRepliesTo, insertPost, countPosts, prunePosts } from "../../../src/toolkit/colony/posts.js";
import { insertClaim } from "../../../src/toolkit/colony/claims.js";
import { initColonyCache } from "../../../src/toolkit/colony/schema.js";

describe("colony posts", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("inserts and retrieves a cached post", () => {
    insertPost(db, {
      txHash: "0xpost-1",
      author: "demos1alice",
      blockNumber: 101,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["bitcoin", "mining"],
      text: "Bitcoin hash rate is climbing.",
      rawData: { kind: "post", score: 1 },
    });

    expect(getPost(db, "0xpost-1")).toEqual({
      txHash: "0xpost-1",
      author: "demos1alice",
      blockNumber: 101,
      timestamp: "2026-03-31T10:00:00.000Z",
      replyTo: null,
      tags: ["bitcoin", "mining"],
      text: "Bitcoin hash rate is climbing.",
      rawData: { kind: "post", score: 1 },
    });
  });

  it("queries posts by author, recency, replies, and count", () => {
    insertPost(db, {
      txHash: "0xroot-1",
      author: "demos1alice",
      blockNumber: 100,
      timestamp: "2026-03-31T09:00:00.000Z",
      replyTo: null,
      tags: ["macro"],
      text: "Root post",
      rawData: { id: 1 },
    });
    insertPost(db, {
      txHash: "0xreply-1",
      author: "demos1bob",
      blockNumber: 101,
      timestamp: "2026-03-31T09:05:00.000Z",
      replyTo: "0xroot-1",
      tags: ["macro"],
      text: "First reply",
      rawData: { id: 2 },
    });
    insertPost(db, {
      txHash: "0xroot-2",
      author: "demos1alice",
      blockNumber: 102,
      timestamp: "2026-03-31T09:10:00.000Z",
      replyTo: null,
      tags: ["defi"],
      text: "Second root",
      rawData: { id: 3 },
    });

    expect(getPostsByAuthor(db, "demos1alice", 1).map((post) => post.txHash)).toEqual(["0xroot-2"]);
    expect(getRecentPosts(db, "2026-03-31T09:04:00.000Z").map((post) => post.txHash)).toEqual([
      "0xroot-2",
      "0xreply-1",
    ]);
    expect(getRepliesTo(db, "0xroot-1").map((post) => post.txHash)).toEqual(["0xreply-1"]);
    expect(countPosts(db)).toBe(3);
  });
});

describe("prunePosts", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  const oldTimestamp = "2020-01-01T00:00:00.000Z";
  const recentTimestamp = new Date().toISOString();

  it("prunes old unreferenced posts", () => {
    insertPost(db, {
      txHash: "0xold-1",
      author: "alice",
      blockNumber: 1,
      timestamp: oldTimestamp,
      replyTo: null,
      tags: [],
      text: "Old post",
      rawData: {},
    });
    insertPost(db, {
      txHash: "0xrecent-1",
      author: "alice",
      blockNumber: 2,
      timestamp: recentTimestamp,
      replyTo: null,
      tags: [],
      text: "Recent post",
      rawData: {},
    });

    const result = prunePosts(db, { retentionDays: 30 });
    expect(result.pruned).toBe(1);
    expect(result.preserved).toBe(0);
    expect(countPosts(db)).toBe(1);
    expect(getPost(db, "0xrecent-1")).not.toBeNull();
    expect(getPost(db, "0xold-1")).toBeNull();
  });

  it("preserves old posts referenced by claim_ledger", () => {
    insertPost(db, {
      txHash: "0xold-claimed",
      author: "alice",
      blockNumber: 1,
      timestamp: oldTimestamp,
      replyTo: null,
      tags: [],
      text: "Old claimed post",
      rawData: {},
    });
    insertClaim(db, {
      subject: "bitcoin",
      metric: "price",
      value: 100,
      unit: "USD",
      direction: null,
      chain: "eth:1",
      address: null,
      market: null,
      entityId: null,
      dataTimestamp: null,
      postTxHash: "0xold-claimed",
      author: "alice",
      claimedAt: oldTimestamp,
      attestationTxHash: null,
      verified: false,
      verificationResult: null,
      stale: false,
    });

    const result = prunePosts(db, { retentionDays: 30 });
    expect(result.pruned).toBe(0);
    expect(result.preserved).toBe(1);
    expect(getPost(db, "0xold-claimed")).not.toBeNull();
  });

  it("preserves old posts that are parents of other posts", () => {
    insertPost(db, {
      txHash: "0xold-parent",
      author: "alice",
      blockNumber: 1,
      timestamp: oldTimestamp,
      replyTo: null,
      tags: [],
      text: "Parent post",
      rawData: {},
    });
    insertPost(db, {
      txHash: "0xchild",
      author: "bob",
      blockNumber: 2,
      timestamp: recentTimestamp,
      replyTo: "0xold-parent",
      tags: [],
      text: "Reply",
      rawData: {},
    });

    const result = prunePosts(db, { retentionDays: 30 });
    expect(result.pruned).toBe(0);
    expect(result.preserved).toBe(1);
  });

  it("dryRun counts without deleting", () => {
    insertPost(db, {
      txHash: "0xold-dry",
      author: "alice",
      blockNumber: 1,
      timestamp: oldTimestamp,
      replyTo: null,
      tags: [],
      text: "Old post",
      rawData: {},
    });

    const result = prunePosts(db, { retentionDays: 30, dryRun: true });
    expect(result.pruned).toBe(1);
    expect(getPost(db, "0xold-dry")).not.toBeNull();
  });

  it("cleans up embeddings for pruned posts", () => {
    insertPost(db, {
      txHash: "0xold-emb",
      author: "alice",
      blockNumber: 1,
      timestamp: oldTimestamp,
      replyTo: null,
      tags: [],
      text: "Old post with embedding",
      rawData: {},
    });
    // Get the rowid of the inserted post
    const rowid = Number(
      db.prepare("SELECT rowid FROM posts WHERE tx_hash = ?").pluck().get("0xold-emb"),
    );
    db.prepare("INSERT INTO post_embeddings (post_rowid, vec_rowid) VALUES (?, ?)").run(rowid, 1);

    const result = prunePosts(db, { retentionDays: 30 });
    expect(result.pruned).toBe(1);

    const embCount = Number(
      db.prepare("SELECT COUNT(*) FROM post_embeddings WHERE post_rowid = ?").pluck().get(rowid),
    );
    expect(embCount).toBe(0);
  });
});
