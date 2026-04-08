import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getLifecycle, upsertLifecycle } from "../../../src/toolkit/colony/source-lifecycle-store.js";
import { initColonyCache } from "../../../src/toolkit/colony/schema.js";
import type { SourceRecordV2 } from "../../../src/toolkit/sources/catalog.js";
import type { SourceTestResult } from "../../../src/toolkit/sources/health.js";
import {
  loadPersistedLifecycle,
  persistRatingUpdate,
  persistTransition,
} from "../../../src/toolkit/sources/lifecycle.js";

function makeSource(overrides: Partial<SourceRecordV2> = {}): SourceRecordV2 {
  return {
    id: "btc-hash-rate",
    name: "Bitcoin Hash Rate",
    provider: "coingecko",
    url: "https://api.example.com/btc",
    urlPattern: "api.example.com/btc",
    topics: ["bitcoin"],
    tlsn_safe: true,
    dahr_safe: true,
    max_response_kb: 64,
    topicAliases: ["btc"],
    domainTags: ["crypto"],
    responseFormat: "json",
    scope: { visibility: "global", importedFrom: ["sentinel"] },
    runtime: {
      timeoutMs: 5000,
      retry: { maxAttempts: 2, backoffMs: 500, retryOn: ["timeout"] },
    },
    trustTier: "official",
    status: "active",
    rating: {
      overall: 82,
      uptime: 88,
      relevance: 80,
      freshness: 79,
      sizeStability: 84,
      engagement: 76,
      trust: 90,
      testCount: 4,
      successCount: 2,
      consecutiveFailures: 1,
    },
    lifecycle: {
      discoveredAt: "2026-01-01T00:00:00.000Z",
      discoveredBy: "manual",
    },
    ...overrides,
  };
}

function makeTestResult(overrides: Partial<SourceTestResult> = {}): SourceTestResult {
  return {
    sourceId: "btc-hash-rate",
    provider: "coingecko",
    status: "OK",
    latencyMs: 180,
    entryCount: 3,
    sampleTitles: ["Bitcoin"],
    error: null,
    ...overrides,
  };
}

describe("toolkit lifecycle persistence", () => {
  let db: ReturnType<typeof initColonyCache>;

  beforeEach(() => {
    db = initColonyCache(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("persistRatingUpdate writes the updated rating state and preserves prior transition metadata", () => {
    const source = makeSource();

    upsertLifecycle(db, source.id, {
      status: source.status,
      rating: {
        overall: source.rating.overall,
        uptime: source.rating.uptime,
        relevance: source.rating.relevance,
        freshness: source.rating.freshness,
        sizeStability: source.rating.sizeStability,
        engagement: source.rating.engagement,
        trust: source.rating.trust,
        testCount: source.rating.testCount,
        successCount: source.rating.successCount,
        consecutiveFailures: source.rating.consecutiveFailures,
      },
      testCount: source.rating.testCount,
      successCount: source.rating.successCount,
      consecutiveFailures: source.rating.consecutiveFailures,
      lastTransitionAt: "2026-04-01T09:55:00.000Z",
      transitionHistory: [
        {
          at: "2026-04-01T09:55:00.000Z",
          oldStatus: "quarantined",
          newStatus: "active",
          reason: "Promoted: 3 consecutive passes",
        },
      ],
    });

    const updated = persistRatingUpdate(
      db,
      source,
      makeTestResult({ status: "NO_ADAPTER", latencyMs: 250 }),
    );

    expect(updated.rating).toEqual(expect.objectContaining({
      testCount: 5,
      successCount: 2,
      consecutiveFailures: 1,
      lastTestedAt: expect.any(String),
    }));

    expect(getLifecycle(db, source.id)).toEqual(expect.objectContaining({
      sourceId: source.id,
      status: "active",
      testCount: 5,
      successCount: 2,
      consecutiveFailures: 1,
      lastTransitionAt: "2026-04-01T09:55:00.000Z",
      transitionHistory: [
        {
          at: "2026-04-01T09:55:00.000Z",
          oldStatus: "quarantined",
          newStatus: "active",
          reason: "Promoted: 3 consecutive passes",
        },
      ],
      rating: expect.objectContaining({
        overall: 82,
        testCount: 5,
        successCount: 2,
        consecutiveFailures: 1,
        lastResponseMs: 250,
        lastTestedAt: expect.any(String),
      }),
      lastTestAt: expect.any(String),
    }));
  });

  it("persistTransition records transition history when evaluateTransition recommends a new status", () => {
    const source = makeSource({
      status: "quarantined",
      rating: {
        overall: 82,
        uptime: 88,
        relevance: 80,
        freshness: 79,
        sizeStability: 84,
        engagement: 76,
        trust: 90,
        testCount: 4,
        successCount: 3,
        consecutiveFailures: 0,
      },
    });

    const transition = persistTransition(db, source, makeTestResult());

    expect(transition).toEqual(expect.objectContaining({
      sourceId: source.id,
      currentStatus: "quarantined",
      newStatus: "active",
      reason: expect.stringContaining("Promoted"),
      testResult: expect.objectContaining({ status: "OK" }),
    }));

    expect(getLifecycle(db, source.id)).toEqual(expect.objectContaining({
      sourceId: source.id,
      status: "active",
      lastTransitionAt: expect.any(String),
      transitionHistory: [
        {
          at: expect.any(String),
          oldStatus: "quarantined",
          newStatus: "active",
          reason: expect.stringContaining("Promoted"),
        },
      ],
    }));
  });

  it("persistTransition does not create lifecycle rows when no transition is needed", () => {
    const source = makeSource({
      status: "active",
      rating: {
        overall: 90,
        uptime: 95,
        relevance: 88,
        freshness: 90,
        sizeStability: 91,
        engagement: 84,
        trust: 92,
        testCount: 6,
        successCount: 6,
        consecutiveFailures: 0,
      },
    });

    const transition = persistTransition(db, source);

    expect(transition.newStatus).toBeNull();
    expect(getLifecycle(db, source.id)).toBeNull();
  });

  it("loadPersistedLifecycle maps persisted rows back into runtime lifecycle fields", () => {
    upsertLifecycle(db, "btc-hash-rate", {
      status: "degraded",
      rating: {
        overall: 55,
        uptime: 60,
        relevance: 58,
        freshness: 54,
        sizeStability: 57,
        engagement: 50,
        trust: 62,
        lastTestedAt: "2026-04-01T10:00:00.000Z",
        testCount: 9,
        successCount: 2,
        consecutiveFailures: 3,
      },
      lastTestAt: "2026-04-01T10:00:00.000Z",
      testCount: 9,
      successCount: 2,
      consecutiveFailures: 3,
      lastTransitionAt: "2026-03-20T12:00:00.000Z",
      transitionHistory: [
        {
          at: "2026-03-20T12:00:00.000Z",
          oldStatus: "active",
          newStatus: "degraded",
          reason: "3 consecutive failures",
        },
      ],
    });

    expect(loadPersistedLifecycle(db, "btc-hash-rate")).toEqual({
      id: "btc-hash-rate",
      status: "degraded",
      rating: {
        overall: 55,
        uptime: 60,
        relevance: 58,
        freshness: 54,
        sizeStability: 57,
        engagement: 50,
        trust: 62,
        lastTestedAt: "2026-04-01T10:00:00.000Z",
        testCount: 9,
        successCount: 2,
        consecutiveFailures: 3,
      },
      lifecycle: {
        statusChangedAt: "2026-03-20T12:00:00.000Z",
      },
    });
  });
});
