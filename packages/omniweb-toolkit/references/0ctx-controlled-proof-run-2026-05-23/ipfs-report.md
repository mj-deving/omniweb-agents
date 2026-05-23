---
summary: "5mnk.3 controlled proof lane result for quote-gated IPFS upload."
---

# 5mnk.3 IPFS Quote-Gated Proof

Status: `BLOCKED`

Bead: `omniweb-agents-5mnk.3`

Packet: [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](../../../../docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md)

## Result

No live IPFS upload was executed. The packet allows live upload only if the
preview produces a concrete quote within `5 DEM`. The preview ran against the
explicit `colony-operator` credential target with a public non-secret payload,
but the quote surface returned `"{ error: \"Unknown message\"}"` instead of a
concrete fee.

The lane is `BLOCKED` by quote availability. No `--broadcast` command was run.

## Evidence

- Preview artifact: [ipfs-preview.json](./ipfs-preview.json)

Preview details:

- agent target: `colony-operator`
- address: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- filename: `phase24-continuation-2026-05-21.txt`
- payload: public, non-secret
- size: `80` bytes
- quote: `"{ error: \"Unknown message\"}"`

## Command

Preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --agent-name colony-operator --filename phase24-continuation-2026-05-21.txt --content 'Phase 24 continuation controlled IPFS proof, public testnet payload, no secrets.' --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/ipfs-preview.json
```

## Budget

- packet DEM ledger remains `10 / 25` nominal testnet DEM
- IPFS budget used: `0 DEM`
- no `--broadcast`, no upload tx, no CID, and no storage spend

## Next Lane

Advance to `omniweb-agents-5mnk.4` after this lane PR is merged and Beads state
is pushed.
