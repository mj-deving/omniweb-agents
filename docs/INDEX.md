---
type: index
status: current
updated: 2026-04-20
summary: "Project history and narrative — 16 eras from harness to the attestation-first, leaderboard-pattern moat. Phases 1-22 complete. Ready queue currently empty."
read_when: ["project history", "evolution", "what happened", "session changelog", "documentation map", "archive", "completed phases"]
---

# omniweb-agents — Project Index

> **The one document you read to understand the project's story.**
> Architecture: CLAUDE.md. Operations: AGENTS.md + Beads. Roadmap: [ROADMAP.md](ROADMAP.md). This file: **where we've been.**

**Current state:** Phases 1-22 COMPLETE | 295 suites, 3,442 passing tests, 7 skipped | 0 tsc errors | 19 ADRs | `omniweb-toolkit` v0.1.0 | attestation-first reset complete | leaderboard-pattern moat complete | `bd ready` empty

---

## What This Is

An autonomous agent toolkit built ON the Demos Network. Demos provides identity, attestation, cross-chain operations, storage, and messaging. We consume it to build agents that publish verifiable observations to the SuperColony — a collective AI intelligence protocol.

**One active agent (Sentinel)** runs the V3 loop: SENSE → ACT → CONFIRM. Signal-first publishing with DAHR attestation, FTS5 dedup, auto-calibration, and 10 enrichment-aware strategy rules. `createToolkit()` facade exposes 15 domain namespaces — agent builders call one method, routing/fallback/auth/caching handled internally.

---

## Project History

### Era 0: Foundation (March 20–23)

The project began as a session-loop harness — plugins orchestrated by a monolithic runner. Early work established the core patterns: skill loader replacing `registerHook()`, claim-driven attestation (4 phases), intent-driven source scanning (5 phases), and session transcript logging.

**Milestones:**
- Phase 0+5: Skill loader — `loadExtensions()` replaces imperative hooks. "New agent = just YAML"
- Claim extraction: rules-first + LLM fallback. Surgical URL construction. Attestation planner/executor with budget limits
- Source scanning: Anti-signal detection, Z-score adaptive thresholds, cross-source confirmation
- Session transcript: JSONL logger, query CLI, 7 bugs fixed in live session audit
- Correlation analysis (n=68): `predicted_reactions` has zero predictive value (r=-0.002). TLSN 2.3x reactions vs DAHR

**Tests at era end:** 89 suites, 1383 passing

### Era 1: Toolkit Pivot (March 25–26)

**The first pivot: "This isn't a framework — it's a toolkit."**

A 4-perspective council debate achieved unanimous convergence: omniweb-agents should be a framework-agnostic toolkit of atomic operations, not an orchestration harness. The zero-loops principle was established: tools + guards, not control flow.

- TLSN disabled — 0/145 feed posts used it. Zero ecosystem adoption
- Reply-first strategy — replies moved to Bucket 1 (were Bucket 3)
- Three-layer vision: adapter → core → SDK
- `claude -p` hook recursion bug found and fixed (14+ spawns per call)

### Era 2: Security & Hardening (March 27–28)

Seven hours to build the complete toolkit: 10 tools, 6 guards, DemosSession with symbol-keyed secrets, SSRF URL validator. Then three desloppify cycles grinding from 81→81.7 strict score.

**The transferDem bug** — SDK's `transfer()` was signing transactions but never broadcasting them. Silent money loss. Found in 3 places during a 107-call SDK audit. This created the SDK Contract Compliance rules (14 rules in `.ai/guides/sdk-interaction-guidelines.md`).

- 28 security findings resolved: DNS rebinding pin, atomic spend cap, chain-first tip resolution, proto pollution defense
- 102 new tests (1713→1815). CLAUDE.md trimmed 296→69 lines
- Chain-first migration: all CLI tools work without SuperColony API

**Tests at era end:** 112 suites, 1815 passing

### Era 3: First Principles (March 29–30)

**The second pivot: "Measure first, don't build first."**

75+ planned items were synthesized into 4 condition-triggered horizons. Architecture enforcement layers (ADR-0014) automated boundary checking. H0 baseline sessions revealed the real bottleneck: **body_match=0 in 78% of matches.** The problem wasn't infrastructure — it was matching quality.

- First-principles decomposition with 6+ parallel agents. Red Team killed 3/8 proposed primitives, found 3 missing
- Toolkit expanded 28→45 files with proper security boundaries
- ADR-0002 updated (toolkit boundary), ADR-0013 created (gray-zone splits)

### Era 4: V3 Architecture (March 31)

**The architectural breakthrough: signal-first replaces topic-first.**

A 7-hour design session produced a 1,791-line V3 design document through 5 review cycles. Seven irreducible primitives identified. The 8-phase sentinel loop was replaced with SENSE/ACT/CONFIRM — a signal-first attestation feedback loop.

Implementation sprint: Phases 1-5 via 8 Codex delegations with dual reviews. Colony cache (SQLite, 7 tables), strategy engine (5 rules, rate-limited planning), claim extraction, faithfulness gate, V3 loop swap.

- TS 6.0 upgrade (80+ type errors fixed, `using` declarations enabled)
- V3 loop operational. Sessions 55-56 ran but produced 0 actions — colony DB was empty
- Key decision: signal-first (creative freedom + attestation grounding) over topic-first (78% failure rate)

**Tests at era end:** 153 suites, 2108 passing

### Era 5: Colony & Data (April 1)

Colony DB goes live. Session 59: first V3 post with 4 on-chain DAHR attestations.

**Critical pagination bug:** SDK's `getTransactions(start)` takes a **tx index**, not a block number. Caused 99% data loss in colony scanning until fixed.

- Full chain backfill: 188,239 posts from 183 authors, 29 reactions, 293MB
- Discovered reactions are API-only, not on-chain (three-layer data model established)
- hive-query CLI (5 subcommands), backfill-colony tool
- ADR-0017 (colony DB: no ORM, disposable cache, numbered migrations)
- SuperColony API came back online after March 26 NXDOMAIN outage

### Era 6: Platform Alignment (April 2)

**The third pivot: "Align fully with SuperColony's official spec."**

34 official capabilities mapped from supercolony.ai/docs. Official scoring formula implemented exactly. Categories expanded 3→10. SuperColonyApiClient with 38 typed methods (100% endpoint coverage).

- Phase 5.4: FTS5 full-text search on 188K posts
- Phase 5.5: Colony intelligence layer (agent profiles + interactions)
- Phase 5.7: Signals, 2-step tipping, intelligence wiring into V3 sense
- Phase 6: Strategy domain refactor — 5→8 enrichment-aware rules, FTS5 dedup, auto-calibration, content-driven categories
- Engine stays pure-function: pre-compute intelligence in bridge, pass as data

**Tests at era end:** 180 suites, 2412 passing. 0 tsc errors. Phase 7 ready.

### Era 7: Strategy & Proof (April 3–4)

**Strategy rules mature. Proof ingestion and SSE go live.**

Phase 7 expanded strategy rules from 8 to 10 with VOTE and BET action types. Proof ingestion pipeline added for verifiable claim grounding. SSE (Server-Sent Events) integration for real-time feed monitoring. Semantic search (Phase 5.6) completed — hybrid FTS5+vec0 over 188K posts with embeddings backfilled.

- Phase 7.1: VOTE/BET action types with on-chain proof
- Phase 7.2: SSE real-time feed subscription
- Phase 7.3: Proof ingestion pipeline
- 10 strategy rules total (8 enrichment-aware + VOTE + BET)
- Colony DB grew to 188K posts with full semantic search

### Era 8: Tech Debt Sweep (April 5–6)

12-item tech debt sweep: 21 files, +1225/-170 lines, +23 tests. Six review gates passed (Fabric + Codex). Codebase health hardened before Phase 9.

**Tests at era end:** 194 suites, 2581 passing. 0 tsc errors. 15 ADRs.

### Era 9: API-First Toolkit (April 6)

**The fourth pivot: "One function call. We handle routing."**

ADR-0018 established the principle: API-first for reads, chain-first for writes. Phase 9 delivered 23 items implementing this across the full toolkit surface.

`createToolkit()` facade with 15 domain namespaces: feed, intelligence, scores, agents, actions, oracle, prices, verification, predictions, ballot, webhooks, identity, balance, health, stats. DataSource abstraction (ApiDataSource + ChainDataSource + AutoDataSource) handles routing and fallback transparently. Auto colony sync at session start pulls from API. API drift detection CLI catches spec changes early. Auth fix resolved the www-redirect 405 bug.

- ADR-0018: API-first for reads, chain-first for writes
- `createToolkit()` — single entry point, 15 namespaces, typed returns
- DataSource abstraction: Api / Chain / Auto with fallback
- Auto colony sync: 201K+ posts backfilled via API
- API drift detection CLI tool
- Auth 405 fix (www redirect stripping Authorization header)
- 3 new ADRs (16→18 total)

**Tests at era end:** 211 suites, 2671 passing. 0 tsc errors. 18 ADRs. Schema v8.

### Era 10: Production Hardening + Pattern Adoption (April 7)

**The fifth pivot: "Extract battle-tested patterns into reusable toolkit primitives."**

Comprehensive sweep of all open items from the V3 production audit, followed by Codex security review and legacy session-runner pattern extraction. 12 commits in one session.

**Phase A: Full sweep (8 workstreams, 48 ISC criteria)**
- Doc health: 23 stale file references fixed across 6 docs via `doc-health-check.ts --counts`
- Phase C configurability: 12 hardcoded v3-loop limits extracted to `LoopLimitsConfig` in strategy YAML
- v3-loop refactor: 539→295 lines. SENSE phase extracted to `v3-loop-sense.ts` (231 lines)
- Strategy tuning from score-100 insights: confidence threshold 70%, 5+ agents minimum, cross-domain +10 bonus, no random fallback
- Faucet/balance primitives: `requestFaucet()` + `ensureMinimum()` with chain address safety
- TX simulation gate: `simulateTransaction()` via eth_call, fail-closed by default (ADR-0018 security)
- Codex atomicity fixes: optimistic rate-limit recording with rollback, double-publish guard
- 6 medium audit items: auth token refresh, DB growth monitoring, checkpoint logging, attestation cross-fallback

**Phase B: Codex security review cycle**
- Initial review: NO-GO (3 HIGH — reservation leak on 8 exit paths, pop()-based rollback race, fail-open simulation)
- All 8 findings fixed (3 HIGH, 3 MEDIUM, 2 LOW)
- Re-review: **GO** with line-level evidence per finding
- Post-fix audit: 2 additional findings fixed (dbPath leak, unchecked Promise.allSettled)

**Phase C: Legacy pattern extraction (session-runner.ts → toolkit primitives)**
- 13 patterns extracted from 4528-line legacy session-runner.ts (see `docs/archive/session-runner-patterns.md`)
- Classified: 4 ADOPT, 5 PRESERVE, 4 DEAD (negative knowledge)
- 7 patterns being implemented as toolkit-layer primitives for auto-flow to agent templates:
  - `toolkit/util/subprocess.ts` — SIGTERM→SIGKILL kill escalation
  - `toolkit/util/timed-phase.ts` — budget-aware async wrapper with overage observation
  - `toolkit/sources/prefetch-cascade.ts` — try N source candidates with fallback logging
  - `toolkit/publish/quality-gate.ts` — text length, predicted reactions, category markers
  - `toolkit/util/hook-dispatch.ts` — isolated hook runner with timeout + isTimeout distinction
  - `toolkit/strategy/topic-expansion.ts` — generic→specific topic mapping
  - `toolkit/colony/agent-index.ts` — agent quality index + convergence detection

**Template alignment verified:** 6/10 improvements auto-flow to agent templates via `createToolkit()` / `createAgentRuntime()`. 3 are V3-only by design. 1 (strategy tuning) needs per-template strategy.yaml customization.

- 19 ADRs (ADR-0019: template architectural patterns)
- `docs/archive/session-runner-patterns.md`: legacy wisdom preservation
- Production audit: ALL items closed (was 6 remaining + 2 deferred → 0)

**Tests at era end:** 230 suites, 2996 passing. 0 tsc errors. 19 ADRs. Schema v8.

### Era 11: Learn-First + Agent Compiler (April 8–9)

**The sixth pivot: "Colony is the source, not just the target."**

Phase 16 established the Learn-first design principle — agents read the colony, discover shared reasoning, then contribute what the collective doesn't have yet. Phase 17 delivered the infrastructure and the Agent Compiler.

**Phase 16: Tech debt + template readiness**
- signals.ts removed (-477 lines). lifecycle persistence wired
- Primitives audit: all 32 API methods wrapped, 4 new Learn-first primitives (feedRefs, oracle window, polymarket, per-asset sentiment)
- ADR-0020: strategy-driven observe with 10 evidence categories + DEM economics
- Evidence matrix: 89 types from 32 primitives across 10 categories
- Learn-first design decision: templates embody Share/Index/Learn from supercolony.ai/docs

**Phase 17: Observe infrastructure + Agent Compiler**
- ObservationLog: file-based rolling history with batch flush, 72h retention
- 10 evidence extractors (one per ADR-0020 category) with PrefetchedData support
- Single-fetch observe router: one parallel API batch → extractors + enrichment from same data
- Strategy.yaml `evidence.categories` section (backward-compatible)
- Agent Compiler: intent parser (LLM prompt → AgentIntentConfig), template composer (deterministic generation), validator
- 3 example agents generated: prediction-tracker, engagement-optimizer, research-synthesizer
- Codex review: 6 HIGH + 6 MEDIUM + 4 LOW findings — all fixed

Key architectural achievement: `strategyObserve()` is the single entry point for observe. It prefetches all needed API data once (based on category dependencies), runs extractors with prefetched results (zero duplicate calls), and builds `ApiEnrichmentData` from the same fetch. Templates no longer need separate `enrichedObserve()`.

**Tests at era end:** 258 suites, 3199 passing. 0 tsc errors. 20 ADRs. Schema v9.

### Era 12: Consumer Toolkit + Discovery (April 10)

**The seventh pivot: "Toolkit as infrastructure for autonomous agents."**

Phase 19 delivered pristine documentation (15 domain docs with live response examples), caught 6 type drifts and 2 extractor bugs via documentation-as-testing, built a doc generator, and prepared the `omniweb-toolkit` npm package (renamed from supercolony-toolkit).

**Key discoveries this era:**
1. **KyneSys `supercolony-agent-starter` repo** — 152-line agent.mjs with `observe()` as the only customization point. 44KB SKILL.md + 27KB GUIDE.md (perceive-then-prompt methodology, 7 principles).
2. **`supercolony.ai/llms-full.txt`** — 365-line authoritative API reference designed for LLMs. Plus discovery layer: `openapi.json` (27KB), A2A agent card (v0.2.0, 9 skills), AI plugin manifest, agents manifest.
3. **Product gap** — subagent testing revealed `publish()` and `attest()` not wired through consumer hive API. Not a doc gap — a missing feature.

**Design decisions:**
- Hard gates only: attestation on publish, tip/bet clamping, TX simulation
- NOT enforced: rate limiting (chain unlimited), dedup (agent's choice), strategy engine (agent writes own logic)
- SKILL.md references `llms-full.txt` — layers toolkit value, doesn't duplicate raw API
- Three-file context: `llms-full.txt` → `SKILL.md` → `GUIDE.md`

**Phase 19 deliverables:** 15 domain docs, ecosystem guide, capabilities guide, attestation pipeline doc, verification script (--snapshot, --generate), type drift fixes (6 types), omniweb-toolkit v0.1.0 package, initial SKILL.md, alpha test partial

**Repo cleanup:** -217K lines. Deleted: connectors/, plugins/, profiles/, prompts/, tools/, platform/, Plans/, dist/, .desloppify/ (untracked), 4 root cruft files. Archived: 6 agent configs (sentinel kept), 7 stale phase docs.

**Tests at era end:** 257 suites, 3104 passing. 0 tsc errors. Phase 20 active.

### Era 13: Launch Proof + Public Surface (April 11–18)

**The eighth pivot: "Prove the package from the outside in."**

This era turned the consumer package from a typed wrapper into a product with explicit proof posture. The work was less about adding new API nouns and more about making the install path, the write/readback claims, and the shipped archetype artifacts honest.

- public docs surface and onboarding cleanup landed
- OpenClaw workspace export pipeline and registry-skill export pipeline landed
- publish visibility, read-surface, write-surface, consumer-journey, and launch-proof docs became maintained artifacts instead of one-off session notes
- package validation hardened around `check:package`, `check:evals`, `check:release`, live checks, and export integrity
- repo workflow hardened around Codex review inspection, branch protection, and PR-first merge discipline
- research runtime/readback divergence and canonical-runtime docs clarified which execution world is current

**Net effect:** outside consumers now had a coherent repo-install story, explicit proof limits, and committed exported archetype bundles instead of implicit knowledge spread across chats and stale docs.

### Era 14: Attestation-First Reset + Flat Doctrine (April 19)

**The ninth pivot: "Attestation reliability matters more than prompt cleverness."**

Live leaderboard analysis and the architecture overengineering audit changed the ordering of priorities. The repo stopped treating prompt-contract growth as the main path forward and instead optimized for the thing the top agents were obviously exploiting: one simple source, one real attestation path, one concrete post.

- `omniweb-agents-bgo` reset the runtime around attestation-first behavior
- minimal attestation planning now defaults to one primary source
- publish-path enforcement was tightened so attested publish is the norm rather than an optional pattern
- source catalog breadth expanded with restored and newly added attestable sources
- research-family doctrine and oracle-divergence doctrine moved into flat YAML files
- research metric semantics were mapped into doctrine without reintroducing a large TypeScript contract layer
- old prompt-contract and packet-layering epics were explicitly paused and later marked blocked instead of pretending they were next

**Net effect:** the repo's center of gravity moved from "typed prompt architecture" to "simple attestable loops + flatter doctrine + source quality."

### Era 15: Leaderboard-Pattern Moat (April 20)

**The tenth pivot: "Make every shipped archetype behave like the agents that are actually winning."**

The final wave translated the attestation-first reset into shipped defaults. Instead of merely saying the top agents win with short, attested, one-source posts, the package now encodes that shape in starters, playbooks, proof harnesses, and evals.

- `omniweb-agents-ez4` landed the shared leaderboard-pattern prompt scaffold
- starter source packs were added and then ranked by measured live proof success
- the minimal starter was routed through the shared scaffold and given an attestation-first publish path
- a leaderboard proof harness plus scorecard snapshot/regression gate landed to keep the pattern from drifting
- docs and playbooks were rewritten to lead with the one-source, attest-first path rather than pushing users into the heaviest runtimes first
- market, engagement, and finally research were all aligned to the short-post doctrine in shipped runtime defaults and exported bundles (`#195`, `#196`)

**Net effect:** the moat is now encoded in `main`. Every shipped archetype converges on the same operational thesis: source -> attest -> interpret -> publish, with skip discipline when the evidence is weak.

---

## Recent Timeline

This is the compact merged-work timeline for the latest repo wave, useful when you want the high-signal story without reading hundreds of individual PRs.

| Window | Mainline changes |
|--------|------------------|
| April 18–19 | research runtime hardening, source matching, canonical runtime docs, network-activity family completion, and the attestation-first reset foundation |
| April 19 | `#171`, `#172`, `#174`, `#175`, `#176`, `#177`, `#178` — one-source attestation default, source catalog expansion, flat doctrine extraction, and doctrine mappings |
| April 20 morning | `#179`–`#188` — leaderboard scaffold, starter source packs, proof harness, minimal starter convergence, and playbook/docs simplification |
| April 20 late morning | `#189`–`#196` — attestation-first minimal starter publish path, scorecard snapshot/regression, top-source ranking, and short-post alignment across all archetypes |

The last merged PR in this wave is `#196` (`toolkit: align research with short leaderboard posts`). At that point the ready queue returned to empty and the previously paused prompt-contract / packet-layering epics were left explicitly blocked instead of silently hanging around as fake-next work.

---

## Demos SDK Capability Map

What Demos offers vs what we use. SDK v2.11.5. See [demos-sdk-capabilities.md](research/demos-sdk-capabilities.md) for full module inventory.

| Demos Capability | SDK Module | Our Status | Notes |
|-----------------|------------|------------|-------|
| **Wallet + Transactions** | `websdk` | ✅ Active | PQC (Falcon/ML-DSA), dual signing |
| **SuperColony API** | `websdk` + fetch | ✅ Active | 38/38 endpoints via `SuperColonyApiClient` |
| **DAHR Attestation** | `websdk` (proxy) | ✅ Active | Primary method. +40 scoring points |
| **Colony DB** | Chain + API | ✅ Active | 201K posts, FTS5, semantic search, agent profiles, auto-sync |
| **TLSN Attestation** | `tlsnotary` | ❌ Disabled | MPC-TLS hangs 300s. Zero ecosystem adoption |
| **Cross-Chain Identity** | `abstraction` | ⚠️ RPC-direct | `Identities` class SIGSEGV (NAPI crash). RPC works |
| **ZK Identity** | `encryption/zK` | 🔲 Phase 8+ | Groth16 ZK-SNARKs. Available in SDK |
| **Post-Quantum Crypto** | `websdk` | ✅ Active | `connectWallet({ algorithm: "falcon" })` |
| **Storage Programs** | `storage` | ❌ Blocked | RPC "Unknown message" / "GCREdit mismatch" |
| **XMCore Cross-Chain** | `xmcore` | 🔲 Phase 8+ | EVM, Solana, BTC, TON reads. Available |
| **Escrow** | `websdk` | 🔲 Future | Send DEM to social identity with expiry |
| **Encrypted Messaging** | `instant-messaging` | 🔲 Future | E2E encrypted (ml-kem-aes) |

**Key blocker:** `@kynesyslabs/demosdk/abstraction` barrel SIGSEGV — transitive FHE/PQC/zK native module loading. `Identities` class itself is pure JS. Fix: KyneSys splits barrel or lazy-loads native modules.

---

## Documentation Map

### Active (docs/ root)

| Document | Purpose |
|----------|---------|
| [INDEX.md](INDEX.md) | This file — project history + narrative |
| [ROADMAP.md](ROADMAP.md) | All open work: future phases beyond 9 |
| [architecture-plumbing-vs-strategy.md](architecture-plumbing-vs-strategy.md) | Toolkit vs strategy boundary (ADR-0002) |
| [project-structure.md](project-structure.md) | Full codebase tree |

### Reference (docs/research/)

| Document | Purpose |
|----------|---------|
| [supercolony-api-reference.md](research/supercolony-api-reference.md) | 100% SuperColony API + scoring + consensus + oracle |
| [demos-sdk-capabilities.md](research/demos-sdk-capabilities.md) | Full SDK module inventory from MCP |

### Architecture Decisions (docs/decisions/)

19 ADRs. All with `Status: accepted`. Key: ADR-0001 (chain-first, superseded for reads by ADR-0018), ADR-0002 (toolkit/strategy boundary), ADR-0007 (security-first), ADR-0014 (enforcement layers), ADR-0015 (V3 loop), ADR-0017 (colony DB), ADR-0018 (API-first reads), ADR-0019 (template architectural patterns).

### Archive (docs/archive/)

| Directory | Contents |
|-----------|----------|
| `archive/` | Completed design docs: V3 design, Phase 5/6 plans, loop heuristics, toolkit audit, TLSN report, claim/attestation specs, colony plans, scanning design, session transcript, **session-runner-patterns.md** (legacy extraction) |
| `archive/reference/` | Agent workspace format, attestation reference, ElizaOS comparison, SDK exploration, Skill Dojo research |
| `archive/plans/` | 27 Claude Code session plan artifacts |
| `archive/designs/` | Completed Phase 5.1/5.3 designs (hive-query, backfill) |
| `archive/claude-codex-coop/` | Full Claude-Codex collaboration workflow (Phase 4 + PR1-4, pre-V3) |

### Agent Guides (.ai/guides/)

| Guide | Use When |
|-------|----------|
| `cli-reference.md` | CLI commands, session runner, V3 tools |
| `gotchas-detail.md` | Credentials, scoring, quality gate, TLSN |
| `sdk-interaction-guidelines.md` | SDK calls, transaction pipeline, mock contracts |
| `sdk-rpc-reference.md` | RPC methods, HIVE encoding, chain queries |
| `colony-db-research.md` | Semantic search, sqlite-vec (Phase 5.6) |

---

## External References

| Resource | URL |
|----------|-----|
| **SuperColony LLM Reference** | `supercolony.ai/llms-full.txt` — THE authoritative API reference |
| **OpenAPI Spec** | `supercolony.ai/openapi.json` — canonical type schema |
| **A2A Agent Card** | `supercolony.ai/.well-known/agent.json` — A2A v0.2.0 |
| **Agent Starter** | `github.com/TheSuperColony/supercolony-agent-starter` — north star template |
| SuperColony | `supercolony.ai` |
| Demos SDK Docs | `docs.kynesys.xyz` |
| SDK API Reference | `kynesyslabs.github.io/demosdk-api-ref` |
| KyneSys GitHub | `github.com/kynesyslabs` |
| TheSuperColony GitHub | `github.com/TheSuperColony` |
| This repo | `github.com/mj-deving/omniweb-agents` |
