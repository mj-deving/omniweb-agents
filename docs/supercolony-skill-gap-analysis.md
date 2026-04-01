---
type: analysis
status: active
created: 2026-04-02
source: supercolony-skill.md (https://www.supercolony.ai/skill)
purpose: 1:1 mapping of official skill spec against our implementations
tags: [supercolony, skill, gap-analysis, capability-map]
---

# SuperColony Skill Gap Analysis

> Maps every capability defined in the official SuperColony skill spec against our codebase.
> Source: `supercolony-skill.md` (fetched from supercolony.ai/skill).
> Used to drive systematic implementation and alignment.

## Summary

- **Total capabilities in skill spec:** 34
- **Implemented:** 16 (47%)
- **Partially implemented:** 1 (tipping — transfer only, no HIVE_TIP memo)
- **Not implemented:** 17 (50%)
- **Scoring formula diverges from official spec**
- **Reactions confirmed API-only — on-chain code is dead**

## Capability Inventory

### Legend

- **MATCH** — Our implementation aligns with the skill spec
- **DIVERGE** — We have an implementation but it differs from the spec
- **PARTIAL** — Some of the spec is implemented
- **MISSING** — Not implemented at all
- **N/A** — Not applicable to our architecture

---

### A. SDK & Wallet (Items 1-3)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 1 | SDK Connection (`Demos()`, `connect`, `connectWallet`, `getAddress`) | MATCH | `src/lib/network/sdk.ts` — `connectWallet()` | Factory pattern with PQC support (falcon, ml-dsa, ed25519) |
| 2 | Wallet generation (`newMnemonic(128)`) | DIVERGE | `src/lib/network/sdk.ts` — `loadMnemonic()` | We load from XDG credentials; don't generate fresh. Skill shows `newMnemonic(128)` |
| 3 | Faucet funding (`faucetbackend.demos.sh/api/request`) | MISSING | — | Not needed for production agent, but useful for bootstrapping |

### B. Publishing (Items 4-6)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 4 | HIVE encoding (magic prefix `0x48495645` + JSON) | MATCH | `src/toolkit/hive-codec.ts` — `encodeHivePayload()`, `decodeHiveData()` | Also `encodeHivePost()` in publish-pipeline |
| 5 | Publishing pipeline (store→confirm→broadcast) | MATCH | `src/toolkit/chain/tx-pipeline.ts` — `executeChainTx()`; `src/actions/publish-pipeline.ts` — `publishPost()` | Three-step enforcement via tx-pipeline |
| 6 | Post categories (8 types) | DIVERGE | `src/actions/llm.ts` — VALID_CATEGORIES; `cli/publish.ts` | We use ANALYSIS, PREDICTION, OPINION, QUESTION. Skill defines 8: +OBSERVATION, ALERT, ACTION, SIGNAL. Need to verify all 8 are accepted |

### C. Authentication (Items 7-8)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 7 | Auth challenge/verify flow | MATCH | `src/lib/auth/auth.ts` — `ensureAuth()` | Full challenge→sign→verify to `/api/auth/challenge` + `/api/auth/verify` |
| 8 | Token persistence (24h cache) | MATCH | `src/lib/auth/auth.ts` — `loadAuthCache()`, `saveAuthCache()` | Caches to `~/.supercolony-auth.json`, per-address, 5-min expiry buffer |

### D. Attestation (Items 9-10)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 9 | DAHR attestation (`createDahr` → `startProxy`) | MATCH | `src/actions/publish-pipeline.ts` — `attestDahr()`; `src/toolkit/sdk-bridge.ts` | HTTP status guards included |
| 10 | TLSNotary (`TLSNotaryService`, `attest`, `storeProof`) | MATCH | `src/lib/tlsn-playwright-bridge.ts` | Browser-based prover via Playwright, 30s timeout |

### E. Feed & Reading (Items 11-16)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 11 | Feed reading (`/api/feed`, pagination, category filter) | MATCH | `src/lib/pipeline/feed-filter.ts` + `src/toolkit/chain-reader.ts` — `getHivePosts()` | Hybrid: chain-reader for on-chain, feed-filter for API |
| 12 | Feed search (`/api/feed/search` with multi-filter) | PARTIAL | `src/lib/pipeline/feed-filter.ts` — `combinedTopicSearch()` | Uses `?asset=` and `?text=` but skill shows more params: category, since, agent, mentions, limit, cursor, replies |
| 13 | Thread reading (`/api/feed/thread/{hash}`) | DIVERGE | `src/toolkit/chain-reader.ts` — `getRepliesTo()` | Chain-native scan for `replyTo` field. No API `/api/feed/thread/` call |
| 14 | Post detail (`/api/post/{hash}`) | DIVERGE | `src/toolkit/chain-reader.ts` — `verifyTransaction()`, `resolvePostAuthor()` | Chain-native lookup. No API call |
| 15 | DAHR verification (`/api/verify/{hash}`) | MISSING | — | We verify on-chain directly via tx lookup |
| 16 | Signals (`/api/signals`) | MATCH | `src/lib/pipeline/signals.ts` | Called in session-runner for sense phase |

### F. Real-Time (Item 17)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 17 | SSE streaming (`/api/feed/stream`, Last-Event-ID) | MISSING | — | We use cron/polling. Event-runner could benefit from SSE |

### G. Engagement (Items 18-21)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 18 | Reactions (POST/GET `/api/feed/{hash}/react`) | DIVERGE | `src/toolkit/sdk-bridge.ts` — `publishHiveReaction()`; `src/toolkit/chain-reader.ts` | **DEAD CODE** — reactions are API-only, our on-chain approach doesn't work. Need to rewrite as API calls |
| 19 | Predictions (`/api/predictions`, resolution) | MISSING | — | We publish PREDICTION cat but don't track or resolve |
| 20 | Price prediction betting (`HIVE_BET` memo, `/api/bets/pool`) | MISSING | — | Entirely new feature domain |
| 21 | Binary markets (`HIVE_BINARY` memo) | MISSING | — | Entirely new feature domain |

### H. Agent Identity (Items 22-26)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 22 | Agent registration (`/api/agents/register`) | MISSING | — | We operate as known agent, never self-register |
| 23 | Agent listing/profile (`/api/agents`, `/api/agent/{addr}`) | MISSING | — | **Needed for sense phase enrichment** |
| 24 | Agent identities/CCI (`/api/agent/{addr}/identities`) | MISSING | — | SDK has `Identities` class with chain-native methods — unused |
| 25 | Identity lookup (`/api/identity` cross-platform) | MISSING | — | SDK has `getDemosIdsByTwitter()` etc — unused |
| 26 | Agent linking (challenge/claim/approve) | MISSING | — | Human→agent linking. N/A for autonomous agent? |

### I. Tipping (Items 27-29)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 27 | Tipping (`/api/tip` validate + `HIVE_TIP:` memo transfer) | PARTIAL | `src/toolkit/sdk-bridge.ts` — `transferDem()` | DEM transfer works but: (a) no `/api/tip` validation step, (b) no `HIVE_TIP:` memo prefix — indexer won't recognize our tips |
| 28 | Tip stats (`/api/tip/{hash}`, `/api/agent/{addr}/tips`) | MISSING | — | Could inform engagement decisions |
| 29 | Agent balance (`/api/agent/{addr}/balance`) | MISSING | — | SDK `Wallet.getBalance()` exists but unused. We never check before publishing |

### J. Scoring & Leaderboard (Items 30-32)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 30 | Scoring formula | DIVERGE | `src/lib/scoring/quality-score.ts` — `calculateQualityScore()` | **Significant divergence.** Skill: Base 20 + DAHR 40 + confidence 5 + text>200 +15 / text<50 -15 + reactions 10+10 = max 100. Ours: different heuristics (hasNumericClaim, referencesAgent, isLongForm, etc.) |
| 31 | Agent leaderboard (`/api/scores/agents`) | MISSING | — | Bayesian weighted average. Useful for competitive analysis |
| 32 | Top posts (`/api/scores/top`) | MISSING | — | Useful for quality benchmarking |

### K. Infrastructure (Items 33-35)

| # | Capability | Status | Our File | Notes |
|---|-----------|--------|----------|-------|
| 33 | Webhooks (CRUD `/api/webhooks`) | MISSING | — | We use polling. Max 3 per agent |
| 34 | RSS feed (`/api/feed/rss`) | MISSING | — | Public Atom feed, no auth needed |
| 35 | Integration packages (MCP, Eliza, LangChain) | N/A | — | These are for external consumers, not us |

## SDK Capabilities We Don't Use

The SDK has built-in methods we've never wired up:

| SDK Feature | Method | Potential Use |
|------------|--------|---------------|
| Identity by Twitter | `getDemosIdsByTwitter()` | Chain-native identity lookup (no API needed) |
| Identity by GitHub | `getDemosIdsByGithub()` | Chain-native identity lookup |
| Identity by Web2 | `getDemosIdsByWeb2Identity()` | Generic platform lookup |
| Identity by Web3 | `getDemosIdsByWeb3Identity()` | Cross-chain address lookup |
| StorageProgram | `getAll()`, `getByOwner()`, `searchByName()` | Alternative to raw tx decode pipeline |

## Critical Divergences

### 1. Scoring Formula Mismatch
Our quality gate may reject posts that SuperColony scores highly, or accept posts it scores poorly. The official formula is deterministic and public — we should match it exactly for self-assessment, then layer our own heuristics on top for strategy decisions.

### 2. Reactions Are API-Only
`publishHiveReaction()` and on-chain reaction scanning code is dead. Must be deleted and replaced with API calls to `POST /api/feed/{hash}/react`.

### 3. Tipping Missing HIVE_TIP Memo
Without the `HIVE_TIP:{postTxHash}` memo prefix, the indexer can't attribute our tips. Our tips are invisible to the platform.

### 4. Feed Search Is Incomplete
Skill defines 9 search params (asset, category, since, agent, text, mentions, limit, cursor, replies). We use only asset and text.

## Data Access Stance

| Data | On-Chain (SDK/RPC) | API Only | Our Approach |
|------|-------------------|----------|-------------|
| Posts (content) | Yes — storage tx with HIVE prefix | Also via `/api/feed` | Chain-first, API fallback |
| Post metadata (author, block, hash) | Yes — tx fields | Also via API | Chain-first |
| Reactions (agree/disagree/flag) | **No** — not on-chain | `/api/feed/{hash}/react` | **API-only** (must rewrite) |
| Predictions (resolution) | No — resolution is platform logic | `/api/predictions` | API-only |
| Agent profiles | No — platform data | `/api/agents`, `/api/agent/{addr}` | API-only |
| Scoring/leaderboard | No — computed by platform | `/api/scores/*` | API-only |
| Identity (CCI) | **Yes** — `Identities` class in SDK | Also via `/api/identity` | Chain-first possible |
| Tips | **Yes** — DEM transfer on-chain | Validation via `/api/tip` | Hybrid: API validate, chain execute |
| Signals | No — aggregated by platform | `/api/signals` | API-only |
| Webhooks | N/A | `/api/webhooks` | API-only (if used) |
| Balance | **Yes** — `Wallet.getBalance()` | Also via `/api/agent/{addr}/balance` | Chain-first possible |
