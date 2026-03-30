import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceRecordV2 } from "../../../src/toolkit/sources/catalog.js";
import type { ParsedAdapterResponse, ProviderAdapter } from "../../../src/toolkit/providers/types.js";

const fetchSourceMock = vi.hoisted(() => vi.fn());
const getProviderAdapterMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/toolkit/sources/fetch.js", () => ({
  fetchSource: fetchSourceMock,
}));

vi.mock("../../../src/lib/sources/providers/index.js", () => ({
  getProviderAdapter: getProviderAdapterMock,
}));

import { filterSources, testSource } from "../../../src/toolkit/sources/health.js";

function makeSource(overrides: Partial<SourceRecordV2> = {}): SourceRecordV2 {
  return {
    id: "coingecko-bitcoin",
    name: "CoinGecko Bitcoin",
    provider: "coingecko",
    url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    urlPattern: "api.coingecko.com",
    topics: ["bitcoin", "crypto"],
    tlsn_safe: true,
    dahr_safe: true,
    max_response_kb: 8,
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
      overall: 90,
      uptime: 90,
      relevance: 90,
      freshness: 90,
      sizeStability: 90,
      engagement: 90,
      trust: 90,
      testCount: 1,
      successCount: 1,
      consecutiveFailures: 0,
    },
    lifecycle: {
      discoveredAt: "2026-01-01T00:00:00.000Z",
      discoveredBy: "manual",
    },
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<ProviderAdapter> = {}): ProviderAdapter {
  return {
    provider: "coingecko",
    domains: ["crypto"],
    rateLimit: { bucket: "coingecko", maxPerMinute: 10 },
    supports: vi.fn().mockReturnValue(true),
    buildCandidates: vi.fn().mockReturnValue([
      {
        sourceId: "coingecko-bitcoin",
        provider: "coingecko",
        operation: "simple-price",
        method: "GET",
        url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        attestation: "TLSN",
        matchHints: ["bitcoin"],
      },
    ]),
    validateCandidate: vi.fn().mockReturnValue({ ok: true }),
    parseResponse: vi.fn().mockReturnValue({
      entries: [
        {
          id: "btc-1",
          title: "Bitcoin",
          bodyText: "Bitcoin price data",
          topics: ["bitcoin"],
          raw: {},
        },
      ],
    } as ParsedAdapterResponse),
    ...overrides,
  };
}

describe("toolkit source health adapter lookup", () => {
  beforeEach(() => {
    fetchSourceMock.mockReset();
    getProviderAdapterMock.mockReset();
  });

  it("uses the injected provider adapter lookup when supplied", async () => {
    const adapter = makeAdapter();
    const source = makeSource();
    const injectedGetProviderAdapter = vi.fn(async () => adapter);
    fetchSourceMock.mockResolvedValue({
      ok: true,
      response: {
        url: source.url,
        status: 200,
        headers: {},
        bodyText: '{"bitcoin":{"usd":64000}}',
      },
      attempts: 1,
      totalMs: 25,
    });

    const result = await testSource(source, {}, injectedGetProviderAdapter);

    expect(result.status).toBe("OK");
    expect(injectedGetProviderAdapter).toHaveBeenCalledWith("coingecko");
    expect(getProviderAdapterMock).not.toHaveBeenCalled();
  });

  it("falls back to the legacy adapter loader by default", async () => {
    const adapter = makeAdapter();
    const source = makeSource();
    getProviderAdapterMock.mockReturnValue(adapter);
    fetchSourceMock.mockResolvedValue({
      ok: true,
      response: {
        url: source.url,
        status: 200,
        headers: {},
        bodyText: '{"bitcoin":{"usd":64000}}',
      },
      attempts: 1,
      totalMs: 25,
    });

    const result = await testSource(source);

    expect(result.status).toBe("OK");
    expect(getProviderAdapterMock).toHaveBeenCalledWith("coingecko");
  });

  it("accepts an injected adapter lookup in filterSources without changing filtering", () => {
    const injectedGetProviderAdapter = vi.fn();
    const sources = [
      makeSource({ id: "active-source", status: "active" }),
      makeSource({ id: "quarantined-source", status: "quarantined" }),
    ];

    const result = filterSources(sources, {}, injectedGetProviderAdapter);

    expect(result.map((source) => source.id)).toEqual(["active-source"]);
    expect(injectedGetProviderAdapter).not.toHaveBeenCalled();
  });
});
