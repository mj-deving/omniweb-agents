---
type: roadmap
status: active
updated: 2026-04-03
open_items: 6
completed_phases: 8
tests: 2542
suites: 191
tsc_errors: 0
api_endpoints: 38
strategy_rules: 10
colony_posts: 188000
summary: "Phases 1-8 complete. Open: 3 semantic search items, 3 future items, engine.ts split. 46 deferred evaluations."
read_when: ["roadmap", "phase 7", "phase 8", "open items", "deferred", "tech debt", "next steps", "what's next", "backlog", "future work"]
---

# Roadmap

> Authoritative execution tracker. Every open item is here.
> Completed work lives in `docs/INDEX.md` history. Specs in `docs/archive/`.

## Current Status

- **V3 loop:** LIVE with full data + intelligence pipeline + proof ingestion + SSE feed
- **Phase 8:** COMPLETE (proof ingestion, contradiction detection, verified engagement, colony intelligence, VOTE/BET codec, XMCore napi-guard, SSE adapter)
- **Tests:** 2542 passing, 191 suites, **0 tsc errors**
- **API Client:** 38/38 endpoints (35 in client, 3 in dedicated modules). 100% coverage.
- **Strategy Engine:** 10 rules (4 enrichment-aware + disagree_contradiction). Auto-calibration. Leaderboard meta-rule. FTS5 dedup. VOTE/BET rate limiting.
- **Colony DB:** 188K posts. Schema v6 (retry_count + composite indexes). 293MB.
- **Next:** engine.ts split (603 lines → threshold 500), Phase 5.6 semantic search (blocked on embedding model)

---

## Open Items

### Phase 5.6: Semantic Search (deferred)

- [ ] 5.6a -- Colony DB migration: sqlite-vec with 384-dim embeddings
- [ ] 5.6b -- Embedding pipeline: generate embeddings on insert
- [ ] 5.6c -- Hybrid search: FTS5 + vec0 via Reciprocal Rank Fusion

**Spec:** `docs/colony-tooling-plan.md` P5 + `.ai/guides/colony-db-research.md`
**Blocked by:** embedding model decision

---

### Phase 7: Strategy Phase 2 Rules — COMPLETE

- [x] 7a -- Event verifier for non-numeric claims (3-tier: field match, keyword, LLM semantic)
- [x] 7b -- Strategy Phase 2 rules (9 rules: 5 core + 4 enrichment-aware, all from design-loop-v3.md §6)
- [x] 7c -- Contamination check in faithfulness gate (unattested factual claims detected)
- [x] 7d -- Thread fan-out: `planThreadFanOut()` in `src/toolkit/publish/thread-fan-out.ts`
- [x] 6-defer-d -- adapt_to_leaderboard meta-rule: `applyLeaderboardAdjustment()` with YAML config
- [x] 6-disc-c -- Pluggable rule registry (YAML-based via `config-loader.ts`)
- [x] 6-disc-d -- Colony report consumption: `briefingContext` in DecisionContext, priority boost
- [x] 6-disc-e -- Identity lookup enrichment: `socialHandles` in agent profiles, `identityLookup` param
- [x] 6-disc-j -- ENGAGE txHash resolution: `targetType` discriminant + `resolveAgentToRecentPost()`

**Spec:** `docs/archive/design-loop-v3.md` sections 4-6 + `docs/archive/phase7-design.md`
**Completed:** 2026-04-03

---

### Phase 8: Advanced — COMPLETE

- [x] 8a -- Proof ingestion: `resolveAttestation()` + `ingestProofs()` + schema v5 (chain_verified)
- [x] 8b -- Contradiction detection: `contradiction-scanner.ts`, metric windows, self-exclusion, `disagree_contradiction` rule
- [x] 8c -- Verified engagement: `VerificationGate` enum, ENGAGE allows verified+unresolved, TIP requires verified
- [x] 8d -- Colony intelligence: `buildColonyIntelligence()`, claim freshness, evidence quality, colony health
- [x] 6-disc-a -- VOTE action type: `vote-bet-codec.ts` (Zod-validated HIVE_BET, 0.1-5 DEM, 7-day expiry)
- [x] 6-disc-b -- Binary market bets: HIVE_BINARY codec, publish-executor handler, heavy path routing
- [x] 6-disc-f -- XMCore cross-chain reads: `napi-guard.ts` with child_process.fork() SIGSEGV isolation
- [x] 6-disc-g -- SSE/webhook consumption: `sse-sense-adapter.ts`, time-bounded, wired into v3-loop SENSE

**Spec:** `docs/archive/design-loop-v3.md` sections 5+6b + `Plans/phase8-all-features-design-reviewed.md`
**Completed:** 2026-04-03. Triple-reviewed (Fabric design + threat model + Codex). 15 new files, +2300 lines, +82 tests.

---

### Refactor: engine.ts split

- [ ] Split `src/toolkit/strategy/engine.ts` (603 lines, threshold 500) into focused modules
  - Core rules (reply_to_mentions, engage_verified, publish_to_gaps, tip_valuable) → `engine.ts`
  - Enrichment-aware rules (engage_novel, signal_aligned, divergence, prediction) → `engine-enrichment.ts`
  - Contradiction rule (disagree_contradiction) → `engine-contradiction.ts`
  - Rate limiting + candidate selection → stays in `engine.ts`

**Target:** Each module under 300 lines. Re-export from `engine.ts` for backward compat.

---

### Future (no phase assigned)

- [ ] 6-disc-h -- Escrow to social identity: tip by Twitter/GitHub handle without wallet
- [ ] 6-disc-i -- ZK identity proofs for privacy-preserving attestation
- [ ] StorageProgram exploration: SDK structured on-chain storage for HIVE data

---

## Dependency Graph

```
Phase 1-4 (DONE) --> Phase 5 (DONE) --> Phase 6 (DONE) --> Phase 7 (DONE) --> Phase 8 (DONE)
                       |
                       +-> 5.6 semantic search (blocked on embedding model decision)
                       |
                       +-> Future (independent, no blockers)
```

---

## Tech Debt

| Item | Target | Metric |
|------|--------|--------|
| Double-fetch in V3 loop (scan-feed + colony ingestion both call getHivePosts) | 2026-04-14 | 14 sessions with >0 actions |
| Cursor not functional (SDK has no sinceBlock param) | When SDK adds pagination | Track SDK releases |
| ~~Wire `ingestProofs()` into v3-loop after scan completes~~ | ~~Phase 8b~~ | **DONE 2026-04-03** — wired in v3-loop SENSE phase |
| Add composite index `(author, timestamp)` on posts for `resolveAgentToRecentPost` perf | When engagement volume grows | Query plan analysis |
| TLSN comparison: structural key-value matching instead of substring | Phase 8c | Substring injection risk on short values |
| ~~Retry cap on retryable attestation failures (currently retries forever)~~ | ~~Phase 8b~~ | **DONE 2026-04-03** — retry_count column in schema v6, 5-retry cap |
| DAHR/TLSN detection: require both url+responseHash for DAHR, serverName+recv for TLSN | Phase 8c | Reduce false positives on malformed tx |
| Concurrency guard: prevent double-processing in `ingestProofs` when scans overlap | Phase 8b | BEGIN IMMEDIATE or exclusion list |
| Edge case tests: DAHR empty data, TLSN empty recv, boolean snapshot values | Phase 8b | Test coverage gap |
| Integration tests for strategy bridge (briefingContext, identityLookup, targetType) | Phase 8b | Unit tests exist, integration tests missing |
| Identity API shape: v3-loop `identityLookup` may always produce `platform: "unknown"` | Next session | Verify against live API response shape |
| socialHandles in agent profiles unused by engine rules | Phase 8c | Infrastructure ready, no consumer yet |
| TLSN storage fee uncapped — large proof = unbounded DEM cost (`tlsn-playwright-bridge.ts:298`) | Phase 8b | Add Math.min(storageFee, 15) cap |
| claim_ledger.verified based on self-reported snapshot, not chain-verified data (`scanner.ts:191`) | Phase 8b | Reconcile after ingestProofs runs |
| API responses cast to generic T without runtime validation (`api-client.ts:458`) | Phase 8c | Add Zod schemas for critical endpoints |
| External JSON.parse without safeParse in provider files (`generic.ts:93`, `declarative-engine.ts:1215`, `source-discovery.ts:80`, `sse-feed.ts:135`) | Phase 8c | Use safeParse() for external HTTP bodies |
| File paths leaked in error messages (`sdk.ts:83,167`, `agent-config.ts:405`) | Phase 8c | Redact absolute paths |
| ~~No unified daily spending cap across tips + attestations + D402 + gas~~ | ~~Future~~ | **DONE 2026-04-03** — checkSessionBudget() in spending-policy.ts with NaN/negative guard |
| Runtime guard for unrecognized targetType values in action-executor ENGAGE case | Phase 8b | TypeScript enforces at compile time, no runtime check |
| LLM prompt injection via briefingContext (`.slice(500)` truncated but unsanitized) | Phase 8c | Consider delimiter/system instruction boundary |
| ~~Parallel RPC concurrency unbounded in ingestProofs beyond limit param~~ | ~~Phase 8b~~ | **DONE 2026-04-03** — p-limit(5) in proof-ingestion-rpc-adapter |
| Raw error `.toString()` coercion in `eliza/event-service.ts:55` | Phase 8c | Use `.message` pattern |
| SSE feed event cast without schema validation (`sse-feed.ts:135`) | Phase 8c | Add Zod schema for SSEPost |
| Faithfulness gate has no chain verification dependency (by design, pre-publish) | N/A | Document that gate output is NOT chain-verified |
| Cache contradiction scan results with TTL (avoid recomputing 188K posts each iteration) | Phase 8d | Review finding 2026-04-03 — Fabric design review |
| SSE endpoint configuration (URL, auth, reconnect backoff) — endpoint not yet stable | Phase 8d | Review finding 2026-04-03 — Fabric design review |
| Bet outcome tracking: reserve schema field for settlement status | Phase 8d | Review finding 2026-04-03 — Fabric threat model |
| Colony DB periodic pruning at scale (293MB and growing) | Future | Review finding 2026-04-03 — Fabric threat model |

### Deferred Evaluation (assessed as acceptable — revisit periodically)

| Item | Original Assessment | Revisit When |
|------|-------------------|--------------|
| `normalize()` not shared across codebase — each module has local trim+lowercase | Pre-existing, large blast radius to consolidate | When adding new modules that need normalization |
| `scoreAttestability` in thread-fan-out parallels `scoreClaim` in signal-first-pipeline | Intentionally different heuristics (attestability vs signal strength) | If scoring logic drifts or a unified scorer is needed |
| Two priority mutation patterns (briefing boost + leaderboard adjustment) | Info — no abstraction needed for 2 sites | If a 3rd priority modifier is added |
| `getRule` vs `findRule` near-duplicate in engine.ts | Pre-existing, `findRule` fabricates default for rejection logging | Next engine refactor |
| Stringly-typed targetType ("post"\|"agent") acceptable for 2 values | TypeScript union enforces compile-time | If a 3rd target type is added |
| Swallowed error in `resolveAgentToRecentPost` — no observer access | Function is a standalone helper, can't thread observer | If debugging engagement failures |
| N+1 DB queries for agent profiles via `getAgentProfile` (uncached prepare per call) | Pre-existing pattern across colony modules | When profile count exceeds 50 per batch |
| `db.prepare()` not cached across repeated `ingestProofs` calls | better-sqlite3 caches internally, LOW severity | If profiling shows prepare() as bottleneck |
| Array copy in `planThreadFanOut` sort — necessary to avoid mutating input | Correct behavior, confirmed by reviewer | Never — this is right |
| `applyLeaderboardAdjustment` toLowerCase per entry — negligible at <100 entries | O(N) on small N | If leaderboard exceeds 1000 agents |
| Magic number '-48 hours' in `resolveAgentToRecentPost` | Acceptable hardcode for recency window | If window needs tuning per agent/config |
| Inline `import(...)` type syntax in v3-loop.ts | Readability preference, not a bug | Next v3-loop refactor |
| `Promise.allSettled` type annotation in v3-strategy-bridge | Trivial readability suggestion | Never — not blocking |
| WHAT comments in proof-resolver.ts (2 inline comments restate code) | Cosmetic, function docstring already covers | Next code cleanup pass |
| `resolveAttestation` swallows exception details in catch blocks | Acceptable — returns typed failure reason | If debugging chain resolution issues |
| DAHR `compareProofToSnapshot` always returns "match" without URL check | Design choice: DAHR = hash-level trust, data not on-chain | If DAHR trust model changes |
| Quartile math on small leaderboards (index 0 in 4 agents = top quartile) | Mathematically correct: rank 1 of 4 IS top quartile | Never — this is right |
| Fabric design: no documented API auth/authorization | False positive — wallet-signed requests, documented in SDK reference | Never |
| Fabric design: no encryption-at-rest for ColonyDatabase | Colony DB is disposable local cache per ADR-0017, not secrets | Never |
| Fabric design: no multi-tenant data segregation | Single-agent system, no multi-tenancy requirement | If multi-agent support is added |
| Fabric design: rate limiting undefined | False positive — fully implemented with hard clamping | Never |
| Fabric design: document inconsistencies in phase7-design.md | Design doc shows iterative thought process, not blocking | Next doc cleanup |
| Fabric 8a design: decouple verification from scanner as independent worker | Intentional: incremental in caller, not a separate service | If attestation volume exceeds scan budget |
| Fabric 8a design: harden RPC client (mTLS, rate limiting, circuit breaker) | Generic infrastructure concern, SDK abstracts the chain | If running own RPC node |
| Fabric 8a design: encrypt ColonyDB at rest | Same as above — disposable cache per ADR-0017 | Never |
| SQL injection audit: all 63 queries clean | No issue — all parameterized | Continuous — check on every new query |
| Secrets audit: no hardcoded keys, mnemonics, or API secrets | No issue — wallet loaded from file, never logged | Continuous |
| Secrets audit: prototype pollution protected via safeParse on chain data | No issue — active protection in place | Continuous |
| Error handling: no stack traces leaked, no secrets in observe() calls | No issue — consistent err.message pattern | Continuous |
| Error handling: state-helpers parse error may leak partial content | Minor — key name already omitted | If state format becomes sensitive |
| Sequential proof ingestion + agent profile refresh in SENSE phase | Independent ops run serially; ~5-10s parallelizable | Next SENSE phase performance pass |
| Sequential source fetches in SENSE phase (serial HTTP in 15s budget) | Could parallelize with concurrency limiter for more coverage | Next SENSE phase performance pass |
| Dynamic imports per v3-loop iteration (proof-ingestion, SSE adapter) | Node caches after first load; async import() is cheap | If profiling shows import overhead |
| SQL placeholder interpolation in `getVerifiedPostCountsByAuthor` | Safe (only `?` chars) but prevents SQLite prepare caching across author counts | If called frequently with varying author counts |
| `Promise<any>` at SDK boundary in proof-ingestion-rpc-adapter | SDK type genuinely unknown; downstream validates structure | If SDK adds TypeScript types for RPC |
| ~~3 unwired modules (intelligence-summary, vote-bet-codec, napi-guard)~~ | **DONE 2026-04-03** — all wired in Phase 8d | ~~Phase 8d wiring session~~ |
| ~~VOTE/BET heavy path but no publish-executor handler yet~~ | **DONE 2026-04-03** — executor handler added | ~~Phase 8d VOTE/BET executor wiring~~ |
| `hasColumn()` in schema.ts uses string interpolation in `db.pragma()` | Always hardcoded literal "attestations" from migration functions | If hasColumn is generalized |
| N+1 `findContradictions` per (subject,metric) pair in contradiction scanner | Capped by maxResults:3 early-break; ~3 queries max per cycle | If claim_ledger grows beyond 500K rows |
| SSE adapter named "SSE" but uses poll-based `/api/feed` fetch | Reflects intended future SSE integration; poll is interim | When SSE endpoint is production-ready |
| `blockNumber: 0` sentinel for SSE-ingested posts | tx_hash PK handles dedup; blockNumber not used for ordering | If blockNumber becomes ordering-critical |
| `createLimiter()` concurrency semaphore buried in proof-ingestion-rpc-adapter | Generic reusable primitive; only one consumer currently | When a 2nd adapter needs concurrency limiting |
| `createTestDb()` and `addPost()` duplicated across 4 test files | Test helper code, not production; extract to shared fixture if 6+ files | Next test cleanup pass |
| WHAT comments in contradiction-scanner and sse-sense-adapter | Borderline — aid scannability but restate obvious code | Next code cleanup pass |

---

## Decision Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-03-30 | SENSE/ACT/CONFIRM replaces 8-phase V1 | 7 primitives to 3 phases; V1 had 5 ceremonial phases |
| 2026-03-30 | Signal-first publishing | Topic-first: 78% body_match=0. Signal-first: creative freedom + attestation grounding |
| 2026-03-30 | 1 post = 1 attestable claim | Focused, verifiable posts. Multi-claim to thread. |
| 2026-03-31 | Two executors (action + publish) | ENGAGE=1 call, PUBLISH=10 steps. Different complexity. |
| 2026-03-31 | SDK double-fetch acceptable (temporary) | Chain reads cheap. Consolidation target 2026-04-14. |
| 2026-04-01 | P0-P2 before Phase 6 | Strategy refactor needs data + tooling first |
| 2026-04-01 | No ORM for colony DB | Thin interface layer IS the abstraction |
| 2026-04-01 | Archive completed plan docs | design-loop-v3.md + phase5-plan.md to docs/archive/ (read-only reference) |
| 2026-04-02 | Phase 5.7 before Phase 6 | API audit revealed broken tipping, missing signals/feed-search, unwired intelligence layer |
| 2026-04-02 | Signals are strategy-critical, not optional | /api/signals provides colony consensus -- must be primary input to plan phase |
| 2026-04-02 | Tipping must use 2-step API validation | Direct transferDem() skips spam limits and indexer can't attribute tips |
| 2026-04-02 | Phase 6 is reference implementation, not canonical strategy | Toolkit/loop/primitives are universal; sentinel rules are ONE demo |
| 2026-04-02 | All enrichment is optional (graceful degradation) | Rules skip when apiEnrichment is null -- agent works without API |
| 2026-04-02 | Auto-calibration replaces static JSON | computeCalibration() in sense phase, cached in strategyResults |
| 2026-04-02 | Category selection is content-driven | inferCategory() replaces hardcoded "analysis" based on action reason |
| 2026-04-02 | Dedup module wired into publish-executor | checkClaimDedup + checkSelfDedup guard PUBLISH actions before LLM call |
| 2026-04-02 | SDK capabilities doc is informational only | XMCore/StoragePrograms/ZK are Phase 8+ -- no Phase 6 rules use them |
| 2026-04-02 | Engine stays pure-function: pre-compute in bridge | Engine's testability + agent-agnosticism is its strongest property. Bridge extracts intelligence data into DecisionContext fields. |

---

## Spec Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `docs/archive/design-loop-v3.md` | Architectural vision: first principles, phase contracts, signal-first, claim schema | Archive (reference) |
| `docs/archive/phase5-v3-loop-swap-plan.md` | Phase 5 implementation plan + Codex review findings | Archive (complete) |
| `docs/archive/phase6-strategy-refactor-plan.md` | Phase 6 plan: 5 sub-phases, 72 criteria, design philosophy | Archive (complete) |
| `docs/colony-db-ingestion-plan.md` | Colony DB ingestion fixes + backfill spec (step 2) | Active (step 2 open) |
| `docs/colony-tooling-plan.md` | P0-P5 detail specs: query CLI, reactions, backfill, FTS5, intelligence, semantic | Active (roadmap) |
| `docs/research/supercolony-api-reference.md` | 100% SuperColony API + scoring + consensus + oracle reference | Active (reference) |
| `docs/research/demos-sdk-capabilities.md` | Full SDK module inventory from MCP queries | Active (reference) |
