# NEXT_BAND_CHEAT_SHEET.md

Status: active
Updated: 2026-05-25
Scope: terse operator re-entry card after completed consumer-spectrum, hosted no-spend operator proof, full action-spectrum matrix, no-spend operatorHelp stress pass, Phase 24 continuation, full OmniWeb endpoint reconciliation, 0ctx truth hardening, completed controlled proof, sc96 hardening, completed 9st0 successor unblock runway, completed 04c5 docs-backed hardening, and cleanup closeout through PR #543.

## Do first

- `omniweb-agents-0z87` is closed.
- `omniweb-agents-5xp4.8` is closed.
- The blocker-truth / diagnosis wave is closed through PR #382.
- `omniweb-agents-uw66.1` is closed with a bounded live publish proof: chain-confirmed DAHR attestation + publish tx, delayed recent-feed visibility.
- `omniweb-agents-uw66.2` is closed with a bounded live reply proof: chain-confirmed DAHR attestation + reply tx, parent-thread readback, post-detail/thread visibility, degraded recent-feed indexing.
- `omniweb-agents-uw66.3` is closed with a bounded live reaction proof: maintained `agree` execution, first-poll reaction readback.
- `omniweb-agents-uw66.4` is closed with a bounded live tip proof: 1 DEM tip tx confirmed on-chain, post/recipient stats readback still degraded.
- `omniweb-agents-uw66.5` / PR #409 changed the market-write conclusion: fixed-price agentic DEM betting works through headless native args-memo, but same-window active-pool polling can miss it. BTC txs `07a921826d436781685505a05ae967dd5a6c55bd9940cc8153b0bb1c70352440` and `0fb5dda1416130bf3288f5e97aab96c015eacdbfd6605898f2b362b6ae4f8007`, plus ETH tx `7dbee3140aa2b6ef83b6f580db3f52dab0f5531adcbe5653927eb110e86f9471`, resolved in SuperColony winners at block `2265016`.
- PR #411 completed durable write lifecycle/readback. Every maintained write family now has pending-chain / pending-indexer / indexed / resolved / degraded / expired state handling through the lifecycle layer where wired.
- Wave E / `omniweb-agents-capsurf` is complete through PRs #420-#426: runtime capability manifest, official skill coverage, operator discovery, response-depth preservation, multi-action dry-run planning, and skill/playbook slimming.
- PR #427 completed toolkit guardrails.
- PRs #428/#429 completed `omniweb-agents-admissibility`: runtime now has the decision layer that says whether a requested operator action can be planned or executed right now.
- PR #431 completed `uw66.6`: the maintained operator-cycle proof observes live context, selects an action, surfaces maintained alternatives, reports capability/guardrail/lifecycle/supervision/explicit-execute/admissibility truth, and keeps the default verdict no-spend.
- PRs #432-#441 completed the no-release consumer-spectrum and codebase reality lane: official docs/discovery and live endpoint shapes were compared, code reachability/ballast was classified, public exports were normalized, consumer transport/read/chat/webhook/market surfaces were widened, no-spend market write intents were added, and `check:consumer-spectrum-tarball` proves a clean local tarball whole-spectrum consumer install without registry publication.
- Beads epic `omniweb-agents-spectrum` is complete.
- Hosted no-spend operator consumer proof is complete through `omniweb-agents-hosted`: clean local-tarball install, package-name imports, repeated full-spectrum no-spend operator cycles, optional dry-run hosted smoke, drift/degraded ledger, and front-door check wiring. Packet: `docs/HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md`, `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md`, `docs/HOSTED_OPERATOR_CONSUMER_GOAL_LAUNCH.md`.
- Do not relaunch `/goal` for `omniweb-agents-hosted`; future release, public-registry, live-spend, or production hosted-activation work needs a separate explicit lane.
- The full action-spectrum matrix lane is complete.
- The no-spend successor lane `omniweb-agents-operator-stress` is complete through PRs #458-#460. GoalMode packet/status: `docs/goalmode/colony-operator-stress-test-2026-05-19.md`.
- PR #459 stress-tested `capabilityDiscovery.operatorHelp.readCommands`: 92 reads, 48 green, 33 thin, 6 auth-gated, 5 degraded, 0 missing-param/dev-only/broken. Pool horizon samples passed 30m/4h/24h and returned HTTP 400 for sampled 1h/12h fixed and higher/lower pool horizons.
- PR #460 produced execution previews / proposed action packets for all 28 `operatorHelp.writeCommands` without spend, mutation, or broadcast.
- Phase 24 continuation `omniweb-agents-0d7f` is complete through PRs #471-#478. VOTE is green with tx `68532c333cd78f2451cad8c3f376be4292399807c4552fb38d788f7a52e482af` and category-search readback after PR #470/#472 fallback proof. Social remains target-thin DEGRADED/BLOCKED under score >=85 and engagement >=5. Raw-chain advanced proof is green with no spend/no broadcast.
- PR #482 completed the no-spend write/spend sweep. PR #483 closed `omniweb-agents-0ctx.6`: live identity/storage/IPFS/escrow mutation probes now require explicit existing `--agent-name` or `--env-path`.
- `omniweb-agents-3005` is complete after PRs #490, #491, and #495-#500. Keep `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md` as map-of-record evidence, not the immediate next lane.
- `omniweb-agents-0ctx.4` and `omniweb-agents-0ctx.5` are complete; bounded write/spend truth hardening is closed.
- Historical controlled proof packet: `docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md`. It preserved the 10/25 nominal testnet DEM ledger, used `--agent-name colony-operator`, and closed all lanes as `GREEN`, `DEGRADED`, `STUCK`, or `BLOCKED`.
- `omniweb-agents-sc96` is complete. The successor readiness packet is `packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/readiness-report.md`; verdict is still `BLOCKED`.
- `omniweb-agents-9st0` is complete after PR #522, PR #530, and PR #531. It ended in a no-go readiness aggregation and a blocked packet decision with no live authority.
- `omniweb-agents-04c5` is complete after PRs #532-#537. It left docs-backed evidence, the four-column readiness model, and the next-lane decision without live authority.
- `omniweb-agents-8afw` is complete via PR #538: escrow existing-tx readback hardening stayed no-spend and classified the existing tx honestly.
- `omniweb-agents-xqlb` is complete, and cleanup follow-ups `7yvt`, `zpd6`, `pl96`, `e4xu`, and `6tn0` are closed through PR #543.
- After PR #543, open PRs and `bd ready` were empty.
- Active self-audit lane: `omniweb-agents-g2iv`. Work order: `g2iv.1` bundled registry reference links, `g2iv.2` shipped-vs-repo-only script classification, `g2iv.3` shipped script docs/help wiring, `g2iv.4` packaged top-level reference frontmatter, `g2iv.5` `check:skill` gate classification, and `g2iv.6` decision-only next product hardening record.
- No bounded testnet writes are currently authorized. Tx confirmation alone is never success.
- Do not confuse `omniweb-agents-action-spectrum` with historical `omniweb-agents-spectrum`; the latter is the completed consumer-spectrum lane in docs.
- `omniweb-agents-uw66` is the umbrella band tracker, not the next claimable PR bead.
- `bd ready` should not surface `omniweb-agents-hosted.*` after PR5 closes; follow-up work should be new, explicitly scoped Beads.

## Then do

- **Wave A — bounded live write floor:** `uw66.1` publish, `uw66.2` reply, `uw66.3` react, `uw66.4` tip, AC-5 VOTE, and fixed-price BET via PR #409 are complete.
- **Wave B — lifecycle hardening:** complete via PR #411 and `docs/WRITE_LIFECYCLE_MASTER_PRD.md`.
- **Wave C — lifecycle-aware operator MegaGoal:** complete through capability truth, bounded maintained operator publish, higher/lower readback, and accepted no-spend OpenClaw/Gregor runtime-host smoke evidence.
- **Wave D — official identity participation:** q5k8 proved supervised local register, human-link, and cleanup through maintained package paths.
- **Wave E — capability surface:** complete via `omniweb-agents-capsurf` and PRs #420-#426.
- **Post-Wave-E — action admissibility:** complete via PRs #428/#429; capability answers what exists, guardrails answer whether it is safe, admissibility answers whether this action can proceed now.
- **Consumer-spectrum lane:** complete via PRs #432-#441; use the landed checks before proposing cleanup, widening, or release work.
- **Hosted no-spend operator consumer proof:** complete via `omniweb-agents-hosted`; use `npm --prefix packages/omniweb-toolkit run check:frontdoor` or `check:hosted-operator-consumer` for current package proof.
- **Full action-spectrum matrix:** complete via `omniweb-agents-action-spectrum`; use it as the prior evidence base.
- **OperatorHelp stress-test and Phase 24 live-write tranche:** default no-spend pass complete via PRs #458-#460; Phase 24 live continuation is complete through PRs #471-#478, post-sweep hardening is complete through PRs #482-#483, the 0ctx controlled proof packet is complete, sc96 hardening is complete, and the 9st0 no-spend successor unblock runway is complete with no successor live packet.
- **Full OmniWeb endpoint reconciliation:** complete via `omniweb-agents-3005`; use the landed inventories and design doc as reference inputs before later non-colony implementation.
- **Current self-audit band:** launch from `omniweb-agents-g2iv`; make `check:skill` / public package-surface debt green before choosing the next product hardening lane.

## Keep frozen for this wave

- `PolicyActionRequest`
- resolved status truth: `executable | blocked | supervised | unsupported`
- shared execution / verification envelope
- live multi-action execution remains dry-run only unless explicitly widened and authorized
- operator-stress live writes are no longer the active lane; Phase 24 continuation closed the VOTE retry and raw-chain proof, full OmniWeb reconciliation is complete, 04c5/xqlb cleanup is complete, and remaining controlled proof expansion needs its child bead, packet gates, and explicit credential target where relevant
- BET/higher-lower widening is deliberate follow-up, not default spend authority
- no-release posture unless a separate release/auth/public-registry lane is explicitly authorized
- hosted proof means local tarball plus optional dry-run runtime smoke, not production deployment

## Do not touch yet

- broad seam rewrite
- default substrate fork
- StorageProgram / escrow / IPFS execution outside an explicit future successor packet, no-spend preview gates, and PR #483 explicit credential-target guardrail
- launch / consumer polish that skips the completed consumer-spectrum/live-shape/codebase evidence
- npm release, public registry proof, broad substrate rewrite, live multi-action spend outside explicit `omniweb-agents-action-spectrum` child budgets, and unsupervised identity mutation
- live spend or mutation from old `omniweb-agents-operator-stress`, the completed May 23 controlled packet, sc96, 9st0, 04c5, xqlb, cleanup follow-ups, or g2iv; remaining controlled proof work must use a future packet created only after docs-backed evidence, no-spend proof, and explicit `--agent-name colony-operator` or a safer lane-recorded explicit target
- mainnet, real-money, npm release, production hosted activation, secret handling changes, uncontrolled credential/profile mutation, or tx-only success claims while handling the controlled proof packet
- relaunching the completed hosted `/goal` lane as release, public-registry, live-spend, or production hosted-activation work
- production OpenClaw/Gregor activation claims from optional dry-run hosted smoke
- blind deletion or refactor of old toolkit code before reachability/coverage classifies it
- feature widening that skips actual live endpoint response-shape comparison or the completed consumer-spectrum checks
- feature widening that skips official Demos docs, SDK/API/source behavior, package behavior, and no-spend proof alignment

## Execution habits

- one bead = one branch = one PR
- inspect first: `bd show <id>`
- claim before coding: `bd update <id> --claim`
- claim the concrete PR bead, not the umbrella epic
- for g2iv, keep the ordered ladder unless a child records why a later self-audit failure must move earlier; work from `refs/remotes/origin/main`
- serialize `bd` calls in this repo; parallel access to the shared `.beads/embeddeddolt` DB can fail
- keep new follow-up work and durable notes in Beads, not scratch TODO files

## Rule of thumb

- move fast **above** the seam
- harden **below** the seam only from observed live pain and evidence
- inventory first, then widen or delete from proof
