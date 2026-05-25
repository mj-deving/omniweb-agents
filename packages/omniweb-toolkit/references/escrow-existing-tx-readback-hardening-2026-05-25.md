---
summary: "No-spend escrow existing-tx readback hardening result for omniweb-agents-8afw."
read_when: ["omniweb-agents-8afw", "escrow existing tx", "escrow readback hardening"]
owner_bead: "omniweb-agents-8afw"
status: "DEGRADED"
date: "2026-05-25"
---

# Escrow Existing-Tx Readback Hardening - 2026-05-25

Final verdict: `DEGRADED`

Existing tx:

`2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`

Scope:

- no escrow send
- no claim
- no refund
- no broadcast
- no DEM spend
- no public API or CLI namespace promotion
- no hosted activation or npm release

## Four-Column Classification

| official docs | SDK/API/source | package behavior | no-spend proof |
|---|---|---|---|
| Current official docs source map records no named Escrow guide in the docs index. Missing official Escrow docs remain an evidence gap, not a package-readiness inference. | Installed SDK escrow subpath remains runtime-sensitive; current readback wrappers reach SDK query names that return `Method not implemented: get_claimable_escrows` and `Method not implemented: get_escrow_balance` in this recheck. | `sendToIdentity`, `claimEscrow`, and `refundExpired` stay mutation-only. `getClaimable` and `getEscrowBalance` are now classified as product-state evidence only when claimable identity data and positive balance data are both proven; empty or mismatched successful wrapper payloads are `inconclusive-readback`, not `GREEN`. | Existing tx recheck with `--recheck-existing-proof --verify-timeout-ms 0` confirmed the tx at block `2312202`, but both product readback wrappers remained method-not-implemented. The probe emitted `finalVerdict: DEGRADED` and `confirmationSurface: tx_confirmed_readback_wrappers_degraded`. |

## Command

```bash
bunx tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --recheck-existing-proof --verify-timeout-ms 0 --verify-poll-ms 5000 --state-dir /tmp/8afw-escrow-existing-tx-readback --proof-out /tmp/8afw-escrow-existing-tx-readback.json
```

The raw JSON report was reviewed during the implementation pass but is not kept
as a separate package artifact in this PR. The public-safe fields consumed here:

- `attempted: false`
- `recheck: true`
- `status: DEGRADED`
- `finalVerdict: DEGRADED`
- `verification.confirmed: true`
- `verification.blockNumber: 2312202`
- `readbackAfter.classification: degraded-wrapper`
- `readbackAfter.reasonCodes: ["escrow_query_method_not_implemented"]`
- `readbackClassification.confirmationSurface: tx_confirmed_readback_wrappers_degraded`
- `readbackClassification.reasonCodes: ["escrow_query_method_not_implemented", "readback_wrappers_degraded"]`

## Package Change

The classifier no longer treats arbitrary successful wrapper calls as product
escrow proof. `GREEN` now requires both:

- claimable escrow evidence for the expected platform and username
- positive escrow balance evidence for the expected amount when the probe knows it

Confirmed tx plus missing, empty, zero, mismatched, or unparseable product
readback remains `DEGRADED` or `STUCK` depending on tx confirmation. Runtime/API
blockers remain `BLOCKED`.

## Result

This lane does not resolve escrow product readback. It makes the package
classification harder to overstate and keeps the current existing-tx state
honest: chain confirmation exists, product escrow state remains unproven.
