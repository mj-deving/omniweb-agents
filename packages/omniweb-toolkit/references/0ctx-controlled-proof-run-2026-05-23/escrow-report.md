---
summary: "5mnk.4 controlled proof lane result for controlled escrow send."
---

# 5mnk.4 Escrow Controlled Send Proof

Status: `DEGRADED`

Bead: `omniweb-agents-5mnk.4`

Packet: [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](../../../../docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md)

## Result

The escrow lane executed one packet-authorized live send after a green no-spend
preview. The target was the controlled GitHub identity
`phase24-continuation-20260521`, the wallet target was the explicit
`colony-operator` profile, the amount was `0.1 DEM`, and live execution required
the explicit `--broadcast` flag.

The live call returned tx hash
`2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`, but the
available readback surface is degraded:

- immediate `verifyTransaction` did not confirm the tx
- `getClaimable` returned `Method not implemented: get_claimable_escrows`
- `getEscrowBalance` returned `Method not implemented: get_escrow_balance`
- a read-only tx recheck attempted after the live send hit runtime/API `502`
  before it could write an artifact

The lane is therefore `DEGRADED`, not green. It produced send tx evidence, but
the product readback wrappers do not currently prove claimable escrow state or
escrow balance.

## Evidence

- Preview artifact: [escrow-preview.json](./escrow-preview.json)
- Live artifact: [escrow-live.json](./escrow-live.json)

Preview details:

- agent target: `colony-operator`
- address: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- controlled recipient: GitHub `phase24-continuation-20260521`
- amount: `0.1 DEM`
- ceiling: `5 DEM`
- preview gate: `PREVIEW_GREEN`
- readback classification: `degraded-wrapper`

Live details:

- explicit live flag: `--broadcast`
- tx hash: `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`
- send result: `ok: true`
- immediate verification: `confirmed: false`
- readback classification: `degraded-wrapper`
- suppressed SDK log count: `1`

## Commands

Preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --platform github --username phase24-continuation-20260521 --amount 0.1 --message 'Phase 24 continuation controlled escrow proof' --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/escrow-preview.json
```

Live:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --platform github --username phase24-continuation-20260521 --amount 0.1 --message 'Phase 24 continuation controlled escrow proof' --broadcast --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/escrow-live.json
```

Read-only recheck attempted after live send:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --platform github --username phase24-continuation-20260521 --amount 0.1 --message 'Phase 24 continuation controlled escrow proof' --recheck-tx-hash 2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1 --verify-timeout-ms 30000 --verify-poll-ms 5000 --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/escrow-recheck.json
```

Result: `Error: Request failed with status code 502`; no recheck artifact was
written and no second escrow send was attempted.

## Budget

- prior packet DEM ledger: `10 / 25` nominal testnet DEM
- escrow controlled send amount: `0.1 DEM`
- updated packet DEM ledger: `10.1 / 25` nominal testnet DEM

## Next Lane

Advance to `omniweb-agents-0ctx.2` after this lane PR is merged and Beads state
is pushed.
