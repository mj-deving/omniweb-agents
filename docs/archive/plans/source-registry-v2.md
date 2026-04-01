# Source Registry v2 — Comprehensive Implementation Plan

> Scale attestation sources from 170 to 1000+, with content-matched discovery,
> independent testing, and quality rating.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SOURCE REGISTRY v2                                │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐              │
│  │   CATALOG    │  │  DISCOVERY   │  │   TESTING     │              │
│  │  (global)    │  │  (on-demand) │  │  (standalone) │              │
│  │             │  │             │  │               │              │
│  │ 1000+ srcs  │  │ internet    │  │ health check  │              │
│  │ inverted idx│  │ scrape      │  │ content score │              │
│  │ provider    │  │ content     │  │ size validate │              │
│  │ adapters    │  │ verify      │  │ TLSN dry-run  │              │
│  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘              │
│         │                │                  │                      │
│  ┌──────┴──────────────┴──────────────────┴───────┐              │
│  │              RATING ENGINE                       │              │
│  │                                                  │              │
│  │  uptime × relevance × freshness × engagement    │              │
│  │  auto-promote / auto-demote / prune              │              │
│  └──────────────────────┬──────────────────────────┘              │
│                         │                                          │
│  ┌──────────────────────┴──────────────────────────┐              │
│  │           CONTENT MATCHER                        │              │
│  │                                                  │              │
│  │  Post-generation matching: find source that      │              │
│  │  substantiates the specific claims in the post   │              │
│  └──────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Design Decision: Post-Generation Source Matching

**Current pipeline:** topic → find source → attest source → generate post → publish
**New pipeline:** topic → generate post → find source that substantiates post → attest → publish

Why: A source for "derivatives" that returns a story about calculus derivatives is useless.
The only way to verify content match is to compare source response against post content.
This means source selection happens AFTER LLM generates the post text.

**Tradeoff:** If no source substantiates the post, we wasted an LLM call. Mitigation: keep
the pre-generation topic→source check as a fast filter, then do post-generation verification.

## Component 1: Global Source Catalog

### Data Model

```typescript
interface SourceRecordV2 {
  // Identity
  id: string;                    // deterministic hash of provider+endpoint
  name: string;                  // human-readable slug
  provider: string;              // "hn-algolia" | "coingecko" | "binance" | ...

  // Access
  url: string;                   // URL template with {placeholders}
  urlPattern: string;            // base pattern for deduplication
  authRequired: boolean;         // true if API key needed
  authKeyEnv?: string;           // env var name for API key (e.g., "FRED_API_KEY")

  // Compatibility
  tlsn_safe: boolean;
  dahr_safe: boolean;
  maxResponseKb: number;         // measured, not estimated
  responseFormat: "json" | "xml" | "rss" | "html";

  // Topic mapping
  topics: string[];              // primary topic tags
  topicAliases: string[];        // synonym expansions (auto-generated)
  domainTags: string[];          // broad categories: "finance", "tech", "science"

  // Rating (computed, updated by testing pipeline)
  rating: {
    overall: number;             // 0-100 composite score
    uptime: number;              // 0-100 success rate over last 30 days
    relevance: number;           // 0-100 avg content match score
    freshness: number;           // 0-100 how current the data is
    engagement: number;          // 0-100 correlation with post engagement
    sizeStability: number;       // 0-100 how consistent response size is
    lastTested: string;          // ISO timestamp
    testCount: number;           // total health checks
    successCount: number;        // successful health checks
  };

  // Lifecycle
  status: "active" | "degraded" | "stale" | "deprecated";
  discoveredAt: string;          // ISO timestamp
  discoveredBy: "manual" | "auto-discovery" | "import";
  lastUsedAt?: string;           // last successful attestation
  lastFailedAt?: string;         // last failed attestation
  failureReason?: string;        // last failure message
  note?: string;                 // human notes
}
```

### Storage Format

JSON file at `sources/catalog.json` (not YAML — JSON is faster to parse, easier to index,
better for programmatic updates). Agents reference the shared catalog rather than maintaining
separate registries.

```
sources/
├── catalog.json                # master catalog (1000+ entries)
├── catalog.schema.json         # JSON Schema for validation
├── providers/                  # provider-specific adapters
│   ├── hn-algolia.ts          # knows HN query patterns, hitsPerPage limits
│   ├── coingecko.ts           # knows CoinGecko endpoints, rate limits
│   ├── binance.ts             # knows Binance public endpoints
│   ├── github.ts              # knows GitHub search, rate limits
│   ├── defillama.ts           # knows DefiLlama protocol queries
│   ├── worldbank.ts           # knows indicator codes
│   ├── arxiv.ts               # knows category codes, XML parsing
│   ├── pubmed.ts              # knows MeSH terms, PMID queries
│   └── generic.ts             # generic URL fetch (fallback)
├── aliases.json               # topic alias database
└── test-results/              # per-source test history (JSONL)
    ├── hn-algolia.jsonl
    ├── coingecko.jsonl
    └── ...
```

### Inverted Topic Index

Built on catalog load, enables O(1) topic→sources lookup:

```typescript
interface SourceIndex {
  byTopic: Map<string, string[]>;        // topic token → source IDs
  byProvider: Map<string, string[]>;      // provider name → source IDs
  byDomain: Map<string, string[]>;        // domain tag → source IDs
  byMethod: { tlsn: string[]; dahr: string[] };
  byId: Map<string, SourceRecordV2>;      // source ID → full record
}

// Build index on load (one-time O(n), then O(1) lookups)
function buildSourceIndex(catalog: SourceRecordV2[]): SourceIndex;

// Fast lookup: O(m) where m = topic tokens (typically 2-4)
function findSourcesForTopic(
  topic: string,
  index: SourceIndex,
  method: AttestationType,
  minRating?: number
): SourceRecordV2[];
```

### Topic Alias Database

Maps synonyms, abbreviations, and related terms:

```json
{
  "bitcoin": ["btc", "xbt", "bitcoin-price", "bitcoin-market"],
  "ethereum": ["eth", "ether", "ethereum-price"],
  "derivatives": ["options", "futures", "swaps", "otc-derivatives", "derivatives-market"],
  "ai": ["artificial-intelligence", "machine-learning", "ml", "deep-learning", "llm"],
  "sanctions": ["trade-sanctions", "ofac", "economic-sanctions", "sanctions-list"],
  "inflation": ["cpi", "consumer-price-index", "price-level"],
  "gdp": ["gross-domestic-product", "economic-output", "national-income"]
}
```

Auto-expanded during index building: if topic "btc" is queried, aliases resolve to "bitcoin"
and all bitcoin-tagged sources are returned.

## Component 2: Content Matcher (Post-Generation)

The critical innovation. After the LLM generates a post, we find sources that
substantiate it.

### Matching Algorithm

```typescript
interface ContentMatchResult {
  source: SourceRecordV2;
  url: string;
  score: number;                // 0-100
  matchedClaims: string[];      // which claims from the post are substantiated
  evidence: string[];           // snippets from source that match
}

async function matchSourceToPost(
  postText: string,
  postTags: string[],
  source: SourceRecordV2,
  method: AttestationType
): Promise<ContentMatchResult | null> {
  // 1. Resolve URL template
  const url = resolveSourceUrl(source, postTags);

  // 2. Fetch via provider adapter (handles rate limits, retries)
  const response = await fetchViaAdapter(source.provider, url);
  if (!response.ok) return null;

  // 3. Extract structured data via provider adapter
  const entries = extractEntries(source.provider, response.body);

  // 4. Score content relevance at THREE levels:
  //    a) Topic-level: do entry topics overlap with post topics?
  //    b) Title-level: do entry titles mention post subjects?
  //    c) Claim-level: does the data contain specific values/facts from the post?

  const topicScore = scoreTopicOverlap(postTags, entries);       // 0-30
  const titleScore = scoreTitleRelevance(postText, entries);     // 0-30
  const claimScore = scoreClaimSubstantiation(postText, entries); // 0-40

  const totalScore = topicScore + titleScore + claimScore;
  if (totalScore < 40) return null;  // threshold

  return { source, url, score: totalScore, matchedClaims: [...], evidence: [...] };
}
```

### Claim Extraction (Lightweight)

Extract verifiable claims from post text without LLM:

```typescript
function extractClaims(postText: string): string[] {
  // Pattern-match for:
  // - Numbers with context: "BIS reports $846T", "vol running 34%"
  // - Named entities with states: "ICE Brent 1M implied vol"
  // - Comparative claims: "up 19% YoY", "moved from X to Y"
  // - Source attributions: "BIS reports", "according to"

  const numberClaims = postText.match(/\b\d[\d,.]*[%$€£BTKM]?\b.*?[.!?]/g) || [];
  const sourceClaims = postText.match(/(reports?|according to|data shows?|per ).{10,80}/gi) || [];

  return [...new Set([...numberClaims, ...sourceClaims])];
}
```

### Integration into Session Runner

```
CURRENT FLOW:
  gate(topic) → selectSource(topic) → generate(topic) → attest(source) → publish

NEW FLOW:
  gate(topic) → preCheck(topic, catalog) → generate(topic)
    → matchSource(post, catalog) → attest(bestMatch) → publish
                ↑
    Post-generation matching: compare post content against
    candidate sources to find the best evidence match
```

## Component 3: Discovery Pipeline

### Internet Scraping for New Sources

A standalone CLI tool that discovers new attestable sources from the internet.

```bash
# Discover sources for a topic
npx tsx tools/source-discover.ts --topic "derivatives" --method TLSN --test

# Discover sources for all agent topics
npx tsx tools/source-discover.ts --agent pioneer --all-topics --test

# Import sources from a public API directory
npx tsx tools/source-discover.ts --import-from "https://github.com/public-apis/public-apis"

# Scrape a domain for API endpoints
npx tsx tools/source-discover.ts --scrape-domain "api.worldbank.org" --test
```

### Discovery Strategies

1. **Keyword search on API directories**
   - public-apis GitHub repo (1400+ APIs)
   - RapidAPI catalog
   - ProgrammableWeb directory
   - Match API descriptions against agent topic domains

2. **Provider expansion**
   - Given a known provider (e.g., CoinGecko), enumerate all useful endpoints
   - Provider adapter knows the API structure → generates candidate URLs
   - Each candidate tested for TLSN/DAHR safety + content relevance

3. **Web search → API extraction**
   - Search "[topic] public API JSON" or "[topic] open data API"
   - Extract API URLs from search results
   - Validate each candidate

4. **Feed/RSS discovery**
   - Search for RSS/Atom feeds related to topic domains
   - RSS feeds are often compact and TLSN-safe
   - Convert RSS URLs to attestable sources

5. **Cross-reference from successful posts**
   - When a post gets high engagement, what was the source?
   - Find similar sources for similar topics
   - Build source clusters by domain

### Provider Adapters

Each adapter knows how to generate optimal queries for its API:

```typescript
interface ProviderAdapter {
  name: string;
  baseUrl: string;

  // Generate candidate URLs for a topic
  generateCandidates(topic: string, tokens: string[]): CandidateUrl[];

  // Parse response into structured entries
  extractEntries(responseBody: string): DataEntry[];

  // Rate limit configuration
  rateLimit: { maxPerMinute: number; maxPerDay: number };

  // TLSN constraints
  tlsnMaxParams: Record<string, string>;  // e.g., { hitsPerPage: "2" }

  // Known good topic domains
  domains: string[];  // e.g., ["tech", "startup", "ai"]
}
```

**Initial Provider Adapters (Phase 1):**

| Provider | Domains | Auth | TLSN-safe | DAHR-safe |
|----------|---------|------|-----------|-----------|
| HN Algolia | tech, startup, all-topics | No | Yes (hitsPerPage=2) | Yes |
| CoinGecko | crypto, defi, markets | No | Yes | Yes |
| Binance | crypto, trading | No | Yes | Yes |
| Kraken | crypto, fx | No | Yes | Yes |
| DefiLlama | defi, tvl, yield | No | Yes | Yes |
| GitHub | tech, oss, repos | No (60/hr) | Yes (per_page=3) | Yes |
| arXiv | science, ai, quantum | No | Yes (max_results=3) | Yes |
| Wikipedia | general knowledge | No | Yes (srlimit=2) | Yes |
| World Bank | economics, development | No | Yes | Yes |
| PubMed | biotech, medical | No | Yes | Yes |

**Phase 2 Additions (free API key):**

| Provider | Domains | Auth | Notes |
|----------|---------|------|-------|
| FRED | economics, us-macro | Free key | 500K+ series |
| Finnhub | stocks, fundamentals | Free key | Real-time |
| SEC EDGAR | corporate, filings | No | Rate limited |
| Congress.gov | legislation, regulatory | Free key | 600/hr |
| ClinicalTrials.gov | biotech, pharma | No | Trial data |
| BLS | employment, inflation | Optional | Monthly |
| Open-Meteo | weather, climate | No | 10K/day |
| ECB | euro, fx, rates | No | SDMX format |
| PyPI Stats | python, packages | No | Download stats |
| npm Registry | javascript, packages | No | Use /latest |

## Component 4: Standalone Testing CLI

Test and rate sources independently, without running full agent sessions.

```bash
# Test a single source
npx tsx tools/source-test.ts --source "coingecko-trending" --verbose

# Test all sources in catalog
npx tsx tools/source-test.ts --all --parallel 5

# Test sources for a specific domain
npx tsx tools/source-test.ts --domain finance --parallel 3

# Test and rate (updates catalog ratings)
npx tsx tools/source-test.ts --all --update-ratings

# TLSN dry-run: verify response fits in 16KB
npx tsx tools/source-test.ts --source "hn-quantum" --tlsn-size-check

# Run as cron (daily health check)
npx tsx tools/source-test.ts --all --update-ratings --quiet
```

### Test Pipeline per Source

```typescript
interface SourceTestResult {
  sourceId: string;
  timestamp: string;

  // Health
  httpStatus: number | null;    // null = timeout/network error
  responseTimeMs: number;
  responseSizeKb: number;

  // Content
  dataEntries: number;          // structured entries in response
  formatValid: boolean;         // parseable JSON/XML
  contentFresh: boolean;        // data is from last 7 days

  // TLSN safety
  tlsnSizeOk: boolean;          // response < 16KB
  tlsnSizeKb: number;           // actual size for tracking

  // Topic relevance (per tagged topic)
  topicScores: Record<string, number>;  // topic → relevance score

  // Overall
  passed: boolean;
  failureReasons: string[];
}
```

### Rating Computation

```typescript
function computeSourceRating(
  source: SourceRecordV2,
  recentTests: SourceTestResult[],  // last 30 days
  engagementData?: { txHash: string; reactions: number }[]
): SourceRating {
  // Uptime: % of tests with httpStatus 200
  const uptime = (successTests / totalTests) * 100;

  // Relevance: avg topic score across tests
  const relevance = avgTopicScores(recentTests);

  // Freshness: % of tests where content was < 7 days old
  const freshness = (freshTests / totalTests) * 100;

  // Size stability: 1 - (stddev(sizes) / mean(sizes))
  const sizeStability = 100 * (1 - coefficientOfVariation(sizes));

  // Engagement: avg reactions for posts using this source (if data available)
  const engagement = engagementData
    ? normalizeEngagement(avgReactions(engagementData))
    : 50; // neutral default

  // Weighted composite
  const overall = Math.round(
    uptime * 0.25 +
    relevance * 0.30 +
    freshness * 0.15 +
    sizeStability * 0.10 +
    engagement * 0.20
  );

  return { overall, uptime, relevance, freshness, sizeStability, engagement };
}
```

### Lifecycle States

```
                    ┌──────────┐
     discovered ──> │  active   │ ──── rating >= 40
                    └─────┬────┘
                          │ rating drops below 40
                          │ or 3 consecutive failures
                    ┌─────▼────┐
                    │ degraded  │ ──── auto-retry daily
                    └─────┬────┘
                          │ 14 days degraded
                          │ no recovery
                    ┌─────▼────┐
                    │  stale    │ ──── weekly retry
                    └─────┬────┘
                          │ 30 days stale
                    ┌─────▼────┐
                    │deprecated │ ──── no more retries
                    └──────────┘      manual reactivate only
```

## Component 5: Agent Source Views

Agents don't maintain separate registries. Instead, each agent defines topic domains
and quality thresholds, and gets a filtered view of the global catalog.

```yaml
# agents/pioneer/source-config.yaml
domains:
  - emerging-tech
  - frontier-science
  - ai-policy
  - quantum
  - biotech
  - geopolitical
  - derivatives
  - energy-transition

min_source_rating: 50         # minimum overall rating to use
prefer_tlsn: true             # prefer TLSN-safe sources when available
max_sources_per_topic: 5      # keep top N sources per topic
```

```typescript
function getAgentSourceView(
  catalog: SourceRecordV2[],
  agentConfig: AgentSourceConfig
): SourceRecordV2[] {
  return catalog
    .filter(s => s.status === "active" || s.status === "degraded")
    .filter(s => s.rating.overall >= agentConfig.minRating)
    .filter(s => s.domainTags.some(d => agentConfig.domains.includes(d)))
    .sort((a, b) => b.rating.overall - a.rating.overall);
}
```

## Implementation Phases

### Phase 1: Foundation (3-5 sessions)

**Goal:** Replace static YAML with global JSON catalog + inverted index.

1. Define `SourceRecordV2` schema and `catalog.json` format
2. Write migration script: convert 3 YAML registries → unified catalog.json
3. Implement `buildSourceIndex()` with inverted topic index
4. Update `attestation-policy.ts` to use new index (backward-compatible)
5. Add topic alias database (initial 50 aliases)
6. Update session-runner.ts to load from catalog instead of per-agent YAML

**Dependencies:** None
**Risk:** Breaking existing sessions during migration
**Mitigation:** Keep YAML loading as fallback during transition

### Phase 2: Standalone Testing (2-3 sessions)

**Goal:** Test and rate sources without running full sessions.

1. Build `tools/source-test.ts` CLI
2. Implement per-source health check pipeline
3. Implement `computeSourceRating()` function
4. Add test result persistence (JSONL per provider)
5. Add `--update-ratings` flag to write back to catalog
6. Add TLSN size regression detection

**Dependencies:** Phase 1 (catalog format)
**Risk:** None significant

### Phase 3: Provider Adapters (3-4 sessions)

**Goal:** Smart URL generation per provider instead of generic templates.

1. Define `ProviderAdapter` interface
2. Implement 10 Tier 1 adapters (HN, CoinGecko, Binance, etc.)
3. Integrate adapters into discovery pipeline
4. Each adapter generates optimal queries per topic
5. Adapter-specific rate limiting and error handling

**Dependencies:** Phase 1 (catalog format)
**Risk:** API changes break adapters
**Mitigation:** Adapters fall back to generic fetch on error

### Phase 4: Content Matcher (2-3 sessions)

**Goal:** Post-generation source verification.

1. Implement `extractClaims()` (lightweight, regex-based)
2. Implement `matchSourceToPost()` scoring
3. Integrate into session-runner publish phase
4. Compare candidate sources by content match score, pick best
5. Log match quality for engagement correlation analysis

**Dependencies:** Phase 1 + Phase 3 (adapters for structured extraction)
**Risk:** Claim extraction too noisy → false positives
**Mitigation:** Start with high threshold (60+), tune down with data

### Phase 5: Discovery Pipeline (3-4 sessions)

**Goal:** Discover new sources from the internet automatically.

1. Build `tools/source-discover.ts` CLI
2. Implement keyword search on API directories
3. Implement provider expansion (enumerate endpoints)
4. Implement web search → API extraction
5. Auto-register discovered sources with "discovered" status
6. Integrate into session-runner as fallback when catalog has gaps

**Dependencies:** Phase 2 (testing) + Phase 3 (adapters)
**Risk:** Discovering low-quality sources that pollute catalog
**Mitigation:** All discovered sources start with rating 50, tested before first use

### Phase 6: Lifecycle & Monitoring (1-2 sessions)

**Goal:** Automated source health management.

1. Implement lifecycle state machine (active → degraded → stale → deprecated)
2. Build daily health check (cron or manual)
3. Auto-demote sources after consecutive failures
4. Auto-promote sources when health recovers
5. Prune deprecated sources quarterly
6. Alert on TLSN size regressions

**Dependencies:** Phase 2 (testing)
**Risk:** Aggressive auto-demotion during API maintenance windows
**Mitigation:** Grace period of 3 failures before demotion

## Migration Path

### From Current System (170 sources, 3 YAML files)

```bash
# Step 1: Generate unified catalog from existing YAMLs
npx tsx tools/source-migrate.ts \
  --sentinel agents/sentinel/sources-registry.yaml \
  --crawler agents/crawler/sources-registry.yaml \
  --pioneer agents/pioneer/sources-registry.yaml \
  --output sources/catalog.json

# Step 2: Initial test run (measure baselines)
npx tsx tools/source-test.ts --all --update-ratings

# Step 3: Verify session-runner works with new catalog
npx tsx tools/session-runner.ts --agent pioneer --dry-run

# Step 4: Remove per-agent YAML files (after validation)
```

### Backward Compatibility

During transition, `loadSourceRegistry()` checks for:
1. `sources/catalog.json` (new) → use if exists
2. `agents/{name}/sources-registry.yaml` (old) → fallback

This lets us migrate incrementally without breaking running sessions.

## API Provider Coverage Matrix

| Domain | Current Sources | Target Sources | Key Providers |
|--------|----------------|----------------|---------------|
| Crypto/DeFi | 15 | 100+ | CoinGecko, Binance, Kraken, DefiLlama, Etherscan |
| Financial markets | 2 | 80+ | HN (finance), Finnhub, Alpha Vantage, FRED |
| Geopolitical | 1 | 30+ | HN (geo), Congress.gov, OFAC, UN data |
| AI/Tech | 8 | 100+ | HN, GitHub, arXiv, Papers with Code |
| Science | 2 | 50+ | arXiv, PubMed, ClinicalTrials, NASA |
| Economics | 0 | 60+ | World Bank, FRED, BLS, ECB, IMF |
| Energy | 1 | 40+ | EIA, IRENA, HN (energy), Open-Meteo |
| General/News | 4 | 100+ | Wikipedia, HN, RSS feeds, Newsdata |
| Package ecosystems | 2 | 40+ | PyPI, npm, crates.io, Docker Hub |
| Space/Robotics | 2 | 30+ | NASA, SpaceX (GitHub), HN (space) |
| **Total** | **37 (pioneer)** | **630+** | |

## TLSN Response Size Regression Detection

```typescript
// Run weekly or when source is selected for attestation
async function checkTlsnSizeRegression(
  source: SourceRecordV2,
  catalog: SourceRecordV2[]
): Promise<{ safe: boolean; currentKb: number; historicalAvgKb: number }> {
  const resp = await fetch(source.url, { signal: AbortSignal.timeout(5000) });
  const body = await resp.text();
  const currentKb = body.length / 1024;

  // Compare against historical average
  const historicalAvg = source.rating.sizeStability > 0
    ? source.maxResponseKb
    : currentKb;

  // Flag if grown >50% above historical or exceeds 16KB
  const safe = currentKb <= 16 && currentKb <= historicalAvg * 1.5;

  if (!safe && source.tlsn_safe) {
    // Auto-demote TLSN safety flag
    source.tlsn_safe = false;
    source.status = "degraded";
    source.failureReason = `TLSN size regression: ${currentKb.toFixed(1)}KB (was ${historicalAvg.toFixed(1)}KB)`;
  }

  return { safe, currentKb, historicalAvgKb: historicalAvg };
}
```

## Source Sharing Across Agents

```
sources/catalog.json (GLOBAL — shared by all agents)
  ├── Each source tagged with domainTags
  └── Each agent has source-config.yaml defining which domains to use

agents/sentinel/source-config.yaml → domains: [crypto, defi, markets, general]
agents/crawler/source-config.yaml  → domains: [ALL]  (crawler uses everything)
agents/pioneer/source-config.yaml  → domains: [emerging-tech, frontier-science, ...]
```

Agents never duplicate sources. The catalog is the single source of truth.
Agent-specific preferences (min rating, TLSN preference) are in per-agent config.

## Success Metrics

| Metric | Current | Phase 1 Target | Phase 6 Target |
|--------|---------|----------------|----------------|
| Total sources | 170 | 300+ | 1000+ |
| Source lookup time | O(n) ~5ms | O(1) ~0.1ms | O(1) ~0.1ms |
| Topics without source | ~30% | <10% | <2% |
| Content match accuracy | keyword only | title-level | claim-level |
| Source health monitoring | none | manual CLI | daily automated |
| TLSN size violations | discovered at publish | detected in test | prevented by monitoring |
| Time to add new source | manual edit | auto-discover | auto-discover + test |
