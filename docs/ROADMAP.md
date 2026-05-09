---
type: roadmap
status: active
updated: 2026-05-09
completed_phases: 22
tests: 3442
suites: 295
tsc_errors: 0
summary: "The current architecture checkpoint is PR #360 plus the 5xp4 PR ladder: broad substrate exists, boundary blur is the main problem, the preferred pivot is playbook-owned policy over a shared resolver/executor seam, and the next code PR remains the no-behavior-change `5xp4.9` PolicyActionRequest seam."
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
- if only doctrine/working-style changed, update `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md` without forcing roadmap edits

## Where We Stand

| Metric | Value |
|--------|-------|
| Tests | 3,442 passing, 7 skipped, 295 suites, **0 tsc errors** (latest full-repo baseline recorded 2026-04-20; rerun before making fresh launch-grade claims) |
| Current direction | Checkpointed playbook-policy pivot on top of the substrate-first rebuild: truthful front door, strong capability/readiness + write-ceremony substrate, thin intent seam, and an explicit plan to move strategy upward without pretending it already landed |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the front-door honesty cleanup plus the first real non-publish action-family proof (`react`) through the shared intent seam |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred by environment/auth + launch-proof posture |
| Doctrine | Current shipped truth is still read-first / no-spend by default / runtime-owned action selection; the planned pivot is playbook-owned policy above a shared resolver/executor seam, checkpointed in PR #360 but not yet implemented |
| Documentation | Colony-operator remains the honest default front door for now, but it should be understood as a skill-layer entry path over substrate primitives rather than the architectural center of gravity |
| Beads | PR #360 is the planning checkpoint; the canonical execution ladder is `5xp4.9 -> 5xp4.10 -> 5xp4.11 -> 5xp4.12 -> 5xp4.13 -> 5xp4.14 -> 5xp4.15`; `5xp4.9` / `5xp4.9.1` are ready, no gate currently blocks the ladder, and `5xp4.9` remains the next code PR |
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

## Current Architecture Checkpoint

`main` is now anchored by the planning checkpoint captured in PR #360 and the Beads ladder under `omniweb-agents-5xp4`.

This checkpoint locks in the following truths:

- `omniweb-toolkit` already has a broad substrate.
- **Boundary blur** is the main problem, not missing primitives.
- The preferred pivot is **playbook-owned policy over a shared resolver/executor seam**.
- Current shipped behavior is still read-first / no-spend by default / runtime-owned action selection.
- The pivot is checkpointed in docs and Beads before implementation so later work does not drift into older premises.

Canonical source artifacts for this checkpoint:
- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- PR #360 — https://github.com/mj-deving/omniweb-agents/pull/360

## Next Work Ladder

The next work is not a vague band anymore; it is an explicit PR-sized Beads ladder. Do not skip steps.

1. `omniweb-agents-5xp4.9` — introduce a playbook-facing `PolicyActionRequest` seam without behavior change
2. `omniweb-agents-5xp4.10` — thin `minimal-agent.ts` into orchestration-only glue
3. `omniweb-agents-5xp4.11` — add an explicit TypeScript-first policy layer and move colony-operator starter into that mode
4. `omniweb-agents-5xp4.12` — unify publish/reply/react under one executor + result envelope
5. `omniweb-agents-5xp4.13` — bring tip into the shared seam honestly
6. `omniweb-agents-5xp4.14` — bring market/bet writes into the same seam
7. `omniweb-agents-5xp4.15` — realign docs, proof surfaces, and bundle story around the landed architecture

Important nuance:
- `5xp4.8` still matters as a maintained proof checkpoint, but it is **not** the next implementation PR in this ladder.
- PR #360 is the committed checkpoint for planning state, not PR1 of implementation.

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
