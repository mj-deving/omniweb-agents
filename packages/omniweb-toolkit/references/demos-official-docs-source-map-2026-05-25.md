---
summary: "Official Demos documentation source map for the docs-backed hardening wave before storage/IPFS/escrow, XM/Rubic/DemosWork, readiness-model, and next-lane PRs."
read_when: ["Demos official docs", "docs-backed hardening", "04c5 source map", "storage IPFS escrow", "XM Rubic", "DemosWork", "L2PS", "MCP"]
owner_bead: "omniweb-agents-04c5.2"
status: "source-map-only"
date: "2026-05-25"
---

# Demos Official Docs Source Map - 2026-05-25

This is the PR1 source map for the Demos-docs-backed hardening wave. It records
which official Demos documentation sources downstream PRs must consume before
changing package wrappers, capability/readiness claims, or execution lanes.

This document is intentionally source-map only:

- no wrapper hardening
- no public API addition
- no CLI addition
- no live endpoint probe
- no upload, broadcast, mainnet action, hosted activation, npm release, secret mutation, or DEM spend

Source authority order for this wave:

1. Official Demos docs under `https://docs.kynesys.xyz/`.
2. Official SDK API reference at `https://kynesyslabs.github.io/demosdk-api-ref/`.
3. Local package references and current package source.
4. SuperColony docs only as secondary context for the colony consumer surface.

If an official Demos source is missing or contradicts package history, downstream
work should record the gap and classify the package surface honestly instead of
inventing behavior.

## Source Availability Check

Read-only source availability used for this map:

- `https://docs.kynesys.xyz/llms.txt`
- `https://docs.kynesys.xyz/backend/storage-programs/overview.md`
- `https://docs.kynesys.xyz/sdk/storage-programs/overview.md`
- `https://docs.kynesys.xyz/sdk/storage-programs/api-reference.md`
- `https://docs.kynesys.xyz/sdk/websdk/transactions/overview.md`
- `https://docs.kynesys.xyz/sdk/websdk/transactions/denominations.md`
- `https://docs.kynesys.xyz/sdk/cross-chain/overview.md`
- `https://docs.kynesys.xyz/sdk/cookbook/swap/crosschain-swap.md`
- `https://docs.kynesys.xyz/backend/bridges/rubic-bridge.md`
- `https://docs.kynesys.xyz/sdk/demoswork.md`
- `https://docs.kynesys.xyz/backend/l2ps-subnet-framework/overview.md`
- `https://docs.kynesys.xyz/sdk/websdk/l2ps/overview.md`
- `https://docs.kynesys.xyz/backend/mcp-server/overview.md`
- `https://kynesyslabs.github.io/demosdk-api-ref/index.html`

No live Demos/SuperColony product endpoint, wallet runtime, SDK import probe,
upload, transaction, or broadcast was run for this source map.

## Entry Format

- `url/source`: official URL or local package source to read next
- `topic`: hardening subject covered by the source
- `confidence`: source-map confidence, not implementation-readiness confidence
- `gaps`: missing or contradictory material the consumer PR must resolve
- `consumer`: downstream bead that should consume the entry

## Official Index

- `url/source`: `https://docs.kynesys.xyz/llms.txt`
- `topic`: Canonical machine-readable index for Demos docs pages, OpenAPI spec, SDK API reference, status, explorer, and Discord.
- `confidence`: high
- `gaps`: The index advertises broad Demos docs coverage, but some package-relevant domains are missing named pages, especially IPFS and Escrow.
- `consumer`: `04c5.3`, `04c5.4`, `04c5.5`, `04c5.6`

## Storage Programs

- `url/source`: `https://docs.kynesys.xyz/backend/storage-programs/overview.md`
- `topic`: Backend architecture for Storage Programs as GCR-backed key-value containers.
- `confidence`: high
- `gaps`: Backend page explains system model; it is not enough to promote package write wrappers without SDK method and readback evidence.
- `consumer`: `04c5.3`

- `url/source`: `https://docs.kynesys.xyz/sdk/storage-programs/overview.md`
- `topic`: SDK-facing Storage Programs overview, including deterministic addresses, consensus-backed writes, RPC reads, and payload limits.
- `confidence`: high
- `gaps`: Narrative overview needs reconciliation with exact current package wrappers and current installed SDK/source behavior.
- `consumer`: `04c5.3`

- `url/source`: `https://docs.kynesys.xyz/sdk/storage-programs/api-reference.md`
- `topic`: Storage Program API signatures for `Demos.storagePrograms.sign/read`, `StorageProgram` static helpers, payload types, constants, and guards.
- `confidence`: high
- `gaps`: Must be compared against installed package/runtime behavior before changing `omni.storage` or probes.
- `consumer`: `04c5.3`

- `url/source`: `https://docs.kynesys.xyz/sdk/storage-programs/access-control.md`, `https://docs.kynesys.xyz/sdk/storage-programs/operations.md`, `https://docs.kynesys.xyz/sdk/storage-programs/rpc-queries.md`, `https://docs.kynesys.xyz/sdk/cookbook/storage-programs/overview.md`, `https://docs.kynesys.xyz/sdk/cookbook/storage-programs/examples.md`
- `topic`: Storage ACL, operation lifecycle, no-spend RPC reads, and cookbook recipes.
- `confidence`: high
- `gaps`: Cookbook examples include write/broadcast flows; downstream PR must keep create/set/delete behind explicit live authority.
- `consumer`: `04c5.3`

## WebSDK Transactions And Denominations

- `url/source`: `https://docs.kynesys.xyz/sdk/websdk/transactions/overview.md`
- `topic`: WebSDK transaction families: native, crosschain, Web2, and DemosWork.
- `confidence`: high
- `gaps`: Overview is taxonomy only. It does not by itself define package-safe wrapper boundaries or readback rules.
- `consumer`: `04c5.5`, `04c5.6`

- `url/source`: `https://docs.kynesys.xyz/sdk/websdk/transactions/denominations.md`
- `topic`: DEM versus OS denomination model, `OS_PER_DEM`, BigInt OS preferred path, fork detection, and sub-DEM precision guard.
- `confidence`: high
- `gaps`: Downstream work must reconcile this with existing raw-transfer and escrow artifacts, especially historical integer-only/fractional DEM blockers.
- `consumer`: `04c5.3`, `04c5.5`, `04c5.6`

- `url/source`: `https://docs.kynesys.xyz/sdk/websdk/transactions/creating-a-transaction.md`, `https://docs.kynesys.xyz/sdk/websdk/transactions/signing-a-transaction.md`, `https://docs.kynesys.xyz/sdk/websdk/transactions/broadcasting-a-transaction.md`
- `topic`: Transaction creation, signing, confirm, and broadcast lifecycle.
- `confidence`: medium
- `gaps`: The source-map pass did not deep-read these pages. Downstream PRs should inspect them when updating lifecycle/readiness claims.
- `consumer`: `04c5.5`, `04c5.6`

## Escrow

- `url/source`: `https://docs.kynesys.xyz/llms.txt`
- `topic`: Official docs index scan for escrow coverage.
- `confidence`: high for absence from index
- `gaps`: No named Escrow page appeared in the official docs index on 2026-05-25. `04c5.3` must treat package escrow as SDK/source/package-evidence-led until an official Escrow page or API-ref deep link is found.
- `consumer`: `04c5.3`

- `url/source`: `https://kynesyslabs.github.io/demosdk-api-ref/index.html`
- `topic`: Official SDK API reference as the likely source for escrow classes/types if present.
- `confidence`: medium
- `gaps`: The top-level API reference does not provide a simple escrow guide. Downstream work must deep-link exact Escrow class/type pages or record the gap.
- `consumer`: `04c5.3`

- `url/source`: `packages/omniweb-toolkit/references/storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- `topic`: Current local escrow wrapper/proof/readback inventory.
- `confidence`: high as local package history, secondary to official Demos docs
- `gaps`: Local inventory is not official platform documentation. Use it to locate current package behavior and blockers, not to override missing official docs.
- `consumer`: `04c5.3`

## IPFS

- `url/source`: `https://docs.kynesys.xyz/llms.txt`
- `topic`: Official docs index scan for IPFS coverage.
- `confidence`: high for absence from index
- `gaps`: No named IPFS page appeared in the official docs index on 2026-05-25. `04c5.3` must not infer upload/pin/unpin readiness from package wrappers alone.
- `consumer`: `04c5.3`

- `url/source`: `https://kynesyslabs.github.io/demosdk-api-ref/index.html`
- `topic`: Official SDK API reference as the likely source for IPFS classes/types if present.
- `confidence`: medium
- `gaps`: The top-level API reference does not provide a simple IPFS guide. Downstream work must deep-link exact IPFS class/type pages or record the gap.
- `consumer`: `04c5.3`

- `url/source`: `packages/omniweb-toolkit/references/storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- `topic`: Current local IPFS wrapper/proof/quote-readback inventory.
- `confidence`: high as local package history, secondary to official Demos docs
- `gaps`: Local quote blockers and package fallbacks need official-docs and installed-SDK reconciliation before any wrapper promotion.
- `consumer`: `04c5.3`

## XM And Cross-Chain SDK

- `url/source`: `https://docs.kynesys.xyz/sdk/cross-chain/overview.md`
- `topic`: XM cross-chain SDK overview, web SDK versus local SDK split, supported blockchains.
- `confidence`: high
- `gaps`: Overview names families but not package-safe import, wallet, gas, readback, or mutation boundaries.
- `consumer`: `04c5.4`

- `url/source`: `https://docs.kynesys.xyz/sdk/cross-chain/general-layout-of-the-xm-sdks.md`, plus chain-specific pages under `https://docs.kynesys.xyz/sdk/cross-chain/`
- `topic`: Common XM SDK shape and per-chain adapters for EVM, Solana, Bitcoin, IBC, TON, XRPL, NEAR, Aptos, TRON, MultiversX, TEN, and identity links.
- `confidence`: medium
- `gaps`: The source-map pass identified these pages from the index but did not deep-read each chain page. `04c5.4` should only classify methods after exact chain-page and installed-SDK comparison.
- `consumer`: `04c5.4`

- `url/source`: `packages/omniweb-toolkit/references/xm-rubic-capability-inventory-2026-05-22.md`
- `topic`: Current local XM/Rubic raw-only/import-blocker/package-boundary inventory.
- `confidence`: high as local package history, secondary to official Demos docs
- `gaps`: Local import blocker must be rechecked against current installed SDK behavior before changing package classification.
- `consumer`: `04c5.4`

## Rubic Bridge

- `url/source`: `https://docs.kynesys.xyz/backend/bridges/rubic-bridge.md`
- `topic`: Node-side Rubic bridge RPC surface: `get_trade`, `execute_trade`, and `execute_mock_trade`.
- `confidence`: high
- `gaps`: Backend page documents quote/execute plumbing but not package wrapper readiness, budget, slippage, or readback policy.
- `consumer`: `04c5.4`

- `url/source`: `https://docs.kynesys.xyz/sdk/cookbook/swap/crosschain-swap.md`
- `topic`: SDK RubicBridge usage, `getTrade`, `executeTrade`, payload shape, source-chain units, and supported token keys.
- `confidence`: high
- `gaps`: `executeTrade` is spendful/cross-chain. `04c5.4` should keep quote-only and execute boundaries separate.
- `consumer`: `04c5.4`

- `url/source`: `https://docs.kynesys.xyz/sdk/bridges/rubic-bridge-test.md`
- `topic`: Rubic bridge tests and mocked versus real-funds execution.
- `confidence`: high
- `gaps`: Test docs explicitly include real-funds setup. Do not use them as no-spend proof of execute readiness.
- `consumer`: `04c5.4`

## DemosWork

- `url/source`: `https://docs.kynesys.xyz/sdk/demoswork.md`
- `topic`: DemosWork core model: `DemosScript`, work steps, operations, operation order, and API reference links.
- `confidence`: high
- `gaps`: The page documents composition and classes, but package readiness still depends on current SDK import behavior and execution/readback lifecycle.
- `consumer`: `04c5.4`

- `url/source`: `https://docs.kynesys.xyz/sdk/cookbook/demoswork/overview.md`, `https://docs.kynesys.xyz/sdk/cookbook/demoswork/creating-work-steps.md`, `https://docs.kynesys.xyz/sdk/cookbook/demoswork/base-operation.md`, `https://docs.kynesys.xyz/sdk/cookbook/demoswork/conditional-operation.md`, `https://docs.kynesys.xyz/sdk/cookbook/demoswork/signing-and-broadcasting.md`
- `topic`: DemosWork cookbook coverage for web2/native/xm steps, base and conditional operations, and payload signing/broadcasting.
- `confidence`: high
- `gaps`: Cookbook contains execution paths. `04c5.4` must separate compile/validate-only from sign/confirm/broadcast/readback.
- `consumer`: `04c5.4`

- `url/source`: `packages/omniweb-toolkit/references/demoswork-capability-inventory-2026-05-22.md`
- `topic`: Current local DemosWork raw-only/import-blocker/package-boundary inventory.
- `confidence`: high as local package history, secondary to official Demos docs
- `gaps`: Local ESM/import blocker must be refreshed against current installed SDK behavior before wrapper decisions.
- `consumer`: `04c5.4`

## L2PS

- `url/source`: `https://docs.kynesys.xyz/backend/l2ps-subnet-framework/overview.md`
- `topic`: Backend L2PS architecture: encrypted transactions, batch rollups, ZK proofs, transaction lifecycle, transaction fee, and node participation.
- `confidence`: high
- `gaps`: Backend architecture includes a 1 DEM transaction fee; package readiness must distinguish docs-backed concept from current SDK wrapper/proof status.
- `consumer`: `04c5.5`, `04c5.6`

- `url/source`: `https://docs.kynesys.xyz/backend/l2ps-subnet-framework/how-are-l2ps-transactions-handled.md`, `https://docs.kynesys.xyz/backend/l2ps-subnet-framework/quickstart.md`
- `topic`: Node-side L2PS transaction handling and quickstart.
- `confidence`: medium
- `gaps`: Source-map pass identified these pages from the index but did not deep-read them. Downstream work should inspect before readiness or execution-lane decisions.
- `consumer`: `04c5.5`, `04c5.6`

- `url/source`: `https://docs.kynesys.xyz/sdk/websdk/l2ps/overview.md`
- `topic`: SDK L2PS surface: `@kynesyslabs/demosdk/l2ps`, `L2PS.create`, `encryptTx`, `decryptTx`, instance registry, and config object.
- `confidence`: high
- `gaps`: L2PS wraps ordinary signed transactions; downstream work must keep encryption/composition distinct from broadcast and spend authority.
- `consumer`: `04c5.5`, `04c5.6`

## MCP And Backend Docs

- `url/source`: `https://docs.kynesys.xyz/backend/mcp-server/overview.md`
- `topic`: Demos node MCP server overview, transports, automatic startup, state tracking, and scope.
- `confidence`: high
- `gaps`: MCP is backend/node integration, not package runtime proof. Do not expose package MCP claims without exact tool/status verification.
- `consumer`: `04c5.5`, `04c5.6`

- `url/source`: `https://docs.kynesys.xyz/backend/mcp-server/architecture.md`, `https://docs.kynesys.xyz/backend/mcp-server/available-tools.md`, `https://docs.kynesys.xyz/backend/mcp-server/client-usage.md`, `https://docs.kynesys.xyz/backend/mcp-server/configuration.md`, `https://docs.kynesys.xyz/backend/mcp-server/monitoring-endpoint.md`, `https://docs.kynesys.xyz/backend/mcp-server/troubleshooting.md`
- `topic`: MCP architecture, tool catalog, remote SSE usage, config, monitoring, and troubleshooting.
- `confidence`: medium
- `gaps`: Source-map pass identified these pages from the index but did not deep-read each one. Use exact pages before any MCP/backend readiness claim.
- `consumer`: `04c5.5`, `04c5.6`

- `url/source`: `https://docs.kynesys.xyz/backend/developers-testbed/overview.md`, `https://docs.kynesys.xyz/backend/developers-testbed/running-the-node.md`, `https://docs.kynesys.xyz/cookbook/project-setup/overview.md`
- `topic`: Backend node/dev-testbed setup and runtime docs.
- `confidence`: medium
- `gaps`: These docs are useful for backend environment context only; this wave must not activate hosted/node runtime or mutate secrets.
- `consumer`: `04c5.5`, `04c5.6`

## SDK API References

- `url/source`: `https://kynesyslabs.github.io/demosdk-api-ref/index.html`
- `topic`: Official TypeDoc API reference for package exports, modules, classes, interfaces, and variables.
- `confidence`: high as an official API-reference entrypoint; medium for any class until deep-linked
- `gaps`: Downstream PRs should deep-link exact class/type pages when making claims about `Demos`, `DemosWork`, `RubicBridge`, `L2PS`, storage, IPFS, escrow, denomination, or XM classes. Top-level API docs alone are not enough.
- `consumer`: `04c5.3`, `04c5.4`, `04c5.5`, `04c5.6`

## Local Package References To Consume After Official Docs

- `url/source`: `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- `topic`: Existing package-local SDK/RPC inventory and current `omni.chain` coverage.
- `confidence`: high as local package history
- `gaps`: Needs official transaction/denomination and current installed-SDK reconciliation before readiness-model updates.
- `consumer`: `04c5.5`, `04c5.6`

- `url/source`: `packages/omniweb-toolkit/references/storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- `topic`: Existing package-local storage/IPFS/escrow inventory.
- `confidence`: high as local package history
- `gaps`: Official docs now strongly cover Storage Programs, but not IPFS/Escrow in the docs index. `04c5.3` must split those confidence levels.
- `consumer`: `04c5.3`

- `url/source`: `packages/omniweb-toolkit/references/xm-rubic-capability-inventory-2026-05-22.md`
- `topic`: Existing package-local XM/Rubic inventory.
- `confidence`: high as local package history
- `gaps`: Must be refreshed against official Rubic/XM docs and current installed-SDK import behavior.
- `consumer`: `04c5.4`

- `url/source`: `packages/omniweb-toolkit/references/demoswork-capability-inventory-2026-05-22.md`
- `topic`: Existing package-local DemosWork inventory.
- `confidence`: high as local package history
- `gaps`: Must be refreshed against official DemosWork docs and current installed-SDK import behavior.
- `consumer`: `04c5.4`

- `url/source`: `packages/omniweb-toolkit/references/identity-attestation-messaging-network-crypto-inventory-2026-05-22.md`
- `topic`: Existing package-local identity, DAHR/TLSN, messaging, network/governance, L2PS, and crypto/ZK inventory.
- `confidence`: high as local package history
- `gaps`: Use for L2PS/MCP/backend readiness only after official L2PS/MCP docs are read.
- `consumer`: `04c5.5`, `04c5.6`

## Downstream Consumer Checklist

`04c5.3` storage/IPFS/escrow reconciliation should consume:

- official storage backend, SDK, API, ACL, operations, RPC, and cookbook docs
- official transaction/denomination docs
- official SDK API reference with exact Storage/IPFS/Escrow class/type deep links
- local `storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- existing `9st0` / `sc96` / `0ctx` readiness artifacts as package proof history

`04c5.4` XM/Rubic/DemosWork reconciliation should consume:

- official XM overview and chain-specific docs
- official Rubic backend, SDK cookbook, and test docs
- official DemosWork overview and cookbook docs
- official SDK API reference with exact XM/Rubic/DemosWork class/type deep links
- local XM/Rubic and DemosWork inventories

`04c5.5` readiness evidence model should consume:

- official transaction lifecycle and denomination docs
- official SDK API reference
- official L2PS and MCP/backend docs where the readiness model mentions those domains
- package inventory docs for current package behavior and no-spend proof boundaries

`04c5.6` next executable lane decision should consume:

- outputs from `04c5.3`, `04c5.4`, and `04c5.5`
- this source map for any unresolved official-docs gaps
- source-map gaps for IPFS/Escrow official docs before deciding whether escrow remains first

## Current Verdict

The source-map pass is complete for PR1:

- official Demos docs now provide strong coverage for Storage Programs, WebSDK transactions/denominations, XM/cross-chain, Rubic, DemosWork, L2PS, MCP/backend docs, and SDK API-reference entrypoints
- official docs index did not expose named IPFS or Escrow pages on 2026-05-25
- IPFS and Escrow must therefore be reconciled as official-doc gaps plus SDK API/source/package behavior in `04c5.3`
- no package behavior, public API, live proof, spend, upload, broadcast, or hosted/runtime state changed
