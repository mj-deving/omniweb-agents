---
type: roadmap
status: active
phase: 6
progress: 33/38
updated: 2026-04-02
open_items: 5
next_action: "Phase 7 — event verifier and strategy Phase 2 rules"
tags: [v3, colony, strategy]
---

# V3 Roadmap

> Authoritative execution tracker. Every open item is here. Completed work is ticked.
> Detailed specs live in separate docs (linked below). Archive in `docs/archive/`.

## Status

- **V3 loop:** LIVE. Signals, oracle, prices, ballot, intelligence all wired into sense phase.
- **Tests:** 2372 passing, 177 suites, **0 tsc errors**
- **Colony DB:** 188K posts, schema v4 (FTS5 + agent_profiles + interactions)
- **API Client:** 38/38 endpoints (35 in client, 3 in dedicated modules). 100% coverage.
- **Phase 5.7:** ✅ COMPLETE. Signals, 2-step tipping, agent profiles, interactions all wired.
- **Phase 6:** ✅ COMPLETE. Enrichment-aware rules, dedup, auto-calibration, category selection. 2404 tests.
- **Next:** Phase 7 — event verifier, strategy Phase 2 rules

## Checklist

### Phase 1-4: Foundation

- [x] 1 — TypeScript 6.0.2 upgrade (`73bbdd5`)
- [x] 2 — Toolkit/strategy boundary extraction, ADR-0002 (`architecture-plumbing-vs-strategy.md`)
- [x] 3a — Colony DB schema + scanner (`src/toolkit/colony/`)
- [x] 3b — Strategy engine: sense/plan/computePerformance (`src/toolkit/strategy/engine.ts`)
- [x] 3c — Claim extraction + faithfulness gate (`src/lib/attestation/claim-extraction.ts`)
- [x] 4a — Architecture enforcement tests, ADR-0014 (`tests/architecture/boundary.test.ts`)
- [x] 4b — Standards audit, TS 6.0 strict, catch (e: unknown) codemod

### Phase 5: V3 Loop Swap

- [x] 5 — `cli/v3-loop.ts` replaces V2 as default loop (`437b2c2`)
- [x] 5 — `cli/publish-executor.ts` with full attestation pipeline (`f965ac7`)
- [x] 5 — `cli/action-executor.ts` for ENGAGE/TIP actions (`6829a57`)
- [x] 5 — `cli/v3-strategy-bridge.ts` — sense/plan/perf wiring (`437b2c2`)
- [x] 5 — Session-runner V3 integration + `--legacy-loop` for V2 (`437b2c2`)
- [x] 5 — Codex review: 3 HIGH findings fixed (`2763c47`, `01ce119`)
- [x] 5-db — Colony DB ingestion in V3 sense phase (`007ff1e`, `ebe5c72`)
- [x] 5-db — Timestamp conversion: `new Date(ms).toISOString()` with validation guard (`b1d52d3`)
- [x] 5-db — FK pragma try/finally safety (Codex F1) (`2a19a2d`)
- [x] 5-db — Removed dead setCursor code (Codex F2) (`2a19a2d`)
- [x] 5-cache — Source fetch + cache in V3 sense phase (`1354085`)
- [x] 5-cache — 15s budget timeout for source fetches (Codex F3) (`2a19a2d`)
- [x] 5-cache — Error logging + consecutiveFailures tracking (Codex F4/F5) (`2a19a2d`)
- [x] 5-cache — Single SDK bridge instance, no duplicate (Codex F7) (`2a19a2d`)

**Spec:** `docs/archive/phase5-v3-loop-swap-plan.md` | **Colony DB spec:** `docs/colony-db-ingestion-plan.md`

### Phase 5.1: hive-query CLI

- [x] 5.1a — `cli/hive-query.ts` scaffold: arg parsing, wallet connect, --pretty/--json (`b437a63`)
- [x] 5.1b — `posts` subcommand: posts by author + reactions + attestations (`b437a63`)
- [x] 5.1c — `performance` subcommand: our post scores over time (`b437a63`)
- [x] 5.1d — `engagement` subcommand: who reacts to us, patterns (`b437a63`)
- [x] 5.1e — `colony` subcommand: top agents, trending topics, activity (`b437a63`)
- [x] 5.1f — `tx` subcommand: raw transaction lookup + decode (`b437a63`)

**Spec:** `docs/colony-tooling-plan.md` P0

### Phase 5.2: Reaction Refresh

- [x] 5.2a — Wire `getHiveReactions()` into V3 sense phase after post ingestion (`d045809`)
- [x] 5.2b — `upsertReaction()` for recent posts (24h window) with existing row merge (`3ad5078`)
- [x] 5.2c — Verify `tip_valuable` and `engage_verified` rules fire with populated cache (`d045809`)

**Spec:** `docs/colony-tooling-plan.md` P1 | ~10 lines of code + 1 chain call

### Phase 5.3: Colony Backfill

- [x] 5.3a — `cli/backfill-colony.ts`: cursor-based pagination, resume support (`4acb468`)
- [x] 5.3b — Batch inserts (1000/tx), dead-letter routing for decode failures (`4acb468`, `3ad5078`)
- [x] 5.3c — Progress reporting + final stats (`4acb468`)

**Spec:** `docs/colony-tooling-plan.md` P2 + `docs/colony-db-ingestion-plan.md` step 2

### Phase 5.4: FTS5 Full-Text Search

- [x] 5.4a — Colony DB migration v3: FTS5 virtual table + 3 sync triggers in `MIGRATIONS[3]` (`ca41ac6`)
- [x] 5.4b — Query helper: `searchPosts(db, query, opts?)` with limit, offset, author filter (`ca41ac6`, `e62a2f1`)

**Spec:** `docs/colony-tooling-plan.md` P3

### Phase 5.5: Colony Intelligence Layer

- [x] 5.5a — `agent_profiles` table (address, post_count, avg_agrees, topics, trust_score NULL) (`8081f73`)
- [x] 5.5b — `interactions` table (our_tx, their_tx, type NOT NULL, timestamp) (`8081f73`)
- [x] 5.5c — `refreshAgentProfiles(db, since?)` + `recordInteraction` + `getAgentProfile` + `getInteractionHistory` (`8081f73`)

**Spec:** `docs/colony-tooling-plan.md` P4

### Phase 5.6: Semantic Search

- [ ] 5.6a — Colony DB migration v3: sqlite-vec with 384-dim embeddings
- [ ] 5.6b — Embedding pipeline: generate embeddings on insert
- [ ] 5.6c — Hybrid search: FTS5 + vec0 via Reciprocal Rank Fusion

**Spec:** `docs/colony-tooling-plan.md` P5 + `.ai/guides/colony-db-research.md` | **Blocked by:** 5.4 + embedding model decision

### Phase 5.7: Strategy Data Wiring (pre-Phase 6)

> Revealed by 2026-04-02 API audit. These wire existing capabilities into the V3 loop.
> Must complete before Phase 6 so the strategy refactor has real data to work with.

- [x] 5.7a — Wire `/api/signals` into V3 sense phase as 6th enrichment call (`2d1144d`)
- [x] 5.7b — `searchFeed()` available in API client; `combinedTopicSearch` not used in V3 loop (Phase 6 wires it)
- [x] 5.7c — 2-step tipping: POST /api/tip validates → transferDem() fallback (`2d1144d`)
- [x] 5.7d — `refreshAgentProfiles(db, since24h)` called after colony ingestion (`2d1144d`)
- [x] 5.7e — `recordInteraction()` in action-executor for ENGAGE, REPLY, TIP (`2d1144d`)

**Spec:** `docs/supercolony-skill-gap-analysis.md` "Strategy-Relevant Capabilities" | **Blocked by:** API completion merge

### Phase 6: Strategy Domain Refactor

- [x] 6a — Strategy rules consume enrichment data: publish_signal_aligned, publish_on_divergence, publish_prediction (`a9d613d`)
- [x] 6b — Strategy rules consume intelligence: engage_novel_agents from leaderboard, tip_reputable upgrade
- [x] 6c — Claim deduplication: FTS5-based `checkClaimDedup` + `checkSelfDedup` in `src/toolkit/colony/dedup.ts`
- [x] 6d — Auto-calibration: `computeCalibration()` replaces static readCalibrationOffset, cold-start guard
- [x] 6e — Post quality: inferCategory (content-driven), config schema with enrichment thresholds

**Spec:** `docs/phase6-strategy-refactor-plan.md` + `docs/research/supercolony-api-reference.md` | **Tests:** 2404 (+32)

### Phase 7: Strategy Phase 2 Rules

- [ ] 7a — Event verifier for non-numeric claims (`design-loop-v3.md` section 4a-ii)
- [ ] 7b — Strategy Phase 2 rules (from `design-loop-v3.md` section 6)
- [ ] 7c — Contamination check in faithfulness gate (unattested factual claims)
- [ ] 7d — Thread fan-out: 1 post = 1 claim, multi-claim → reply thread

**Spec:** `docs/archive/design-loop-v3.md` sections 4-6 | **Blocked by:** Phase 6

### Phase 8: Advanced

- [ ] 8a — Proof ingestion: verify other agents' DAHR/TLSN attestations on scan
- [ ] 8b — Contradiction detection in claim ledger
- [ ] 8c — Verified engagement: agree/tip only after verifying target's attestation
- [ ] 8d — Colony intelligence algorithm: smart scanning per `design-loop-v3.md` section 5

**Spec:** `docs/archive/design-loop-v3.md` sections 5+6b | **Blocked by:** Phase 7

## Dependency Graph

```
Phase 1-4 (DONE) → Phase 5 (DONE)
                      |
                      +→ 5.1 hive-query CLI ──→ (unblocked)
                      +→ 5.2 reaction refresh ─→ (unblocked)
                      +→ 5.3 backfill ─────────→ (unblocked)
                      |       |
                      |       +→ 5.4 FTS5
                      |       |    |
                      |       |    +→ 5.5 intelligence
                      |       |    +→ 5.6 semantic search
                      |       |
                      +→ Phase 6 (after 5.1-5.3)
                              |
                              +→ Phase 7 (after 6)
                                    |
                                    +→ Phase 8 (after 7)
```

## Tech Debt

| Item | Target | Metric |
|------|--------|--------|
| Double-fetch in V3 loop (scan-feed + colony ingestion both call getHivePosts) | 2026-04-14 | 14 sessions with >0 actions |
| Cursor not functional (SDK has no sinceBlock param) | When SDK adds pagination | Track SDK releases |

## Decision Log

| Date | Decision | Why |
|------|----------|-----|
| 2026-03-30 | SENSE/ACT/CONFIRM replaces 8-phase V1 | 7 primitives → 3 phases; V1 had 5 ceremonial phases |
| 2026-03-30 | Signal-first publishing | Topic-first: 78% body_match=0. Signal-first: creative freedom + attestation grounding |
| 2026-03-30 | 1 post = 1 attestable claim | Focused, verifiable posts. Multi-claim → thread. |
| 2026-03-31 | Two executors (action + publish) | ENGAGE=1 call, PUBLISH=10 steps. Different complexity. |
| 2026-03-31 | SDK double-fetch acceptable (temporary) | Chain reads cheap. Consolidation target 2026-04-14. |
| 2026-04-01 | P0-P2 before Phase 6 | Strategy refactor needs data + tooling first |
| 2026-04-02 | Phase 5.7 before Phase 6 | API audit revealed broken tipping, missing signals/feed-search, unwired intelligence layer |
| 2026-04-02 | Signals are strategy-critical, not optional | `/api/signals` provides colony consensus — must be primary input to plan phase |
| 2026-04-02 | Tipping must use 2-step API validation | Direct `transferDem()` skips spam limits and indexer can't attribute tips |
| 2026-04-01 | No ORM for colony DB | Thin interface layer IS the abstraction |
| 2026-04-01 | Archive completed plan docs | design-loop-v3.md + phase5-plan.md → docs/archive/ (read-only reference) |

## Spec Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `docs/archive/design-loop-v3.md` | Architectural vision: first principles, phase contracts, signal-first, claim schema | Archive (reference) |
| `docs/archive/phase5-v3-loop-swap-plan.md` | Phase 5 implementation plan + Codex review findings | Archive (complete) |
| `docs/colony-db-ingestion-plan.md` | Colony DB ingestion fixes + backfill spec (step 2) | Active (step 2 open) |
| `docs/colony-tooling-plan.md` | P0-P5 detail specs: query CLI, reactions, backfill, FTS5, intelligence, semantic | Active (roadmap) |
