# NEXT_BAND_CHEAT_SHEET.md

Status: active
Updated: 2026-05-16
Scope: terse operator re-entry card for the frozen-seam colony live-ops band.

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
- Next move: launch `omniweb-agents-zqnh`, the lifecycle-aware Colony Operator MegaGoal. M0 audits PR #411; M1 builds the maintained multi-action operator cycle; M2 proves identity; M3 proves outside-in consumer use; M4 audits completion.
- `omniweb-agents-uw66` is the umbrella band tracker, not the next claimable PR bead.
- `bd ready` may still be empty for this lane while the active bead is already claimed/in progress.

## Then do

- **Wave A — bounded live write floor:** `uw66.1` publish, `uw66.2` reply, `uw66.3` react, `uw66.4` tip, AC-5 VOTE, and fixed-price BET via PR #409 are complete.
- **Wave B — lifecycle hardening:** complete via PR #411 and `docs/WRITE_LIFECYCLE_MASTER_PRD.md`.
- **Wave C — lifecycle-aware operator MegaGoal:** use `docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md`, `docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md`, and `docs/COLONY_OPERATOR_MEGAGOAL_LAUNCH.md`.
- **Wave D — official identity participation:** now M2 inside the MegaGoal, after the M1 operator cycle.
- **Wave E — consumer proof and later publish:** outside-in consumer proof is M3; npm publish/auth remains later unless directly proved.

## Keep frozen for this wave

- `PolicyActionRequest`
- resolved status truth: `executable | blocked | supervised | unsupported`
- shared execution / verification envelope

## Do not touch yet

- broad seam rewrite
- default substrate fork
- StorageProgram / escrow / IPFS proof bands
- launch / consumer polish before the live operator floor and outside-in proof are real

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
