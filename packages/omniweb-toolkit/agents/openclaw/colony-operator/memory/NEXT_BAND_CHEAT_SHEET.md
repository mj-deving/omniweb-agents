# NEXT_BAND_CHEAT_SHEET.md

Status: active
Updated: 2026-05-18
Scope: terse operator re-entry card after PR #431 / `uw66.6`.

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
- Next lane: consumer-spectrum and codebase reality map before widening implementation. Compare official SuperColony docs/discovery, actual live endpoint response shapes, and local toolkit/code reachability. Do not reopen capability, guardrails, admissibility, or the maintained operator-cycle report surface as upcoming architecture work.
- Active Beads epic: `omniweb-agents-spectrum`; current docs/bead sync: `omniweb-agents-spectrum.0`; first implementation slice: `omniweb-agents-spectrum.1`.
- `omniweb-agents-uw66` is the umbrella band tracker, not the next claimable PR bead.
- `bd ready` may still be empty for this lane while the active bead is already claimed/in progress.

## Then do

- **Wave A — bounded live write floor:** `uw66.1` publish, `uw66.2` reply, `uw66.3` react, `uw66.4` tip, AC-5 VOTE, and fixed-price BET via PR #409 are complete.
- **Wave B — lifecycle hardening:** complete via PR #411 and `docs/WRITE_LIFECYCLE_MASTER_PRD.md`.
- **Wave C — lifecycle-aware operator MegaGoal:** complete through capability truth, bounded maintained operator publish, higher/lower readback, and accepted no-spend OpenClaw/Gregor runtime-host smoke evidence.
- **Wave D — official identity participation:** q5k8 proved supervised local register, human-link, and cleanup through maintained package paths.
- **Wave E — capability surface:** complete via `omniweb-agents-capsurf` and PRs #420-#426.
- **Post-Wave-E — action admissibility:** complete via PRs #428/#429; capability answers what exists, guardrails answer whether it is safe, admissibility answers whether this action can proceed now.
- **Next lane — consumer-spectrum inventory:** build a repeatable map across official docs/cards/skill/OpenAPI, live endpoint response shapes, current toolkit surfaces, and codebase reachability/deadweight before package widening.

## Keep frozen for this wave

- `PolicyActionRequest`
- resolved status truth: `executable | blocked | supervised | unsupported`
- shared execution / verification envelope
- live multi-action execution remains dry-run only unless explicitly widened and authorized
- BET/higher-lower widening is deliberate follow-up, not default spend authority
- no-release posture while the consumer-spectrum inventory is incomplete

## Do not touch yet

- broad seam rewrite
- default substrate fork
- StorageProgram / escrow / IPFS proof bands
- launch / consumer polish before the consumer-spectrum/live-shape/codebase inventory is real
- npm release, public registry proof, broad substrate rewrite, live multi-action spend, and unsupervised identity mutation
- blind deletion or refactor of old toolkit code before reachability/coverage classifies it
- feature widening that skips actual live endpoint response-shape comparison

## Execution habits

- one bead = one branch = one PR
- inspect first: `bd show <id>`
- claim before coding: `bd update <id> --claim`
- claim the concrete PR bead, not the umbrella epic
- serialize `bd` calls in this repo; parallel access to the shared `.beads/embeddeddolt` DB can fail
- keep new follow-up work and durable notes in Beads, not scratch TODO files

## Rule of thumb

- move fast **above** the seam
- harden **below** the seam only from observed live pain and evidence
- inventory first, then widen or delete from proof
