---
summary: "Inventory-first import-boundary proof for DemosWork, XM, and Rubic before any package wrapper, probe harness, fixture, CLI, or live-write claim."
read_when: "DemosWork XM Rubic import boundary; raw-only package classification; isolated import probe planning; no-spend hardening"
owner_bead: "omniweb-agents-xs0w.1"
status: "inventory-only"
date: "2026-05-25"
---

# DemosWork XM Rubic Import-Boundary Inventory - 2026-05-25

PR1 artifact for `omniweb-agents-xs0w.1`.

Purpose: record current official-doc, installed-SDK, package-boundary, and
no-spend truth before adding any import probe or fixture.

Scope exclusions:

- no `omni.xm`, `omni.bridge`, or `omni.demoswork` public API
- no CLI command, manifest schema, package export, or wrapper behavior
- no wallet creation, private-key import, signing, bridge execution, workflow execution, broadcast, or spend
- no hosted activation, npm publish, credential mutation, or secret lookup

## Source Refresh

Official docs were refreshed read-only on 2026-05-25.

Docs index:

- source: `https://docs.kynesys.xyz/llms.txt`
- status: fetched successfully
- relevant entries present:
  - `https://docs.kynesys.xyz/sdk/cross-chain/overview.md`
  - `https://docs.kynesys.xyz/sdk/cross-chain/general-layout-of-the-xm-sdks.md`
  - chain pages under `https://docs.kynesys.xyz/sdk/cross-chain/`
  - `https://docs.kynesys.xyz/backend/bridges/rubic-bridge.md`
  - `https://docs.kynesys.xyz/sdk/bridges/rubic-bridge-test.md`
  - `https://docs.kynesys.xyz/sdk/cookbook/swap/crosschain-swap.md`
  - `https://docs.kynesys.xyz/sdk/demoswork.md`
  - DemosWork cookbook pages under `https://docs.kynesys.xyz/sdk/cookbook/demoswork/`

HTTP availability checked:

- `https://docs.kynesys.xyz/sdk/demoswork.md`: 200
- `https://docs.kynesys.xyz/sdk/cross-chain/overview.md`: 200
- `https://docs.kynesys.xyz/sdk/cross-chain/general-layout-of-the-xm-sdks.md`: 200
- `https://docs.kynesys.xyz/backend/bridges/rubic-bridge.md`: 200
- `https://docs.kynesys.xyz/sdk/cookbook/swap/crosschain-swap.md`: 200
- `https://docs.kynesys.xyz/sdk/bridges/rubic-bridge-test.md`: 200

Official API reference availability checked:

- `https://kynesyslabs.github.io/demosdk-api-ref/index.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/classes/demoswork.DemosWork.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/classes/demoswork.BaseOperation.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/classes/demoswork.ConditionalOperation.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/classes/bridge.RubicBridge.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/classes/xmwebsdk.EVM.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/classes/xmcore.EVM.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/modules/demoswork.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/modules/bridge.html`: 200
- `https://kynesyslabs.github.io/demosdk-api-ref/modules/xmwebsdk.html`: 200

## Installed SDK Boundary

Current dependency state:

- root `package.json`: `@kynesyslabs/demosdk` is `^2.11.5`
- root `package-lock.json`: resolved package is `@kynesyslabs/demosdk@2.11.5`
- root installed `node_modules/@kynesyslabs/demosdk/package.json`: version `2.11.5`
- `packages/omniweb-toolkit/package.json`: `@kynesyslabs/demosdk` is an optional peer dependency with range `>=2.11.0`

SDK export metadata exposes raw module entrypoints:

- `@kynesyslabs/demosdk/xmcore`
- `@kynesyslabs/demosdk/xm-websdk`
- `@kynesyslabs/demosdk/xm-localsdk`
- `@kynesyslabs/demosdk/bridge`
- `@kynesyslabs/demosdk/demoswork`

PR1 did not import those modules. Prior package references already record that
combined XM/bridge/DemosWork import experiments can crash the runtime. PR2 must
therefore run every import attempt in an isolated child process.

## Package Surface Boundary

Current `omniweb-toolkit` public surface:

- package exports: `.`, `./agent`, `./types`, `./runtime`, `./write`, `./research-agent-minimal`
- main package entry: no `omni.xm`, `omni.bridge`, or `omni.demoswork`
- package scripts: no XM, Rubic, bridge, or DemosWork script target
- package CLI: no cross-chain, bridge, or workflow command
- package manifest: no XM, bridge, or DemosWork capability namespace

Root repo fallbacks remain outside package surface:

- `src/toolkit/chain/napi-guard.ts` uses a child process because `xmcore` native bindings can crash the agent process.
- `src/plugins/demoswork-plugin.ts` lazy-imports `@kynesyslabs/demosdk/demoswork` and returns an unavailable result when the SDK import fails.
- `src/adapters/skill-dojo/multi-step-operations.ts` is a stub action that validates false because DemosWork is unavailable in the current Node agent runtime.

Those files are blocker evidence, not maintained package wrappers.

## Starting Classification

XM:

- official docs: present for cross-chain overview, general XM SDK layout, chain pages, identities, and XMScript.
- SDK/API source: raw SDK entrypoints exist, but prior import evidence is unstable and must be isolated.
- package behavior: no package namespace, CLI, manifest entry, read fixture, wallet model, gas policy, or chain readback.
- no-spend proof: static-only; no package-level read fixture.
- classification: `raw-only`, `blocked`, `design-needed`.

Rubic:

- official docs: present for backend bridge RPC, SDK bridge tests, and cookbook cross-chain swap.
- SDK/API source: `RubicBridge` API reference is present; raw bridge entrypoint exists.
- package behavior: no bridge namespace, quote helper, mock-trade helper, execute helper, slippage policy, budget policy, or readback contract.
- no-spend proof: no committed quote fixture.
- classification: `raw-only`; quote path `design-needed`; execute and mock-execute paths `blocked`.

DemosWork:

- official docs: present for DemosWork overview, DemosScript model, operations, work steps, operation order, cookbook, and signing/broadcasting path.
- SDK/API source: DemosWork API reference and raw entrypoint exist; prior package history records import blockers.
- package behavior: no DemosWork namespace, CLI, job runner, compile-only helper, manifest entry, or proof/readback lifecycle.
- no-spend proof: static-only; no deterministic compile/validate fixture.
- classification: `raw-only`, `blocked`, `design-needed`.

## PR2 Probe Target

Exact PR2 module attempts:

- `@kynesyslabs/demosdk/xmcore`
- `@kynesyslabs/demosdk/xm-websdk`
- `@kynesyslabs/demosdk/xm-localsdk`
- `@kynesyslabs/demosdk/bridge`
- `@kynesyslabs/demosdk/demoswork`

Required PR2 behavior:

- one child process per module attempt
- parent process must survive child crashes, nonzero exits, and timeouts
- output JSON fields: `module`, `attempted`, `ok`, `exitCode`, `signal`, `error`, `exportKeys`, `testedAt`
- no wallet creation, private-key import, signing, quote execution, bridge execution, workflow execution, `--broadcast`, or live write

PR2 should not add any public package namespace. It should only make the import
boundary observable without risking the agent process.

## Current Verdict

Inventory is complete for PR1:

- official docs and API-reference URLs for XM, Rubic, and DemosWork are present
- installed SDK metadata still points at `@kynesyslabs/demosdk@2.11.5`
- package boundary still excludes XM, bridge, and DemosWork surfaces
- starting classification remains raw-only, blocked, or design-needed
- next step is the isolated child-process import probe, not a wrapper or fixture
