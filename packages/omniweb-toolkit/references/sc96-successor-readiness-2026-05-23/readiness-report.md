---
summary: "No-spend successor readiness packet after sc96 raw-transfer, escrow, and IPFS hardening."
---

# sc96.4 Successor Readiness Packet

Status: `BLOCKED`

Bead: `omniweb-agents-sc96.4`

Date: `2026-05-23`

## Decision

Do not create the successor controlled live-proof packet yet.

The post-hardening no-spend packet is not green enough for a successor live run:

- Raw chain transfer preview is `PREVIEW_GREEN` for the integer-only `1 DEM` contract.
- Escrow recheck is `DEGRADED`: the existing tx is confirmed, but claimable/balance readback wrappers still degrade.
- IPFS preview is `BLOCKED`: the maintained quote path reaches the runtime, but the node still returns `Unknown message`, so there is no concrete fee within budget.

No live writes, broadcasts, uploads, mainnet actions, npm release, hosted activation, credential mutation, or profile mutation were performed.

## Evidence Artifacts

- [transfer-preview.json](./transfer-preview.json)
- [escrow-recheck.json](./escrow-recheck.json)
- [ipfs-preview.json](./ipfs-preview.json)

## Transfer Preview

Command:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-chain-transfer.ts --agent-name colony-operator --recipient-agent-name action-spectrum-pr4-20260519-01 --amount 1 --state-dir /tmp/sc96-readiness-state/transfer --proof-out packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/transfer-preview.json
```

Result:

- status: `PREVIEW_GREEN`
- attempted broadcast: `false`
- amount: `1 DEM`
- unit contract: integer DEM only; base-unit conversion is not proven; fractional amounts are unsupported
- sender balance readback: `1752 DEM` at block `2314086`
- recipient balance readback: `1000 DEM` at block `2314086`
- readback requirement for any future live run: tx confirmation plus sender and recipient balance readback

This establishes that the current integer-only transfer preview is satisfiable. It does not authorize a live transfer; a future live packet would still need explicit budget, target, command, live flag, readback criteria, and stop rules.

## Escrow Recheck

Command:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --recheck-existing-proof --verify-timeout-ms 0 --verify-poll-ms 5000 --state-dir /tmp/sc96-readiness-state/escrow --proof-out packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/escrow-recheck.json
```

Result:

- status: `DEGRADED`
- attempted send: `false`
- rechecked tx: `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`
- tx confirmation: confirmed at block `2312202`
- confirmation surface: `tx_confirmed_readback_wrappers_degraded`
- reason codes: `escrow_query_method_not_implemented`, `readback_wrappers_degraded`

This confirms the existing tx without new spend, but it is still not a green escrow product-readback state.

## IPFS Preview

Command:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --agent-name colony-operator --budget-dem 5 --readback tx-confirmation --state-dir /tmp/sc96-readiness-state/ipfs --proof-out packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/ipfs-preview.json
```

Result:

- status: `BLOCKED`
- attempted upload: `false`
- budget: `5 DEM`
- quote path: `omni.runtime.demos.ipfs.quote`
- SDK node call: `ipfsQuote`
- quote args: `{"file_size_bytes":199,"operation":"IPFS_ADD"}`
- quote classification: `unsupported-runtime`
- reason code: `ipfs_quote_unknown_message`
- quote response evidence: `{ error: "unknown message"}`

The preview has a precise unsupported-runtime reason before upload. It does not provide a concrete fee within budget, so a live IPFS upload remains blocked.

## Stop Rules

Stop before any successor controlled live proof until all of the following are true:

- transfer preview remains green for an explicit integer budget and controlled recipient
- escrow has either green product readback or an explicitly accepted degraded adapter state
- IPFS preview returns a concrete fee within budget, or the successor packet explicitly excludes IPFS from live execution
- the successor packet records exact target, budget, commands, live flags, readback criteria, and ledger updates

## Ledger

- transfer spend: `0 DEM`
- escrow spend: `0 DEM`
- IPFS spend: `0 DEM`
- broadcasts/uploads performed: `0`
- successor controlled proof bead created: no

