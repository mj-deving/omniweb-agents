---
summary: "Docs-backed no-spend reconciliation of XM, Rubic, and DemosWork for the 04c5 hardening wave."
read_when: ["04c5.4", "XM Rubic DemosWork reconciliation", "Demos official docs", "no-spend hardening"]
owner_bead: "omniweb-agents-04c5.4"
status: "reconciliation-only"
date: "2026-05-25"
---

# XM Rubic DemosWork Docs Reconciliation - 2026-05-25

This PR3 artifact reconciles XM, Rubic, and DemosWork against the official
Demos docs source map, current installed SDK import behavior, local package
boundaries, and no-spend evidence.

Scope exclusions:

- no `omni.xm`, `omni.bridge`, or `omni.demoswork` public API
- no CLI command, manifest schema, or package behavior change
- no wallet creation, private-key import, transaction signing, bridge execution, workflow execution, broadcast, or spend
- no hosted activation, npm release, credential mutation, or secret lookup

Evidence model:

- `official-docs`: official docs under `docs.kynesys.xyz` and the official SDK API reference
- `sdk-api-source`: current installed dependency/import behavior plus known SDK/source map
- `package-behavior`: current `omniweb-toolkit` package surface and root-only fallbacks
- `no-spend-proof`: committed static/import evidence only

Status vocabulary:

- `maintained`: package-owned surface with docs, implementation, and proof
- `raw-only`: raw SDK/source behavior exists, but the package should not claim a maintained wrapper
- `blocked`: import/runtime/proof blocker prevents honest execution
- `design-needed`: public namespace, lifecycle, safety, or readback semantics are not yet designed

## Source Inputs

- `packages/omniweb-toolkit/references/demos-official-docs-source-map-2026-05-25.md`
- `packages/omniweb-toolkit/references/xm-rubic-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demoswork-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/demos-sdk-rpc-capability-inventory-2026-05-22.md`
- `src/plugins/chain-query-plugin.ts`
- `src/toolkit/chain/napi-guard.ts`
- `src/plugins/demoswork-plugin.ts`
- `src/adapters/skill-dojo/multi-step-operations.ts`

Read-only checks performed for this artifact:

- fetched official docs pages for cross-chain overview, Rubic bridge, cross-chain swap, and DemosWork
- scanned `https://docs.kynesys.xyz/llms.txt` for XM, Rubic, DemosWork, and related bridge pages
- attempted a Bun import check for `@kynesyslabs/demosdk/xmcore`, `@kynesyslabs/demosdk/bridge`, and `@kynesyslabs/demosdk/demoswork`
- inspected existing package references and package exports

## XM

Verdict: `raw-only`, `blocked`, and `design-needed`.

Reason codes:

- `official_xm_docs_present`
- `xm_supported_chain_list_present`
- `xm_import_crashes_bun_native_module`
- `package_has_no_xm_namespace`
- `read_and_write_methods_not_separated`
- `chain_wallet_rpc_fee_policy_missing`

Evidence:

- `official-docs`: official cross-chain docs define XM SDKs for browser and Node runtimes and list supported chains: EVM, MultiversX, Solana, IBC, Bitcoin, TEN, TON, XRPL, NEAR, Aptos, and TRON. The official docs also include chain-specific pages and cross-chain identity pages.
- `sdk-api-source`: the no-spend Bun import probe crashed while loading a native module through the XM/bridge/DemosWork import set. This reinforces the existing `napi-guard.ts` pattern: import experimentation must stay isolated from the agent process.
- `package-behavior`: `omniweb-toolkit` exposes no `omni.xm` namespace, CLI, or manifest entry. Root `chain-query-plugin.ts` is outside package public surface and queries Demos native RPC, not the XM chain adapters.
- `no-spend-proof`: no package-level XM read fixture, chain fixture, gas model, wallet model, or readback proof exists. Existing inventory is static-only and import-blocked.

Classification:

- keep XM as raw-only and blocked for package hardening
- do not promote chain adapters into a public package namespace from official overview alone
- separate read-only chain fixtures from signing, transfers, contract writes, account lifecycle, and cross-chain identity mutation before any future package work

Next safe boundary:

- first future lane should be isolated import-guard hardening plus one read-only chain fixture, not generic `omni.xm` exposure.

## Rubic

Verdict: `raw-only`, quote path `design-needed`, execute path `blocked`.

Reason codes:

- `official_rubic_docs_present`
- `quote_and_execute_are_distinct`
- `rubic_amounts_are_foreign_chain_units`
- `execute_trade_is_spendful_cross_chain`
- `package_has_no_bridge_namespace`
- `import_runtime_unstable`

Evidence:

- `official-docs`: official backend docs describe bridge RPC methods `get_trade`, `execute_trade`, and `execute_mock_trade`. Official cookbook docs describe `RubicBridge.getTrade` for quotes and `RubicBridge.executeTrade` for committing a swap. Amounts and chain IDs refer to the foreign source chain, not DEM or OS.
- `sdk-api-source`: the combined Bun import probe crashed before producing safe module keys. Existing inventory also records import instability for `@kynesyslabs/demosdk/xmcore`/`bridge`.
- `package-behavior`: the package exposes no bridge namespace, quote helper, mock-trade helper, execute helper, budget policy, slippage policy, or readback contract.
- `no-spend-proof`: no committed quote fixture exists. No execute, mock-execute, tx hash, route, or post-trade readback proof exists.

Classification:

- keep Rubic as raw-only
- classify quote as design-needed, not maintained, until there is a no-wallet quote fixture and response contract
- classify execute and mock execute as blocked for package hardening; mock plumbing can still create false confidence without documented semantics
- do not mix quote readiness with execute readiness

Next safe boundary:

- first future lane should be quote-only, no wallet signing, no bridge execution, with pinned chain/token pair and explicit units.

## DemosWork

Verdict: `raw-only`, `blocked`, and `design-needed`.

Reason codes:

- `official_demoswork_docs_present`
- `demoswork_is_executable_script_family`
- `work_steps_mix_web2_xm_native_risk`
- `bun_import_crashes_native_module`
- `package_has_no_demoswork_namespace`
- `compile_execute_readback_lifecycle_missing`

Evidence:

- `official-docs`: official DemosWork docs define `DemosScript`, work steps, operations, and operation order. Work steps can be `web2`, `xm`, or `native`, so a composed script can contain no-spend reads, external side effects, Demos native transactions, or cross-chain activity.
- `sdk-api-source`: the Bun import probe crashed through a native dependency before safely loading the module set. The May 22 inventory also records a Node ESM blocker for the DemosWork barrel path in SDK v2.11.5.
- `package-behavior`: `omniweb-toolkit` exposes no DemosWork package API, CLI, job runner, manifest entry, compile-only helper, or proof/readback lifecycle. Root `src/plugins/demoswork-plugin.ts` is a fallback provider outside package surface, not a maintained package wrapper.
- `no-spend-proof`: only static inventory exists. There is no deterministic compile fixture, no normalized script snapshot, no transaction preparation proof, and no execution/readback proof.

Classification:

- keep DemosWork raw-only and blocked
- future work must begin with compile/validate-only fixtures after import safety is proven
- do not treat local script construction as live workflow readiness
- signing, confirm, broadcast, and product readback must be modeled as separate stages before any package claim

Next safe boundary:

- first future lane should be compile/validate-only, with deterministic fixtures and redaction rules, after import behavior is fixed or isolated.

## Readiness Impact

Current readiness state:

- XM: raw-only/blocked; possible future read fixtures, no package namespace.
- Rubic: raw-only; quote design-needed, execute blocked.
- DemosWork: raw-only/blocked; compile-only design needed before execution proof.

Required follow-up for `04c5.5`:

- readiness rows need all four evidence columns
- quote/compile/read-only must stay separate from execute/spend/cross-chain paths
- Bun/native-module crashes should be recorded as package-runtime blockers
- official docs confirm existence of these domains, not package readiness

## Commands

```bash
curl -fsSL https://docs.kynesys.xyz/sdk/cross-chain/overview.md
curl -fsSL https://docs.kynesys.xyz/sdk/cookbook/swap/crosschain-swap.md
curl -fsSL https://docs.kynesys.xyz/backend/bridges/rubic-bridge.md
curl -fsSL https://docs.kynesys.xyz/sdk/demoswork.md
curl -fsSL https://docs.kynesys.xyz/llms.txt | rg -n "Rubic|DemosWork|Demoswork|cross-chain|Cross Chain|bridge"
bun -e 'for (const mod of ["@kynesyslabs/demosdk/xmcore","@kynesyslabs/demosdk/bridge","@kynesyslabs/demosdk/demoswork"]) { try { const m = await import(mod); console.log(mod, "ok", Object.keys(m).slice(0,25).join(",")); } catch (e) { console.log(mod, "ERR", e?.name, e?.message); } }'
```

The Bun import probe crashed while loading a native module instead of returning
structured module output. This artifact treats that as blocker evidence and does
not retry in-process.
