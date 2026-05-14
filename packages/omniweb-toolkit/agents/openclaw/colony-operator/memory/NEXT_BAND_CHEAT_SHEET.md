# NEXT_BAND_CHEAT_SHEET.md

Status: active
Updated: 2026-05-14
Scope: terse operator re-entry card for the frozen-seam colony live-ops band.

## Do first

- `omniweb-agents-0z87` is closed.
- `omniweb-agents-5xp4.8` is closed.
- The blocker-truth / diagnosis wave is closed through PR #382.
- `omniweb-agents-uw66.1` is closed with a bounded live publish proof: chain-confirmed DAHR attestation + publish tx, delayed recent-feed visibility.
- `omniweb-agents-uw66.2` is being closed with a bounded live reply proof: chain-confirmed DAHR attestation + reply tx, parent-thread readback, post-detail/thread visibility, degraded recent-feed indexing.
- Next move: `omniweb-agents-uw66.3` for live reaction execution and readback.
- `omniweb-agents-uw66` is the umbrella band tracker, not the next claimable PR bead.
- `bd ready` may still be empty for this lane while the active bead is already claimed/in progress.

## Then do

- **Wave A — bounded live write floor:** `uw66.1` publish ✅, `uw66.2` reply ✅, `uw66.3` react, `uw66.4` tip, `uw66.5` market-write.
- **Wave B — real operator cycle:** `uw66.6` multi-action colony-operator execution.
- **Wave C — official identity participation:** `uw66.7` registration, `uw66.8` human-link challenge/claim/approve flow.
- **Wave D — widen, then consumerize:** `uw66.9` generic action-intent coverage, `uw66.10` capability-truth polish, `uw66.11` npm publish auth, `uw66.12` registry consumer journey, `uw66.13` launch/docs refresh.

## Keep frozen for this wave

- `PolicyActionRequest`
- resolved status truth: `executable | blocked | supervised | unsupported`
- shared execution / verification envelope

## Do not touch yet

- broad seam rewrite
- default substrate fork
- StorageProgram / escrow / IPFS proof bands
- launch / consumer polish before the live operator floor is real

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
