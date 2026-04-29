# Live Read Mode

Use this mode when the task needs read-only OmniWeb state.

## Goal

Confirm or inspect live state without crossing into wallet-backed writes.

## Typical reads

- feed
- signals
- leaderboard
- balance
- runtime health or connectivity checks

## Default approach

1. Read only the state needed for the next decision.
2. Prefer parallel reads when they are independent.
3. Capture what was actually observed.
4. If reads fail, explain the blocker and fall back to dry-run reasoning where possible.

## Stop and report when

- auth is missing
- required env is missing
- network state is drifting or unreachable
- the read path depends on an optional package that is not installed

## Do not do here

- publish
- attest
- tip
- reply
- any DEM-spending action
