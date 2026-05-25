---
summary: "No-spend raw-transfer unit contract evidence for fcui.1, reconciling official denomination docs, installed SDK shape, package behavior, and existing proof artifacts."
read_when: ["raw transfer units", "base-unit conversion", "fractional DEM", "integer DEM transfer", "fcui.1"]
owner_bead: "omniweb-agents-fcui.1"
status: "integer-only"
date: "2026-05-25"
---

# Raw Transfer Unit Contract Evidence - 2026-05-25

Verdict: keep raw transfer integer-only.

No-spend evidence does not prove that fractional DEM can be safely converted to
a base-unit payload in the currently installed runtime before reaching transfer
confirmation or broadcast. Do not implement decimal-to-base-unit transfer
conversion in this lane.

No live spend, broadcast, upload, hosted activation, npm release, secret access,
credential/profile mutation, or public API promotion was performed.

## Four-Column Evidence

| Column | Evidence | Verdict |
| --- | --- | --- |
| official docs | `https://docs.kynesys.xyz/sdk/websdk/transactions/denominations.md` was fetched on 2026-05-25. It documents DEM versus OS, `OS_PER_DEM = 10n ** 9n`, preferred `bigint` OS amounts, and a pre-fork `SubDemPrecisionError` guard. The source map already marks this page as relevant but warns downstream work must reconcile it with package artifacts. | Official docs describe a future/modern denomination model, but they are not enough to prove this package's current installed SDK/runtime accepts a converted base-unit payload. |
| SDK/API/source | `package-lock.json` pins `@kynesyslabs/demosdk` `2.11.5`. The installed SDK surface inspected from the local install exposes `Demos.transfer(to: string, amount: number)` and `Demos.pay(to: string, amount: number)`. `DemosTransactions.pay()` writes `tx.content.amount = amount` and native args `[to, amount]`. The inspected public `Demos` instance has no `getNetworkInfo()` method, and importing the package root under Bun crashed in a native dependency before any safe denomination export could be verified. | Current installed SDK evidence does not prove the documented `bigint` OS path is available through this runtime. |
| package behavior | `classifyDemTransferAmount()` rejects non-positive, non-finite, and non-integer DEM before transfer. `transferDem()`, `safeTransfer()`, and `omni.chain.transfer()` all use that classifier before reaching their transfer executor. Existing tests assert `0.1 DEM` is rejected before SDK confirmation/broadcast. | Current package behavior is already fail-closed and integer-only. |
| no-spend proof | `9st0.2-raw-transfer-readiness-2026-05-23.md` records integer-only readiness. `sc96-successor-readiness-2026-05-23/transfer-preview.json` is green only for `1 DEM` and records `baseUnitConversion: not_proven`. `0ctx-controlled-proof-run-2026-05-23/transfer-report.md` records the historical `0.1 DEM` live-gated attempt stopping before broadcast with `Not an integer`. | Existing no-spend/live-gated evidence supports integer-only transfer and blocks fractional DEM until a base-unit runtime path is proven. |

## Source Notes

- Root `package-lock.json` lists `@kynesyslabs/demosdk` version `2.11.5`.
- `docs/research/demos-sdk-capabilities.md` records the local SDK transfer shape
  as `transfer(to, amount: number)` / `pay(to, amount: number)`.
- `src/toolkit/sdk-bridge.ts` exports `classifyDemTransferAmount()` and calls it
  in `transferDem()` before any SDK transfer, confirm, or broadcast stage.
- `src/toolkit/safe-transfer.ts` calls the same classifier before invoking its
  supplied executor.
- `packages/omniweb-toolkit/src/chain-api.ts` calls the same classifier before
  delegating to `sdkBridge.transferDem()`.
- `packages/omniweb-toolkit/scripts/probe-chain-transfer.ts` emits a
  no-broadcast `unitContract` of `integer-dem`, `baseUnitConversion:
  not_proven`, and `fractionalAmounts: unsupported`.

## Decision

Child 2 should not implement a conversion helper from this evidence. The
conversion precondition in the lane plan is not met.

Child 3 should only align preview/report surfaces with the current normalized
integer-only contract. If a later SDK upgrade exposes and proves `bigint` OS
transfer support, reopen the helper as a new evidence-first bead with:

- installed SDK source and type evidence for `bigint` or denomination helpers
- local tests proving conversion rejects invalid, non-finite, negative,
  over-precision, and pre-fork sub-DEM amounts before broadcast
- no-spend import/source proof that the runtime accepts the payload shape
- explicit preview output distinguishing DEM input from wire-unit payload

