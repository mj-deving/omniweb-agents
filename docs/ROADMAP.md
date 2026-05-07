---
type: roadmap
status: active
updated: 2026-05-06
completed_phases: 22
tests: 3442
suites: 295
tsc_errors: 0
summary: "Phases 21-22 remain complete, but current `main` has moved into a newer runtime-owned operator band: colony-operator honesty, starter thinning, the generic action-intent seam, and first non-publish action-family proof. The ready queue remains intentionally empty until the next proof band is chosen deliberately."
read_when: ["roadmap", "next steps", "what's next", "backlog", "future work", "consumer toolkit", "attestation-first", "leaderboard pattern", "colony-operator", "action-intent"]
---

# Roadmap

> Authoritative strategic tracker. Active execution state lives in Beads; this file records the current direction and the higher-level bands.
> Strategic mirror: `memory/projects/omniweb-agents-colony-operator-rebuild.md`.
> History: `docs/INDEX.md`. Archived specs: `docs/archive/`.
> Design spec: `docs/design-consumer-toolkit.md`.

## Strategic truth sync policy

Use this split on purpose:
- **Beads/GitHub** = execution truth
- **`docs/ROADMAP.md`** = canonical repo-facing strategic roadmap
- **`memory/projects/omniweb-agents-colony-operator-rebuild.md`** = local memory-side strategic mirror for re-entry

Anti-drift rule:
- when the **current architecture band**, **strategic sequence**, or **explicit next / not-next priorities** change, update `docs/ROADMAP.md` and the project-memory mirror in the **same work slice**
- if the shared project direction changed materially, refresh the Beads shared memory key `omniweb-agents-colony-operator-strategic-truth` too
- if only execution state changed (active bead, PR, wait, merge), update Beads/GitHub without forcing roadmap/memory edits
- if only doctrine/working-style changed, update `memory/CURRENT_DOCTRINE.md` without forcing roadmap edits

## Where We Stand

| Metric | Value |
|--------|-------|
| Tests | 3,442 passing, 7 skipped, 295 suites, **0 tsc errors** (latest full-repo baseline recorded 2026-04-20; rerun before making fresh launch-grade claims) |
| Current direction | Runtime-owned colony-operator rebuild on top of the attestation-first simplification baseline: truthful front door, thinner starters, substrate-first package boundaries, and the generic action-intent seam |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the first runtime-owned operator cleanup band: colony-operator baseline tightening, starter thinning, and first non-publish action-family proof (`react`) |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred by environment/auth + launch-proof posture |
| Doctrine | The governing split is now explicit: substrate owns capability truth, starters own sensible defaults, playbooks own stronger strategy, and runtime owns non-deterministic judgment |
| Documentation | Colony-operator is now the honest default front door; legacy specialist surfaces remain reference/compatibility material rather than the center of gravity |
| Beads | `bd ready` is empty by design; stale legacy beads were deferred, and the next proof band should be opened deliberately from current architecture truth rather than old publish/research sludge |
| Remaining external edges | operator-core proof definition, generic action-intent coverage beyond react/publish, capability-truth surfacing cleanup, generic publish indexing, tip-specific readback, price-history population, npm auth/publish, and broader storage/escrow/IPFS live proofs |

**North star:** a substrate-complete OmniWeb package plus replaceable skills/playbooks above it; reference `supercolony-agent-starter` (KyneSys repo) + `supercolony.ai/llms-full.txt`
**Discovery layer:** `openapi.json` (27KB), A2A agent card, AI plugin — see `docs/research/supercolony-discovery/`

**Core principle:** Don't duplicate what supercolony.ai provides. Reference `llms-full.txt` for raw API. `omniweb-toolkit` should be the shared substrate — typed primitives, auth handling, attestation enforcement, guardrails, spend safety, and capability truth — while skills stay above it as consumer-facing playbooks.

**Philosophy:** Hard gates where they matter, but keep the winning loop simple: source -> attest -> interpret -> publish.

**Architectural rule:** the substrate owns the hard parts of real operation; the skill owns instructions, best practices, and thin scaffolding. If an agent has to manually reason about auth ceremony, credential lifecycle, or spend-safety plumbing in prompt-space, the boundary is wrong.

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

## Current Architecture Band (post-Phases 21-22)

`main` has moved beyond pure attestation-first simplification into a newer operator-core rebuild band.

This band has already landed the following truths:

- colony-operator is the honest default/front-door operator path
- starter/runtime surfaces were thinned so the default path is easier to reason about
- the generic action-intent seam now exists in the minimal runtime
- `react` is the first non-publish action family proved through that seam
- cold-consumer testing and follow-up doc cleanup were used to force the front door back into truthful shape

The current architectural sequence is:
1. keep one real core-action lane active at a time
2. expand the generic action-intent seam through narrow real proof slices
3. keep runtime-owned judgment primary and avoid slipping back into role-script fakery
4. broaden into more action families or specialist overlays only after the operator core is honest and proved

## Next Work Bands

There is no unblocked work in beads right now. The next work should be opened deliberately from one of these bands rather than inferred from stale paused epics.

### 23. Operator-core end-to-end proof

Primary next band.

Current execution epic: `omniweb-agents-ylzx`

- define the smallest honest acceptance criteria for the general-purpose colony-operator MVP floor
- audit the current action-intent families and identify which paths are real, partial, or still fake/implicit
- tighten capability-truth surfacing so the runtime can clearly tell what it can do, what it cannot do, and what still requires guarded/manual ceremony
- land one narrow next proof slice at a time rather than reopening broad family expansion

### 24. Launch-proof and external truth

Only after the operator-core proof band is tighter.

- keep external/front-door docs aligned to actual shipped behavior
- generic publish indexing still needs continued observation and conservative messaging
- tip-specific readback remains weaker than the other proved write families
- `getPriceHistory` population still lags on the production host
- npm publish remains blocked by environment/auth and launch-proof posture, not by package structure

### 25. Later expansion and overlays

Only after the core proof band earns it.

- broaden into additional action families beyond the currently proved slices
- revisit specialist/operator overlays as optional strategy surfaces rather than the default entry path
- expand research/family playbooks only where they improve a runtime-owned operator instead of replacing it

### 26. Explicitly paused work

These are not next steps today:

| ID | Area | Status |
|----|------|--------|
| `omniweb-agents-7h7` | packet layering and skeleton rollout | blocked behind the attestation-first model and newer operator-core proof band |
| `omniweb-agents-8lg` | prompt architecture contractification | blocked behind the attestation-first model and newer operator-core proof band |
| `omniweb-agents-9he` | research family expansion | blocked until the runtime-owned operator core is better proved |
| legacy specialist-front-door churn | extra archetype polishing | blocked unless it directly improves the honest colony-operator default path |

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
