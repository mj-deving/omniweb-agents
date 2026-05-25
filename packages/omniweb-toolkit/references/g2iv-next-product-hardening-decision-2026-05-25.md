---
summary: "Post-self-audit decision record for the next product hardening order, using the four-column evidence model."
read_when: ["g2iv.6", "next product hardening", "raw transfer units", "storage no-spend", "DemosWork XM Rubic"]
owner_bead: "omniweb-agents-g2iv.6"
status: "decision-only"
date: "2026-05-25"
---

# G2IV Next Product Hardening Decision - 2026-05-25

Decision: after the toolkit skill/package self-audit cleanup, work the next
product hardening sequence in this order:

1. raw-transfer unit conversion
2. storage no-spend ergonomics
3. DemosWork / XM / Rubic import-boundary proof
4. IPFS and escrow only if new evidence changes their blocked/degraded state

This is a decision record only. It does not add package APIs, CLI commands,
runtime behavior, live packet authority, spend, upload, broadcast, hosted
activation, npm release, credential mutation, or secret access.

## Evidence Model

Use the active four-column model from
[hardening-readiness-evidence-model-2026-05-25.md](./hardening-readiness-evidence-model-2026-05-25.md)
before promoting any lane.

## Selected Order

| Lane | official-docs | sdk-api-source | package-behavior | no-spend-proof | Decision |
| --- | --- | --- | --- | --- | --- |
| Raw-transfer unit conversion | Transaction denomination docs are the relevant official source via the 04c5 source map. They do not by themselves prove fractional DEM support. | Current SDK/runtime use accepts the integer DEM path; fractional DEM remains unproven. | `transferDem()`, `omni.chain.transfer()`, guardrails, and capability docs now fail closed on non-integer DEM. | `9st0.2-raw-transfer-readiness-2026-05-23.md` records green `1 DEM` preview and explicit fractional blocking. | First lane. Design and test decimal-to-base-unit conversion as no-spend only before any live transfer packet. |
| Storage no-spend ergonomics | Official Storage Programs docs are present and list current payload/key/nesting limits. | Storage subpath imports under Bun and static helpers exist. | Maintained storage reads exist; broad writes stay isolated to `probe-storage.ts`. | `storage-preview-colony-operator.json` is green preview evidence with no broadcast or DEM spend. | Second lane. Improve preview ergonomics and read/write boundary docs without adding live authority. |
| DemosWork / XM / Rubic import boundary | Official docs exist for DemosWork, XM concepts, and Rubic bridge flows. | DemosWork imports hit ESM blockers; XM/bridge import probes have native-module crash risk; Rubic imports are unstable. | No package namespace, CLI, manifest entry, runner, bridge helper, or public wrapper is maintained. | Static inventory only; no deterministic compile fixture, no no-wallet quote fixture, no read fixture. | Third lane. Prove isolated imports and compile/quote/read fixtures before any package promotion. |
| IPFS | Named official IPFS docs are missing from the current docs-backed source map. | SDK IPFS subpath is not importable under Bun. | Existing wrappers are upload/pin/unpin write paths. | Quote path returned `Unknown message`; no owned CID/readback proof exists. | Not next. Reopen only after official/API evidence, import stability, concrete quote, and no-spend readback exist. |
| Escrow | Named official Escrow docs are missing from the current docs-backed source map. | SDK escrow subpath is not importable under Bun. | Send/claim/refund are mutations; read wrappers remain best-effort/degraded. | Existing tx readback hardening remained degraded after product readback checks. | Not next. Reopen only if new docs/import/readback evidence appears. |

## Follow-Up Shape

The next executable bead should be narrow and no-spend:

- title: Harden raw-transfer unit conversion contract
- scope: classify and test decimal-to-base-unit conversion before execution
- allowed: source inspection, local conversion helper design, tests, no-spend
  preview output, docs that state exact supported units
- blocked: live transfer, broadcast, spend, wallet mutation, public API
  promotion, hosted activation, npm release

The lane should stop if the SDK/source path cannot prove which unit form is
accepted before transaction confirmation, or if a conversion would require live
spend to distinguish a valid payload from a rejected one.

## Superseded Default

The earlier 04c5 decision selected escrow existing-tx readback hardening because
it had the most concrete degraded blocker at that time. That pass has now run
and remained degraded. The next product hardening decision therefore moves to
the raw-transfer unit boundary first, while keeping storage second and leaving
IPFS/escrow blocked unless new evidence arrives.
