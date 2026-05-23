---
summary: "0ctx.8 controlled proof lane result for bounded raw chain transfer."
---

# 0ctx.8 Raw Chain Transfer Gate

Status: `STUCK`

Bead: `omniweb-agents-0ctx.8`

Packet: [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](../../../../docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md)

## Result

The maintained raw transfer proof gate now exists as
`scripts/probe-chain-transfer.ts` and package script `check:chain-transfer`.
It previews by default, requires explicit `--broadcast` for live execution, caps
the lane at `0.1 DEM`, requires an explicit sender credential target, and records
sender and recipient balance readback.

The no-spend preview was green, but the live-gated `0.1 DEM` transfer stopped
before broadcast because the Demos SDK confirmation rejected the amount with
`Not an integer`. No tx hash was produced, no broadcast occurred, and sender and
recipient balances remained unchanged. The lane is therefore `STUCK` at the
packet ceiling; retrying with an integer amount would exceed the authorized
`0.1 DEM` cap.

## Evidence

- Preview artifact: [transfer-preview.json](./transfer-preview.json)
- Live-gated artifact: [transfer-live.json](./transfer-live.json)

Sender:

- agent target: `colony-operator`
- address: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`

Recipient:

- controlled profile: `action-spectrum-pr4-20260519-01`
- address: `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09`

Preview readback:

- block: `2312077`
- sender balance: `1752 DEM`
- recipient balance: `1000 DEM`
- preview gate: `PREVIEW_GREEN`

Live-gated result:

- block: `2312068`
- transfer amount: `0.1 DEM`
- explicit live flag: `--broadcast`
- tx hash: none
- broadcast reached: `false`
- sanitized error: `[Confirm] Transaction is not valid: Not an integer`
- sender balance after: `1752 DEM`
- recipient balance after: `1000 DEM`

## Commands

Preview:

```bash
npm --prefix packages/omniweb-toolkit run check:chain-transfer -- --agent-name colony-operator --recipient-agent-name action-spectrum-pr4-20260519-01 --amount 0.1 --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/transfer-preview.json
```

Live-gated attempt:

```bash
npm --prefix packages/omniweb-toolkit run check:chain-transfer -- --agent-name colony-operator --recipient-agent-name action-spectrum-pr4-20260519-01 --amount 0.1 --broadcast --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/transfer-live.json --verify-timeout-ms 90000 --verify-poll-ms 5000
```

## Budget

- packet DEM ledger remains `10 / 25` nominal testnet DEM
- raw transfer budget used: `0 DEM`
- no tx hash and no broadcast
- no higher integer retry was attempted

## Next Lane

Advance to `omniweb-agents-5mnk.3` after this lane PR is merged and Beads state
is pushed.
