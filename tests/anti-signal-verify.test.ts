/**
 * Tests for verifyAntiSignalsWithRefetch — double-fetch anti-signal verification.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
vi.mock("../src/lib/sources/fetch.js", () => ({
  fetchSource: vi.fn(),
}));

vi.mock("../src/lib/sources/providers/index.js", () => ({
  getProviderAdapter: vi.fn(),
}));

vi.mock("../src/lib/pipeline/observe.js", () => ({
  observe: vi.fn(),
}));

import { verifyAntiSignalsWithRefetch } from "../src/lib/pipeline/source-scanner.js";
import type { DetectedSignal } from "../src/lib/pipeline/signal-detection.js";
import type { SourceRecordV2 } from "../src/lib/sources/catalog.js";

// ── Helpers ──────────────────────────────────────────

function makeSource(overrides: Partial<SourceRecordV2> = {}): SourceRecordV2 {
  return {
    id: "test-source-1",
    name: "Test Source",
    provider: "test",
    url: "https://test.com/api",
    urlPattern: "test.com/api",
    domainTags: ["crypto"],
    responseFormat: "json",
    scope: { visibility: "global", importedFrom: [] },
    runtime: { timeoutMs: 5000, retry: { maxAttempts: 2, backoffMs: 1000, retryOn: ["timeout"] } },
    trustTier: "established",
    status: "active",
    rating: { overall: 80, uptime: 90, relevance: 80, freshness: 85, sizeStability: 90, engagement: 70, trust: 85, testCount: 10, successCount: 9, consecutiveFailures: 0 },
    lifecycle: { discoveredAt: "2026-01-01T00:00:00Z", discoveredBy: "manual" },
    ...overrides,
  } as SourceRecordV2;
}

function makeAntiSignal(overrides: Partial<DetectedSignal> = {}): DetectedSignal {
  return {
    source: makeSource(),
    rule: { type: "anti-signal", metric: "price" },
    strength: 1.5,
    currentValue: 60000,
    baselineValue: 70000,
    changePercent: -14.3,
    summary: "Feed claims Bitcoin at 70000, source shows 60000",
    evidence: { id: "e1", bodyText: "test", topics: ["bitcoin"], raw: {}, metrics: { price: 60000 } },
    fetchResult: { ok: true, attempts: 1, totalMs: 200, response: { url: "https://test.com/api", status: 200, headers: {}, bodyText: "{}" } },
    entity: "bitcoin",
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────

describe("verifyAntiSignalsWithRefetch", () => {
  let fetchSource: ReturnType<typeof vi.fn>;
  let getProviderAdapter: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const fetchMod = await import("../src/lib/sources/fetch.js");
    fetchSource = fetchMod.fetchSource as any;
    const providerMod = await import("../src/lib/sources/providers/index.js");
    getProviderAdapter = providerMod.getProviderAdapter as any;
  });

  it("returns empty for empty input", async () => {
    const result = await verifyAntiSignalsWithRefetch([], { gapMs: 0 });
    expect(result).toHaveLength(0);
  });

  it("passes through non-anti-signal types unchanged", async () => {
    const changeSignal: DetectedSignal = {
      ...makeAntiSignal(),
      rule: { type: "change", metric: "price", threshold: 5 },
    };
    const result = await verifyAntiSignalsWithRefetch([changeSignal], { gapMs: 0 });
    expect(result).toHaveLength(1);
    // fetchSource should NOT be called for non-anti-signal
    expect(fetchSource).not.toHaveBeenCalled();
  });

  it("verifies stable anti-signal (drift <= 5%)", async () => {
    fetchSource.mockResolvedValue({
      ok: true,
      attempts: 1,
      totalMs: 100,
      response: { url: "https://test.com/api", status: 200, headers: {}, bodyText: '{"price":60500}' },
    });
    getProviderAdapter.mockReturnValue({
      supports: () => true,
      parseResponse: () => ({
        entries: [{ id: "e1", bodyText: "test", topics: ["bitcoin"], raw: {}, metrics: { price: 60500 } }],
      }),
    });

    const signal = makeAntiSignal({ currentValue: 60000 });
    const result = await verifyAntiSignalsWithRefetch([signal], { gapMs: 0 });
    // 60500 vs 60000 = 0.83% drift, within 5% → passes
    expect(result).toHaveLength(1);
  });

  it("suppresses unstable anti-signal (drift > 5%)", async () => {
    fetchSource.mockResolvedValue({
      ok: true,
      attempts: 1,
      totalMs: 100,
      response: { url: "https://test.com/api", status: 200, headers: {}, bodyText: '{"price":70000}' },
    });
    getProviderAdapter.mockReturnValue({
      supports: () => true,
      parseResponse: () => ({
        entries: [{ id: "e1", bodyText: "test", topics: ["bitcoin"], raw: {}, metrics: { price: 70000 } }],
      }),
    });

    const signal = makeAntiSignal({ currentValue: 60000 });
    const result = await verifyAntiSignalsWithRefetch([signal], { gapMs: 0 });
    // 70000 vs 60000 = 16.7% drift → suppressed
    expect(result).toHaveLength(0);
  });

  it("suppresses when refetch fails", async () => {
    fetchSource.mockResolvedValue({ ok: false, attempts: 1, totalMs: 100, error: "timeout" });

    const signal = makeAntiSignal();
    const result = await verifyAntiSignalsWithRefetch([signal], { gapMs: 0 });
    expect(result).toHaveLength(0);
  });

  it("suppresses when original value is 0", async () => {
    fetchSource.mockResolvedValue({
      ok: true, attempts: 1, totalMs: 100,
      response: { url: "https://test.com/api", status: 200, headers: {}, bodyText: "{}" },
    });
    getProviderAdapter.mockReturnValue({
      supports: () => true,
      parseResponse: () => ({
        entries: [{ id: "e1", bodyText: "test", topics: ["bitcoin"], raw: {}, metrics: { price: 100 } }],
      }),
    });

    const signal = makeAntiSignal({ currentValue: 0 });
    const result = await verifyAntiSignalsWithRefetch([signal], { gapMs: 0 });
    expect(result).toHaveLength(0);
  });
});
