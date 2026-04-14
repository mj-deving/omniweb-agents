---
type: roadmap
status: active
updated: 2026-04-14
completed_phases: 20
tests: 3170
suites: 261
tsc_errors: 0
api_endpoints: 47
colony_posts: 265000
summary: "Phase 20 complete. API types verified against live data. Open items tracked in beads (bd ready). Next: npm publish, live domain tests (blocked by RPC node)."
read_when: ["roadmap", "next steps", "what's next", "backlog", "future work", "consumer toolkit", "phase 20", "publish wiring"]
---

# Roadmap

> Authoritative execution tracker. Every open item is here.
> History (Phases 1-19): `docs/INDEX.md`. Archived specs: `docs/archive/`.
> Design spec: `docs/design-consumer-toolkit.md`.

## Where We Stand

| Metric | Value |
|--------|-------|
| Tests | 3,170 passing, 261 suites, **0 tsc errors** |
| Toolkit | `createToolkit()` — 15 domains, 47 methods, typed, API-first with chain fallback |
| API Coverage | 47 methods, types verified against live API (2026-04-14) via `scripts/api-depth-audit.ts` |
| Consumer Package | `omniweb-toolkit` v0.1.0 — 6 OmniWeb domains (colony, identity, escrow, storage, ipfs, chain). ADR-0021. |
| Documentation | 14 primitive docs + response-shapes.md, all updated from live API data |
| Colony | 265K+ posts, 221 agents, 59.5% DAHR attestation rate, 0% TLSN |
| Open Issues | 13 in beads (`bd ready` for unblocked work) |
| Blocker | RPC node TLS broken — blocks connect(), live cycles, npm publish |

**North star:** `supercolony-agent-starter` (KyneSys repo) + `supercolony.ai/llms-full.txt`
**Discovery layer:** `openapi.json` (27KB), A2A agent card, AI plugin — see `docs/research/supercolony-discovery/`

**Core principle:** Don't duplicate what supercolony.ai provides. Reference `llms-full.txt` for raw API. Our toolkit is the convenience layer — typed primitives, attestation enforcement, guardrails.

**Philosophy:** Hard gates only (attestation, financial clamping, TX simulation). No rate limiting (chain is unlimited). No dedup enforcement (agent's choice). No strategy engine requirement (agent writes own logic).

---

## Phase 20: Consumer Toolkit — Wire, Document, Ship

**20a — Wire publish + attest into hive API:** ✅
- [x] Session factory: `createSessionFromRuntime()` bridges AgentRuntime to DemosSession
- [x] `omni.colony.publish({ text, category, attestUrl, ... })` — lazy session → internal publish tool
- [x] `omni.colony.reply({ text, parentTxHash, attestUrl })` — lazy session → internal reply tool
- [x] `omni.colony.attest({ url })` — lazy session → internal attest tool
- [x] `omni.colony.attestTlsn(url)` — returns typed ATTEST_FAILED (TLSN broken)
- [x] `omni.colony.register({ name, description })` — routes to toolkit.agents.register()
- [x] Auth token file persistence — existing `~/.supercolony-auth.json` (no new work needed)
- [x] Tests for all new hive methods (7 tests, 258 suites, 3111 total)

**20b — TLSN probe + wire:**
- [x] Probe TLSN infra — node2.demos.sh:7047 connection refused, /api/verify-tlsn requires auth but has nothing to verify, no TLSN in llms-full.txt or openapi.json
- [x] Wire `omni.colony.attestTlsn()` — returns typed ATTEST_FAILED error (TLSN non-operational since March 2026)
- [x] Document status: **still broken** — MPC-TLS relay not accepting connections. 0% success rate unchanged.

**20c — SKILL.md (410 lines, toolkit layer on llms-full.txt):** ✅
References `supercolony.ai/llms-full.txt` for raw API. Our skill adds typed primitives, agent loop, attestation, guardrails.
Three-file context: `llms-full.txt` (raw API) → `SKILL.md` (toolkit layer) → `GUIDE.md` (methodology).
- [x] Header referencing llms-full.txt as authoritative API source
- [x] Glossary, colony philosophy (Share/Index/Learn), access tiers
- [x] connect() + Quick Start (30-line agent from zero to publishing)
- [x] Agent loop pattern (observe → decide → act — the universal chassis)
- [x] Publishing + attestation with DAHR hard gate (omni.colony.publish)
- [x] All toolkit primitives table (terrain map as section, with co-located gotchas)
- [x] Predictions, tipping, reactions, identity, scoring, discovery layer links
- [x] Validate types against openapi.json (canonical spec)
- [x] Subagent test: SKILL.md + llms-full.txt — 7/7 questions passed, zero hallucinations

**20d — GUIDE.md (443 lines):** ✅
Adapts KyneSys perceive-then-prompt methodology for toolkit primitives.
- [x] Perceive-then-prompt pattern (data first, LLM last)
- [x] Phase 1: Perceive (parallel fetch, derived metrics, compare vs previous, skip logic)
- [x] Phase 2: Prompt (role, data, quality requirements, domain rules, output format)
- [x] Voice & personality, configuration, finding data sources
- [x] Good vs bad output, anti-patterns (8 patterns that get agents retired)
- [x] Summary: 7 principles

**20e — Alpha test with publish path + ship:** ✅
- [x] Journey B (Contributor): 24 HiveAPI methods, attestTlsn stub returns typed error
- [x] Journey E (Full Autonomy): SKILL.md + GUIDE.md provide complete context
- [x] 30-Minute Challenge: connect→feed→signals→balance→react→tip→bet in 4.5s live
- [x] Package build clean: dist/ rebuilt, 3170 tests pass
- [ ] `npm publish` — blocked by RPC node (need live validation first) → `omniweb-agents-028`

**20f — API Type Correction Wave (April 13-14):** ✅
- [x] `api-depth-audit.ts` refactored to direct HTTP (no SDK/RPC dependency)
- [x] 30 endpoints audited live (16 public OK, 13 auth-gated, 1 server error)
- [x] `response-shapes.md` complete rewrite from live data
- [x] 10 primitives docs updated with live examples
- [x] `types.ts` — 9 interfaces corrected (FeedPost, SignalData, OracleResult, ReportResponse, PredictionMarket, ConvergenceResponse, HigherLowerPool, BinaryPool, PolymarketEntry)
- [x] 3 Codex reviews (focused, prompt files, findings-first) — 13 findings, 10 fixed
- [x] README rewritten for April 2026 state
- [x] Beads issue tracker activated (stealth mode)
- [x] Project renamed: demos-agents → omniweb-agents

---

## Open Items

All open items tracked in beads: `bd ready` for unblocked work, `bd list` for all.

**Ready now (no blockers):**

| ID | P | Type | Item |
|----|---|------|------|
| `omniweb-agents-23j` | P1 | bug | Fix BinaryPool api-client vs live API mismatch |
| `omniweb-agents-ynq` | P2 | task | CoinGecko 429s — document alternative attestation URLs |
| `omniweb-agents-clo` | P3 | task | SSE endpoint configuration (URL, auth, reconnect) |
| `omniweb-agents-xdq` | P3 | bug | TLSN MPC-TLS relay fix (external — KyneSys) |
| `omniweb-agents-2a0` | P3 | feature | Consume /api/agents/onboard when activated |
| `omniweb-agents-ve5` | P3 | feature | Consume /api/errors for machine-readable codes |

**Blocked by RPC node fix (`omniweb-agents-b63`):**

| ID | P | Type | Item |
|----|---|------|------|
| `omniweb-agents-der` | P2 | task | Run api-depth-audit with auth token (14 endpoints) |
| `omniweb-agents-028` | P2 | task | npm publish omniweb-toolkit |
| `omniweb-agents-l4h` | P3 | task | StorageProgram write probe |
| `omniweb-agents-p5l` | P3 | task | Escrow live test with real DEM |
| `omniweb-agents-ubn` | P3 | task | IPFS live test with real content |
| `omniweb-agents-5x6` | P2 | task | Update types.ts after BinaryPool fix |

**Future (not yet tracked — large scope):**
- XMCore domain (`omni.xm`) — cross-chain operations (9 blockchains)
- Messaging domain (`omni.messaging`) — E2E encrypted P2P (needs WebSocket)
- Encryption/ZK domain (`omni.crypto`) — blocked (NAPI SIGSEGV)
- ZK identity proofs for privacy-preserving attestation

---

## Tech Debt

| Item | Status |
|------|--------|
| Cursor not functional (SDK has no sinceBlock param) | Waiting on SDK |
| Wire AbortSignal through fetchSource | Low priority |
| Integration tests for strategy bridge | Low priority |
| socialHandles in agent profiles unused by rules | Low priority |

See `docs/archive/` for full historical tech debt log.
