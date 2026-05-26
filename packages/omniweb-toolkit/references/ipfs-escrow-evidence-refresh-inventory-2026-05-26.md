---
summary: "Evidence-first IPFS and escrow refresh inventory before no-spend probe reruns."
read_when: "IPFS escrow evidence refresh, no-spend probe rerun, ui3j.1, PR1 inventory"
owner_bead: "omniweb-agents-ui3j.1"
status: "inventory-only"
date: "2026-05-26"
---

# IPFS Escrow Evidence Refresh Inventory - 2026-05-26

This PR1 artifact refreshes source, import, wrapper, and proof boundaries before
the no-spend PR2 probe rerun.

Scope exclusions:

- no public API addition
- no CLI command
- no wrapper promotion
- no live broadcast
- no upload, pin, or unpin
- no escrow send, claim, or refund
- no wallet mutation, signing, hosted activation, or npm publish

## Current Verdict

IPFS remains `blocked` for no-spend readiness and `raw-only` for package
hardening.

Reason codes:

- `official_ipfs_docs_missing_from_index`
- `official_ipfs_guess_404`
- `sdk_ipfs_subpath_not_importable_in_bun`
- `sdk_ipfs_build_files_present`
- `ipfs_upload_pin_unpin_are_write_paths`
- `previous_ipfs_quote_unknown_message`
- `no_live_owned_cid_or_chain_readback`

Escrow remains `degraded` for existing-tx readback and `blocked` for any new
send/claim/refund lane.

Reason codes:

- `official_escrow_docs_missing_from_index`
- `official_escrow_guess_404`
- `sdk_escrow_subpath_not_importable_in_bun`
- `sdk_escrow_build_files_present`
- `escrow_send_claim_refund_are_mutations`
- `escrow_existing_tx_readback_degraded`
- `claim_refund_lifecycle_design_needed`

## Source Refresh

Read-only checks run on 2026-05-26:

- `https://docs.kynesys.xyz/llms.txt`: HTTP 200.
- `https://docs.kynesys.xyz/llms.txt` scan: storage docs present; no named IPFS
  or Escrow pages present.
- `https://docs.kynesys.xyz/sdk/ipfs/overview.md`: HTTP 404.
- `https://docs.kynesys.xyz/sdk/escrow/overview.md`: HTTP 404.
- `https://kynesyslabs.github.io/demosdk-api-ref/index.html`: HTTP 200.

Official docs classification:

- Storage docs remain present and named.
- IPFS and Escrow still lack named official docs in `llms.txt`.
- The top-level SDK API reference is available, but it is not an IPFS or Escrow
  guide and did not expose named IPFS/Escrow navigation in the fetched index
  page.
- Missing official docs remain evidence gaps. Do not fill them by inference from
  local wrappers.

## SDK Import Refresh

Bun import check:

```bash
bun -e 'for (const mod of ["@kynesyslabs/demosdk/storage","@kynesyslabs/demosdk/ipfs","@kynesyslabs/demosdk/escrow"]) { try { const m = await import(mod); console.log(mod, "ok", Object.keys(m).slice(0,20).join(",")); } catch (e) { console.log(mod, "ERR", e?.name, e?.message); } }'
```

Observed result:

- `@kynesyslabs/demosdk/storage`: import OK; exports included
  `STORAGE_PROGRAM_CONSTANTS`, `StorageProgram`, `isStorageProgramPayload`,
  `isValidEncoding`, and `isValidStorageLocation`.
- `@kynesyslabs/demosdk/ipfs`: import failed with `ResolveMessage Cannot find
  module`.
- `@kynesyslabs/demosdk/escrow`: import failed with `ResolveMessage Cannot find
  module`.

SDK cache/source check:

- Bun resolved `@kynesyslabs/demosdk` to
  `/home/mj/.bun/install/cache/@kynesyslabs/demosdk@4.0.0@@@1/build/index.js`.
- SDK build files exist under `build/ipfs` and `build/escrow`.
- `build/ipfs/index.d.ts` exports `IPFSOperations`, `IPFS_CONSTANTS`, and IPFS
  payload/quote types.
- `build/escrow/index.d.ts` exports `EscrowTransaction`, `EscrowQueries`, and
  escrow readback types.

Import classification:

- Direct subpath imports for IPFS/Escrow remain unstable in the current Bun
  runtime.
- Build-file presence supports the package fallback shape, but it does not prove
  public subpath stability or no-spend readiness.

## Package Wrapper Boundaries

Current package files:

- `packages/omniweb-toolkit/src/ipfs-api.ts`
- `packages/omniweb-toolkit/src/escrow-api.ts`
- `packages/omniweb-toolkit/scripts/probe-ipfs.ts`
- `packages/omniweb-toolkit/scripts/probe-escrow.ts`
- `packages/omniweb-toolkit/src/ipfs-quote-classifier.ts`
- `packages/omniweb-toolkit/src/escrow-readback-classifier.ts`

IPFS package boundary:

- `omni.ipfs.upload`, `pin`, and `unpin` create signed IPFS transactions and
  submit through confirm/broadcast.
- The wrapper attempts `@kynesyslabs/demosdk/ipfs` first and falls back to SDK
  build files when Node reports a missing `./ipfs` export.
- `probe-ipfs.ts` is the controlled proof path. Without `--broadcast`, it only
  attempts quote/preview classification and does not upload.
- `classifyIPFSQuoteSupport` treats `Unknown message` as
  `ipfs_quote_unknown_message` and `unsupported-runtime`.

Escrow package boundary:

- `omni.escrow.sendToIdentity`, `claimEscrow`, and `refundExpired` are state
  mutations.
- `omni.escrow.getClaimable` and `getEscrowBalance` are no-spend read wrappers,
  but product readback can remain degraded or unavailable.
- The wrapper attempts `@kynesyslabs/demosdk/escrow` first and falls back to SDK
  build files when Node reports a missing `./escrow` export.
- `probe-escrow.ts` is the controlled proof path. `--recheck-existing-proof` is
  read-only and reuses tx
  `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`.
- `classifyEscrowProofReadback` returns `GREEN` only when tx confirmation and
  claimable/balance product readback are both proven.

## Existing Proof Artifacts

Inputs consumed:

- `packages/omniweb-toolkit/references/storage-ipfs-escrow-capability-inventory-2026-05-22.md`
- `packages/omniweb-toolkit/references/storage-ipfs-escrow-docs-reconciliation-2026-05-25.md`
- `packages/omniweb-toolkit/references/escrow-existing-tx-readback-hardening-2026-05-25.md`
- `packages/omniweb-toolkit/references/9st0-successor-unblock-2026-05-23/ipfs-quote-exclusion.md`
- `packages/omniweb-toolkit/references/9st0.3-escrow-readiness-2026-05-23/readiness-report.md`

Existing evidence state:

- Previous IPFS quote path returned `Unknown message`; no concrete fee, no owned
  CID, no upload, no pin, and no chain/readback proof exists.
- Previous escrow existing-tx recheck confirmed the tx but readback wrappers
  remained degraded with `escrow_query_method_not_implemented` and
  `readback_wrappers_degraded`.
- Existing escrow tx hash alone is not product escrow success.
- Existing wrapper presence is not readiness.

## PR2 Probe Commands

IPFS no-spend quote/preview refresh:

```bash
bunx tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts \
  --agent-name colony-operator \
  --content "Public no-spend IPFS quote refresh for omniweb-toolkit evidence gate on 2026-05-26." \
  --filename omniweb-toolkit-ipfs-evidence-refresh-2026-05-26.txt \
  --budget-dem 5 \
  --readback "owned CID and chain/readback proof required before any future broadcast" \
  --state-dir /tmp/ipfs-escrow-refresh-ipfs \
  --proof-out /tmp/ipfs-escrow-refresh-ipfs.json
```

Expected safe shape:

- no `--broadcast`
- `attempted: false`
- command redacted by probe helper
- `quoteSupport.reasonCodes` present
- `successorReadiness.status` present

Escrow existing-tx readback recheck:

```bash
bunx tsx packages/omniweb-toolkit/scripts/probe-escrow.ts \
  --agent-name colony-operator \
  --recheck-existing-proof \
  --verify-timeout-ms 0 \
  --verify-poll-ms 5000 \
  --state-dir /tmp/ipfs-escrow-refresh-escrow \
  --proof-out /tmp/ipfs-escrow-refresh-escrow.json
```

Expected safe shape:

- no `--broadcast`
- `attempted: false`
- `recheck: true`
- `status` and `finalVerdict` present
- command redacted by probe helper
- `readbackClassification.reasonCodes` present

## Stop Rules

Stop and record a blocker instead of proceeding if a next command requires any
of these:

- secret lookup or credential mutation
- wallet mutation or signing
- upload, pin, or unpin
- escrow send, claim, or refund
- transaction broadcast
- hosted activation
- npm publish

## PR2 Decision Gate

Proceed to PR2 with the exact no-spend commands above.

Expected default classification:

- IPFS: `blocked` or `excluded` unless a concrete quote appears.
- Escrow: `degraded` unless tx confirmation plus claimable/balance product
  readback both prove escrow state.

PR3 is needed only if PR2 reveals changed behavior or an
over/under-classification bug.
