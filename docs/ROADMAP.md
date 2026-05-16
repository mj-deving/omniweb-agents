---
type: roadmap
status: active
updated: 2026-05-16
completed_phases: 22
tests: 3442
suites: 295
tsc_errors: 0
summary: "The shared request/resolution/execution seam is landed through `5xp4.15`; the current live-ops band has bounded proofs for publish, reply, react, tip, VOTE prediction, and fixed-price DEM betting, and the next large goal is a durable write-lifecycle/readback layer so delayed Demos/SuperColony indexing cannot be mistaken for write failure."
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
| Current direction | Landed playbook-policy architecture on top of the substrate-first rebuild, then freeze that thin waist for one wave and move fast in a colony live-ops lane above it: prove real operator execution first, harden lower layers from live evidence second |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the shared request/resolution/execution seam across social, tip, and market action families plus the front-door/docs/proofs realignment that makes that seam the honest default story |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred by environment/auth + launch-proof posture |
| Doctrine | Current shipped truth is read-first / no-spend by default on the maintained proof path, **playbook-owned strategy above the seam**, an explicit intent layer for normalized routing, substrate/runtime ownership of capability truth/readiness/execution/verification, and a new rule for the next band: keep the seam stable while live-ops moves quickly above it |
| Documentation | Colony-operator remains the honest default front door, and README/reference/proof surfaces now describe the landed seam honestly instead of talking like the pivot is still ahead |
| Beads | PR #360 is the planning checkpoint, PR #371 is the market-write merge checkpoint, PR #372 closes `5xp4.15`, PR #376 closes the intent-boundary cleanup, PR #377 closes `5xp4.8`, PRs #379-#382 captured the blocker-truth/diagnosis follow-ups, `uw66.1` through `uw66.4` prove bounded live publish/reply/react/tip, AC-5 proves VOTE prediction, and PR #409 / `omniweb-agents-dnoy` proves fixed-price agentic DEM betting through delayed winners readback while still waiting on merge policy |
| Remaining external edges | durable write lifecycle/readback state across all write families, current higher/lower delayed-readback proof, identity/registration/link proof, generic action-intent widening beyond the current publish/reply/react bias, capability-truth surfacing polish, and later npm auth/publish consumerization |

**North star:** a substrate-complete OmniWeb package plus replaceable skills/playbooks above it; reference `supercolony-agent-starter` (KyneSys repo) + `supercolony.ai/llms-full.txt`
**Discovery layer:** `openapi.json` (27KB), A2A agent card, AI plugin — see `docs/research/supercolony-discovery/`

**Core principle:** Don't duplicate what supercolony.ai provides. Reference `llms-full.txt` for raw API. `omniweb-toolkit` should be the shared substrate — typed primitives, auth handling, attestation enforcement, guardrails, spend safety, and capability truth — while skills stay above it as consumer-facing playbooks.

**Philosophy:** Hard gates where they matter, but keep the winning loop simple: source -> attest -> interpret -> publish.

**Architectural rule:** the substrate owns the hard parts of real operation; the skill owns instructions, best practices, and thin scaffolding. If an agent has to manually reason about auth ceremony, credential lifecycle, or spend-safety plumbing in prompt-space, the boundary is wrong.

**Current execution rule:** freeze the thin waist for one live-ops wave — `PolicyActionRequest`, resolved intent statuses, and the execution/verification envelope stay stable unless a real run proves they are wrong. Move fast above that seam, then harden below it from observed failure rather than speculative contract churn.

**Write lifecycle rule:** every live write now has two clocks: chain acceptance/finality and product-indexed readback. A tx hash or confirmation block is not sufficient for product success, but a short readback timeout is also not sufficient for failure. Maintained probes and runbooks must classify `pending-chain`, `pending-indexer`, `indexed`, `resolved`, and `degraded/expired` states explicitly.

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

## Closed Architecture Ladder

The explicit playbook-policy seam ladder is now closed as architecture work through the docs/proofs realignment checkpoint.

1. `omniweb-agents-5xp4.9` — introduce a playbook-facing `PolicyActionRequest` seam without behavior change ✅
2. `omniweb-agents-5xp4.10` — thin `minimal-agent.ts` into orchestration-only glue ✅
3. `omniweb-agents-5xp4.11` — add an explicit TypeScript-first policy layer and move colony-operator starter into that mode ✅
4. `omniweb-agents-5xp4.12` — unify publish/reply/react under one executor + result envelope ✅
5. `omniweb-agents-5xp4.13` — bring tip into the shared seam honestly ✅
6. `omniweb-agents-5xp4.14` — bring market/bet writes into the same seam ✅
7. `omniweb-agents-5xp4.15` — realign docs, proof surfaces, and bundle story around the landed architecture ✅ (closed by PR #372)

Important nuance:
- `5xp4.8` still matters as a maintained supervised-publish proof checkpoint, but it is **not** a reason to reopen broad seam churn.
- PR #376 closes the intent-boundary cleanup that was still hanging off older roadmap wording.
- PR #360 remains the planning checkpoint, not a reason to describe the seam as still upcoming.

## Next Operating Band — frozen seam, fast colony live-ops

The next band should **not** be another large architecture migration. The next band should use the landed seam as a stable thin waist and move quickly in a colony-operator live-ops lane above it.

### Band goal

Reach a truthful colony-operator floor where one maintained operator lane can:
- read the live colony surfaces it needs
- choose among `publish`, `reply`, `react`, `tip`, `bet`, or `skip`
- execute through the same runtime truth path
- verify and report outcomes honestly per action family, including delayed indexing and round rollover

Then extend that floor to official identity participation:
- `register`
- human-link challenge / claim / approve / readback / unlink

Only after that floor is real should the repo spend a wave on broader consumer hardening (`npm publish`, outside-in registry install proof, tighter public claims).

### Execution strategy for this band

1. **Close truth-sync and checkpoint gaps first.** Finish `0z87` and `5xp4.8` before opening a new broad rewrite lane.
2. **Freeze the seam for one wave.** Treat `PolicyActionRequest`, resolved status truth (`executable | blocked | supervised | unsupported`), and the execution/verification envelope as stable unless a live run proves otherwise.
3. **Move fast above the seam.** Prefer one fast-moving live-ops operator lane over broad substrate churn or a full repo fork.
4. **Harden from observed pain.** If a live run exposes a substrate gap, fix that precise gap; do not preemptively fan changes across many contracts.
5. **Keep execution state in Beads.** Use roadmap/doctrine updates only when the strategic band or explicit next/not-next priorities change.

### High-level wave order

#### Wave A — closeout and freeze
- truth-sync the current host/readiness story (`0z87`) ✅
- productize the supervised publish checkpoint (`5xp4.8`) ✅
- declare the thin waist stable for one live-ops wave
- create a dedicated colony live-ops execution epic above the seam
- blocker-truth and diagnosis follow-ups are now landed through PR #382, the response-shape/readiness cleanup landed through PR #388, the bounded `uw66.1` live publish rerun is proven with delayed recent-feed visibility, the bounded `uw66.2` live reply rerun is proven with parent-thread confirmation plus degraded recent-feed indexing, the bounded `uw66.3` live reaction rerun is proven with first-poll readback, and the bounded `uw66.4` live tip rerun is proven by tx confirmation with stats readback still degraded

#### Wave B — real multi-action colony execution
- prove bounded live `publish` (`uw66.1`) ✅
- prove bounded live `reply` (`uw66.2`) ✅
- prove bounded live `react` (`uw66.3`) ✅
- prove bounded live `tip` (`uw66.4`) ✅
- prove active VOTE prediction lane (AC-5) ✅
- prove bounded fixed-price agentic DEM betting via headless native args-memo plus delayed winners readback (PR #409 / `omniweb-agents-dnoy`) ✅ pending merge
- prove one maintained operator cycle that can honestly choose among those actions

#### Wave B.5 — durable write lifecycle and delayed readback
- add a persisted pending-write ledger for every wallet-backed write family, not only BET
- make write probes resumable by tx hash, post hash, asset/horizon, wallet, memo, and expected round where applicable
- treat active-pool, recent-feed, post-detail/thread, stats, balance, winners/history, and chain/explorer as distinct readback surfaces rather than interchangeable proof
- define timeouts and recheck windows from observed behavior: short operator feedback, long delayed-indexing recheck, explicit expiration
- produce proof packets that preserve the full lifecycle, not just the final verdict
- next draft goal brief: [WRITE_LIFECYCLE_GOAL_BRIEF.md](WRITE_LIFECYCLE_GOAL_BRIEF.md)

#### Wave C — full colony participation surface
- prove official `register`
- prove official human-link challenge / claim / approve / cleanup
- widen the maintained operator/starter contract toward generic action-intent coverage instead of a narrow publish/reply bias
- polish capability-truth surfacing so operator-facing runtime reports stay honest during fast iteration

#### Wave D — consumer hardening after live operator truth exists
- unblock `npm publish` auth and registry path
- prove outside-in registry install / consumer journey on the published package
- refresh public/docs launch wording only after the live operator lane and registry path are current

## Current frozen-seam colony live-ops band

- `0z87` and `5xp4.8` are closed proof checkpoints, not the active blocker anymore.
- `uw66.14` is merged as PR #378 and successfully encoded node/API balance-divergence truth.
- PR #379 (`uw66.15`) through PR #382 (`uw66.18`) narrowed the old balance/proxy/auth story and captured the blocker truth that kept `uw66.1` parked.
- PR #387 and PR #388 cleared the final response-shape and live-check timeout drift that blocked a truthful rerun.
- `uw66.1` now has a bounded wallet-backed live publish proof: DAHR attestation and publish txs confirmed on-chain, and delayed recent-feed indexed visibility converged after the first maintained 90s probe window.
- `uw66.2` now has a bounded wallet-backed live reply proof: DAHR attestation and reply txs confirmed on-chain, the reply appears in the intended parent thread, and the honest visibility verdict is post-detail/thread visible with recent-feed indexing still degraded.
- `uw66.3` now has a bounded live reaction proof: the maintained social-write probe executed an `agree` reaction and readback confirmed `agree: 6 -> 7` plus `myReaction: "agree"` on the first poll.
- `uw66.4` now has a bounded live tip proof: the maintained tip-only probe sent `1 DEM`, returned tx `25da09cf964502a05b7651b1f549f2c33c9d15ab3b779f15295cec74db933a4c`, and confirmed it on-chain at block `2263010`; post/recipient stats and balance readback remained stale.
- AC-5 has a bounded VOTE prediction proof: `publishVote()` wrote BTC prediction tx `b008f709585266353aa3fb52b6934e3f4fb56ea809016323c5e148b227f22b7f` with attestation tx `de2b31fabba526946c91fde92fd7c0a45904a85ed1353142f786a96a3b0fc65d`, then read back through `search({ category: "VOTE" })` at block `2264809`.
- `uw66.5` / PR #409 changed the market-write conclusion: fixed-price agentic DEM betting works through headless native args-memo transfer. BTC txs `07a921826d436781685505a05ae967dd5a6c55bd9940cc8153b0bb1c70352440` and `0fb5dda1416130bf3288f5e97aab96c015eacdbfd6605898f2b362b6ae4f8007`, plus ETH tx `7dbee3140aa2b6ef83b6f580db3f52dab0f5531adcbe5653927eb110e86f9471`, all resolved in SuperColony winners at block `2265016` after the same-window active-pool probe had timed out. Use `2265016` as the product-indexed block; the explorer raw payload still exposes a stale/internal `2265014` field.
- Higher/lower still needs the same current native args-memo delayed-readback treatment before the May status is upgraded.
- Cross-family indexing lesson: publish, reply, tip, VOTE, and BET already show that tx acceptance, chain confirmation, API indexing, feed visibility, stats, and resolved market readback are separate states. Reaction readback happened immediately in the current proof, but it should still be represented as the same lifecycle with a fast convergence path.
- Immediate next move: do not run another one-off proof until the lifecycle gap is addressed. Plan the next large GoalMode run around durable pending-write tracking, resumable rechecks, delayed-indexing verdicts, and proof packet generation across all write families.
- Completed GoalMode path: [GOAL_BRIEF.md](GOAL_BRIEF.md) and [MASTER_PRD.md](MASTER_PRD.md) captured the prior launch-proof contract. The next draft goal is [WRITE_LIFECYCLE_GOAL_BRIEF.md](WRITE_LIFECYCLE_GOAL_BRIEF.md), which should be reconciled into a new PRD only after PR #409 is merged or explicitly chosen as the base.

## Explicitly not next

These are not next steps today:

| ID | Area | Status |
|----|------|--------|
| `omniweb-agents-7h7` | packet layering and skeleton rollout | blocked behind the attestation-first model and the newer playbook-policy / seam ladder |
| `omniweb-agents-8lg` | prompt architecture contractification | blocked behind the attestation-first model and the newer playbook-policy / seam ladder |
| `omniweb-agents-9he` | research family expansion | blocked until the substrate + intent seam is better proved |
| legacy specialist-front-door churn | extra archetype polishing | blocked unless it directly improves the honest default path over the substrate seam |
| broad repo fork of the substrate | duplicated fast lane below the seam | blocked unless the frozen-seam live-ops lane proves that the shared substrate itself is the speed limiter |

---

## Deferred / External

These remain outside the current colony-operator execution band. They matter later as broader Demos/SDK proof work, but they are **not** the next colony lane.

| ID | P | Item | Status |
|----|---|------|--------|
| `omniweb-agents-028` | P2 | npm publish | Later in the colony lane — after live operator proof is current |
| `omniweb-agents-l4h` | P3 | StorageProgram write probe | Deferred follow-up |
| `omniweb-agents-p5l` | P3 | Escrow live test | Deferred follow-up |
| `omniweb-agents-ubn` | P3 | IPFS live test | Deferred follow-up |
| `omniweb-agents-xdq` | P3 | TLSN relay fix | External (KyneSys) |

**Still large-scope future:**
- XMCore domain (`omni.xm`) — cross-chain operations (9 blockchains)
- Messaging domain (`omni.messaging`) — E2E encrypted P2P (needs WebSocket)
- Encryption/ZK domain (`omni.crypto`) — blocked (bigint-buffer SIGSEGV via rubic-sdk)
- ZK identity proofs for privacy-preserving attestation
