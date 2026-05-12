---
type: roadmap
status: active
updated: 2026-05-12
completed_phases: 22
tests: 3442
suites: 295
tsc_errors: 0
summary: "The shared request/resolution/execution seam is landed through `5xp4.15`; the current live-ops lane has moved from balance-divergence truth to a narrower node3 DAHR/Web2 proxy-start blocker after PR #378."
read_when: ["roadmap", "next steps", "what's next", "backlog", "future work", "consumer toolkit", "attestation-first", "leaderboard pattern", "colony-operator", "action-intent"]
---

# Roadmap

> Authoritative strategic tracker. Active execution state lives in Beads; this file records the current direction and the higher-level bands.
> Strategic re-entry mirror: `packages/omniweb-toolkit/agents/openclaw/colony-operator/MEMORY.md` + `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md`.
> History: `docs/INDEX.md`. Archived specs: `docs/archive/`.
> Design spec: `docs/design-consumer-toolkit.md`.

## Strategic truth sync policy

Use this split on purpose:
- **Beads/GitHub** = execution truth
- **`docs/ROADMAP.md`** = canonical repo-facing strategic roadmap
- **`packages/omniweb-toolkit/agents/openclaw/colony-operator/MEMORY.md` + `.../memory/CURRENT_DOCTRINE.md`** = local re-entry mirror for this architecture lane

Anti-drift rule:
- when the **current architecture band**, **strategic sequence**, or **explicit next / not-next priorities** change, update `docs/ROADMAP.md` and the project-memory mirror in the **same work slice**
- for the current playbook-policy checkpoint, also keep PR #360 and the three 2026-05-08 reference docs as the exact status-quo anchor
- for current package architecture planning in the seam-thinning band, treat `packages/omniweb-toolkit/references/current-toolkit-architecture-map-annotated.md` as the live architecture anchor and keep planning aligned to it
- if the shared project direction changed materially, refresh the Beads shared memory key `omniweb-agents-colony-operator-strategic-truth` too
- if only execution state changed (active bead, PR, wait, merge), update Beads/GitHub without forcing roadmap/memory edits
- if the explicit immediate blocker for the current live-ops lane changes materially, refresh the local re-entry mirror and this roadmap together so fresh sessions do not retry the wrong failure mode
- if only doctrine/working-style changed, update `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md` without forcing roadmap edits

## Where We Stand

| Metric | Value |
|--------|-------|
| Tests | 3,442 passing, 7 skipped, 295 suites, **0 tsc errors** (latest full-repo baseline recorded 2026-04-20; rerun before making fresh launch-grade claims) |
| Current direction | Landed playbook-policy architecture on top of the substrate-first rebuild: strategy now lives above a shared intent seam, while capability/readiness/execution/verification truth stays in the substrate/runtime |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the shared request/resolution/execution seam across social, tip, and market action families plus the front-door/docs/proofs realignment that makes that seam the honest default story |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred by environment/auth + launch-proof posture |
| Doctrine | Current shipped truth is read-first / no-spend by default on the maintained proof path, **playbook-owned strategy above the seam**, an explicit intent layer for normalized routing, and substrate/runtime ownership of capability truth, readiness, execution, and verification |
| Documentation | Colony-operator remains the honest default front door, and README/reference/proof surfaces now describe the landed seam honestly instead of talking like the pivot is still ahead |
| Beads | PR #360 is the planning checkpoint, PR #371 is the market-write merge checkpoint, and PR #372 closes `5xp4.15`; the canonical ladder `5xp4.9 -> 5xp4.10 -> 5xp4.11 -> 5xp4.12 -> 5xp4.13 -> 5xp4.14 -> 5xp4.15` is now landed |
| Remaining external edges | intent-boundary contract cleanup, generic action-intent coverage beyond react/publish/reply, capability-truth surfacing polish, generic publish indexing, tip-specific readback, npm auth/publish, and broader storage/escrow/IPFS live proofs |

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

## Current Architecture Checkpoint

`main` is now anchored by the planning checkpoint captured in PR #360, the market-write merge checkpoint in PR #371, and the Beads ladder under `omniweb-agents-5xp4`.

This checkpoint locks in the following truths:

- `omniweb-toolkit` already has a broad substrate.
- **Boundary blur** is the main problem, not missing primitives.
- The preferred pivot was **playbook-owned policy over a shared request/resolution/execution seam**.
- Current shipped behavior is now read-first / no-spend by default on the maintained proof path, with an explicit policy layer above the seam and substrate/runtime-owned execution truth below it.
- The planning checkpoint prevented drift; the implementation ladder has now landed through `5xp4.15`, including the docs/proofs/bundle realignment closeout in PR #372.

Canonical source artifacts for this checkpoint:
- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- PR #360 — https://github.com/mj-deving/omniweb-agents/pull/360
- PR #371 — https://github.com/mj-deving/omniweb-agents/pull/371
- PR #372 — https://github.com/mj-deving/omniweb-agents/pull/372

## Next Work Ladder

The next work is not a vague band anymore; it is an explicit PR-sized Beads ladder. That ladder is now landed through the docs/proofs closeout.

1. `omniweb-agents-5xp4.9` — introduce a playbook-facing `PolicyActionRequest` seam without behavior change ✅
2. `omniweb-agents-5xp4.10` — thin `minimal-agent.ts` into orchestration-only glue ✅
3. `omniweb-agents-5xp4.11` — add an explicit TypeScript-first policy layer and move colony-operator starter into that mode ✅
4. `omniweb-agents-5xp4.12` — unify publish/reply/react under one executor + result envelope ✅
5. `omniweb-agents-5xp4.13` — bring tip into the shared seam honestly ✅
6. `omniweb-agents-5xp4.14` — bring market/bet writes into the same seam ✅
7. `omniweb-agents-5xp4.15` — realign docs, proof surfaces, and bundle story around the landed architecture ✅ (closed by PR #372)

Important nuance:
- `5xp4.8` still matters as a maintained supervised-publish proof checkpoint, but it is **parallel** to this closeout lane rather than the next architecture slice.
- PR #360 is the committed checkpoint for planning state, not PR1 of implementation.

## Current frozen-seam colony live-ops band

- `0z87` and `5xp4.8` are closed proof checkpoints, not the active blocker anymore.
- `uw66.14` is merged as PR #378 and successfully encoded node/API balance-divergence truth.
- PR #379 (`uw66.15`) and PR #380 (`uw66.16`) narrowed the old balance-divergence story, but the blocker is now broader than just node3: direct auth challenge calls to `supercolony.ai` are returning `500`, while node hosts do not expose that auth path at all (`404`).
- Fresh true per-node spend-path probes split the remaining route truth: `node2` currently reports raw chain balance `0` and fails attestation with insufficient balance, while `node3` and `demosnode.discus.sh` still fail with `dahr.startProxy() timed out after 30000ms`.
- The active bounded slice is therefore `uw66.18`, which records the combined auth-API plus cross-node spend-path blocker truth and keeps `uw66.1` blocked for the right reason.

## Explicitly not next

These are not next steps today:

| ID | Area | Status |
|----|------|--------|
| `omniweb-agents-7h7` | packet layering and skeleton rollout | blocked behind the attestation-first model and the newer playbook-policy / seam ladder |
| `omniweb-agents-8lg` | prompt architecture contractification | blocked behind the attestation-first model and the newer playbook-policy / seam ladder |
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
