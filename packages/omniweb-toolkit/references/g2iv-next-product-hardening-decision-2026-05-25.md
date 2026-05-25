---
summary: "Post-self-audit decision record for the next product hardening order, using the four-column evidence model."
read_when: ["g2iv.6", "next product hardening", "raw transfer units", "storage no-spend", "DemosWork XM Rubic"]
owner_bead: "omniweb-agents-g2iv.6"
status: "raw-transfer-complete"
date: "2026-05-25"
---

# G2IV Next Product Hardening Decision - 2026-05-25

Decision: after the raw-transfer unit lane closeout, work the remaining product
hardening sequence in this order:

1. storage no-spend ergonomics
2. DemosWork / XM / Rubic import-boundary proof
3. IPFS and escrow only if new evidence changes their blocked/degraded state

This is a decision record only. It does not add package APIs, CLI commands,
runtime behavior, live packet authority, spend, upload, broadcast, hosted
activation, npm release, credential mutation, or secret access.

Outcome update: the raw-transfer unit lane completed as no-spend evidence and
preview/report alignment. It did not prove installed-runtime base-unit payload
support, so raw transfer remains integer-only and the conversion helper was not
implemented. The next product hardening lane is storage no-spend ergonomics.

## Evidence Model

Use the active four-column model from
[hardening-readiness-evidence-model-2026-05-25.md](./hardening-readiness-evidence-model-2026-05-25.md)
before promoting any lane.

## Selected Order

| Lane | official-docs | sdk-api-source | package-behavior | no-spend-proof | Decision |
| --- | --- | --- | --- | --- | --- |
| Raw-transfer unit conversion | Transaction denomination docs are the relevant official source via the 04c5 source map. They describe OS/base-unit concepts but do not by themselves prove installed-runtime fractional DEM support. | Current installed/runtime evidence still exposes the integer DEM path; base-unit payload support was not proven in this package. | `transferDem()`, `omni.chain.transfer()`, guardrails, capability docs, and `probe-chain-transfer.ts` now state DEM input with accepted payload `integer-dem-number`. | `raw-transfer-unit-contract-evidence-2026-05-25.md` records the negative conversion verdict; `9st0.2-raw-transfer-readiness-2026-05-23.md` records green `1 DEM` preview and explicit fractional blocking. | Complete as integer-only. No conversion helper, live packet authority, spend, or public API promotion. |
| Storage no-spend ergonomics | Official Storage Programs docs are present and list current payload/key/nesting limits. | Storage subpath imports under Bun and static helpers exist. | Maintained storage reads exist; broad writes stay isolated to `probe-storage.ts`. | `storage-preview-colony-operator.json` is green preview evidence with no broadcast or DEM spend. | Second lane. Improve preview ergonomics and read/write boundary docs without adding live authority. |
| DemosWork / XM / Rubic import boundary | Official docs exist for DemosWork, XM concepts, and Rubic bridge flows. | DemosWork imports hit ESM blockers; XM/bridge import probes have native-module crash risk; Rubic imports are unstable. | No package namespace, CLI, manifest entry, runner, bridge helper, or public wrapper is maintained. | Static inventory only; no deterministic compile fixture, no no-wallet quote fixture, no read fixture. | Third lane. Prove isolated imports and compile/quote/read fixtures before any package promotion. |
| IPFS | Named official IPFS docs are missing from the current docs-backed source map. | SDK IPFS subpath is not importable under Bun. | Existing wrappers are upload/pin/unpin write paths. | Quote path returned `Unknown message`; no owned CID/readback proof exists. | Not next. Reopen only after official/API evidence, import stability, concrete quote, and no-spend readback exist. |
| Escrow | Named official Escrow docs are missing from the current docs-backed source map. | SDK escrow subpath is not importable under Bun. | Send/claim/refund are mutations; read wrappers remain best-effort/degraded. | Existing tx readback hardening remained degraded after product readback checks. | Not next. Reopen only if new docs/import/readback evidence appears. |

## Follow-Up Shape

The raw-transfer executable bead was narrow and no-spend:

- title: Harden raw-transfer unit conversion contract
- outcome: no-spend evidence did not prove base-unit conversion support
- follow-up: keep raw transfer integer-only; reopen only after installed SDK
  source/types prove a base-unit payload path
- blocked: live transfer, broadcast, spend, wallet mutation, public API
  promotion, hosted activation, npm release

The lane stopped because the installed SDK/source path did not prove which
base-unit form is accepted before transaction confirmation, and this plan does
not allow live spend to distinguish a valid fractional payload from a rejected
one.

## Superseded Default

The earlier 04c5 decision selected escrow existing-tx readback hardening because
it had the most concrete degraded blocker at that time. That pass has now run
and remained degraded. The later raw-transfer unit boundary pass also completed
with an integer-only verdict. The next product hardening decision therefore
moves to storage no-spend ergonomics, while leaving IPFS/escrow blocked unless
new evidence arrives.
