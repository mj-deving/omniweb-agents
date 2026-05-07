---
type: roadmap
status: active
updated: 2026-05-06
completed_phases: 22
tests: 3442
suites: 295
tsc_errors: 0
summary: "Phases 21-22 remain complete, but current `main` now points toward a substrate-first band: strong capability/readiness + write-ceremony substrate, a thin intent boundary, and lightweight skill-layer experimentation above it. The ready queue remains intentionally empty until the next proof band is chosen deliberately."
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
- for current package architecture planning in the seam-thinning band, treat `packages/omniweb-toolkit/references/current-toolkit-architecture-map-annotated.md` as the live architecture anchor and keep planning aligned to it
- if the shared project direction changed materially, refresh the Beads shared memory key `omniweb-agents-colony-operator-strategic-truth` too
- if only execution state changed (active bead, PR, wait, merge), update Beads/GitHub without forcing roadmap/memory edits
- if only doctrine/working-style changed, update `memory/CURRENT_DOCTRINE.md` without forcing roadmap edits

## Where We Stand

| Metric | Value |
|--------|-------|
| Tests | 3,442 passing, 7 skipped, 295 suites, **0 tsc errors** (latest full-repo baseline recorded 2026-04-20; rerun before making fresh launch-grade claims) |
| Current direction | Substrate-first rebuild on top of the attestation-first simplification baseline: truthful front door, thinner starters, strong capability/readiness + write-ceremony substrate, and a thin generic action-intent seam |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the front-door honesty cleanup plus the first real non-publish action-family proof (`react`) through the shared intent seam |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred by environment/auth + launch-proof posture |
| Doctrine | The governing split is now explicit: substrate owns capability truth, auth/readiness, guardrails, write ceremony, verification, and intent execution; skills own strategy and experimentation above that seam |
| Documentation | Colony-operator remains the honest default front door for now, but it should be understood as a skill-layer entry path over substrate primitives rather than the architectural center of gravity |
| Beads | `bd ready` is empty by design; stale legacy beads were deferred, and the next proof band should be opened deliberately from current substrate/intent truth rather than old publish/research sludge |
| Remaining external edges | intent-boundary contract cleanup, generic action-intent coverage beyond react/publish/reply, capability-truth surfacing polish, generic publish indexing, tip-specific readback, price-history population, npm auth/publish, and broader storage/escrow/IPFS live proofs |

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

`main` has moved beyond pure attestation-first simplification into a substrate-first rebuild band.

This band has already landed the following truths:

- colony-operator is the honest current front door, but not the architectural center of gravity
- starter/runtime surfaces were thinned so the default path is easier to reason about
- the generic action-intent seam now exists in the minimal runtime
- `react` is the first non-publish action family proved through that seam
- cold-consumer testing and follow-up doc cleanup were used to force the front door back into truthful shape

The current architectural sequence is:
1. strengthen the substrate until capability truth and tricky ceremony live below the seam
2. keep the intent boundary thin, explicit, and honest about blocked/supervised/unsupported states
3. keep skill-layer strategy lightweight and swappable instead of baking more decision doctrine into runtime code
4. broaden into more action families or specialist overlays only after the substrate + intent seam are honest and proved

## Next Work Bands

The next work is now explicitly opened in Beads under epic `omniweb-agents-5xp4`. Keep additions inside these bands rather than drifting back to stale paused epics.

### 23. Substrate + intent-boundary proof

Primary next band.

This band should replace the looser "operator-core" framing as the next execution center.

Current architecture-planning anchor for this band:
- `packages/omniweb-toolkit/references/current-toolkit-architecture-map-annotated.md`

- define the smallest honest substrate contract: capability truth, readiness, auth/write ceremony, verification, and execution-result shape
- audit the current action-intent families and identify which paths are real, partial, unsupported, or still architecturally named only
- tighten the intent boundary so blocked / supervised / unsupported states are first-class substrate outputs rather than prompt-space guesswork
- land one narrow next proof slice at a time rather than reopening broad family expansion or thick runtime doctrine

### 24. Launch-proof and external truth

Only after the substrate + intent-boundary proof band is tighter.

- keep external/front-door docs aligned to actual shipped behavior
- generic publish indexing still needs continued observation and conservative messaging
- tip-specific readback remains weaker than the other proved write families
- `getPriceHistory` population still lags on the production host
- npm publish remains blocked by environment/auth and launch-proof posture, not by package structure

### 25. Later expansion and overlays

Only after the substrate/intent proof band earns it.

- broaden into additional action families beyond the currently proved slices
- revisit specialist/operator overlays as optional strategy surfaces rather than the default entry path
- expand research/family playbooks only where they improve a runtime-owned operator instead of replacing it

### 26. Explicitly paused work

These are not next steps today:

| ID | Area | Status |
|----|------|--------|
| `omniweb-agents-7h7` | packet layering and skeleton rollout | blocked behind the attestation-first model and newer operator-core proof band |
| `omniweb-agents-8lg` | prompt architecture contractification | blocked behind the attestation-first model and newer substrate/intent proof band |
| `omniweb-agents-9he` | research family expansion | blocked until the substrate + intent seam is better proved |
| legacy specialist-front-door churn | extra archetype polishing | blocked unless it directly improves the honest default path over the substrate seam |

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
