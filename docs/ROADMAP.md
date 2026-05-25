---
type: roadmap
status: active
updated: 2026-05-25
completed_phases: 23
tests: 3442
suites: 295
tsc_errors: 0
summary: "The no-spend full OmniWeb reconciliation lane, 0ctx truth-hardening slices, controlled 0ctx proof packet, sc96 hardening pass, and 9st0 successor unblock runway are complete. The active band is docs-backed no-spend Demos hardening under omniweb-agents-04c5, with a parallel evidence-first stale-surface audit under omniweb-agents-xqlb."
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
| Current direction | The consumer-spectrum, hosted no-spend proof, full action-spectrum matrix, no-spend `omniweb-agents-operator-stress` read/write-preview pass, Phase 24 VOTE/raw-chain continuation, write/spend sweep, explicit mutation-probe targeting, storage no-spend preview, full OmniWeb endpoint reconciliation, `0ctx.4` / `0ctx.5` write/spend truth-hardening, the controlled bounded 0ctx proof packet, sc96 hardening/readiness pass, and 9st0 successor unblock runway are complete. `omniweb-agents-3005` closed after PRs #490, #491, and #495-#500 mapped the Demos SDK/RPC, DemosWork, XM/Rubic, storage/IPFS/escrow, identity/attestation/messaging/network/crypto, and future manifest/CLI design surfaces without live writes or spend. The controlled proof packet [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](goalmode/0ctx-controlled-proof-run-2026-05-23.md) produced one `GREEN`, one `DEGRADED`, one `STUCK`, and five `BLOCKED` lane outcomes. sc96 then fixed/classified raw transfer units, escrow readback, and IPFS quote discovery enough to run [packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/readiness-report.md](../packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/readiness-report.md), which remained `BLOCKED`. 9st0 then ran the full no-spend unblock sequence through PRs #522-#531 and recorded a no-go packet decision: raw transfer is green only for integer DEM, escrow is degraded on product readback, social is blocked, and IPFS/TLSN/chat/webhook are excluded. The active band is docs-backed no-spend Demos hardening under `omniweb-agents-04c5`, plus a parallel evidence-first whole-codebase stale-surface audit under `omniweb-agents-xqlb`. |
| Shipped moat | Leaderboard-pattern rollout remains complete, and `main` now also includes the shared request/resolution/execution seam across social, tip, and market action families plus the front-door/docs/proofs realignment that makes that seam the honest default story |
| Consumer Package | `omniweb-toolkit` v0.1.0 — repo install and shipped checks are usable now; npm publish remains deferred until explicit release authorization plus npm auth, and no public registry install is claimed |
| Doctrine | Current shipped truth is read-first / no-spend by default on the maintained proof path, **playbook-owned strategy above the seam**, an explicit intent layer for normalized routing, substrate/runtime ownership of capability truth/readiness/execution/verification, and a three-layer runtime model: capability answers what exists, guardrails answer whether it is safe, and admissibility answers whether this action can proceed now |
| Documentation | Colony-operator remains the honest default front door, and README/reference/proof surfaces now describe the landed seam, capability surface, guardrails, and admissibility gate honestly instead of talking like those pivots are still ahead |
| Beads | PR #360 is the planning checkpoint, PR #371 is the market-write merge checkpoint, PR #372 closes `5xp4.15`, PR #376 closes the intent-boundary cleanup, PR #377 closes `5xp4.8`, PRs #379-#382 captured the blocker-truth/diagnosis follow-ups, `uw66.1` through `uw66.4` prove bounded live publish/reply/react/tip, AC-5 proves VOTE prediction, PR #409 / `omniweb-agents-dnoy` proves fixed-price agentic DEM betting through delayed winners readback, PR #411 / `omniweb-agents-zg11` completed durable write lifecycle/readback, PR #413 is only the `omniweb-agents-zqnh` capability-truth/dry-run checkpoint, `omniweb-agents-8tga` carries the live maintained operator proof, higher/lower readback proof, earlier identity blocker, and accepted OpenClaw/Gregor no-spend runtime-host proof, `omniweb-agents-q5k8` carries the Wave C supervised identity participation GoalMode run, PR #419 completes Wave D release-readiness without npm release, `omniweb-agents-capsurf` completed Wave E capability-surface execution through PRs #420-#426, PR #427 completed toolkit guardrails, PRs #428/#429 completed action admissibility, PR #431 completed `uw66.6`, PRs #432-#441 completed historical consumer-spectrum `omniweb-agents-spectrum`, `omniweb-agents-hosted` completed the hosted no-spend operator consumer proof, `omniweb-agents-action-spectrum` completed the full-operation testing matrix, `omniweb-agents-operator-stress` completed roadmap/packet prep, read-surface stress, write-preview packets, and blocker wiring through PRs #458-#460, `.5` ran the initial Phase 24 tranche through PRs #465-#468, PR #470 added VOTE RPC candidate fallback, `omniweb-agents-0d7f` completed the continuation graph through PRs #471-#478 plus closeout, PR #482 completed the write/spend sweep, PR #483 closed `omniweb-agents-0ctx.6` so storage/IPFS/escrow live probes now require explicit credential targeting, `omniweb-agents-97o2` resolved `colony-operator` and produced the green no-spend storage preview, `omniweb-agents-3005` is closed after PRs #490, #491, and #495-#500, `0ctx.4` / `0ctx.5` are closed, the controlled proof packet is complete after PRs #504-#512, `omniweb-agents-sc96` is closed after the post-proof hardening/readiness pass, and `omniweb-agents-9st0` is closed after PR #522 prepared the runway, PR #530 aggregated readiness, and PR #531 recorded the blocked packet decision. New parent epic `omniweb-agents-04c5` is the active docs-backed no-spend hardening lane: PR0 truth-sync, PR1 Demos documentation source map, PR2 storage/IPFS/escrow reconciliation, PR3 XM/Rubic/DemosWork reconciliation, PR4 four-column readiness evidence model, and PR5 next executable lane decision. New parent epic `omniweb-agents-xqlb` tracks the non-destructive whole-codebase stale-surface audit. The existing nominal ledger remains `10.1 / 25` testnet DEM. |
| Remaining external edges | npm release/public registry proof and production hosted activation remain separately gated. The May 23 controlled packet, sc96 readiness packet, and 9st0 aggregation/packet decision are complete evidence; none authorizes more live writes by itself. The active 04c5 lane is no-spend and docs-backed: future live work requires a later explicit packet with official Demos-doc evidence, SDK/API/source behavior, package behavior, no-spend proof, budget, host, wallet/agent target, command, mutation/tx evidence, product readback criteria, stop rules, and ledger updates. Mainnet, real-money, npm release, production hosted activation, secret handling changes, and uncontrolled credential/profile changes remain out of scope. |

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

## Phase 23: Colony Operator Capability Stress-Test and GoalMode Readiness

Owner bead: `omniweb-agents-operator-stress`

GoalMode packet:
- [docs/goalmode/colony-operator-stress-test-2026-05-19.md](goalmode/colony-operator-stress-test-2026-05-19.md)

This is the completed no-spend successor lane after the action-spectrum matrix. It exists because the repo now has the command catalog and proof vocabulary, but a fresh colony operator needed the current surface stress-tested as an operational help system before more live operations could even be considered.

Current truth:
- `capabilityDiscovery.operatorHelp` is on `main` as the CLI-style operator discovery surface.
- `operatorHelp.readCommands` and `operatorHelp.writeCommands` are generated from `toolkitCapabilityManifest`, including method-level params, response depth, proof tier, requirements, no-spend/no-mutation flags, usage strings, and readback surfaces.
- Response-depth discovery now exposes time and horizon knobs. Defaults remain `window=24h` for oracle-style market reads, `periods=24` for `getPriceHistory(asset, periods)`, and `horizon=30m` for active fixed, higher/lower, ETH, and commodity pool reads. Supported horizon examples include `30m`, `1h`, `4h`, `12h`, and `24h`.
- PR #459 captured the read-surface proof under `packages/omniweb-toolkit/references/operator-stress-2026-05-19/`: 92 read commands, 48 green, 33 thin, 6 auth-gated, 5 degraded, and 0 missing-param/dev-only/broken. Targeted samples showed 30m/4h/24h pool horizons passing while sampled 1h/12h fixed and higher/lower pool horizons returned HTTP 400.
- PR #460 captured write-preview proof for all 28 write commands. Every row is a proposed action packet only: 7 preview-ready/live-gated, 15 advanced preview-only, 1 degraded pending higher/lower row, and 5 supervised identity/profile rows. No write, spend, broadcast, identity/profile mutation, webhook mutation, escrow/storage/IPFS/raw-chain mutation, npm release, or production hosted activation was executed.
- The completed action-spectrum lane leaves two hard safety blockers that must not be papered over: `omniweb-agents-km3g` for identity/profile targeting and configured-wallet restore, and `omniweb-agents-vhat` for escrow/storage/IPFS probe targeting plus chain sign/verify classification.

Execution ladder:
1. `omniweb-agents-operator-stress.0` - propagate this roadmap state (complete, PR #458)
2. `omniweb-agents-operator-stress.1` - add the GoalMode launch packet (complete, PR #458)
3. `omniweb-agents-operator-stress.2` - enumerate `operatorHelp.readCommands`, run maintained no-spend read sweeps plus time/horizon samples, and classify every read as green, thin, missing-param, auth-gated, dev-only, degraded, or broken (complete, PR #459)
4. `omniweb-agents-operator-stress.3` - enumerate `operatorHelp.writeCommands` and generate reviewable execution previews / proposed action packets without mutation (complete, PR #460)
5. `omniweb-agents-operator-stress.4` - keep credential/profile blockers wired into the execution graph; no new throwaway wallet/profile by default (complete, PR #458)
6. `omniweb-agents-operator-stress.5` - bounded testnet live-write tranche, unblocked after `omniweb-agents-km3g`, `omniweb-agents-vhat`, and `omniweb-agents-wck6` closed; executed through PRs #465-#468 with green BET/HL proof, social degraded, and VOTE STUCK on runtime 502
7. `omniweb-agents-operator-stress.6` - historical no-spend closeout and AC-6 through AC-9 status propagation for the May 19 packet (complete, PR #461). Phase 24 follow-ups now live in the Beads opened from `.5`: VOTE runtime recovery, social target recheck, and controlled advanced-domain target planning.

GoalMode stop rule:
- keep working until AC-1 through AC-9 in the packet have evidence, an explicit `DEGRADED` verdict, or a `STUCK` note after repeated attempts on the same blocker
- do not stop at AC-1 or the first successful read pass
- the default stress pass was read-only plus write previews; the next tranche is live testnet execution under [docs/goalmode/testnet-live-write-tranche-2026-05-21.md](goalmode/testnet-live-write-tranche-2026-05-21.md)

Explicit boundaries:
- no npm release
- no public registry proof
- no production hosted activation claim
- no mainnet or real-money operations
- no new wallet/profile creation unless the packet or active bead names the controlled target and cleanup/readback plan
- no live operation without an explicit script flag such as `--execute`, `--broadcast`, or `--confirm-identity-mutation`; the human prompt is waived for this testnet tranche, not the code-level safety flag
- no tx-only success claims where product readback is the success criterion

## Phase 24: Testnet Live-Write GoalMode Tranche

Owner beads: `omniweb-agents-operator-stress.5` for the original tranche, `omniweb-agents-0d7f` for the continuation after PR #470, `omniweb-agents-5mnk.2` / `.3` / `.4` for the historical advanced-domain successor execution, and `omniweb-agents-0ctx.9` plus child proof beads for the completed controlled proof packet.

Launch packet:
- [docs/goalmode/testnet-live-write-tranche-2026-05-21.md](goalmode/testnet-live-write-tranche-2026-05-21.md)
- [docs/goalmode/testnet-live-write-continuation-2026-05-21.md](goalmode/testnet-live-write-continuation-2026-05-21.md)
- [docs/goalmode/testnet-live-write-successor-2026-05-21.md](goalmode/testnet-live-write-successor-2026-05-21.md) (historical successor packet)
- [docs/goalmode/testnet-live-write-advanced-domain-successor-2026-05-22.md](goalmode/testnet-live-write-advanced-domain-successor-2026-05-22.md) (historical advanced-domain successor packet)
- [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](goalmode/0ctx-controlled-proof-run-2026-05-23.md) (completed controlled proof packet)

Big picture:
- Phase 21-22 built the simple attestation-first and leaderboard-pattern floor.
- The later architecture bands moved capability, guardrails, admissibility, lifecycle, and proof reporting into the toolkit/runtime substrate.
- The consumer-spectrum, hosted no-spend, full action-spectrum, and operatorHelp stress lanes proved that a fresh operator can discover the surface and preview every write safely.
- Phase 24 converted that proof into bounded testnet live runs: one live operation at a time, no per-operation human approval prompts inside the active packet, but strict script flags, budget caps, controlled targets, and product readback.

Current Phase 24 status:
- PR #465 prepared the authorization packet and roadmap/mirror state. No live write ran in that prep slice.
- PR #466 executed one fixed-price BTC `30m` BET for `5` testnet DEM and proved product readback by exact active-pool tx match after fixing stale-winner fallback risk.
- PR #467 executed one BTC `24h` higher/lower `lower` BET for `5` testnet DEM and proved product readback by pool deltas: `totalLower 0 -> 5`, `lowerCount 0 -> 1`, and `totalDem 0 -> 5`.
- PR #468 widened social preview to 200 posts and kept social writes `DEGRADED` because no untouched attested target met score `>=85` and engagement `>=5`; it also kept VOTE publish `STUCK` after a green no-spend preflight and a sanitized `--broadcast` retry failed at `node3.demos.sh` `502 Bad Gateway` before tx/lifecycle creation.
- PR #470 fixed the VOTE node3-only blocker by adding runtime RPC override support and `check-vote-publish` RPC candidate fallback; PRs #472 and #476 then proved that path with `rpcSelection`, no-spend preflight, one bounded broadcast, and category-search product readback.
- PR #471 prepared the continuation graph and packet after PR #470.
- PR #472 captured green VOTE fallback no-spend proof with `rpcSelection`, target prices, category-search readback surface, and no mutation.
- PR #474 rechecked social over 500 posts and classified the lane `target-thin`; the top candidate scored `80` with engagement `3`, below the maintained score `>=85` and engagement `>=5` floor.
- PR #475 decomposed advanced-domain targets into raw-chain, storage, IPFS, and escrow child beads with explicit targets, commands, live flags, budget/readback rules, and raw-chain first.
- PR #476 executed exactly one bounded VOTE live publish after green preflight: tx `68532c333cd78f2451cad8c3f376be4292399807c4552fb38d788f7a52e482af`, lifecycle verdict `pass`, category-search product readback matched the tx.
- PR #477 recorded the social policy packet. It preserves score `>=85` and engagement `>=5`, does not authorize a social mutation now, and marks the social mutation lane `BLOCKED/DEGRADED` until a fresh eligible target or separately reviewed controlled-target plan exists.
- PR #478 recorded the lowest-risk advanced-domain proof: raw-chain no-spend/no-broadcast sign/read smoke, `attemptedBroadcast=false`, `ok=true`, `verify.verified=true`, balance read `1737`, block number `2298490`; storage/IPFS/escrow remain follow-up beads.
- PR #482 completed the no-spend write/spend sweep and opened/connected the follow-up hardening beads.
- PR #483 closed `omniweb-agents-0ctx.6`: identity, storage, IPFS, and escrow probes now refuse live mutation unless an explicit existing `--agent-name` or `--env-path` credential target is provided.
- The May 22 storage successor attempt for `omniweb-agents-5mnk.2` stopped before mutation: `node --import tsx packages/omniweb-toolkit/scripts/probe-storage.ts --agent-name mj-codex-proof-agent ...` exited with `--agent-name credentials profile not found`. `packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/storage-preview.json` records the blocked preview; no public address, cost quote, readback surface, live broadcast, or DEM spend was produced.
- Follow-up `omniweb-agents-97o2` selected and provisioned `--agent-name colony-operator`, then reran storage preview without `--broadcast`. `packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/storage-preview-colony-operator.json` records the green preview: address `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`, runtime target `agent-name` / `colony-operator`, storage address `stor-b2248cf13f55ded07e66cca0d1dea6787ba8c0c6`, estimated create fee `1` DEM, and no live broadcast or DEM spend.
- `omniweb-agents-0ctx.4` and `omniweb-agents-0ctx.5` are complete. The immediate truth-hardening band is closed.
- PR #504 prepared the controlled proof packet through `omniweb-agents-0ctx.9` without claiming proof beads or running live work.
- PR #505 / `omniweb-agents-0ctx.1` completed the VOTE proof refresh as `GREEN`: tx `c0dd74f4c8bac54ed46fa87a05f0c5fd1e3312dc854b4e1588e48b8bd61f73c7`, DAHR tx `9ddf76ec6fb3e1194461b48db1c8ed0d50256ca8d03cde4ddafc60ae328b8307`, and category-search product readback at block `2311911`.
- PR #506 / `omniweb-agents-0ctx.3` closed social as `BLOCKED`: maintained scan did not find an eligible untouched or untipped target at the preserved score and engagement floor, so no social mutation or spend ran.
- PR #507 / `omniweb-agents-0ctx.8` closed raw transfer as `STUCK`: the maintained gate/readback and preview exist, but the live-gated `0.1 DEM` transfer stopped before broadcast because SDK confirmation rejected the amount as `Not an integer`.
- PR #508 / `omniweb-agents-5mnk.3` closed IPFS as `BLOCKED`: public-payload preview with `--agent-name colony-operator` returned `"{ error: \"Unknown message\"}"` instead of a concrete quote, so no upload, CID, broadcast, or spend ran.
- PR #509 / `omniweb-agents-5mnk.4` closed escrow as `DEGRADED`: one controlled `0.1 DEM` send returned tx `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`, but confirmation/readback wrappers did not prove claimable escrow state.
- PR #510 / `omniweb-agents-0ctx.2` closed TLSN as `BLOCKED`: preview validated the public URL and local dependency shape, but no concrete no-spend quote or sanitized proof-material path exists; the worst-case estimate exceeded the `5 DEM` lane budget.
- PR #511 / `omniweb-agents-0ctx.7` closed chat-send as `BLOCKED`: no controlled room, cleanup policy, owned message id, or readback lane exists; no chat mutation ran.
- PR #512 / `omniweb-agents-6rc3.5` closed webhook receiver as `BLOCKED`: no controlled public HTTPS callback, cleanup policy, owned webhook id, or create/delete readback lane exists; no webhook mutation ran.
- Final packet ledger: nominal DEM spend is now `10.1 / 25` testnet DEM. Only escrow added `0.1 DEM` to the previous `10 / 25` ledger. The VOTE proof consumed a write-rate slot rather than a DEM amount; social, raw transfer, IPFS, TLSN, chat, and webhook lanes did not execute live spend.

Authorization model:
- The user has approved this testnet tranche to run without asking for a fresh human "yes" before each individual live operation.
- The approval is bounded to testnet DEM and testnet-only mutation surfaces.
- The approval does not cover mainnet, real-money, npm release, public registry proof, production hosted activation, secret storage, credential-path disclosure, or unbounded repeated spend.
- Each operation must still record the command, explicit live flag, target, budget/amount where relevant, tx or mutation evidence, product readback, and final `GREEN`, `DEGRADED`, or `STUCK` verdict.

Default spend envelope for any successor run:
- total tranche ceiling: 25 testnet DEM
- default single-operation ceiling: 5 testnet DEM
- retries that could spend again require a no-spend readback/recheck first and must stay inside the total tranche ceiling
- identity/profile mutations count against the mutation budget even when they do not spend DEM, and need cleanup/readback evidence when they are temporary

Post-packet execution rule:
1. Treat [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](goalmode/0ctx-controlled-proof-run-2026-05-23.md) as completed evidence, not active authority for more live writes.
2. Do not relaunch a broad proof run before closing the highest-signal engineering blockers.
3. Work the next engineering debt in this order unless Beads or a fresh packet records a better reason: `0ctx.8` raw transfer amount/unit handling, `5mnk.4` escrow confirmation/readback, then `5mnk.3` IPFS quote discovery.
4. Keep the existing `10.1 / 25` DEM spend ledger unless a successor packet updates the budget before more spend.
5. Any future wallet-backed advanced-domain live operation must use an explicit existing credential target through `--agent-name colony-operator` or a safer lane-recorded explicit target.
6. Stop before mutation when target, budget/quote, explicit live flag, controlled credential target, or product/readback surface is missing.

## Phase 25: Full OmniWeb Endpoint Inventory ✅

Owner bead: `omniweb-agents-3005`

GoalMode packet:
- [docs/goalmode/full-omniweb-reconciliation-2026-05-22.md](goalmode/full-omniweb-reconciliation-2026-05-22.md)

Reference:
- [packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md](../packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md)

This inventory-first lane is complete. It exists because the toolkit is no longer just a Colony Operator demo: Colony Operator is the first consumer, while the package is intended to be the shared agent-facing OmniWeb substrate over SuperColony, Demos SDK/WebSDK, Demos node RPC, DemosWork, XM cross-chain, storage, IPFS, escrow, identity, attestations, privacy, messaging, bridge, network, and crypto/ZK-adjacent surfaces.

The no-spend reconciliation sequence ran through `omniweb-agents-6rc3.2`, `.3`, `.4`, then `omniweb-agents-3005.1` through `.6`. The parent `omniweb-agents-3005` is closed with evidence and merged PRs; the resulting references remain the map of record before later non-colony implementation work.

Scope boundaries:
- no new wrappers
- no new CLI namespaces
- no capability-manifest schema or type changes
- no live writes, broadcasts, or DEM spend
- no npm, production-hosted, mainnet, or blanket live-readiness claim

Closeout:
1. PR #490 created the inventory map.
2. PR #491 prepared the no-spend GoalMode packet and sequencing.
3. PRs #495-#500 closed `3005.1` through `.6`.
4. No live writes, broadcasts, DEM spend, npm release, production hosting, mainnet expansion, speculative wrapper, broad CLI namespace implementation, or manifest schema implementation happened in this lane.

## Completed Band - controlled 0ctx proof execution

Owner bead: `omniweb-agents-0ctx`

GoalMode packet:
- [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](goalmode/0ctx-controlled-proof-run-2026-05-23.md)

Prep bead: `omniweb-agents-0ctx.9`

The bounded write/spend truth-hardening slices are complete: `0ctx.4` aligned
higher/lower amount-floor and proof-status claims, and `0ctx.5` classified
market registration helpers as owned-transaction recovery surfaces rather than
standalone spend proof. The controlled proof packet above is now complete after
PRs #504-#512.

Lane status:
1. `omniweb-agents-0ctx.1` - `GREEN`: VOTE proof refresh completed through [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/vote-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/vote-report.md).
2. `omniweb-agents-0ctx.3` - `BLOCKED`: social react/tip target selection found no eligible untouched or untipped target at the maintained floor; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/social-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/social-report.md).
3. `omniweb-agents-0ctx.8` - `STUCK`: raw transfer gate/readback exists and preview was green, but the live-gated `0.1 DEM` transfer stopped before broadcast because SDK confirmation rejected the packet-ceiling amount as non-integer; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/transfer-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/transfer-report.md).
4. `omniweb-agents-5mnk.3` - `BLOCKED`: IPFS preview with public payload and `colony-operator` target returned `"{ error: \"Unknown message\"}"` instead of a concrete quote, so no `--broadcast` ran; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/ipfs-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/ipfs-report.md).
5. `omniweb-agents-5mnk.4` - `DEGRADED`: escrow controlled send returned tx hash `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`, but tx confirmation/readback wrappers did not prove claimable escrow state; packet ledger is now `10.1 / 25` nominal testnet DEM; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/escrow-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/escrow-report.md).
6. `omniweb-agents-0ctx.2` - `BLOCKED`: TLSN preview validated the public target URL and local bridge dependencies, but no concrete no-spend quote or sanitized proof-material path is available; the worst-case estimate exceeds the `5 DEM` lane budget; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/tlsn-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/tlsn-report.md).
7. `omniweb-agents-0ctx.7` - `BLOCKED`: chat-send remains a no-spend plan-only surface; no controlled room, cleanup policy, owned message id, or readback lane exists; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/chat-gate-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/chat-gate-report.md).
8. `omniweb-agents-6rc3.5` - `BLOCKED`: webhook receiver remains a no-spend plan-only surface; no controlled public HTTPS callback, cleanup policy, owned webhook id, or create/delete readback lane exists; see [packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-report.md](../packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-report.md).

Boundaries:
- bounded testnet writes only inside the packet, after green no-spend preview, with explicit live flags, controlled target/readback, and packet budget
- use `--agent-name colony-operator` for wallet-backed advanced-domain proofs unless the lane records a safer explicit target
- no mainnet, real-money, npm release, production hosted activation, secret handling changes, uncontrolled credential/profile mutation, or registration replay
- no live operation when target, budget/quote, explicit live flag, controlled credential target, or product/readback surface is missing
- tx confirmation alone is not success

Completed successor unblock runway and active docs-backed hardening:
1. `omniweb-agents-sc96` is complete. Its readiness packet [packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/readiness-report.md](../packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/readiness-report.md) was `BLOCKED`: transfer preview is green for integer `1 DEM`, escrow is still `DEGRADED`, and IPFS remains `BLOCKED`.
2. `omniweb-agents-9st0` is complete. PR #522 prepared the no-spend runway, PR #530 aggregated readiness under [packages/omniweb-toolkit/references/successor-unblock-readiness-2026-05-23/readiness-aggregation.md](../packages/omniweb-toolkit/references/successor-unblock-readiness-2026-05-23/readiness-aggregation.md), and PR #531 recorded the blocked packet decision under [packages/omniweb-toolkit/references/successor-unblock-readiness-2026-05-23/packet-decision.md](../packages/omniweb-toolkit/references/successor-unblock-readiness-2026-05-23/packet-decision.md). No successor live authority was created.
3. `omniweb-agents-04c5` is the active hardening parent. It resets the next OmniWeb hardening lane around official Demos docs, installed SDK/API/source behavior, package truth, and no-spend proof before new wrappers or public APIs.
4. `04c5.1` lands shared truth sync first. Then `04c5.2` maps official Demos docs, `04c5.3` reconciles storage/IPFS/escrow, `04c5.4` reconciles XM/Rubic/DemosWork, `04c5.5` updates the readiness evidence model, and `04c5.6` chooses the next executable hardening lane. Default first executable lane after the evidence pass is escrow readback wrapper hardening, because it has an existing tx and no-spend readback blocker.
5. `omniweb-agents-xqlb` is the parallel whole-codebase stale-surface audit. It is classify-first and non-destructive: source/API, docs/reference, tests/evals/scripts, and package/distribution audits must feed an evidence-backed cleanup matrix before any broad deletion follow-up.
6. No live spend, upload, broadcast, mainnet, npm release, hosted activation, secret mutation, uncontrolled credential/profile mutation, or tx-only success claim is authorized by either active parent.

## Completed Band — full action-spectrum matrix

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
- `packages/omniweb-toolkit/references/full-action-spectrum-domain-write-proof-2026-05-19.md`
- `packages/omniweb-toolkit/references/full-action-spectrum-closeout-2026-05-19.md`

This lane is complete after hosted no-spend proof. It existed because the question was no longer "can a consumer import the package?" but "can an operator prove every supported read, write, spend, identity/admin mutation, and Demos-domain operation with honest readback criteria?"

PR0 was scaffold-only and did not run live spend. Later child beads executed or blocked live operations only after recording:

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
6. `omniweb-agents-action-spectrum.5` — non-colony domain spend and mutation sweep: PR5 proof records throwaway wallet readiness, concrete escrow/storage/IPFS/raw-transfer dry-run payloads, blocked write verdicts due missing PR5 budget gate, and degraded chain sign/verify smoke
7. `omniweb-agents-action-spectrum.6` — action-spectrum closeout and release gating: PR6 reconciles every matrix row as proven, degraded, unsupported, blocked, failed, or skipped; it does not authorize npm release, public registry proof, webhook mutation, PR5 domain broadcasts, or broad "all operations work" claims

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
| live multi-action spend / identity mutation | execution authority | action-spectrum PR2-PR5 executed only the rows explicitly authorized in their child beads; further spend, webhook mutation, PR5 domain broadcasts, or identity reruns still require explicit budget, controlled targets, command flags, and readback criteria |

---

## Deferred / External

These remain outside the current colony-operator execution band. They matter later as broader Demos/SDK proof work, but they are **not** the next colony lane.

| ID | P | Item | Status |
|----|---|------|--------|
| `omniweb-agents-028` | P2 | npm publish | Deferred until explicit release authorization plus npm auth; PR6 made no npm release or public registry claim |
| `omniweb-agents-km3g` | P1 | Identity probe targeting and configured-wallet restore | Closed by PR #462 and PR #464; not an active blocker |
| `omniweb-agents-vhat` | P2 | Domain probe targeting and chain sign/verify classification | Closed by PR #463 and superseded by PR #483 explicit mutation-probe targeting; storage/IPFS/escrow execution now lives in `omniweb-agents-5mnk.2` / `.3` / `.4` |
| `omniweb-agents-l4h` | P3 | StorageProgram write probe | Superseded as broad deferred item by controlled storage child `omniweb-agents-5mnk.2` |
| `omniweb-agents-p5l` | P3 | Escrow live test | Superseded as broad deferred item by controlled escrow child `omniweb-agents-5mnk.4` |
| `omniweb-agents-ubn` | P3 | IPFS live test | Superseded as broad deferred item by controlled IPFS child `omniweb-agents-5mnk.3` |
| `omniweb-agents-xdq` | P3 | TLSN relay fix | External (KyneSys) |

**Still large-scope future:**
- XMCore domain (`omni.xm`) — cross-chain operations (9 blockchains)
- Messaging domain (`omni.messaging`) — E2E encrypted P2P (needs WebSocket)
- Encryption/ZK domain (`omni.crypto`) — blocked (bigint-buffer SIGSEGV via rubic-sdk)
- ZK identity proofs for privacy-preserving attestation
