---
summary: "9st0.4 IPFS quote readiness and successor exclusion decision."
---

# 9st0.4 IPFS Quote Exclusion

Status: `EXCLUDED`

Bead: `omniweb-agents-9st0.4`

Date: `2026-05-23`

## Decision

Exclude IPFS upload from the next successor live packet.

No concrete no-upload fee quote is available for the maintained IPFS path. The
current preview reaches `omni.runtime.demos.ipfs.quote`, but the SDK node call
`ipfsQuote` returns `Unknown message` for `IPFS_ADD`. That is precise
unsupported-runtime evidence, not a spend-ready quote.

No upload, broadcast, spend, credential mutation, or profile mutation was run
for this decision.

## Command

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --agent-name colony-operator --budget-dem 5 --readback tx-confirmation --state-dir /tmp/sc96-readiness-state/ipfs --proof-out packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/ipfs-preview.json
```

## Artifacts

- `packages/omniweb-toolkit/references/9st0-successor-unblock-2026-05-23/ipfs-quote-exclusion.json`

Source evidence:

- `packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/ipfs-preview.json`
- `packages/omniweb-toolkit/references/sc96-successor-readiness-2026-05-23/readiness-report.md`

## Reason Codes

- `ipfs_quote_unknown_message`
- `successor_ipfs_excluded_unsupported_quote`

## Aggregation Contract

`omniweb-agents-9st0.9` should consume this as:

- status: `EXCLUDED`
- include in successor live packet: `false`
- budget impact: `0 DEM`
- live gate: no IPFS `--broadcast`
- reopen condition: a later no-spend preview returns a concrete IPFS fee within
  the explicit successor budget and records a readback expectation
