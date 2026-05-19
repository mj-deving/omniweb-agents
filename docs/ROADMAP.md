---
type: roadmap
status: active
updated: 2026-05-19
completed_phases: 22
tests: 3442
suites: 295
tsc_errors: 0
summary: "The no-release consumer-spectrum lane and hosted no-spend operator proof are complete. The next lane is omniweb-agents-action-spectrum: a full read/write testing matrix for every supported operation before any separately authorized live spend or mutation run."
topic_hint: ["roadmap", "next steps", "what's next", "backlog", "future work", "consumer toolkit", "attestation-first", "leaderboard pattern", "colony-operator", "action-intent"]
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
| Current direction | The consumer-spectrum/codebase reality lane and `omniweb-agents-hosted` are complete. The active next lane is `omniweb-agents-action-spectrum`: first land a full read/write/mutation testing matrix that covers every supported operation with spend class, authorization flag, command, readback surface, and degraded verdict vocabulary; only later child beads may execute live spend or mutation under explicit budgets. |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the shared request/resolution/execution seam across social, tip, and market action families plus the front-door/docs/proofs realignment that makes that seam the honest default story |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred until explicit release authorization plus npm auth, and no public registry install is claimed |
| Doctrine | Current shipped truth is read-first / no-spend by default on the maintained proof path, **playbook-owned strategy above the seam**, an explicit intent layer for normalized routing, substrate/runtime ownership of capability truth/readiness/execution/verification, and a three-layer runtime model: capability answers what exists, guardrails answer whether it is safe, and admissibility answers whether this action can proceed now |
| Documentation | Colony-operator remains the honest default front door, and README/reference/proof surfaces now describe the landed seam, capability surface, guardrails, and admissibility gate honestly instead of talking like those pivots are still ahead |
| Beads | PR #360 is the planning checkpoint, PR #371 is the market-write merge checkpoint, PR #372 closes `5xp4.15`, PR #376 closes the intent-boundary cleanup, PR #377 closes `5xp4.8`, PRs #379-#382 captured the blocker-truth/diagnosis follow-ups, `uw66.1` through `uw66.4` prove bounded live publish/reply/react/tip, AC-5 proves VOTE prediction, PR #409 / `omniweb-agents-dnoy` proves fixed-price agentic DEM betting through delayed winners readback, PR #411 / `omniweb-agents-zg11` completed durable write lifecycle/readback, PR #413 is only the `omniweb-agents-zqnh` capability-truth/dry-run checkpoint, `omniweb-agents-8tga` carries the live maintained operator proof, higher/lower readback proof, earlier identity blocker, and accepted OpenClaw/Gregor no-spend runtime-host proof, `omniweb-agents-q5k8` carries the Wave C supervised identity participation GoalMode run, PR #419 completes Wave D release-readiness without npm release, `omniweb-agents-capsurf` completed Wave E capability-surface execution through PRs #420-#426, PR #427 completed toolkit guardrails, PRs #428/#429 completed action admissibility, PR #431 completed `uw66.6`, PRs #432-#441 completed historical consumer-spectrum `omniweb-agents-spectrum`, `omniweb-agents-hosted` completed the hosted no-spend operator consumer proof, and `omniweb-agents-action-spectrum` is the new full-operation testing matrix lane. |
| Remaining external edges | npm release/public registry proof and production hosted activation remain separately gated. Live spend and supervised mutation move into `omniweb-agents-action-spectrum` only after PR0 lands and each child bead records explicit budget, host, wallet, controlled target, and command-flag authorization. |

**North star:** a substrate-complete OmniWeb package plus replaceable skills/playbooks above it; reference `supercolony-agent-starter` (KyneSys repo) + `supercolony.ai/llms-full.txt`
**Discovery layer:** `openapi.json` (27KB), A2A agent card, AI plugin — see `docs/research/supercolony-discovery/`

**Core principle:** Don't duplicate what supercolony.ai provides. Reference `llms-full.txt` for raw API. `omniweb-toolkit` should be the shared substrate — typed primitives, auth handling, attestation enforcement, guardrails, spend safety, and capability truth — while skills stay above it as consumer-facing playbooks.

**Philosophy:** Hard gates where they matter, but keep the winning loop simple: source -> attest -> interpret -> publish.

**Architectural rule:** the substrate owns the hard parts of real operation; the skill owns instructions, best practices, and thin scaffolding. If an agent has to manually reason about auth ceremony, credential lifecycle, or spend-safety plumbing in prompt-space, the boundary is wrong.

**Current execution rule:** freeze the thin waist for one live-ops wave — `PolicyActionRequest`, resolved intent statuses, and the execution/verification envelope stay stable unless a real run proves they are wrong. Move fast above that seam, then harden below it from observed failure rather than speculative contract churn.

**Write lifecycle rule:** every live write now has two clocks: chain acceptance/finality and product-indexed readback. A tx hash or confirmation block is not sufficient for product success, but a short readback timeout is also not sufficient for failure. Maintained probes and runbooks must classify `planned`, `broadcasted`, `pending-chain`, `chain-confirmed`, `pending-indexer`, `indexed`, `resolved`, `degraded`, `expired`, and `failed` states explicitly, and prefer lifecycle `--recheck` / `--check-tx` no-spend follow-ups before spending again.

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

## Closed Operating Band — frozen seam, fast colony live-ops

This band is now complete through PR #431 / `uw66.6` as a proof checkpoint. It should stay in the roadmap as history and evidence, but it is no longer the active next lane. The follow-on consumer-spectrum and codebase reality map is also complete through PRs #432-#441 below.

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
- prove bounded fixed-price agentic DEM betting via headless native args-memo plus delayed winners readback (PR #409 / `omniweb-agents-dnoy`) ✅
- prove one maintained operator cycle that can honestly choose among those actions

#### Wave B.5 — durable write lifecycle and delayed readback
- add a persisted pending-write ledger for every wallet-backed write family, not only BET ✅
- make write probes resumable by tx hash, post hash, asset/horizon, wallet, memo, and expected round where applicable ✅ for publish/reply, VOTE, reaction/tip records, and fixed-price BET rechecks
- treat active-pool, recent-feed, post-detail/thread, stats, balance, winners/history, and chain/explorer as distinct readback surfaces rather than interchangeable proof ✅
- define timeouts and recheck windows from observed behavior: short operator feedback, long delayed-indexing recheck, explicit expiration ✅
- produce proof packets that preserve the full lifecycle, not just the final verdict ✅
- next GoalMode packet: [WRITE_LIFECYCLE_GOAL_BRIEF.md](WRITE_LIFECYCLE_GOAL_BRIEF.md), [WRITE_LIFECYCLE_MASTER_PRD.md](WRITE_LIFECYCLE_MASTER_PRD.md), and [WRITE_LIFECYCLE_GOAL_LAUNCH.md](WRITE_LIFECYCLE_GOAL_LAUNCH.md)

#### Wave B.6 — lifecycle-aware Colony Operator checkpoints
- [COLONY_OPERATOR_MEGAGOAL_BRIEF.md](COLONY_OPERATOR_MEGAGOAL_BRIEF.md) is the frozen source contract for the post-lifecycle MegaGoal
- [COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md](COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md) is the frozen GoalMode execution surface
- [COLONY_OPERATOR_MEGAGOAL_LAUNCH.md](COLONY_OPERATOR_MEGAGOAL_LAUNCH.md) contains the copy/paste `/goal` launch prompt and preflight
- owner bead: `omniweb-agents-zqnh`
- PR #411 / `omniweb-agents-zg11` completed the durable write lifecycle/readback prerequisite, so M0 is an audit gate rather than a blocker
- PR #413 is the capability-truth/dry-run checkpoint: all required families are surfaced, VOTE is separated from DEM pool betting, fixed-price BET is resolved through no-spend lifecycle readback, higher/lower is explicitly `lifecycle-pending`, identity is supervised/explicit, and the copied-bundle outside-in proof passes without DEM spend
- Wave B.6 now has one maintained operator entrypoint proof: the runner read live state, selected publish, executed under explicit `--execute`, recorded lifecycle state, and proved product readback. This is a bounded live operator proof, not blanket launch-grade authority for every action family.
- The live execution packet is [LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md](LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md), [LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md](LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md), and [LIVE_COLONY_OPERATOR_EXECUTION_LAUNCH.md](LIVE_COLONY_OPERATOR_EXECUTION_LAUNCH.md); parent bead `omniweb-agents-8tga`; external M6b gate `omniweb-agents-aick` is closed by explicit human acceptance of Gregor/OpenClaw runtime-host evidence
- MegaGoal sequence:
  - M0: durable write lifecycle/readback audit
  - M1: multi-action Colony Operator runtime with lifecycle integration
  - M2: official identity participation
  - M3: outside-in consumer/install proof
  - M4: completion audit across roadmap, package references, Beads, PRs, gates, and proof packets

#### Wave C — full colony participation surface
- launch the prep packet [LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md](LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md), [LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md](LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md), and [LIVE_COLONY_IDENTITY_PARTICIPATION_LAUNCH.md](LIVE_COLONY_IDENTITY_PARTICIPATION_LAUNCH.md); parent bead `omniweb-agents-q5k8` ✅
- prove official `register` with product readback under explicit `--execute --confirm-identity-mutation` ✅
- prove official human-link challenge / claim / approve / cleanup with linked-agent and post-cleanup readback under explicit `--execute --confirm-identity-mutation` ✅
- widen the maintained operator/starter contract toward generic action-intent coverage instead of a narrow publish/reply bias
- polish capability-truth surfacing so operator-facing runtime reports stay honest during fast iteration

#### Wave D — consumer hardening after live operator truth exists
- clean up npm release-readiness so package checks, pack dry-run, registry-name lookup, auth detection, and release authorization status are reproducible without publishing
- keep outside-in registry install / published consumer proof blocked until a later explicitly authorized release exists
- refresh public/docs launch wording only after the live operator lane and registry path are current

#### Wave E — toolkit-owned colony capability surface

Goal: a fresh colony operator should learn what is capable from toolkit/runtime capability truth, not from fat skill prose.

External comparison surface:
- official SuperColony skill surface: https://supercolony.ai/skill

Core principle:
- the skill/playbook layer owns strategy
- the toolkit/runtime layer owns protocol mechanics, params, proof status, response depth, readiness, lifecycle, and execution truth

Completed slices:
1. toolkit-owned capability manifest for reads, writes, identity, markets, verification, scoring, webhooks, and advanced domains
2. official SuperColony skill coverage check against that manifest
3. operator discovery so fresh agents can ask the runtime what is capable
4. response-depth preservation through abstractions instead of flattened rich read/proof payloads
5. multi-action dry-run intents with per-action readiness and proof status
6. slimmed skill/playbook protocol teaching after runtime discovery became available

#### Post-Wave-E — toolkit action admissibility ✅

Goal: a fresh colony operator should receive one runtime answer for a requested action: can it be planned or executed right now?

Core principle:
- capability truth answers **what exists**
- guardrail truth answers **whether it is safe**
- action admissibility answers **whether this specific action can proceed now**

Completed via PR #428 and PR #429:
1. `evaluateToolkitActionAdmissibility()` and `buildToolkitActionAdmissibilityManifest()` are exported from `omniweb-toolkit/agent` and `omniweb-toolkit/runtime`
2. per-action admissibility is attached to colony-operator selected actions and multi-action dry-run plans
3. `executeResolvedIntent()` fails closed before side effects unless the final admissibility status is `allowed`
4. `check:colony-operator-admissibility` and `check:colony-operator-admissibility-hardening` are wired into front-door package checks
5. admissibility/guardrail reports stay present across allowed dispatches, minimal-cycle dry-run, skip, and failed outcomes

#### Completed lane — consumer spectrum and codebase reality map

This lane is complete through PRs #432-#441. It was not release follow-up and not public registry proof; it was an evidence-building map plus no-spend consumer widening that proves what a package consumer can actually rely on before later release or live-spend work:
- compared official SuperColony discovery surfaces: `llms.txt`, `llms-full.txt`, `supercolony-skill.md`, `openapi.json`, `.well-known/agent.json`, `.well-known/agents.json`, and `.well-known/ai-plugin.json`
- compared actual live endpoint response shapes, not only docs snapshots: status, content type, auth requirement, top-level fields, error body, pagination/cursor fields, empty/non-empty behavior, and streaming shape where safe
- compared local toolkit coverage: `buildToolkitCapabilityManifest()`, `buildOfficialSkillCoverageReport()`, `HiveAPI`, `createClient`, response-depth maps, admissibility/guardrail/lifecycle surfaces, package exports, scripts, and package checks
- classified codebase reachability and ballast before deleting anything; the inventory found no static duplicate/superseded, stale/dead/orphaned, or blocked local code to remove in this lane
- widened package consumer support across the colony interaction spectrum while keeping live spend and identity mutation gated

Completed Beads epic: `omniweb-agents-spectrum`. Closeout docs slice: `omniweb-agents-gh1x`.

GoalMode scaffold for end-to-end execution:
- [CONSUMER_SPECTRUM_GOAL_BRIEF.md](CONSUMER_SPECTRUM_GOAL_BRIEF.md)
- [CONSUMER_SPECTRUM_MASTER_PRD.md](CONSUMER_SPECTRUM_MASTER_PRD.md)
- [CONSUMER_SPECTRUM_GOAL_LAUNCH.md](CONSUMER_SPECTRUM_GOAL_LAUNCH.md)

Initial live research already shows two important truths to preserve in the inventory:
- current `openapi.json` is much narrower than `supercolony-skill.md`; the skill advertises chat, agent levels, commodity/sports/binary/graduation markets, ETH/Base Sepolia contract-write markets, forecast scoring, user-agent linking, tips, webhooks, reports, convergence, stats, and health surfaces that are not all present in the current OpenAPI path list
- some advertised discovery resources currently return 404, including `.well-known/mcp.json`, `/api/mcp/tools`, `/api/capabilities`, `/api/schema`, `/api/errors`, `/api/rate-limits`, `/api/stream-spec`, and `/api/changelog`; classify these as `advertised_but_404` until live upstream behavior changes

#### Completed lane - hosted no-spend operator consumer proof

This lane is complete under Beads epic `omniweb-agents-hosted`. PR #443 created the GoalMode packet, PR #444 added the clean local-tarball hosted consumer fixture, PR #445 added repeated no-spend full-spectrum operator proof packets, PR #446 added optional dry-run hosted runtime smoke probes, PR #447 preserved degraded/drift endpoint classifications, and the PR5 closeout wired the proof into the package front-door gate.

GoalMode scaffold:
- [HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md](HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md)
- [HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md](HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md)
- [HOSTED_OPERATOR_CONSUMER_GOAL_LAUNCH.md](HOSTED_OPERATOR_CONSUMER_GOAL_LAUNCH.md)

Purpose:
- proved a fresh hosted/external-style consumer can install the local `omniweb-toolkit` tarball
- proved package-name imports only, including root, `runtime`, `agent`, `types`, and maintained write-facing surfaces
- ran repeated full-spectrum no-spend operator cycles across publish, reply, react, tip, VOTE, fixed-price BET, higher/lower BET, register, human-link, and skip alternatives
- preserved capability, guardrail, lifecycle, supervision, explicit-execute, admissibility, and endpoint drift/degraded truth in proof packets
- kept optional hosted runtime smoke deterministic, dry-run, and non-mutating by default
- wired `check:hosted-operator-consumer` into `packages/omniweb-toolkit` `check:frontdoor`

Explicit non-goals:
- no npm release
- no public registry proof
- no live spend or broadcast
- no unsupervised identity mutation
- no production OpenClaw/Gregor activation claim

Closeout:
1. `omniweb-agents-hosted.0` - GoalMode packet and roadmap scaffold: complete
2. `omniweb-agents-hosted.1` - clean hosted consumer fixture: complete
3. `omniweb-agents-hosted.2` - repeated no-spend operator cycles: complete
4. `omniweb-agents-hosted.3` - optional hosted runtime smoke: complete
5. `omniweb-agents-hosted.4` - drift and degraded endpoint ledger: complete
6. `omniweb-agents-hosted.5` - GoalMode closeout and Beads memory: complete after PR5 merge

Required output classes for the inventory:
- `covered`
- `partial`
- `advertised_but_404`
- `advertised_but_missing_locally`
- `live_but_not_advertised`
- `locally_mapped_but_live_shape_drifted`
- `local_manifest_overclaims`
- `local_manifest_underclaims`
- `blocked_auth_needed`
- `blocked_external_or_mutating`
- `dead_or_orphaned_local_code`
- `duplicate_or_superseded_local_code`
- `public_export_uncovered`
- `test_only_or_script_only`

Completed ladder:
1. PR #433 created the repeatable consumer-spectrum inventory gate
2. PR #434 classified codebase reachability and ballast
3. no deletion PR was needed because the inventory found no static dead/orphaned or duplicate/superseded local code
4. PR #435 normalized public exports and consumer coverage
5. PR #436 hardened auth plus RSS/SSE transport consumers
6. PR #437 completed read/profile/verification coverage
7. PR #438 added chat and webhook consumer lifecycle
8. PR #439 widened market reads across binary, graduation, commodity, sports, and ETH surfaces
9. PR #440 added no-spend market write intents and admissibility for all market classes
10. PR #441 proved a local/tarball whole-spectrum consumer journey without registry publication

Still not authorized by this completed band:
- npm release
- public registry proof
- live multi-action spend without explicit authorization
- unsupervised identity mutation

## Active Band — full action-spectrum matrix

Owner bead: `omniweb-agents-action-spectrum`

GoalMode packet:
- [FULL_ACTION_SPECTRUM_GOAL_BRIEF.md](FULL_ACTION_SPECTRUM_GOAL_BRIEF.md)
- [FULL_ACTION_SPECTRUM_MASTER_PRD.md](FULL_ACTION_SPECTRUM_MASTER_PRD.md)
- [FULL_ACTION_SPECTRUM_GOAL_LAUNCH.md](FULL_ACTION_SPECTRUM_GOAL_LAUNCH.md)

Package matrix:
- `packages/omniweb-toolkit/references/full-action-spectrum-testing-matrix.md`
- `packages/omniweb-toolkit/references/full-action-spectrum-read-discovery-proof-2026-05-19.md`
- `packages/omniweb-toolkit/references/full-action-spectrum-social-write-proof-2026-05-19.md`
- `packages/omniweb-toolkit/references/full-action-spectrum-market-write-proof-2026-05-19.md`
- `packages/omniweb-toolkit/references/full-action-spectrum-identity-admin-proof-2026-05-19.md`

This is the next lane after hosted no-spend proof. It exists because the current question is no longer "can a consumer import the package?" but "can an operator prove every supported read, write, spend, identity/admin mutation, and Demos-domain operation with honest readback criteria?"

PR0 is scaffold-only and does not run live spend. Later child beads may execute live operations only after recording:

- active child bead
- explicit budget ceiling
- wallet and host
- package commit
- controlled target for identity/admin/domain mutations
- exact command and explicit `--execute`, `--broadcast`, or equivalent flag
- primary and secondary readback surfaces

Execution ladder:
1. `omniweb-agents-action-spectrum.0` — full action-spectrum matrix scaffold
2. `omniweb-agents-action-spectrum.1` — read and discovery spectrum refresh
3. `omniweb-agents-action-spectrum.2` — social publish and tip live spend sweep: PR2 proof recorded W1/W2 pass, W3 degraded, W4/W5 skipped before spend, and W6 failed/degraded
4. `omniweb-agents-action-spectrum.3` — market and prediction live spend sweep: PR3 proof recorded W7/W8 pass, W9 degraded/unsupported, and W10 blocked
5. `omniweb-agents-action-spectrum.4` — identity admin and delivery mutation sweep: PR4 proof records throwaway wallet registration/human-link/cleanup pass, default-wallet script caveat degraded, deprecated linkIdentity excluded, and webhook create/delete blocked without controlled callback
6. `omniweb-agents-action-spectrum.5` — non-colony domain spend and mutation sweep
7. `omniweb-agents-action-spectrum.6` — action-spectrum closeout and release gating

Explicit boundaries:
- do not reuse historical completed `omniweb-agents-spectrum` as the new Beads lane; that ID remains the completed consumer-spectrum history in docs
- do not treat this PR0 matrix as live-spend authorization
- do not claim "we can do any operation" until every matrix row is proven, degraded, unsupported, blocked, failed, or intentionally skipped with evidence
- do not turn tx-only evidence into product-success evidence where readback is the actual success criterion

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
- Higher/lower now has current native args-memo pool readback proof: a BTC 24h LOWER probe wrote tx `30fc92bca4cf5585302c78ac0363dba0176f2b78a4e20fe43b8ff750c1dde3d1`, and pool/product readback moved `totalLower 0 -> 5`, `totalDem 0 -> 5`, and `lowerCount 0 -> 1`. The operator dry-run capability snapshot may still describe higher/lower as lifecycle-pending until a full operator-cycle BET path is deliberately widened.
- Cross-family indexing lesson: publish, reply, tip, VOTE, and BET already show that tx acceptance, chain confirmation, API indexing, feed visibility, stats, and resolved market readback are separate states. Reaction readback happened immediately in the current proof, but it is now represented in the same lifecycle-aware operator capability vocabulary with a fast convergence path.
- Current MegaGoal checkpoint: PR #413 has passed the M0 lifecycle audit, added the capability truth layer, generated a no-spend fixed-price BET lifecycle proof packet at `/tmp/omni-colony-operator-megagoal/fixed-bet-proof.json`, and reran the copied-bundle outside-in consumer proof successfully. The follow-on live execution packet proves one maintained publish operator cycle with product readback, current higher/lower pool readback, and accepted Gregor/OpenClaw runtime-host no-spend smoke evidence. The q5k8 Wave C run now proves supervised identity register, human-link, and cleanup locally through maintained package paths.
- Current live execution parent: `omniweb-agents-8tga` owns the real maintained-operator cycle. M0-M6b now have evidence or exact blocker records, and gate `omniweb-agents-aick` was closed by explicit human acceptance after Gregor's archive-level audit. The durable evidence archive is `/home/openclaw/.openclaw/workspace/local/demos-agents-worktrees/gregor-aick-proof/tmp/evidence/openclaw-m6b/openclaw-colony-m6b-rerun-20260516181351-redacted.tar.gz` with SHA256 `e9a89737b00c835d88c2b7ecc904b6be7c5aa1fe23b81af2e6a34fabcec23068`.
- Current Wave C packet: `omniweb-agents-q5k8` owns the supervised identity participation GoalMode run. It proved live `register`, human-link approve/readback, and unlink cleanup behind explicit `--execute` plus identity-specific confirmation; identity remains supervised and is not a default autonomous action.
- PR #427 completed toolkit guardrails, and PRs #428/#429 completed action admissibility. Fresh sessions should not route back into capability, guardrail, or admissibility as upcoming architecture work.
- Completed GoalMode paths: [GOAL_BRIEF.md](GOAL_BRIEF.md) / [MASTER_PRD.md](MASTER_PRD.md) captured the prior launch-proof contract, and [WRITE_LIFECYCLE_GOAL_BRIEF.md](WRITE_LIFECYCLE_GOAL_BRIEF.md) / [WRITE_LIFECYCLE_MASTER_PRD.md](WRITE_LIFECYCLE_MASTER_PRD.md) / [WRITE_LIFECYCLE_GOAL_LAUNCH.md](WRITE_LIFECYCLE_GOAL_LAUNCH.md) captured the completed lifecycle goal. PR #431 completed `uw66.6`; PRs #432-#441 completed the consumer-spectrum/codebase reality map and no-spend local tarball consumer proof.

## Explicitly not next

These are not next steps today:

| ID | Area | Status |
|----|------|--------|
| `omniweb-agents-7h7` | packet layering and skeleton rollout | blocked behind the attestation-first model and the newer playbook-policy / seam ladder |
| `omniweb-agents-8lg` | prompt architecture contractification | blocked behind the attestation-first model and the newer playbook-policy / seam ladder |
| `omniweb-agents-9he` | research family expansion | blocked until the substrate + intent seam is better proved |
| legacy specialist-front-door churn | extra archetype polishing | blocked unless it directly improves the honest default path over the substrate seam |
| broad repo fork of the substrate | duplicated fast lane below the seam | blocked unless the frozen-seam live-ops lane proves that the shared substrate itself is the speed limiter |
| `omniweb-agents-admissibility` | action admissibility architecture | complete via PRs #428/#429; do not reopen as the next lane |
| `omniweb-agents-uw66.6` | maintained operator-cycle report surface | complete via PR #431; use it as evidence, not the next claimable lane |
| `omniweb-agents-spectrum` | consumer-spectrum/codebase reality | complete via PRs #432-#441; do not reuse this ID for the new full action-spectrum lane |
| blind dead-code cleanup | codebase ballast | blocked until consumer-spectrum/codebase inventory proves what is unused, duplicate, or superseded |
| feature widening before inventory | consumer spectrum | blocked until official docs, live response shapes, and local toolkit/code reachability are compared |
| live multi-action spend / identity mutation | execution authority | authorized only through future `omniweb-agents-action-spectrum` child beads with explicit budget, controlled targets, command flags, and readback criteria; PR0 remains no-spend |

---

## Deferred / External

These remain outside the current colony-operator execution band. They matter later as broader Demos/SDK proof work, but they are **not** the next colony lane.

| ID | P | Item | Status |
|----|---|------|--------|
| `omniweb-agents-028` | P2 | npm publish | Deferred until explicit release authorization plus npm auth; not part of the consumer-spectrum inventory lane |
| `omniweb-agents-l4h` | P3 | StorageProgram write probe | Deferred follow-up |
| `omniweb-agents-p5l` | P3 | Escrow live test | Deferred follow-up |
| `omniweb-agents-ubn` | P3 | IPFS live test | Deferred follow-up |
| `omniweb-agents-xdq` | P3 | TLSN relay fix | External (KyneSys) |

**Still large-scope future:**
- XMCore domain (`omni.xm`) — cross-chain operations (9 blockchains)
- Messaging domain (`omni.messaging`) — E2E encrypted P2P (needs WebSocket)
- Encryption/ZK domain (`omni.crypto`) — blocked (bigint-buffer SIGSEGV via rubic-sdk)
- ZK identity proofs for privacy-preserving attestation
