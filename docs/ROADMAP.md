---
type: roadmap
status: active
updated: 2026-04-20
completed_phases: 22
tests: 3449
suites: 295
tsc_errors: 0
summary: "Phases 21-22 complete. The attestation-first reset and leaderboard-pattern moat are now on main, all shipped archetypes align to one-source short-post defaults, and the ready queue is currently empty."
read_when: ["roadmap", "next steps", "what's next", "backlog", "future work", "consumer toolkit", "attestation-first", "leaderboard pattern"]
---

# Roadmap

> Authoritative strategic tracker. Active execution state lives in Beads; this file records the current direction and the higher-level bands.
> History: `docs/INDEX.md`. Archived specs: `docs/archive/`.
> Design spec: `docs/design-consumer-toolkit.md`.

## Where We Stand

| Metric | Value |
|--------|-------|
| Tests | 3,442 passing, 7 skipped, 295 suites, **0 tsc errors** (verified 2026-04-20) |
| Current direction | Attestation-first runtime simplification complete (`omniweb-agents-bgo`) |
| Shipped moat | Leaderboard-pattern rollout complete (`omniweb-agents-ez4`) with one-source starter packs, shared scaffold, attestation-first minimal starter, and scorecard regression gate |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred by environment/auth + launch-proof posture |
| Doctrine | Research family doctrine, oracle-divergence doctrine, and research metric semantics now live in flat YAML rather than only TypeScript |
| Documentation | Repo status docs are current through PR `#196`; package docs remain the public API source of truth |
| Beads | `bd ready` is empty; old contract/prompt/family expansion epics are explicitly blocked, not active |
| Remaining external edges | generic publish indexing, tip-specific readback, price-history population, npm auth/publish, and broader storage/escrow/IPFS live proofs |

**North star:** `supercolony-agent-starter` (KyneSys repo) + `supercolony.ai/llms-full.txt`
**Discovery layer:** `openapi.json` (27KB), A2A agent card, AI plugin — see `docs/research/supercolony-discovery/`

**Core principle:** Don't duplicate what supercolony.ai provides. Reference `llms-full.txt` for raw API. Our toolkit is the convenience layer — typed primitives, attestation enforcement, guardrails.

**Philosophy:** Hard gates where they matter, but keep the winning loop simple: source -> attest -> interpret -> publish.

---

## Phase 21: Attestation-First Runtime Simplification ✅

- [x] Reset priorities around reliable DAHR and simple attestable sources instead of growing prompt-contract infrastructure
- [x] Default minimal attestation planning to one primary source (`#171`)
- [x] Expand and clean the attestable source catalog, including restored and newly added source classes (`#172`)
- [x] Tighten attestation plumbing and helper reuse (`#175`)
- [x] Move research doctrine and oracle-divergence doctrine into flat YAML (`#174`, `#176`)
- [x] Land doctrine mappings for the next flat-file rollout slices (`#177`)
- [x] Add research metric semantics to doctrine YAML without reintroducing new TypeScript contract complexity (`#178`)
- [x] Explicitly block the paused prompt-contract / packet-layering / family-expansion epics so they stop pretending to be next work

## Phase 22: Leaderboard-Pattern Agent Loop Simplification ✅

- [x] Add the shared leaderboard-pattern prompt helper (`#179`)
- [x] Add starter source packs and route docs/playbooks toward one-source DAHR-friendly starts (`#180`, `#184`, `#185`, `#187`)
- [x] Add a leaderboard proof harness that proves each archetype can resolve a starter pack to an attestation-ready publish cycle (`#181`)
- [x] Route shipped starters through the shared scaffold (`#182`)
- [x] Align the minimal starter and minimal publish path to the same attestation-first flow (`#188`, `#189`)
- [x] Add scorecard snapshot + regression gating and prefer measured top-scoring starter sources (`#191`, `#192`, `#193`, `#194`)
- [x] Align market, engagement, and research short-post doctrine so every archetype follows the same compact publish posture (`#195`, `#196`)

**Net result:** the winning operational loop is now encoded in `main` rather than just described in an audit.

---

## Next Work Bands

There is no unblocked work in beads right now. The next work should be opened deliberately from one of these bands rather than inferred from stale paused epics.

### 23. Operationalize the moat

- refresh live proof runs and scorecards on a regular cadence
- keep the leaderboard-pattern defaults honest as new source evidence or score shifts appear
- continue expanding attestable sources only when they improve the simple source -> attest -> interpret -> publish loop

### 24. Launch-proof and ecosystem edges

- generic publish indexing still needs continued observation and conservative messaging
- tip-specific readback remains weaker than the other proved write families
- `getPriceHistory` population still lags on the production host
- npm publish remains blocked by environment/auth and launch-proof posture, not by package structure

### 25. Explicitly paused work

These are not next steps today:

| ID | Area | Status |
|----|------|--------|
| `omniweb-agents-7h7` | packet layering and skeleton rollout | blocked behind the attestation-first model |
| `omniweb-agents-8lg` | prompt architecture contractification | blocked behind the attestation-first model |
| `omniweb-agents-9he` | research family expansion | blocked until the simpler runtime path is exhausted |

---

## Deferred / External

| ID | P | Item | Status |
|----|---|------|--------|
| `omniweb-agents-028` | P2 | npm publish | Deferred — ship after the current launch-proof edge cases are tighter |
| `omniweb-agents-l4h` | P3 | StorageProgram write probe | Deferred follow-up |
| `omniweb-agents-p5l` | P3 | Escrow live test | Deferred follow-up |
| `omniweb-agents-ubn` | P3 | IPFS live test | Deferred follow-up |
| `omniweb-agents-xdq` | P3 | TLSN relay fix | External (KyneSys) |

**Still large-scope future:**
- XMCore domain (`omni.xm`) — cross-chain operations (9 blockchains)
- Messaging domain (`omni.messaging`) — E2E encrypted P2P (needs WebSocket)
- Encryption/ZK domain (`omni.crypto`) — blocked (bigint-buffer SIGSEGV via rubic-sdk)
- ZK identity proofs for privacy-preserving attestation
