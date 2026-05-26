---
summary: "No-spend IPFS quote and escrow existing-tx readback refresh for the IPFS/escrow evidence gate."
read_when: "IPFS escrow no-spend probe refresh, ui3j.2, PR2 evidence"
owner_bead: "omniweb-agents-ui3j.2"
status: "no-spend-refresh"
date: "2026-05-26"
---

# IPFS Escrow No-Spend Probe Refresh - 2026-05-26

This PR2 artifact records the public-safe summary of the no-spend IPFS and
escrow probe refresh planned by
`ipfs-escrow-evidence-refresh-inventory-2026-05-26.md`.

Scope exclusions:

- no `--broadcast`
- no upload, pin, or unpin
- no escrow send, claim, or refund
- no signing or wallet mutation
- no public API, CLI, wrapper, manifest, hosted activation, or npm publish

## Commands

IPFS:

```bash
bunx tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts \
  --agent-name colony-operator \
  --content "Public no-spend IPFS quote refresh for omniweb-toolkit evidence gate on 2026-05-26." \
  --filename omniweb-toolkit-ipfs-evidence-refresh-2026-05-26.txt \
  --budget-dem 5 \
  --readback "owned CID and chain/readback proof required before any future broadcast" \
  --state-dir /tmp/ipfs-escrow-refresh-ipfs \
  --proof-out /tmp/ipfs-escrow-refresh-ipfs.json
```

Escrow:

```bash
bunx tsx packages/omniweb-toolkit/scripts/probe-escrow.ts \
  --agent-name colony-operator \
  --recheck-existing-proof \
  --verify-timeout-ms 0 \
  --verify-poll-ms 5000 \
  --state-dir /tmp/ipfs-escrow-refresh-escrow \
  --proof-out /tmp/ipfs-escrow-refresh-escrow.json
```

Both emitted redacted commands in the report body. Neither command included
`--broadcast`.

## IPFS Result

Verdict: `EXCLUDED`

Public-safe summary:

- `attempted: false`
- `status: EXCLUDED`
- `runtimeTarget.credentialSource: agent-name`
- `runtimeTarget.agentName: colony-operator`
- `runtimeTarget.stateDir: provided-redacted`
- `previewGate.liveRequested: false`
- `previewGate.explicitLiveFlag: --broadcast`
- `previewGate.checks.publicPayload: true`
- `previewGate.checks.explicitBudget: true`
- `previewGate.checks.quoteConcrete: false`
- `previewGate.checks.quoteWithinBudget: false`
- `previewGate.checks.readbackExpectationPresent: true`
- `quoteSupport.classification: unsupported-runtime`
- `quoteSupport.concrete: false`
- `quoteSupport.quotedFeeDem: null`
- `quoteSupport.budgetDem: 5`
- `successorReadiness.status: EXCLUDED`
- `successorReadiness.includeInSuccessor: false`
- `successorReadiness.recommendation: exclude-ipfs-from-successor-live-packet`

Reason codes:

- `ipfs_quote_unknown_message`
- `successor_ipfs_excluded_unsupported_quote`

Evidence:

- quote path: `omni.runtime.demos.ipfs.quote`
- node call: `ipfsQuote`
- quote args: `{"file_size_bytes":83,"operation":"IPFS_ADD"}`
- quote response: `{ error: "unknown message"}`

Classification:

- The public-safe payload and explicit 5 DEM budget were accepted.
- The runtime still did not return a concrete quote.
- No CID exists before upload on this maintained runtime.
- IPFS remains excluded from successor live execution and blocked pending a
  concrete no-spend quote plus owned CID and chain/readback proof.

## Escrow Result

Verdict: `DEGRADED`

Public-safe summary:

- `attempted: false`
- `recheck: true`
- `status: DEGRADED`
- `finalVerdict: DEGRADED`
- `runtimeTarget.credentialSource: agent-name`
- `runtimeTarget.agentName: colony-operator`
- `runtimeTarget.stateDir: provided-redacted`
- `platform: github`
- `username: phase24-continuation-20260521`
- `amount: 0.1`
- `ceilingDem: 5`
- existing tx:
  `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`
- `previewGate.ok: true`
- `previewGate.liveFlag: --recheck-tx-hash`
- `verification.confirmed: true`
- `verification.blockNumber: 2312202`
- `verification.timeoutMs: 0`
- `readbackClassification.status: DEGRADED`
- `readbackClassification.confirmationSurface: tx_confirmed_readback_wrappers_degraded`

Reason codes:

- `escrow_query_method_not_implemented`
- `readback_wrappers_degraded`

Classification:

- The existing tx is still confirmed.
- Product escrow state is still not proven.
- Claimable and balance readback remain degraded because the wrappers return
  method-not-implemented payloads.
- Existing tx confirmation alone is not enough for `GREEN`.

## PR3 Gate

PR3 is not needed based on this PR2 evidence.

Reason:

- IPFS behavior is unchanged: unsupported quote, `Unknown message`, no concrete
  fee.
- Escrow behavior is unchanged: tx confirmed, readback wrappers degraded.
- Existing classifiers produced the expected conservative classifications.

If later review finds an over/under-classification bug, PR3 should be reopened
or replaced with a narrow classifier/test bead. Otherwise close `ui3j.3` as
`not needed: PR2 evidence unchanged` after PR2 lands.
