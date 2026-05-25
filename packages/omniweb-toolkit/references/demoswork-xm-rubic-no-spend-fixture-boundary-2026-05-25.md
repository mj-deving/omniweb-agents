---
summary: "No-spend fixture-boundary classification for DemosWork, XM, and Rubic after the isolated import probe."
read_when: "DemosWork XM Rubic no-spend fixture boundary; import probe results; fixture-green blocked design-needed classification"
owner_bead: "omniweb-agents-xs0w.3"
status: "fixture-boundary-only"
date: "2026-05-25"
---

# DemosWork XM Rubic No-Spend Fixture Boundary - 2026-05-25

PR3 artifact for `omniweb-agents-xs0w.3`.

Purpose: decide whether deterministic no-spend fixtures can be added after PR2
made import behavior observable in isolated child processes.

Scope exclusions:

- no `omni.xm`, `omni.bridge`, or `omni.demoswork` public API
- no CLI namespace, manifest entry, package export, wrapper, or runtime behavior change
- no wallet creation, private-key import, signing, quote execution, bridge execution, workflow execution, broadcast, or spend
- no hosted activation, npm publish, credential mutation, or secret lookup

## Inputs

Primary inputs:

- `packages/omniweb-toolkit/references/demoswork-xm-rubic-import-boundary-inventory-2026-05-25.md`
- `packages/omniweb-toolkit/scripts/probe-import-boundary.ts`
- `packages/omniweb-toolkit/references/hardening-readiness-evidence-model-2026-05-25.md`

Probe command:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-import-boundary.ts
```

Local execution note:

- The clean worktree did not have its own `node_modules`, so the probe was run
  from the root checkout with the PR3 script path. The resolved SDK was still
  the installed `@kynesyslabs/demosdk@2.11.5` recorded by PR1.
- The probe contract remained no-spend: imports only, one child process per
  module, no wallet, no signing, no bridge/workflow execution, no broadcast.

## Probe Result

Probe checked at: `2026-05-25T22:05:10.538Z`.

Overall result:

- `ok`: false
- `resultCount`: 5
- required per-result fields: present
- parent process: survived all child exits
- child crash captured: `@kynesyslabs/demosdk/bridge` exited with `SIGSEGV`

Per-module result:

- `@kynesyslabs/demosdk/xmcore`
  - status: failed import
  - exitCode: 1
  - blocker: unresolved `cosmjs-types/cosmos/tx/v1beta1/tx` ESM path from `build/multichain/core/ibc.js`

- `@kynesyslabs/demosdk/xm-websdk`
  - status: failed import
  - exitCode: 1
  - blocker: unsupported directory import from `build/multichain/core/ton.js`

- `@kynesyslabs/demosdk/xm-localsdk`
  - status: failed import
  - exitCode: 1
  - blocker: unresolved `near-api-js/lib/transaction` ESM path from `build/multichain/localsdk/near.js`

- `@kynesyslabs/demosdk/bridge`
  - status: child crash
  - signal: `SIGSEGV`
  - blocker: bridge import can still kill the child process

- `@kynesyslabs/demosdk/demoswork`
  - status: failed import
  - exitCode: 1
  - blocker: unsupported directory import from `build/demoswork/operations/baseoperation.js`

## Fixture Boundary Verdict

XM:

- verdict: `blocked`
- secondary classification: `design-needed`
- fixture-green: false
- proof: all three XM-family module targets failed before any stable export keys were available.
- no-spend fixture decision: do not add read-only chain fixtures yet.
- next allowed work: fix or isolate import/runtime dependencies first; then choose one explicit read-only chain fixture with no wallet and no signing.

Rubic:

- verdict: `blocked`
- secondary classification: quote path `design-needed`; execute path `blocked`
- fixture-green: false
- proof: `@kynesyslabs/demosdk/bridge` child exited with `SIGSEGV`.
- no-spend fixture decision: do not add quote fixtures yet, even though official docs describe `RubicBridge.getTrade`.
- next allowed work: quote-only design after bridge import can produce stable module keys without crashing; execute/mock-execute stay out of scope.

DemosWork:

- verdict: `blocked`
- secondary classification: `design-needed`
- fixture-green: false
- proof: `@kynesyslabs/demosdk/demoswork` failed before stable export keys due the existing operations directory import blocker.
- no-spend fixture decision: do not add compile/validate fixtures yet.
- next allowed work: compile/validate-only design after DemosWork import is stable or a narrower safe subpath is proven; signing, confirm, broadcast, and readback remain separate later stages.

## Current Verdict

No PR3 fixture was added because PR2 did not prove a safe import boundary for
any target domain.

Final PR3 classifications:

- XM: `blocked`, `design-needed`
- Rubic: `blocked`; quote `design-needed`; execute `blocked`
- DemosWork: `blocked`, `design-needed`

This keeps the lane no-spend and prevents fixture names from implying package
readiness where the installed SDK still fails or crashes at import time.
