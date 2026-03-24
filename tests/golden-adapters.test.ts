/**
 * Declarative adapter tests — validate that YAML spec-based adapters produce
 * correct output for all 10 providers.
 *
 * Originally golden tests comparing hand-written vs declarative adapters.
 * After validating equivalence, hand-written adapters were removed (PR5).
 * These tests now serve as the canonical correctness tests for declarative adapters.
 *
 * Test strategy:
 * - buildCandidates: correct URLs, query params, attestation handling
 * - validateCandidate: TLSN rewrite behavior, DAHR blocking
 * - parseResponse: entry extraction, IDs, metrics
 */

import { describe, it, expect } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  ProviderAdapter,
  BuildCandidatesContext,
  CandidateRequest,
  FetchedResponse,
} from "../src/lib/sources/providers/types.js";
import type { SourceRecordV2 } from "../src/lib/sources/catalog.js";

// ── Declarative adapters ────────────────────────────
import { loadDeclarativeProviderAdaptersSync } from "../src/lib/sources/providers/declarative-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specsDir = resolve(__dirname, "../src/lib/sources/providers/specs");
const declAdapters = loadDeclarativeProviderAdaptersSync({
  specDir: specsDir,
  strictValidation: false,
});

function getAdapter(name: string): ProviderAdapter {
  const a = declAdapters.get(name);
  if (!a) throw new Error(`Declarative adapter "${name}" not found`);
  return a;
}

// ── Helper: minimal SourceRecordV2 ──────────────────
function makeSource(overrides: Partial<SourceRecordV2> & { id: string; provider: string; url: string }): SourceRecordV2 {
  return {
    name: overrides.id,
    urlPattern: overrides.url,
    domainTags: [],
    responseFormat: "json",
    scope: { visibility: "global", importedFrom: [] },
    runtime: { timeoutMs: 10000, retry: { maxAttempts: 1, backoffMs: 0, retryOn: [] } },
    trustTier: "established",
    status: "active" as const,
    rating: { overall: 80, uptime: 1, relevance: 1, freshness: 1, sizeStability: 1, engagement: 1, trust: 1, testCount: 0, successCount: 0, consecutiveFailures: 0 },
    lifecycle: { discoveredAt: "2026-01-01", discoveredBy: "manual" },
    ...overrides,
  } as SourceRecordV2;
}

function makeCtx(source: SourceRecordV2, topic: string, attestation: "TLSN" | "DAHR" = "DAHR", vars: Record<string, string> = {}): BuildCandidatesContext {
  const tokens = topic.toLowerCase().split(/\s+/);
  return { source, topic, tokens, vars, attestation, maxCandidates: 5 };
}

function urlPath(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

function urlParam(url: string, param: string): string | null {
  try { return new URL(url).searchParams.get(param); } catch { return null; }
}

function makeResponse(bodyText: string, url = "https://example.com", status = 200): FetchedResponse {
  return { url, status, headers: { "content-type": "application/json" }, bodyText };
}

// ════════════════════════════════════════════════════
// HN-ALGOLIA
// ════════════════════════════════════════════════════

describe("declarative: hn-algolia", () => {
  const adapter = getAdapter("hn-algolia");
  const source = makeSource({
    id: "hn-search", provider: "hn-algolia",
    url: "https://hn.algolia.com/api/v1/search",
    adapter: { operation: "search" },
  });

  it("buildCandidates: URL contains /search path", () => {
    const ctx = makeCtx(source, "artificial intelligence");
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(urlPath(candidates[0].url)).toContain("/search");
  });

  it("buildCandidates: includes query param", () => {
    const ctx = makeCtx(source, "AI safety");
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "query")).toBeTruthy();
  });

  it("buildCandidates: TLSN hitsPerPage=2", () => {
    const ctx = makeCtx(source, "LLMs", "TLSN");
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "hitsPerPage")).toBe("2");
  });

  it("buildCandidates: operation is search", () => {
    const ctx = makeCtx(source, "test");
    expect(adapter.buildCandidates(ctx)[0].operation).toBe("search");
  });

  it("validateCandidate: rewrites hitsPerPage>2 for TLSN", () => {
    const candidate: CandidateRequest = {
      sourceId: "hn-search", provider: "hn-algolia", operation: "search",
      method: "GET", url: "https://hn.algolia.com/api/v1/search?query=test&hitsPerPage=10",
      attestation: "TLSN", matchHints: ["test"],
    };
    const result = adapter.validateCandidate(candidate);
    expect(result.ok).toBe(true);
    expect(result.rewrittenUrl).toBeTruthy();
    expect(urlParam(result.rewrittenUrl!, "hitsPerPage")).toBe("2");
  });

  it("parseResponse: extracts entries with correct IDs", () => {
    const fixture = JSON.stringify({
      hits: [
        { objectID: "40001", title: "AI paper", story_text: "Good stuff", points: 100, num_comments: 50, _tags: ["story"], url: "https://example.com", created_at: "2026-01-01T00:00:00Z", author: "jdoe" },
        { objectID: "40002", title: "ML paper", points: 80, num_comments: 30, _tags: ["story"], created_at: "2026-01-02T00:00:00Z" },
      ],
    });
    const resp = makeResponse(fixture, "https://hn.algolia.com/api/v1/search?query=test");
    const parsed = adapter.parseResponse(source, resp);
    expect(parsed.entries.length).toBe(2);
    expect(parsed.entries.map(e => e.id).sort()).toEqual(["40001", "40002"]);
  });

  it("parseResponse: entries have points metric", () => {
    const fixture = JSON.stringify({
      hits: [{ objectID: "40001", title: "Test", points: 42, num_comments: 5, _tags: [] }],
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(source, resp);
    expect(parsed.entries[0].metrics?.points).toBeDefined();
  });
});

// ════════════════════════════════════════════════════
// COINGECKO
// ════════════════════════════════════════════════════

describe("declarative: coingecko", () => {
  const adapter = getAdapter("coingecko");

  const simplePriceSource = makeSource({
    id: "cg-price", provider: "coingecko",
    url: "https://api.coingecko.com/api/v3/simple/price",
    adapter: { operation: "simple-price" },
  });

  const trendingSource = makeSource({
    id: "cg-trending", provider: "coingecko",
    url: "https://api.coingecko.com/api/v3/search/trending",
    adapter: { operation: "trending" },
  });

  const coinDetailSource = makeSource({
    id: "cg-detail", provider: "coingecko",
    url: "https://api.coingecko.com/api/v3/coins/bitcoin",
    adapter: { operation: "coin-detail" },
  });

  it("buildCandidates: simple-price URL contains /simple/price", () => {
    const ctx = makeCtx(simplePriceSource, "bitcoin", "DAHR", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(urlPath(candidates[0].url)).toContain("/simple/price");
  });

  it("buildCandidates: simple-price includes ids param", () => {
    const ctx = makeCtx(simplePriceSource, "bitcoin", "DAHR", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "ids")).toBeTruthy();
  });

  it("buildCandidates: coin-detail returns empty for TLSN", () => {
    const ctx = makeCtx(coinDetailSource, "bitcoin", "TLSN", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBe(0);
  });

  it("buildCandidates: trending URL contains /search/trending", () => {
    const ctx = makeCtx(trendingSource, "crypto");
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates[0].url).toContain("/search/trending");
  });

  const simplePriceFixture = JSON.stringify({
    bitcoin: { usd: 64000, usd_market_cap: 1200000000000, usd_24h_vol: 25000000000 },
  });

  it("parseResponse: simple-price extracts entries by coin ID", () => {
    const resp = makeResponse(simplePriceFixture);
    const parsed = adapter.parseResponse(simplePriceSource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toBe("bitcoin");
  });

  it("parseResponse: simple-price has price_usd metric", () => {
    const resp = makeResponse(simplePriceFixture);
    const parsed = adapter.parseResponse(simplePriceSource, resp);
    expect(parsed.entries[0].metrics?.price_usd).toBeDefined();
  });

  it("parseResponse: trending extracts from coins[*].item", () => {
    const fixture = JSON.stringify({
      coins: [
        { item: { id: "pepe", name: "Pepe", symbol: "PEPE", market_cap_rank: 25, score: 0 } },
      ],
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(trendingSource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toBe("pepe");
  });
});

// ════════════════════════════════════════════════════
// GITHUB
// ════════════════════════════════════════════════════

describe("declarative: github", () => {
  const adapter = getAdapter("github");

  const searchSource = makeSource({
    id: "gh-search", provider: "github",
    url: "https://api.github.com/search/repositories",
    adapter: { operation: "search-repos" },
  });

  const repoSource = makeSource({
    id: "gh-repo", provider: "github",
    url: "https://api.github.com/repos/{owner}/{repo}",
    adapter: { operation: "repo" },
  });

  it("buildCandidates: search-repos URL contains /search/repositories", () => {
    const ctx = makeCtx(searchSource, "machine learning", "DAHR", { query: "machine learning" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/search/repositories");
  });

  it("buildCandidates: TLSN search-repos per_page=3", () => {
    const ctx = makeCtx(searchSource, "AI", "TLSN", { query: "AI" });
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "per_page")).toBe("3");
  });

  it("validateCandidate: rewrites per_page>3 for TLSN", () => {
    const candidate: CandidateRequest = {
      sourceId: "gh-search", provider: "github", operation: "search-repos",
      method: "GET", url: "https://api.github.com/search/repositories?q=test&per_page=10",
      attestation: "TLSN", matchHints: ["test"],
    };
    const result = adapter.validateCandidate(candidate);
    expect(result.ok).toBe(true);
    expect(result.rewrittenUrl).toBeTruthy();
    expect(urlParam(result.rewrittenUrl!, "per_page")).toBe("3");
  });

  it("parseResponse: search-repos extracts items array", () => {
    const fixture = JSON.stringify({
      total_count: 100,
      items: [
        { id: 12345, full_name: "user/repo", description: "Cool project", html_url: "https://github.com/user/repo", stargazers_count: 500, forks_count: 50, language: "Python", created_at: "2025-01-01" },
      ],
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(searchSource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(String(parsed.entries[0].id)).toBe("12345");
  });

  it("parseResponse: repo has stars metric", () => {
    const fixture = JSON.stringify({
      id: 99, full_name: "octocat/hello", description: "Hello World", html_url: "https://github.com/octocat/hello",
      stargazers_count: 1000, forks_count: 200, open_issues_count: 5, watchers_count: 900,
      topics: ["hello"], language: "JavaScript", created_at: "2020-01-01",
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(repoSource, resp);
    expect(parsed.entries[0].metrics?.stars).toBeDefined();
  });
});

// ════════════════════════════════════════════════════
// DEFILLAMA
// ════════════════════════════════════════════════════

describe("declarative: defillama", () => {
  const adapter = getAdapter("defillama");

  const tvlSource = makeSource({
    id: "dl-tvl", provider: "defillama",
    url: "https://api.llama.fi/tvl/aave",
    adapter: { operation: "tvl" },
  });

  const protocolSource = makeSource({
    id: "dl-protocol", provider: "defillama",
    url: "https://api.llama.fi/protocol/aave",
    adapter: { operation: "protocol" },
  });

  it("buildCandidates: tvl URL contains /tvl/", () => {
    const ctx = makeCtx(tvlSource, "aave", "DAHR", { asset: "aave" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/tvl/");
  });

  it("buildCandidates: tvl uses source URL protocol, not topic", () => {
    // Source URL has "compound-finance" but topic is "defi" — should use source's protocol
    const compoundSource = makeSource({
      id: "dl-tvl-compound", provider: "defillama",
      url: "https://api.llama.fi/tvl/compound-finance",
      adapter: { operation: "tvl" },
    });
    const ctx = makeCtx(compoundSource, "defi", "DAHR");
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/tvl/compound-finance");
    expect(candidates[0].url).not.toContain("/tvl/defi");
  });

  it("buildCandidates: protocol returns empty for TLSN", () => {
    const ctx = makeCtx(protocolSource, "aave", "TLSN", { asset: "aave" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBe(0);
  });

  it("parseResponse: tvl extracts single entry", () => {
    const fixture = "1234567890.12";
    const resp = makeResponse(fixture, "https://api.llama.fi/tvl/aave");
    const parsed = adapter.parseResponse(tvlSource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toContain("tvl");
  });
});

// ════════════════════════════════════════════════════
// ARXIV
// ════════════════════════════════════════════════════

describe("declarative: arxiv", () => {
  const adapter = getAdapter("arxiv");
  const source = makeSource({
    id: "arxiv-search", provider: "arxiv",
    url: "https://export.arxiv.org/api/query",
    adapter: { operation: "search" },
    responseFormat: "xml",
  });

  it("buildCandidates: returns empty for DAHR", () => {
    const ctx = makeCtx(source, "quantum computing", "DAHR");
    expect(adapter.buildCandidates(ctx).length).toBe(0);
  });

  it("buildCandidates: TLSN URL has max_results=3", () => {
    const ctx = makeCtx(source, "transformers", "TLSN");
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(urlParam(candidates[0].url, "max_results")).toBe("3");
  });

  it("validateCandidate: DAHR rejected", () => {
    const candidate: CandidateRequest = {
      sourceId: "arxiv-search", provider: "arxiv", operation: "search",
      method: "GET", url: "https://export.arxiv.org/api/query?search_query=test&max_results=5",
      attestation: "DAHR", matchHints: ["test"],
    };
    expect(adapter.validateCandidate(candidate).ok).toBe(false);
  });

  it("parseResponse: extracts entries from XML", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed>
<entry>
<id>http://arxiv.org/abs/2301.12345v1</id>
<title>Test Paper on AI</title>
<summary>This is about AI safety research.</summary>
<published>2026-01-15T00:00:00Z</published>
<category term="cs.AI" />
<author><name>Alice Smith</name></author>
</entry>
<entry>
<id>http://arxiv.org/abs/2301.67890v1</id>
<title>Another Paper</title>
<summary>About neural networks.</summary>
<published>2026-01-14T00:00:00Z</published>
<category term="cs.LG" />
<author><name>Bob Jones</name></author>
</entry>
</feed>`;
    const resp = makeResponse(xml, "https://export.arxiv.org/api/query?search_query=test");
    const parsed = adapter.parseResponse(source, resp);
    expect(parsed.entries.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════
// WIKIPEDIA
// ════════════════════════════════════════════════════

describe("declarative: wikipedia", () => {
  const adapter = getAdapter("wikipedia");

  const summarySource = makeSource({
    id: "wiki-summary", provider: "wikipedia",
    url: "https://en.wikipedia.org/api/rest_v1/page/summary/Test",
    adapter: { operation: "summary" },
  });

  const searchSource = makeSource({
    id: "wiki-search", provider: "wikipedia",
    url: "https://en.wikipedia.org/w/api.php?action=query&list=search",
    adapter: { operation: "search" },
  });

  it("buildCandidates: summary URL contains /page/summary/", () => {
    const ctx = makeCtx(summarySource, "quantum computing");
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/page/summary/");
  });

  it("buildCandidates: TLSN search has srlimit=2", () => {
    const ctx = makeCtx(searchSource, "AI", "TLSN");
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "srlimit")).toBe("2");
  });

  it("parseResponse: summary extracts single entry", () => {
    const fixture = JSON.stringify({
      pageid: 12345, title: "Quantum computing",
      description: "A type of computation",
      extract: "Quantum computing is the exploitation of collective properties...",
      content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Quantum_computing" } },
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(summarySource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].title).toBe("Quantum computing");
  });

  it("parseResponse: search extracts from query.search array", () => {
    const fixture = JSON.stringify({
      query: {
        search: [
          { pageid: 111, title: "AI", snippet: "<span>Artificial intelligence</span>", wordcount: 5000, timestamp: "2026-01-01" },
          { pageid: 222, title: "ML", snippet: "<span>Machine learning</span>", wordcount: 3000, timestamp: "2026-01-02" },
        ],
      },
    });
    const resp = makeResponse(fixture, "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=test");
    const parsed = adapter.parseResponse(searchSource, resp);
    expect(parsed.entries.length).toBe(2);
  });
});

// ════════════════════════════════════════════════════
// WORLDBANK
// ════════════════════════════════════════════════════

describe("declarative: worldbank", () => {
  const adapter = getAdapter("worldbank");

  const indicatorSource = makeSource({
    id: "wb-gdp", provider: "worldbank",
    url: "https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.CD",
    adapter: { operation: "indicator" },
  });

  it("buildCandidates: indicator URL contains /indicator/", () => {
    const ctx = makeCtx(indicatorSource, "gdp", "DAHR", { indicator: "gdp" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/indicator/");
  });

  it("buildCandidates: includes format=json", () => {
    const ctx = makeCtx(indicatorSource, "gdp", "DAHR", { indicator: "gdp" });
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "format")).toBe("json");
  });

  it("buildCandidates: TLSN has per_page=5", () => {
    const ctx = makeCtx(indicatorSource, "gdp", "TLSN", { indicator: "gdp" });
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "per_page")).toBe("5");
  });

  it("parseResponse: indicator extracts from [meta, data] tuple", () => {
    const fixture = JSON.stringify([
      { page: 1, pages: 1, per_page: 50, total: 1 },
      [{ countryiso3code: "WLD", country: { value: "World" }, indicator: { id: "NY.GDP.MKTP.CD", value: "GDP (current US$)" }, date: "2025", value: 96513077000000 }],
    ]);
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(indicatorSource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].metrics?.value).toBeDefined();
  });
});

// ════════════════════════════════════════════════════
// PUBMED
// ════════════════════════════════════════════════════

describe("declarative: pubmed", () => {
  const adapter = getAdapter("pubmed");

  const esearchSource = makeSource({
    id: "pm-search", provider: "pubmed",
    url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
    adapter: { operation: "esearch" },
  });

  it("buildCandidates: esearch URL contains /esearch.fcgi", () => {
    const ctx = makeCtx(esearchSource, "CRISPR gene editing");
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/esearch.fcgi");
  });

  it("buildCandidates: TLSN has retmax=3", () => {
    const ctx = makeCtx(esearchSource, "CRISPR", "TLSN");
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "retmax")).toBe("3");
  });

  it("validateCandidate: enforces retmode=json for TLSN", () => {
    const candidate: CandidateRequest = {
      sourceId: "pm-search", provider: "pubmed", operation: "esearch",
      method: "GET", url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=xml&term=test&retmax=20",
      attestation: "TLSN", matchHints: ["test"],
    };
    const result = adapter.validateCandidate(candidate);
    expect(result.ok).toBe(true);
    expect(result.rewrittenUrl).toBeTruthy();
    expect(urlParam(result.rewrittenUrl!, "retmode")).toBe("json");
  });

  it("parseResponse: esearch extracts PMIDs from idlist", () => {
    const fixture = JSON.stringify({
      esearchresult: { count: 100, retmax: 3, idlist: ["38001", "38002", "38003"] },
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(esearchSource, resp);
    expect(parsed.entries.length).toBe(3);
    expect(parsed.entries.map(e => e.id).sort()).toEqual(["38001", "38002", "38003"]);
  });
});

// ════════════════════════════════════════════════════
// BINANCE
// ════════════════════════════════════════════════════

describe("declarative: binance", () => {
  const adapter = getAdapter("binance");

  const tickerSource = makeSource({
    id: "bn-ticker", provider: "binance",
    url: "https://api.binance.com/api/v3/ticker/price",
    adapter: { operation: "ticker-price" },
  });

  it("buildCandidates: ticker-price URL contains /ticker/price", () => {
    const ctx = makeCtx(tickerSource, "BTC", "DAHR", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/ticker/price");
  });

  it("buildCandidates: resolves bitcoin to BTCUSDT", () => {
    const ctx = makeCtx(tickerSource, "BTC", "DAHR", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "symbol")).toBe("BTCUSDT");
  });

  it("parseResponse: ticker-price extracts symbol and price", () => {
    const fixture = JSON.stringify({ symbol: "BTCUSDT", price: "64000.50" });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(tickerSource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toBe("BTCUSDT");
    expect(parsed.entries[0].metrics?.price).toBeDefined();
  });
});

// ════════════════════════════════════════════════════
// KRAKEN
// ════════════════════════════════════════════════════

describe("declarative: kraken", () => {
  const adapter = getAdapter("kraken");

  const tickerSource = makeSource({
    id: "kr-ticker", provider: "kraken",
    url: "https://api.kraken.com/0/public/Ticker",
    adapter: { operation: "ticker" },
  });

  const assetsSource = makeSource({
    id: "kr-assets", provider: "kraken",
    url: "https://api.kraken.com/0/public/Assets",
    adapter: { operation: "assets" },
  });

  it("buildCandidates: ticker URL contains /Ticker", () => {
    const ctx = makeCtx(tickerSource, "BTC", "DAHR", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/Ticker");
  });

  it("buildCandidates: resolves bitcoin to XXBTZUSD", () => {
    const ctx = makeCtx(tickerSource, "BTC", "DAHR", { asset: "bitcoin" });
    const candidates = adapter.buildCandidates(ctx);
    expect(urlParam(candidates[0].url, "pair")).toBe("XXBTZUSD");
  });

  it("validateCandidate: TLSN assets returns not-ok", () => {
    const candidate: CandidateRequest = {
      sourceId: "kr-assets", provider: "kraken", operation: "assets",
      method: "GET", url: "https://api.kraken.com/0/public/Assets",
      attestation: "TLSN", matchHints: [],
    };
    expect(adapter.validateCandidate(candidate).ok).toBe(false);
  });

  it("parseResponse: ticker extracts from result object", () => {
    const fixture = JSON.stringify({
      error: [],
      result: {
        XXBTZUSD: {
          a: ["64000.00", "1", "1.000"], b: ["63999.00", "1", "1.000"],
          c: ["64000.50", "0.1"], v: ["1000", "5000"],
          p: ["63500.00", "63800.00"], t: [200, 1000],
          l: ["62000.00", "61000.00"], h: ["65000.00", "66000.00"],
          o: "63000.00",
        },
      },
    });
    const resp = makeResponse(fixture, "https://api.kraken.com/0/public/Ticker?pair=XXBTZUSD");
    const parsed = adapter.parseResponse(tickerSource, resp);
    expect(parsed.entries.length).toBeGreaterThan(0);
    expect(parsed.entries[0].id).toBe("XXBTZUSD");
  });
});

// ════════════════════════════════════════════════════
// CROSS-PROVIDER: ATTESTATION BLOCKING
// ════════════════════════════════════════════════════

describe("declarative: attestation blocking", () => {
  it("coingecko: coin-detail blocked for TLSN", () => {
    const source = makeSource({ id: "cg-detail", provider: "coingecko", url: "https://api.coingecko.com/api/v3/coins/bitcoin", adapter: { operation: "coin-detail" } });
    const ctx = makeCtx(source, "bitcoin", "TLSN", { asset: "bitcoin" });
    expect(getAdapter("coingecko").buildCandidates(ctx).length).toBe(0);
  });

  it("defillama: protocol blocked for TLSN", () => {
    const source = makeSource({ id: "dl-proto", provider: "defillama", url: "https://api.llama.fi/protocol/aave", adapter: { operation: "protocol" } });
    const ctx = makeCtx(source, "aave", "TLSN", { asset: "aave" });
    expect(getAdapter("defillama").buildCandidates(ctx).length).toBe(0);
  });

  it("arxiv: DAHR blocked", () => {
    const source = makeSource({ id: "arxiv", provider: "arxiv", url: "https://export.arxiv.org/api/query", adapter: { operation: "search" }, responseFormat: "xml" });
    const ctx = makeCtx(source, "test", "DAHR");
    expect(getAdapter("arxiv").buildCandidates(ctx).length).toBe(0);
  });

  it("kraken: assets blocked for TLSN via validateCandidate", () => {
    const candidate: CandidateRequest = {
      sourceId: "kr-assets", provider: "kraken", operation: "assets",
      method: "GET", url: "https://api.kraken.com/0/public/Assets",
      attestation: "TLSN", matchHints: [],
    };
    expect(getAdapter("kraken").validateCandidate(candidate).ok).toBe(false);
  });

  it("all 11 declarative adapters loaded successfully", () => {
    const expected = ["hn-algolia", "coingecko", "github", "defillama", "arxiv", "wikipedia", "worldbank", "pubmed", "binance", "kraken", "fred"];
    for (const name of expected) {
      expect(declAdapters.has(name)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════
// ADDITIONAL COVERAGE (Codex Review Findings)
// ════════════════════════════════════════════════════

describe("declarative: additional operation coverage", () => {
  it("hn-algolia: search_by_date produces correct URL", () => {
    const source = makeSource({
      id: "hn-date", provider: "hn-algolia",
      url: "https://hn.algolia.com/api/v1/search_by_date",
      adapter: { operation: "search_by_date" },
    });
    const ctx = makeCtx(source, "GPT-5");
    const candidates = getAdapter("hn-algolia").buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/search_by_date");
    expect(candidates[0].operation).toBe("search_by_date");
  });

  it("hn-algolia: front_page produces correct URL", () => {
    const source = makeSource({
      id: "hn-front", provider: "hn-algolia",
      url: "https://hn.algolia.com/api/v1/search?tags=front_page",
      adapter: { operation: "front_page" },
    });
    const ctx = makeCtx(source, "news");
    const candidates = getAdapter("hn-algolia").buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(urlParam(candidates[0].url, "tags")).toBe("front_page");
  });

  it("github: repo with explicit vars produces URL", () => {
    const source = makeSource({
      id: "gh-repo", provider: "github",
      url: "https://api.github.com/repos/{owner}/{repo}",
      adapter: { operation: "repo" },
    });
    const ctx = makeCtx(source, "openai gpt", "DAHR", { owner: "openai", repo: "gpt-oss" });
    const candidates = getAdapter("github").buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/repos/openai/gpt-oss");
  });

  it("github: commits with vars produces URL", () => {
    const source = makeSource({
      id: "gh-commits", provider: "github",
      url: "https://api.github.com/repos/{owner}/{repo}/commits",
      adapter: { operation: "commits" },
    });
    const ctx = makeCtx(source, "commits", "DAHR", { owner: "facebook", repo: "react" });
    const candidates = getAdapter("github").buildCandidates(ctx);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].url).toContain("/repos/facebook/react/commits");
  });

  it("github: commits parseResponse extracts sha-based entries", () => {
    const source = makeSource({
      id: "gh-commits", provider: "github",
      url: "https://api.github.com/repos/facebook/react/commits",
      adapter: { operation: "commits" },
    });
    const fixture = JSON.stringify([
      { sha: "abc123def456789", commit: { message: "Fix bug", author: { name: "Alice", date: "2026-01-01" } }, html_url: "https://github.com/facebook/react/commit/abc123def456789" },
    ]);
    const resp = makeResponse(fixture);
    const parsed = getAdapter("github").parseResponse(source, resp);
    expect(parsed.entries.length).toBe(1);
    // ID should be truncated sha
    expect(parsed.entries[0].id.length).toBeLessThanOrEqual(12);
  });

  it("binance: ticker-24hr parseResponse extracts stats", () => {
    const source = makeSource({
      id: "bn-24hr", provider: "binance",
      url: "https://api.binance.com/api/v3/ticker/24hr",
      adapter: { operation: "ticker-24hr" },
    });
    const fixture = JSON.stringify({
      symbol: "ETHUSDT", lastPrice: "3200.50", priceChange: "-50.00",
      priceChangePercent: "-1.54", highPrice: "3300.00", lowPrice: "3150.00",
      volume: "500000", quoteVolume: "1600000000", weightedAvgPrice: "3225.00",
    });
    const resp = makeResponse(fixture);
    const parsed = getAdapter("binance").parseResponse(source, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toBe("ETHUSDT");
    expect(parsed.entries[0].metrics?.lastPrice).toBeDefined();
  });

  it("binance: klines parseResponse extracts candles", () => {
    const source = makeSource({
      id: "bn-klines", provider: "binance",
      url: "https://api.binance.com/api/v3/klines",
      adapter: { operation: "klines" },
    });
    const fixture = JSON.stringify([
      [1700000000000, "64000.00", "65000.00", "63500.00", "64500.00", "1000.5", 1700003600000, "64250000.00", 5000],
      [1700003600000, "64500.00", "65500.00", "64000.00", "65000.00", "800.3", 1700007200000, "52000000.00", 4000],
    ]);
    const resp = makeResponse(fixture);
    const parsed = getAdapter("binance").parseResponse(source, resp);
    expect(parsed.entries.length).toBe(2);
    expect(parsed.entries[0].id).toContain("kline-");
    expect(parsed.entries[0].metrics?.open).toBeDefined();
  });

  it("defillama: chains buildCandidates blocked for TLSN", () => {
    const source = makeSource({
      id: "dl-chains", provider: "defillama",
      url: "https://api.llama.fi/chains",
      adapter: { operation: "chains" },
    });
    const ctx = makeCtx(source, "chains", "TLSN");
    expect(getAdapter("defillama").buildCandidates(ctx).length).toBe(0);
  });

  it("defillama: yields parseResponse extracts pools", () => {
    const source = makeSource({
      id: "dl-yields", provider: "defillama",
      url: "https://yields.llama.fi/pools",
      adapter: { operation: "yields" },
    });
    const fixture = JSON.stringify({
      status: "success",
      data: [
        { pool: "pool-1", chain: "Ethereum", project: "Aave", symbol: "USDC", apy: 5.2, tvlUsd: 1000000000 },
      ],
    });
    const resp = makeResponse(fixture);
    const parsed = getAdapter("defillama").parseResponse(source, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toBe("pool-1");
    expect(parsed.entries[0].metrics?.apy).toBeDefined();
  });

  it("worldbank: country parseResponse extracts from tuple", () => {
    const source = makeSource({
      id: "wb-country", provider: "worldbank",
      url: "https://api.worldbank.org/v2/country/US",
      adapter: { operation: "country" },
    });
    const fixture = JSON.stringify([
      { page: 1, pages: 1, per_page: 50, total: 1 },
      [{ id: "US", iso2Code: "US", name: "United States", region: { value: "North America" }, incomeLevel: { value: "High income" }, capitalCity: "Washington D.C.", longitude: "-77.032", latitude: "38.8895" }],
    ]);
    const resp = makeResponse(fixture);
    const parsed = getAdapter("worldbank").parseResponse(source, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].title).toBe("United States");
  });

  it("parseResponse: JSON providers produce normalized output", () => {
    // CoinGecko should produce normalized (normalizeJson: true in spec)
    const source = makeSource({
      id: "cg-price", provider: "coingecko",
      url: "https://api.coingecko.com/api/v3/simple/price",
      adapter: { operation: "simple-price" },
    });
    const fixture = JSON.stringify({ bitcoin: { usd: 64000 } });
    const resp = makeResponse(fixture);
    const parsed = getAdapter("coingecko").parseResponse(source, resp);
    expect(parsed.normalized).toBeDefined();
  });

  it("parseResponse: arxiv does NOT produce normalized output", () => {
    const source = makeSource({
      id: "arxiv", provider: "arxiv",
      url: "https://export.arxiv.org/api/query",
      adapter: { operation: "search" },
      responseFormat: "xml",
    });
    const xml = `<feed><entry><id>http://arxiv.org/abs/2301.00001</id><title>Test</title><summary>Test</summary></entry></feed>`;
    const resp = makeResponse(xml);
    const parsed = getAdapter("arxiv").parseResponse(source, resp);
    expect(parsed.normalized).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════
// BUG FIX TESTS (PR5 follow-up)
// ════════════════════════════════════════════════════

describe("declarative: pubmed esummary fix", () => {
  const adapter = getAdapter("pubmed");

  const esummarySource = makeSource({
    id: "pm-summary", provider: "pubmed",
    url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
    adapter: { operation: "esummary" },
  });

  it("esummary produces per-UID entries (not single result entry)", () => {
    const fixture = JSON.stringify({
      result: {
        uids: ["12345", "67890"],
        "12345": {
          uid: "12345",
          title: "CRISPR-Cas9 Gene Editing",
          source: "Nature",
          pubdate: "2026 Jan",
          sortpubdate: "2026/01/01",
          authors: [{ name: "Smith J" }],
          pmcrefcount: 42,
        },
        "67890": {
          uid: "67890",
          title: "mRNA Vaccine Development",
          source: "Science",
          pubdate: "2026 Feb",
          authors: [{ name: "Jones A" }],
          pmcrefcount: 15,
        },
      },
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(esummarySource, resp);
    // Should produce 2 entries (one per UID), NOT 1 entry for "result"
    expect(parsed.entries.length).toBe(2);
    expect(parsed.entries.map(e => e.id).sort()).toEqual(["12345", "67890"]);
  });

  it("esummary entries have title and pmcrefcount metric", () => {
    const fixture = JSON.stringify({
      result: {
        uids: ["11111"],
        "11111": {
          uid: "11111",
          title: "Test Article",
          source: "JAMA",
          pmcrefcount: 7,
        },
      },
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(esummarySource, resp);
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].title).toBe("Test Article");
    expect(parsed.entries[0].metrics?.pmcrefcount).toBeDefined();
  });
});

describe("declarative: object-entries jsonPath navigation", () => {
  it("object-entries applies jsonPath to navigate before iterating", () => {
    // This tests the engine fix: object-entries mode should apply items.jsonPath
    // Tested indirectly via pubmed esummary (items.jsonPath: "$.result")
    const adapter = getAdapter("pubmed");
    const source = makeSource({
      id: "pm-summary", provider: "pubmed",
      url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
      adapter: { operation: "esummary" },
    });
    const fixture = JSON.stringify({
      result: {
        uids: ["99999"],
        "99999": { uid: "99999", title: "Nested Article", source: "BMJ", pmcrefcount: 3 },
      },
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(source, resp);
    // If jsonPath works: navigates to $.result, iterates entries, skips uids array
    // If jsonPath broken: iterates top-level, gets "result" as single key
    expect(parsed.entries.length).toBe(1);
    expect(parsed.entries[0].id).toBe("99999");
  });

  it("object-entries skips non-object values (arrays, primitives)", () => {
    // The uids array in pubmed result should be filtered out
    const adapter = getAdapter("pubmed");
    const source = makeSource({
      id: "pm-summary", provider: "pubmed",
      url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
      adapter: { operation: "esummary" },
    });
    const fixture = JSON.stringify({
      result: {
        uids: ["55555"],
        "55555": { uid: "55555", title: "Only Article", source: "Lancet", pmcrefcount: 1 },
      },
    });
    const resp = makeResponse(fixture);
    const parsed = adapter.parseResponse(source, resp);
    // Should NOT include an entry with id "uids"
    expect(parsed.entries.every(e => e.id !== "uids")).toBe(true);
    expect(parsed.entries.length).toBe(1);
  });
});
