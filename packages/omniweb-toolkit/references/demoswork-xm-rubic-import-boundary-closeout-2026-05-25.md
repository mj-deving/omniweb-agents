---
summary: "Final closeout for the DemosWork/XM/Rubic import-boundary proof lane."
read_when: "DemosWork XM Rubic import-boundary closeout; final classification; next product hardening lane"
owner_bead: "omniweb-agents-xs0w.4"
status: "closeout"
date: "2026-05-25"
---

# DemosWork XM Rubic Import-Boundary Closeout - 2026-05-25

This artifact closes the DemosWork/XM/Rubic import-boundary proof lane.

Scope exclusions held across the lane:

- no `omni.xm`, `omni.bridge`, or `omni.demoswork` public API
- no CLI namespace, manifest entry, package export, wrapper, or runtime behavior
- no wallet creation, private-key import, signing, bridge execution, workflow execution, broadcast, or spend
- no hosted activation, npm publish, credential mutation, or secret lookup

## Landed PRs

- PR #562: source/import/package-boundary inventory.
- PR #563: child-process import probe harness.
- PR #564: no-spend fixture-boundary classification.

## Final Classification

XM:

- final status: `blocked`, `design-needed`
- package state: raw-only; no maintained package namespace, CLI, manifest entry, or fixture
- proof: `xmcore`, `xm-websdk`, and `xm-localsdk` imports failed before stable export keys were available
- next gate: import/runtime dependency stability before any read-only chain fixture

Rubic:

- final status: quote path `design-needed`; execute and mock-execute paths `blocked`
- package state: raw-only; no bridge namespace, quote helper, execute helper, slippage policy, budget policy, or readback contract
- proof: `@kynesyslabs/demosdk/bridge` import exited in a child process with `SIGSEGV`
- next gate: bridge import must produce stable module keys before any quote-only fixture; execute remains out of scope

DemosWork:

- final status: `blocked`, `design-needed`
- package state: raw-only; no DemosWork namespace, CLI, runner, compile helper, manifest entry, or lifecycle/readback model
- proof: `@kynesyslabs/demosdk/demoswork` failed on the existing operations directory import blocker
- next gate: stable import or narrower safe subpath before compile/validate-only fixtures

## Package Front-Door Decision

No package front-door API, CLI, manifest, README quickstart, or public examples
were added because all three domains remain raw-only and blocked or
design-needed.

The reference index was updated so future agents can find the PR1 inventory,
PR3 fixture-boundary result, and this closeout without expanding `SKILL.md`.

## Next-Lane Decision

No concrete residual import-boundary follow-up remains inside this lane.

Do not continue into fixtures, wrappers, or live execution for DemosWork, XM, or
Rubic until new SDK/import evidence changes the current blockers.

The only remaining product-hardening lane in the active roadmap is
IPFS/escrow, and it is evidence-gated: reopen only if new official docs,
SDK/API source behavior, import stability, quote/readback evidence, or product
readback proof changes the current blocked/degraded state.

## Closeout Gate

After this PR lands:

- close `omniweb-agents-xs0w.4`
- close parent epic `omniweb-agents-xs0w`
- do not create a successor bead unless new evidence makes a specific
  import-boundary or IPFS/escrow action executable
