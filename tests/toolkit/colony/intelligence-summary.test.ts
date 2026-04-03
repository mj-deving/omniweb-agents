import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildColonyIntelligence } from "../../../src/toolkit/colony/intelligence-summary.js";
import { initColonyCache, type ColonyDatabase } from "../../../src/toolkit/colony/schema.js";
import { insertPost } from "../../../src/toolkit/colony/posts.js";
import { insertClaim } from "../../../src/toolkit/colony/claims.js";

function createTestDb(): ColonyDatabase {
  return initColonyCache(":memory:");
}

function addPost(db: ColonyDatabase, txHash: string, author: string, timestamp?: string) {
  insertPost(db, {
    txHash, author, blockNumber: 1,
    timestamp: timestamp ?? new Date().toISOString(),
    replyTo: null, tags: [], text: "Test post", rawData: {},
  });
}

const SINCE = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

describe("buildColonyIntelligence", () => {
  let db: ColonyDatabase;
  beforeEach(() => { db = createTestDb(); });
  afterEach(() => { db.close(); });

  it("returns sensible defaults for empty DB", () => {
    const result = buildColonyIntelligence(db, {
      ourAddress: "0xOur",
      topContributorAddresses: [],
      mentionAuthors: [],
      since24h: SINCE,
    });

    expect(result.recentInteractions).toEqual({});
    expect(result.recentTips).toEqual({});
    expect(result.agentProfiles).toEqual({});
    expect(result.claimFreshness).toEqual({});
    expect(result.colonyHealth.postsLast24h).toBe(0);
    expect(result.colonyHealth.activeAgents).toBe(0);
    expect(result.colonyHealth.verifiedPostRatio).toBe(0);
    expect(result.colonyHealth.avgClaimsPerPost).toBe(0);
  });

  it("computes colony health metrics", () => {
    addPost(db, "0xP1", "0xAgent1");
    addPost(db, "0xP2", "0xAgent2");
    addPost(db, "0xP3", "0xAgent1");

    const result = buildColonyIntelligence(db, {
      ourAddress: "0xOur",
      topContributorAddresses: [],
      mentionAuthors: [],
      since24h: SINCE,
    });

    expect(result.colonyHealth.postsLast24h).toBe(3);
    expect(result.colonyHealth.activeAgents).toBe(2);
  });

  it("computes claim freshness per subject", () => {
    addPost(db, "0xP1", "0xAgent1");
    const now = new Date().toISOString();
    insertClaim(db, {
      subject: "bitcoin", metric: "price", value: 100, unit: "USD",
      direction: null, chain: "eth:1", address: null, market: null,
      entityId: null, dataTimestamp: null, postTxHash: "0xP1",
      author: "0xAgent1", claimedAt: now, attestationTxHash: null,
      verified: false, verificationResult: null, stale: false,
    });

    const result = buildColonyIntelligence(db, {
      ourAddress: "0xOur",
      topContributorAddresses: [],
      mentionAuthors: [],
      since24h: SINCE,
    });

    expect(result.claimFreshness.bitcoin).toBe(now);
  });

  it("computes evidence quality from source cache", () => {
    db.prepare(`
      INSERT INTO source_response_cache (source_id, url, last_fetched_at, response_status, response_size, response_body, ttl_seconds, consecutive_failures)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run("test-source", "https://api.test.com", new Date().toISOString(), 200, 5000, "{}", 900, 0);

    const result = buildColonyIntelligence(db, {
      ourAddress: "0xOur",
      topContributorAddresses: [],
      mentionAuthors: [],
      since24h: SINCE,
    });

    expect(result.evidenceQuality["test-source"]).toBeGreaterThan(0);
  });

  it("excludes degraded sources from evidence quality", () => {
    db.prepare(`
      INSERT INTO source_response_cache (source_id, url, last_fetched_at, response_status, response_size, response_body, ttl_seconds, consecutive_failures)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run("bad-source", "https://api.bad.com", new Date().toISOString(), 503, 0, "", 900, 3);

    const result = buildColonyIntelligence(db, {
      ourAddress: "0xOur",
      topContributorAddresses: [],
      mentionAuthors: [],
      since24h: SINCE,
    });

    expect(result.evidenceQuality["bad-source"]).toBeUndefined();
  });
});
