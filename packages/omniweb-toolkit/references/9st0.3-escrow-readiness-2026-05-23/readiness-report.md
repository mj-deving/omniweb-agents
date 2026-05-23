---
summary: "No-spend escrow existing-tx readiness classification for omniweb-agents-9st0.3."
owner_bead: "omniweb-agents-9st0.3"
status: "DEGRADED"
date: "2026-05-23"
---

# 9st0.3 Escrow Existing-Tx Readiness

Status: `DEGRADED`

Tx: `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`

Artifact: `packages/omniweb-toolkit/references/9st0.3-escrow-readiness-2026-05-23/escrow-recheck.json`

Exact no-spend command:

```bash
bunx tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --platform github --username phase24-continuation-20260521 --amount 0.1 --message 'Phase 24 continuation controlled escrow proof' --recheck-tx-hash 2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1 --verify-timeout-ms 0 --verify-poll-ms 5000 --state-dir /tmp/9st0.3-escrow-readiness/escrow --proof-out packages/omniweb-toolkit/references/9st0.3-escrow-readiness-2026-05-23/escrow-recheck.json
```

Classification:

- status: `DEGRADED`
- attempted send: `false`
- recheck: `true`
- confirmation surface: `tx_confirmed_readback_wrappers_degraded`
- tx confirmation: confirmed at block `2312202`
- reason codes: `escrow_query_method_not_implemented`, `readback_wrappers_degraded`
- preview gate: `ok`
- spend: `0 DEM`
- broadcast/upload: none

Readback evidence:

- `getClaimable` returned `Method not implemented: get_claimable_escrows`
- `getEscrowBalance` returned `Method not implemented: get_escrow_balance`
- both readback wrappers classify as `degraded-wrapper`

Successor aggregation input:

The existing controlled escrow tx is confirmed, but escrow product/readback wrappers do not expose claimable or balance proof. Treat this lane as `DEGRADED`, not `GREEN`. A successor packet can only consume it if degraded adapter semantics are explicitly accepted; otherwise escrow remains excluded from any live successor readiness claim.

No new escrow send, spend, broadcast, upload, credential/profile mutation, or live proof packet was performed for this bead.
