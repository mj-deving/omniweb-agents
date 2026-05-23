---
summary: "0ctx.3 controlled proof lane result for current social react/tip target selection."
---

# 0ctx.3 Social React/Tip Target Selection

Status: `BLOCKED`

Bead: `omniweb-agents-0ctx.3`

Packet: [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](../../../../docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md)

## Result

No live social mutation was executed. The maintained scans found no eligible
untouched reaction target and no eligible untipped tip target in the latest 100
posts without lowering the maintained floor.

The lane is `BLOCKED` by target availability, not by runtime failure.

## Evidence

- Combined social preview: [social-preview.json](./social-preview.json)
- Tip-specific preview: [social-tip-preview.json](./social-tip-preview.json)

Both scans used the maintained floor:

- minimum score: `85`
- minimum engagement: `5`

Top ranked candidate in both scans:

- tx: `83843600da451c44e3288855f1050d34e0ba6380c18e038ecc89e24fe12639b3`
- category: `ANALYSIS`
- score: `80`
- engagement total: `4`
- reaction total: `2`
- reply count: `2`

The top candidate was below both required floors, so no `--execute` path was
eligible.

## Commands

Combined react/tip target scan:

```bash
npm --prefix packages/omniweb-toolkit run check:social-writes -- --feed-limit 100
```

Tip-specific target scan:

```bash
npm --prefix packages/omniweb-toolkit run check:tip-visibility -- --feed-limit 100 --tip-amount 1
```

## Budget

- packet DEM ledger remains `10 / 25` nominal testnet DEM
- react budget used: `0`
- tip budget used: `0`
- no `--execute`, no `--include-tip`, and no DEM transfer ran

## Next Lane

Advance to `omniweb-agents-0ctx.8` only after this lane PR is merged and Beads
state is pushed.
