import { describe, expect, it } from "vitest";
import type { SourceRecordV2 } from "../tools/lib/sources/catalog.js";
import { sampleSources } from "../tools/lib/sources/lifecycle.js";

// ── Fixtures ─────────────────────────────────────────

function makeSource(overrides: Partial<SourceRecordV2> = {}): SourceRecordV2 {
  return {
    id: `src-${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Source",
    provider: "coingecko",
    url: "https://api.example.com/test",
    urlPattern: "api.example.com/test",
    topics: ["test"],
    tlsn_safe: true,
    dahr_safe: true,
    max_response_kb: 8,
    topicAliases: [],
    domainTags: ["test"],
    responseFormat: "json",
    scope: { visibility: "global", importedFrom: ["sentinel"] },
    runtime: {
      timeoutMs: 5000,
      retry: { maxAttempts: 2, backoffMs: 500, retryOn: ["timeout"] },
    },
    trustTier: "official",
    status: "active",
    rating: {
      overall: 90,
      uptime: 90,
      relevance: 90,
      freshness: 90,
      sizeStability: 90,
      engagement: 90,
      trust: 90,
      testCount: 10,
      successCount: 10,
      consecutiveFailures: 0,
    },
    lifecycle: {
      discoveredAt: "2026-01-01T00:00:00.000Z",
      discoveredBy: "manual",
    },
    ...overrides,
  };
}

// ── sampleSources ────────────────────────────────────

describe("sampleSources", () => {
  it("returns at most N sources", () => {
    const sources = Array.from({ length: 20 }, () => makeSource());

    const sampled = sampleSources(sources, 5);

    expect(sampled).toHaveLength(5);
  });

  it("returns all sources when pool is smaller than N", () => {
    const sources = [makeSource(), makeSource()];

    const sampled = sampleSources(sources, 10);

    expect(sampled).toHaveLength(2);
  });

  it("prioritizes near-promotion quarantined sources", () => {
    const nearPromotion = makeSource({
      id: "near-promo",
      status: "quarantined",
      rating: {
        overall: 70, uptime: 70, relevance: 70, freshness: 70,
        sizeStability: 70, engagement: 70, trust: 70,
        testCount: 4, successCount: 2, consecutiveFailures: 0,
      },
    });
    const farFromPromotion = makeSource({
      id: "far-promo",
      status: "quarantined",
      rating: {
        overall: 70, uptime: 70, relevance: 70, freshness: 70,
        sizeStability: 70, engagement: 70, trust: 70,
        testCount: 2, successCount: 0, consecutiveFailures: 2,
      },
    });
    const active = makeSource({ id: "active-healthy", status: "active" });

    const sampled = sampleSources([farFromPromotion, active, nearPromotion], 2);

    // near-promotion should be first (highest priority)
    expect(sampled[0].id).toBe("near-promo");
  });

  it("prioritizes sources with consecutiveFailures > 0", () => {
    const failing = makeSource({
      id: "failing",
      status: "active",
      rating: {
        overall: 80, uptime: 80, relevance: 80, freshness: 80,
        sizeStability: 80, engagement: 80, trust: 80,
        testCount: 10, successCount: 8, consecutiveFailures: 2,
      },
    });
    const healthy = makeSource({
      id: "healthy",
      status: "active",
      rating: {
        overall: 90, uptime: 90, relevance: 90, freshness: 90,
        sizeStability: 90, engagement: 90, trust: 90,
        testCount: 10, successCount: 10, consecutiveFailures: 0,
      },
    });

    const sampled = sampleSources([healthy, failing], 1);

    expect(sampled[0].id).toBe("failing");
  });

  it("prioritizes least-recently-tested sources", () => {
    const old = makeSource({
      id: "old-test",
      rating: {
        overall: 90, uptime: 90, relevance: 90, freshness: 90,
        sizeStability: 90, engagement: 90, trust: 90,
        testCount: 10, successCount: 10, consecutiveFailures: 0,
        lastTestedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const recent = makeSource({
      id: "recent-test",
      rating: {
        overall: 90, uptime: 90, relevance: 90, freshness: 90,
        sizeStability: 90, engagement: 90, trust: 90,
        testCount: 10, successCount: 10, consecutiveFailures: 0,
        lastTestedAt: new Date().toISOString(),
      },
    });

    const sampled = sampleSources([recent, old], 1);

    expect(sampled[0].id).toBe("old-test");
  });

  it("never returns archived sources", () => {
    const archived = makeSource({ id: "archived", status: "archived" });
    const active = makeSource({ id: "active", status: "active" });

    const sampled = sampleSources([archived, active], 10);

    expect(sampled).toHaveLength(1);
    expect(sampled[0].id).toBe("active");
  });

  it("never returns deprecated sources", () => {
    const deprecated = makeSource({ id: "deprecated", status: "deprecated" });
    const quarantined = makeSource({ id: "quarantined", status: "quarantined" });

    const sampled = sampleSources([deprecated, quarantined], 10);

    expect(sampled).toHaveLength(1);
    expect(sampled[0].id).toBe("quarantined");
  });
});
