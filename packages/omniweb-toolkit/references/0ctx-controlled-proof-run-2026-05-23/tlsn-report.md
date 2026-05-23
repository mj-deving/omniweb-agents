---
summary: "0ctx.2 controlled proof lane result for TLSN preview, quote, and redaction readiness."
---

# 0ctx.2 TLSN Preview Quote Redaction Proof

Status: `BLOCKED`

Bead: `omniweb-agents-0ctx.2`

Packet: [docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md](../../../../docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md)

## Result

No live TLSN proof was executed. The packet allows a live TLSN proof only after
the lane has a reviewed public URL, runtime dependency readiness, a concrete
storage fee quote, an explicit budget, and a redaction plan that can sanitize
proof material before any tracked artifact or Beads note is written.

The no-spend preview validated a public URL and the explicit
`colony-operator` credential target, and the maintained local bridge dependencies
are present. The lane is still `BLOCKED` because the preview does not have a
concrete no-spend storage quote, the worst-case policy estimate exceeds the
`5 DEM` hard budget, and the current bridge has not proven a sanitizer for real
TLSN presentation material.

No `--broadcast` command was run.

## Evidence

- Preview artifact: [tlsn-preview.json](./tlsn-preview.json)

Preview details:

- agent target: `colony-operator`
- reviewed URL: `https://supercolony.ai/llms-full.txt`
- method: `GET`
- URL validation: `valid: true`
- maintained bridge dependencies: `playwright`, `tlsn-js`, `tlsn-js/build/lib.js`,
  and the local WASM asset are present
- SDK `@kynesyslabs/demosdk/tlsnotary` subpath remains unreliable in Node and is
  not required by the maintained bridge
- quote: not concrete
- policy estimate: token request `1 DEM` plus bridge safety-margin storage
  estimate `34 DEM`, worst-case `35 DEM`
- hard budget: `5 DEM`

## Command

Preview:

```bash
npm --prefix packages/omniweb-toolkit run check:tlsn-preview -- --agent-name colony-operator --url https://supercolony.ai/llms-full.txt --proof-out packages/omniweb-toolkit/references/0ctx-controlled-proof-run-2026-05-23/tlsn-preview.json
```

## Redaction Plan

Allowed in tracked artifacts:

- reviewed URL origin/path with query redacted
- HTTP method
- dependency readiness booleans
- fee estimate metadata
- credential target kind and public agent name
- future tx hashes/token id only if a later live proof passes every gate

Forbidden in tracked artifacts and Beads:

- TLSN presentation JSON
- raw transcript sent/received bytes
- attestation hex
- secrets hex
- proof byte ranges
- session URL, proxy URL, or notary websocket URL
- signed transactions, signatures, credentials, tokens, or local credential paths

## Budget

- prior packet DEM ledger: `10.1 / 25` nominal testnet DEM
- TLSN budget used: `0 DEM`
- updated packet DEM ledger: `10.1 / 25` nominal testnet DEM
- no token request, proof generation, proof storage, tx hash, or storage spend

## Next Lane

Advance to the lower-priority gated planning lanes `omniweb-agents-0ctx.7` and
`omniweb-agents-6rc3.5` after this lane PR is merged and Beads state is pushed.
