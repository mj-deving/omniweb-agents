# NEXT_BAND_CHEAT_SHEET.md

Status: active
Updated: 2026-05-15
Scope: terse operator re-entry card for the frozen-seam colony live-ops band.

## Do first

- `omniweb-agents-0z87` is closed.
- `omniweb-agents-5xp4.8` is closed.
- The blocker-truth / diagnosis wave is closed through PR #382.
- `omniweb-agents-uw66.1` is closed with a bounded live publish proof: chain-confirmed DAHR attestation + publish tx, delayed recent-feed visibility.
- `omniweb-agents-uw66.2` is closed with a bounded live reply proof: chain-confirmed DAHR attestation + reply tx, parent-thread readback, post-detail/thread visibility, degraded recent-feed indexing.
- `omniweb-agents-uw66.3` is closed with a bounded live reaction proof: maintained `agree` execution, first-poll reaction readback.
- `omniweb-agents-uw66.4` is closed with a bounded live tip proof: 1 DEM tip tx confirmed on-chain, post/recipient stats readback still degraded.
- `omniweb-agents-uw66.5` is blocked by `omniweb-agents-3myq`: a plain 5 DEM fixed-price transfer tx confirmed on-chain, but `/api/bets/place` rejected registration as `wrong_tx_type` and pool readback stayed unchanged. Raw `content.type: "transfer"` envelopes are disproven as a local workaround. A memo-bearing `native-content-memo` tx (`4acb9f76d54a96415e77d3639af591355efd42f598850295852c4cfea72cf4f1`, `HIVE_BET:SOL:89:4h`) later confirmed at block `2264378` and balance readback moved `1747 -> 1741`, but SOL 4h pool readback stayed `totalBets=0,totalDem=0`; manual registration recovery returned `wrong_sender`.
- Next move: local adoption first. Probe the live web-wallet `nativeTransfer` path through `wallet-native-transfer`, require pool readback as the only pass condition, keep memo-transfer candidates diagnostic, and route active predictions through VOTE/PREDICTION while DEM pool readback remains unavailable.
- `omniweb-agents-uw66` is the umbrella band tracker, not the next claimable PR bead.
- `bd ready` may still be empty for this lane while the active bead is already claimed/in progress.

## Then do

- **Wave A — bounded live write floor:** `uw66.1` publish ✅, `uw66.2` reply ✅, `uw66.3` react ✅, `uw66.4` tip ✅, `uw66.5` market-write blocked on `3myq`.
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
