---
summary: "No-spend reconciliation of StorageProgram, IPFSOperations, and Escrow surfaces against current package wrappers, proof artifacts, blockers, and successor beads."
read_when: ["storage inventory", "IPFS inventory", "escrow inventory", "advanced domain proof", "5mnk successors"]
owner_bead: "omniweb-agents-3005.4"
status: "inventory-only"
date: "2026-05-22"
---

# Storage IPFS And Escrow Capability Inventory - 2026-05-22

This is the maintained no-spend map for the storage, IPFS, and escrow slice of the full OmniWeb inventory. It reconciles raw Demos SDK methods, current `omni.storage`, `omni.ipfs`, and `omni.escrow` wrappers, existing proof artifacts, quote/readback blockers, and the already-created `5mnk.2`, `5mnk.3`, and `5mnk.4` successor beads.

This document is intentionally inventory-only:

- no storage create/set broadcast
- no IPFS upload/pin/unpin broadcast
- no escrow send/claim/refund broadcast
- no DEM spend
- no new wrapper
- no CLI command
- no capability-manifest schema change
- no duplicate live proof lane outside the existing `5mnk.*` successors

Sources checked:

- `docs/research/demos-sdk-capabilities.md`
- `docs/ROADMAP.md`
- `packages/omniweb-toolkit/src/storage-api.ts`
- `packages/omniweb-toolkit/src/ipfs-api.ts`
- `packages/omniweb-toolkit/src/escrow-api.ts`
- `packages/omniweb-toolkit/scripts/probe-storage.ts`
- `packages/omniweb-toolkit/scripts/probe-ipfs.ts`
- `packages/omniweb-toolkit/scripts/probe-escrow.ts`
- `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/storage-preview-colony-operator.json`
- locked SDK tarball: `@kynesyslabs/demosdk@2.11.5`
- tarball declarations under `/tmp/demosdk-2.11.5-inspect/package/build/storage/`, `build/ipfs/`, and `build/escrow/`

Fresh no-spend evidence captured during this inventory:

- static SDK declarations inspected for `StorageProgram`, `IPFSOperations`, `EscrowTransaction`, and `EscrowQueries`
- current package wrappers inspected for maintained surface, fallback behavior, direct-import fallbacks, and live mutation gates
- existing storage no-spend preview artifact confirmed for the selected `colony-operator` credential target
- no live command, broadcast, upload, pin, escrow send, claim, refund, or DEM spend was executed for `3005.4`

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `maintained-read` | Package surface exists for no-spend reads and has a current fallback or proof path. |
| `preview-green` | No-spend preview has concrete target and cost/readback details, but live mutation has not run. |
| `partial` | Package wrapper exists, but raw SDK coverage or proof/readback is incomplete. |
| `blocked` | A quote, SDK, target, or readback blocker prevents honest live proof. |
| `successor-lane` | Live or deeper proof work belongs to the existing named bead, not this inventory. |

## Current Package Coverage

| Surface | Current package state | Proof status | Notes |
| --- | --- | --- | --- |
| `omni.storage.read` | Reads a storage program by address through `StorageProgram.getStorage` style SDK access | `maintained-read/partial` | Includes a fallback that reconstructs recent `storageProgram` state from confirmed transactions when shared-node reads drift or return `Unknown message`. |
| `omni.storage.list` / `omni.storage.search` | Lists and filters known storage records | `maintained-read/partial` | Useful for readback, but not a substitute for proving a new live create/set broadcast. |
| `omni.storage.hasField` / `readField` | Field-level reads over storage records | `maintained-read/partial` | Safe as reads; product truth still depends on the selected storage address and node response. |
| `probe-storage.ts` | Controlled preview/live lane for storage create/set | `preview-green` | The selected retry target is `--agent-name colony-operator`; `storage-preview-colony-operator.json` records public address, storage address, estimated 1 DEM create fee, and no broadcast. |
| `omni.ipfs.upload` / `pin` / `unpin` | Package wrappers exist and call signed IPFS transaction paths | `partial/blocked` | The SDK v2.11.x package ships `build/ipfs` but does not export `./ipfs`, so the wrapper includes a direct-import fallback. These methods are write/spend paths. |
| `probe-ipfs.ts` | Controlled preview/live lane for public non-secret content | `blocked successor-lane` | Prior quote/readback was not concrete enough; future proof stays in `omniweb-agents-5mnk.3` and must produce a concrete quote before broadcast. |
| `omni.escrow.sendToIdentity` | Escrow send wrapper | `partial/blocked` | Spendful mutation. Existing successor target is `phase24-continuation-20260521`, amount 0.1 DEM, ceiling 5 DEM. |
| `omni.escrow.claimEscrow` / `refundExpired` | Escrow state mutation wrappers | `partial/blocked` | Claim/refund mutate escrow state and need controlled target/readback. |
| `omni.escrow.getClaimable` / `getEscrowBalance` | Escrow read wrappers | `partial/blocked` | Readback can be degraded depending SDK/query support; a degraded classification is acceptable only with explicit evidence. |
| `probe-escrow.ts` | Controlled preview/live lane for escrow send/readback | `blocked successor-lane` | Future proof stays in `omniweb-agents-5mnk.4`; no current live send proof exists. |

## Storage Program Map

| Raw SDK family | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| Address and fee helpers | `getStorageAddress`, create-fee calculation helpers, size and nesting validation | No-spend preview and validation | Used by `probe-storage.ts` preview | Cost must stay concrete before live broadcast | Keep preview first; record target, address, estimated fee, and planned readback. |
| Create/delete storage | `createStorage`, `deleteStorage` | Write/spend mutation | Not exposed as general runtime API; only through controlled probe path | Live create/set still needs a single explicit broadcast and product readback | Existing `omniweb-agents-5mnk.2` only. |
| Field and collection writes | `writeStorage`, `setField`, `deleteField`, `appendItem`, nested object/list helpers | Write/spend mutation | Not exposed as broad public wrapper | Same fee/readback and credential-target requirements as create | No generic write namespace until `3005.6` design and successor proof settle. |
| Storage reads | `getValue`, `getFields`, `hasField`, `getDataSize`, object/list reads | No-spend read | `omni.storage.read/list/search/hasField/readField` | Shared-node read drift can require fallback reconstruction | Maintain as read surface; do not imply create/set proof from read success. |
| Discovery and ACL | discovery helpers, permission/owner helpers | Mostly reads, some writes depending method | Not broadly exposed | Owner and ACL semantics need explicit proof before mutation | Inventory only until a product need names a controlled target. |

Current storage facts:

- Maximum storage size from current SDK declarations is 1 MB.
- Current pricing model observed in docs/declarations is 1 DEM per 10 KB, minimum 1 DEM.
- The old `mj-codex-proof-agent` storage run stopped before mutation because the credentials profile did not exist.
- The selected `colony-operator` retry preview is green and no-spend, with storage address `stor-b2248cf13f55ded07e66cca0d1dea6787ba8c0c6` and estimated create fee `1` DEM.
- Any next storage step must be the single explicit `--broadcast` from `omniweb-agents-5mnk.2`, with product readback.

## IPFS Map

| Raw SDK family | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| Payload construction | `createAddPayload`, `createPinPayload`, `createUnpinPayload` | No-spend construction until signed/broadcast | Used internally by package wrapper/probe paths | Construction alone is not upload proof | Compile/preview can be no-spend; broadcast remains gated. |
| Quote and charge helpers | charge/custom charge types and quote-related helpers | No-spend if read-only | Not proven as a stable public read surface | Prior quote returned `Unknown message`; no concrete cost quote | `5mnk.3` must produce concrete quote before any upload/pin broadcast. |
| CID and content helpers | CID validation, content size validation, encoding helpers | No-spend local validation | Indirectly useful to probe flow | Current SDK declaration says max content size is 1 GB; older docs may drift | Use current declaration in new docs until upstream clarifies. |
| Upload/pin/unpin | add, pin, unpin transaction paths | Write/spend mutation | `omni.ipfs.upload/pin/unpin` | Requires wallet/auth/runtime, concrete quote, public non-secret content, and readback | Existing `omniweb-agents-5mnk.3` only. |

Current IPFS facts:

- Current package wrappers are real but spendful; they create signed IPFS transactions and use confirm/broadcast paths.
- The package includes a direct-import fallback because the SDK package ships IPFS build files without a matching `./ipfs` export.
- No current live upload, pin, unpin, owned CID, or chain verification proof exists.
- The future target content is already defined in `omniweb-agents-5mnk.3` and must remain public/non-secret.

## Escrow Map

| Raw SDK family | Representative methods | Mutation / spend class | Current package coverage | Current blockers | Safe future boundary |
| --- | --- | --- | --- | --- | --- |
| Deterministic address | `EscrowTransaction.getEscrowAddress` | No-spend calculation/read support | Used by wrapper/probe internals | Address alone is not send proof | Safe for preview/readback only. |
| Send to identity | `sendToIdentity` | DEM spend and escrow state mutation | `omni.escrow.sendToIdentity` | Needs controlled recipient, amount ceiling, explicit broadcast, and readback | Existing `omniweb-agents-5mnk.4` only. |
| Claim/refund | `claimEscrow`, `refundExpiredEscrow` | Escrow state mutation | `omni.escrow.claimEscrow/refundExpired` | Needs owned eligible escrow and before/after classification | Keep separate from send proof unless the successor bead explicitly scopes cleanup. |
| Queries | `getEscrowBalance`, `getClaimableEscrows`, `getSentEscrows` | No-spend read | `omni.escrow.getEscrowBalance/getClaimable` | Current proof path may return degraded/unavailable readback | Degraded readback is acceptable only when recorded with exact method/output. |

Current escrow facts:

- `escrow-api.ts` has a package-level maximum escrow amount of 100 DEM.
- The controlled successor target is narrower: planned amount 0.1 DEM, hard ceiling 5 DEM.
- Send, claim, and refund are not no-spend operations.
- Current proof state has no live escrow send. Claimable/balance readback must be proven or classified degraded in `omniweb-agents-5mnk.4`.

## Existing Proof And Successor Map

| Bead / artifact | Scope | Current verdict | What remains |
| --- | --- | --- | --- |
| `omniweb-agents-0ctx.6` | Safety prerequisite for explicit mutation-probe credential targeting | Closed | Storage, IPFS, and escrow live probes now require explicit existing `--agent-name` or `--env-path`. |
| `omniweb-agents-97o2` | Storage target selection and no-spend retry preview | Green preview | Selected `colony-operator` target and wrote `storage-preview-colony-operator.json`; no broadcast or spend. |
| `omniweb-agents-5mnk.2` | Controlled storage create/set live successor | Pending successor | Run the already-defined storage live command only after preview review, with explicit `--broadcast`, 1 DEM estimated fee context, and product readback. |
| `omniweb-agents-5mnk.3` | Controlled IPFS upload target and readback | Blocked/pending successor | Produce a concrete quote before any broadcast; record CID/upload identifier and chain verification or degraded classification. |
| `omniweb-agents-5mnk.4` | Controlled escrow send target and readback | Blocked/pending successor | Preview must classify target/cost and claimable/balance readback; live proof, if run, records send result plus readback or degraded verdict. |

## Guardrails

- Do not rerun or duplicate the storage/IPFS/escrow live proof lanes from `3005.4`.
- Do not use `default-runtime` for live storage/IPFS/escrow mutation. Live mutation requires an explicit existing `--agent-name` or `--env-path`.
- Do not infer upload, pin, escrow send, or storage create readiness from successful local payload construction.
- Do not commit private payloads, secrets, credential paths, raw signed transactions, escrow claim material, or non-public IPFS content.
- Do not add broad `omni.storage.write`, `omni.ipfs`, `omni.escrow`, or CLI expansion beyond current wrappers until `3005.6` designs the public namespace boundaries.

## Current Verdict

`3005.4` is inventory-green and execution-deferred:

- Storage, IPFS, and escrow raw SDK methods, current package wrappers, proof artifacts, quote/readback blockers, and successor beads are mapped.
- Storage has a green no-spend preview for `colony-operator`, but no live storage broadcast in this lane.
- IPFS and escrow have current package wrappers and controlled successor beads, but quote/readback blockers remain.
- Existing `5mnk.2`, `5mnk.3`, and `5mnk.4` remain the only live/deeper proof lanes.
- No live command, broadcast, upload, pin, escrow send, claim, refund, wrapper, CLI command, manifest schema change, or DEM spend was added.
