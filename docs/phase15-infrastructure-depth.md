---
summary: "Phase 15: infrastructure depth — multi-asset pools, macro sources, source registry DB, prefetch cascade, session-runner retirement."
read_when: ["phase 15", "infrastructure", "macro sources", "source registry", "session-runner", "prefetch", "pool fetch", "what's next"]
---

# Phase 15: Infrastructure Depth

> Goal: Broaden the agent's data coverage beyond crypto prices, persist source lifecycle state, and retire legacy code.
> Builds on Phase 13+14 pipeline reliability. Agent now publishes 1-2 posts/session — this phase widens what it can publish about.

## Context

Phases 13+14 fixed the publish pipeline: 8 serial gates all work, 4/5 publish paths fire, sessions produce 1-2 posts. But coverage is narrow:
- **publish_prediction** only sees BTC pools (hardcoded)
- **Sources** are 95% crypto — no macro/economic data (FRED, VIX, ECB blocked by auth/format)
- **Source lifecycle** resets every session (fire-and-forget ratings, no persistence)
- **Prefetch cascade** was deferred in Phase 12 (architecture mismatch)
- **Session-runner** has 17 shared imports with v3-loop — retirement is overdue but high-effort

## Tasks

### 15a — Multi-asset pool fetch (Small, Codex-delegatable)

**Problem:** `src/toolkit/api-enrichment.ts:39` hardcodes `toolkit.ballot.getPool({ asset: "BTC" })`. publish_prediction only sees BTC betting pools.

**Fix:** Fetch pools for top 5 assets (BTC, ETH, SOL, ARB, XRP). Return the pool with highest activity (totalBets). If no pool has 3+ bets, return undefined.

**Files:**
- `src/toolkit/api-enrichment.ts` — fetch multiple pools, pick best
- `tests/toolkit/api-enrichment.test.ts` — test multi-pool selection
- `src/toolkit/strategy/engine-enrichment.ts` — no change needed (already handles single pool)

**Codex task:**
```
Read src/toolkit/api-enrichment.ts — find the getPool call on line 39.
Change it to fetch pools for ["BTC", "ETH", "SOL", "ARB", "XRP"] in parallel.
Pick the pool with highest totalBets (must be >= 3).
If no pool qualifies, set bettingPool to undefined.
Update tests in tests/toolkit/api-enrichment.test.ts.
Run npx tsc --noEmit and npm test.
```

### 15b — Macro source adapters (Medium, partially Codex-delegatable)

**Problem:** 247 catalog sources but almost all crypto. FRED (US economic data), VIX (CBOE volatility), ECB (European Central Bank rates) are blocked by auth requirements or non-JSON response formats.

**Approach:** Build lightweight adapter functions for each provider. Source infra already supports custom adapters via the `adapter` field in catalog entries.

**Sub-tasks:**
- [ ] 15b-1: FRED adapter — requires free API key. JSON response. `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=KEY&file_type=json`. Register key in `.env`. Adapter: extract latest observation value.
- [ ] 15b-2: VIX/CBOE adapter — `https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`. CSV response. Adapter: parse last row, extract close price.
- [ ] 15b-3: ECB adapter — `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A`. XML/SDMX response. Adapter: parse latest observation. Consider using JSON alternative if available.
- [ ] 15b-4: Add catalog entries for 5-10 macro sources (GDP, CPI, unemployment, VIX, EUR/USD, treasury yields)
- [ ] 15b-5: Tests for each adapter

**Human design needed:** API key management pattern (env var vs secrets store vs config), CSV/XML parsing strategy (lightweight vs dependency).

### 15c — Source registry as DB (Medium, Codex-delegatable)

**Problem:** Source lifecycle (ratings, transitions, test history) resets every session because `updateRating()` and `evaluateTransition()` in `lifecycle.ts` are pure functions operating on in-memory catalog data. No persistence between sessions.

**Fix:** Store source metadata in colony DB. Already has `source_response_cache` table — extend with `source_lifecycle` table for ratings, transition history, test results.

**Files:**
- `src/toolkit/colony/schema.ts` — add `source_lifecycle` table (migration v9)
- `src/toolkit/colony/source-lifecycle-store.ts` — CRUD for lifecycle data
- `src/toolkit/sources/lifecycle.ts` — wire persistence into updateRating/evaluateTransition
- Tests for the new store + integration with lifecycle

**Sub-tasks:**
- [ ] 15c-1: Schema migration v9 — source_lifecycle table (sourceId, status, rating JSON, lastTestAt, testCount, transitionHistory JSON)
- [ ] 15c-2: source-lifecycle-store.ts — upsert/get/list lifecycle records
- [ ] 15c-3: Wire lifecycle.ts to read/write from store (load on startup, persist after each fetch)
- [ ] 15c-4: Tests for store + integration

### 15d — Prefetch cascade redesign (Medium)

**Problem:** Source resolution produces a single candidate, but the prefetch-cascade pattern (Phase 12 deferred) needs a ranked list of candidates so it can fall back to the next source if the top one fails.

**Current flow:** `selectSourceForTopicV2()` returns one `SourceSelectionResult`. If that source's fetch fails, the publish is abandoned.

**Desired flow:** Return a ranked list of 3-5 candidates. Prefetch top candidate. On failure, try next. This makes publishing resilient to individual source outages.

**Files:**
- `src/toolkit/sources/policy.ts` — `selectSourceForTopicV2` returns array, not single
- `cli/publish-helpers.ts` — `resolveSourceForAction` iterates candidates
- `cli/publish-executor.ts` — prefetch loop with fallback
- Tests for multi-candidate resolution

**Sub-tasks:**
- [ ] 15d-1: selectSourceForTopicV2 returns ranked array (top N by match score)
- [ ] 15d-2: resolveSourceForAction iterates candidates until one resolves
- [ ] 15d-3: Prefetch with fallback in publish-executor
- [ ] 15d-4: Tests for cascade behavior

### 15e — Session-runner retirement (Large, phased)

**Problem:** `cli/session-runner.ts` is 1600+ lines of legacy code. 17 of its 21 imports are shared with v3-loop. It predates the toolkit architecture and duplicates many patterns now in toolkit/.

**Approach:** Phase the retirement — don't delete, redirect:
1. Identify which session-runner features are NOT in v3-loop
2. Port missing features to v3-loop or toolkit
3. Make session-runner a thin wrapper that delegates to v3-loop
4. Eventually deprecate

**Sub-tasks:**
- [ ] 15e-1: Audit session-runner features vs v3-loop — produce a diff matrix
- [ ] 15e-2: Port unique features (if any) to v3-loop or toolkit
- [ ] 15e-3: Slim session-runner to thin wrapper
- [ ] 15e-4: Deprecation notice + migration guide

**This is NOT Codex-delegatable** — requires architectural judgment about what to keep vs port.

## Delegation Summary

| Task | Codex? | Mode | Effort | Priority |
|------|--------|------|--------|----------|
| 15a multi-asset pool | Yes | --auto (scoped) | Small | High — unblocks publish_prediction |
| 15b-1 FRED adapter | Yes | --auto (scoped) | Small | High — first macro source |
| 15b-2 VIX adapter | Yes | --auto (scoped) | Small | Medium |
| 15b-3 ECB adapter | Partial | safe then --auto | Medium | Low (XML complexity) |
| 15b-4 catalog entries | Yes | --auto (scoped) | Small | After adapters |
| 15c source registry DB | Yes | --auto (scoped) | Medium | High — persistence fixes lifecycle |
| 15d prefetch cascade | Partial | safe then --auto | Medium | Medium — resilience improvement |
| 15e session-runner | No | human design | Large | Low — works fine, just legacy |

**Recommended batch order:**
- **Batch 1** (parallel, small): 15a (pool fetch) + 15b-1 (FRED) + 15c-1/15c-2 (schema + store)
- **Batch 2** (after Batch 1): 15b-2 (VIX) + 15b-4 (catalog) + 15c-3/15c-4 (lifecycle wiring)
- **Batch 3** (design-heavy): 15d (prefetch cascade) + 15b-3 (ECB)
- **Batch 4** (large, low priority): 15e (session-runner retirement)
