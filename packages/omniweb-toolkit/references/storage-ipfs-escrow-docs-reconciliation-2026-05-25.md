---
summary: "Docs-backed no-spend reconciliation of Storage Programs, IPFS, and Escrow for the 04c5 hardening wave."
read_when: ["04c5.3", "storage IPFS escrow reconciliation", "Demos official docs", "no-spend hardening"]
owner_bead: "omniweb-agents-04c5.3"
status: "reconciliation-only"
date: "2026-05-25"
---

# Storage IPFS Escrow Docs Reconciliation - 2026-05-25

This PR2 artifact reconciles Storage Programs, IPFS, and Escrow against the
official Demos docs source map, current installed SDK import behavior, local
package wrappers, and existing no-spend proof artifacts.

Scope exclusions:

- no storage create, set, delete, or broadcast
- no IPFS upload, pin, unpin, quote broadcast, or content publication
- no escrow send, claim, refund, or DEM spend
- no public API, CLI, manifest, or package behavior change
- no hosted activation, npm release, credential mutation, or secret lookup

Evidence model:

- `official-docs`: official docs under `docs.kynesys.xyz` and the official SDK API reference
- `sdk-api-source`: current installed dependency/import behavior plus known SDK/source map
- `package-behavior`: current `omniweb-toolkit` wrappers and probes
- `no-spend-proof`: committed dry-run/readback evidence only

Status vocabulary:

- `maintained-read`: package read surface exists and is safe to keep as read-only
- `preview-green`: no-spend preview exists, but live mutation still needs explicit authority
- `blocked`: required docs/import/quote/readback evidence is missing or failing
- `degraded`: mutation or tx evidence exists, but product readback remains unsupported or inconclusive
- `raw-only`: raw SDK/source behavior exists but should not be promoted as a maintained package lane
- `design-needed`: public namespace, lifecycle, safety, or readback semantics are not yet designed

## Source Inputs

- `packages/omniweb-toolkit/references/demos-official-docs-source-map-2026-05-25.md`
- `packages/omniweb-toolkit/references/storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/9st0.3-escrow-readiness-2026-05-23/readiness-report.md`
- `packages/omniweb-toolkit/references/9st0-successor-unblock-2026-05-23/ipfs-quote-exclusion.md`
- `packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/storage-preview-colony-operator.json`
- `packages/omniweb-toolkit/src/storage-api.ts`
- `packages/omniweb-toolkit/src/ipfs-api.ts`
- `packages/omniweb-toolkit/src/escrow-api.ts`
- `packages/omniweb-toolkit/scripts/probe-storage.ts`
- `packages/omniweb-toolkit/scripts/probe-ipfs.ts`
- `packages/omniweb-toolkit/scripts/probe-escrow.ts`

Read-only checks performed for this artifact:

- fetched official docs pages for Storage Programs overview, Storage Programs API reference, and transaction denominations
- scanned `https://docs.kynesys.xyz/llms.txt` for named IPFS and Escrow coverage
- ran a Bun import check for `@kynesyslabs/demosdk/storage`, `@kynesyslabs/demosdk/ipfs`, and `@kynesyslabs/demosdk/escrow`
- inspected current package wrappers and maintained proof references

## Storage Programs

Verdict: `maintained-read`, `preview-green` for the existing controlled storage
successor, `design-needed` for broad writes.

Reason codes:

- `official_storage_docs_present`
- `storage_reads_are_rpc_no_spend`
- `storage_writes_are_consensus_mutations`
- `package_storage_read_fallback_exists`
- `storage_preview_green_no_broadcast`
- `storage_limits_drift_requires_correction`

Evidence:

- `official-docs`: official backend and SDK docs describe Storage Programs as deterministic GCR-backed key-value containers with RPC reads and consensus-backed writes. The current official SDK overview says the predictable limits are 128KB payloads, 64 nesting levels, and 256-character keys. The API reference says the v3.1.0 surface is `Demos.storagePrograms` plus `StorageProgram` static helpers.
- `sdk-api-source`: Bun imports `@kynesyslabs/demosdk/storage` successfully and exposes `StorageProgram`, `STORAGE_PROGRAM_CONSTANTS`, and type guards. Official docs now describe `storagePrograms.sign(payload)` as the signing path for payloads that are ready for `confirm` and `broadcast`.
- `package-behavior`: `omni.storage.read/list/search/hasField/readField` are maintained read wrappers. `storage-api.ts` falls back to reconstructing recent confirmed `storageProgram` transactions when direct shared-node reads drift. Broad create/write/delete wrappers are not exposed as normal public API; live mutation is isolated in `probe-storage.ts`.
- `no-spend-proof`: `storage-preview-colony-operator.json` is a green no-spend preview with target, derived address, and estimated create fee; it did not broadcast.

Classification:

- keep `omni.storage.read/list/search/hasField/readField` as maintained reads
- keep `probe-storage.ts` as the controlled live-proof path
- do not claim broad storage write readiness from read fallback success
- update future readiness docs to prefer current official 128KB limit over older local 1MB inventory language unless a newer SDK/source check proves otherwise

Next safe boundary:

- `omniweb-agents-5mnk.2` remains the live storage create/set lane. It must keep explicit `--broadcast`, concrete fee context, selected credential target, and product readback.

## IPFS

Verdict: `blocked` and `raw-only` for package hardening; existing wrappers remain
spendful and should not be promoted.

Reason codes:

- `official_ipfs_docs_missing_from_index`
- `sdk_ipfs_subpath_not_importable_in_bun`
- `ipfs_quote_unknown_message`
- `ipfs_upload_pin_unpin_are_write_paths`
- `no_live_owned_cid_or_chain_readback`

Evidence:

- `official-docs`: the official docs index did not list a named IPFS page on 2026-05-25. The source map points only to the top-level SDK API reference as a possible class/type source.
- `sdk-api-source`: Bun cannot resolve `@kynesyslabs/demosdk/ipfs` from the installed dependency tree. The package wrapper therefore relies on a direct build-file fallback when Node reports a missing `./ipfs` export.
- `package-behavior`: `omni.ipfs.upload/pin/unpin` create signed IPFS transactions and submit through confirm/broadcast. These are not no-spend reads.
- `no-spend-proof`: the maintained IPFS successor packet excludes IPFS because the quote/readback path returned `Unknown message`; no live upload, pin, unpin, owned CID, or chain verification proof exists.

Classification:

- keep current package wrapper as an explicitly spendful, live-gated path
- classify no-spend IPFS hardening as blocked pending official docs or exact API-ref links, import stability, concrete quote, public-safe payload, and chain/readback proof
- do not add an `omni.ipfs` CLI command or readiness upgrade from local payload construction

Next safe boundary:

- `omniweb-agents-5mnk.3` remains the only deeper IPFS proof lane. It must produce a concrete quote before any upload or pin broadcast.

## Escrow

Verdict: `degraded` for existing tx/readback evidence, `blocked` for new live
send hardening, `design-needed` for claim/refund lifecycle.

Reason codes:

- `official_escrow_docs_missing_from_index`
- `sdk_escrow_subpath_not_importable_in_bun`
- `escrow_send_claim_refund_are_mutations`
- `escrow_existing_tx_readback_degraded`
- `package_ceiling_broader_than_successor_ceiling`

Evidence:

- `official-docs`: the official docs index did not list a named Escrow page on 2026-05-25. Transaction denomination docs are relevant because escrow amounts are DEM/OS-sensitive, but they are not an escrow guide.
- `sdk-api-source`: Bun cannot resolve `@kynesyslabs/demosdk/escrow` from the installed dependency tree. The package wrapper includes a direct build-file fallback when Node reports a missing `./escrow` export.
- `package-behavior`: `omni.escrow.sendToIdentity`, `claimEscrow`, and `refundExpired` are mutations. `getClaimable` and `getEscrowBalance` are read wrappers, but package proof shows those reads can be degraded or unavailable. `escrow-api.ts` enforces a package maximum of 100 DEM, while the successor live plan is much narrower: 0.1 DEM target amount and 5 DEM ceiling.
- `no-spend-proof`: `9st0.3` rechecked existing tx `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1` and classified escrow readback as degraded because claimable/balance wrappers did not prove product escrow state after confirmation.

Classification:

- keep read wrappers as best-effort/degraded until exact SDK/API-ref and runtime evidence improve
- keep send/claim/refund behind explicit live authority
- do not use existing tx hash alone as product success
- do not infer package escrow readiness from deterministic address calculation

Next safe boundary:

- `omniweb-agents-5mnk.4` remains the controlled escrow lane. It must separate send, claim, and refund scopes, use the narrower successor ceiling, and record claimable/balance readback or an explicit degraded verdict.

## Readiness Impact

Current readiness state:

- Storage: maintained reads plus a green no-spend preview; write hardening still requires `5mnk.2`.
- IPFS: blocked pending official docs/API-ref links, import stability, concrete quote, and readback.
- Escrow: degraded existing tx/readback; new live send remains blocked without controlled proof and readback.

Required follow-up for `04c5.5`:

- readiness rows need all four evidence columns
- storage limit language must be reconciled with current official 128KB docs versus older local 1MB inventory
- IPFS and Escrow missing official docs should be recorded as gaps, not filled by inference
- spendful wrapper existence must not count as no-spend proof

## Commands

```bash
curl -fsSL https://docs.kynesys.xyz/backend/storage-programs/overview.md
curl -fsSL https://docs.kynesys.xyz/sdk/storage-programs/overview.md
curl -fsSL https://docs.kynesys.xyz/sdk/storage-programs/api-reference.md
curl -fsSL https://docs.kynesys.xyz/sdk/websdk/transactions/denominations.md
curl -fsSL https://docs.kynesys.xyz/llms.txt | rg -n "IPFS|Escrow|escrow|ipfs|Storage|storage"
bun -e 'for (const mod of ["@kynesyslabs/demosdk/storage","@kynesyslabs/demosdk/ipfs","@kynesyslabs/demosdk/escrow"]) { try { const m = await import(mod); console.log(mod, "ok", Object.keys(m).slice(0,20).join(",")); } catch (e) { console.log(mod, "ERR", e?.name, e?.message); } }'
```
