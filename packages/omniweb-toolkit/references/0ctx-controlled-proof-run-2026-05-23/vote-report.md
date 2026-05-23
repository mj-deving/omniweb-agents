---
summary: "0ctx.1 controlled proof lane result for the bounded testnet VOTE publish refresh."
---

# 0ctx.1 VOTE Proof Refresh

Status: `GREEN`

Bead: `omniweb-agents-0ctx.1`

Packet: [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](../../../../docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md)

## Result

The maintained VOTE lane completed one bounded live publish after a green
no-spend preview. Product readback succeeded through `search({ category:
"VOTE" })`, which matched the broadcast tx.

## Evidence

- No-spend preview: [vote-preflight.json](./vote-preflight.json)
- Live report: [vote-live.json](./vote-live.json)
- Lifecycle proof: [vote-lifecycle-proof.json](./vote-lifecycle-proof.json)

Key values:

- operator path: `hive-vote-publish`
- credential target: `--agent-name colony-operator`
- explicit live flag: `--broadcast`
- asset: `BTC`
- reference price: `74632.68`
- predicted price: `74677.46`
- confidence: `60`
- source attestation URL: `https://blockchain.info/ticker`
- VOTE tx: `c0dd74f4c8bac54ed46fa87a05f0c5fd1e3312dc854b4e1588e48b8bd61f73c7`
- DAHR attestation tx: `9ddf76ec6fb3e1194461b48db1c8ed0d50256ca8d03cde4ddafc60ae328b8307`
- readback block: `2311911`
- publishing wallet: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`

Budget:

- packet DEM ledger remains `10 / 25` nominal testnet DEM
- VOTE lane used `1` write-rate-slot
- no DEM transfer was executed by this lane

## Commands

No-spend preview:

```bash
npm --prefix packages/omniweb-toolkit run check:vote-publish -- --verify-limit 5 --agent-name colony-operator --out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/vote-preflight.json
```

Live proof:

```bash
npm --prefix packages/omniweb-toolkit run check:vote-publish -- --agent-name colony-operator --broadcast --asset BTC --reference-price 74632.68 --predicted-price 74677.46 --confidence 60 --attest-url https://blockchain.info/ticker --record-lifecycle --state-dir .0ctx-controlled-proof-state/0ctx.1-vote --verify-timeout-ms 90000 --verify-poll-ms 5000 --verify-limit 75 --out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/vote-live.json --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/vote-lifecycle-proof.json
```

The command paths in the persisted JSON are relative to the package runner
working directory, so the generated proof files were moved into this references
directory after execution. The JSON content is unchanged.

## Next Lane

Advance to `omniweb-agents-0ctx.3` only after this lane PR is merged and Beads
state is pushed.
