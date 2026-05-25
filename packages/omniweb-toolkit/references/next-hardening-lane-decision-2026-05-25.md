---
summary: "Decision record for the next executable no-spend Demos hardening lane after 04c5 evidence reconciliation."
read_when: ["04c5.6", "next hardening lane", "escrow readback", "Demos docs backed hardening"]
owner_bead: "omniweb-agents-04c5.6"
status: "decision-only"
date: "2026-05-25"
---

# Next Hardening Lane Decision - 2026-05-25

Decision: run escrow existing-transaction readback wrapper hardening next.

This is a decision record only. It does not add package APIs, CLI commands,
runtime behavior, live packet authority, spend, upload, broadcast, hosted
activation, npm release, credential mutation, or secret access.

## Selected Lane

Lane name: escrow existing-tx readback wrapper hardening.

Primary target:

- existing escrow tx:
  `2c225acd869c0041606ba7c7981f3d68ce8cd97c6a7feac83a4221f125be92b1`
- maintained package surface:
  `omni.escrow.getClaimable`, `omni.escrow.getEscrowBalance`, and supporting
  readback classification around the existing `escrow-api.ts` behavior
- first deliverable:
  a no-spend readback hardening PR that can classify the existing tx and current
  escrow read wrappers as `resolved`, `degraded`, or `blocked` without sending,
  claiming, refunding, or broadcasting

## Evidence Consumed

- `demos-official-docs-source-map-2026-05-25.md`: official source map records no
  named Escrow guide in the current docs index, so missing official docs remain a
  gap.
- `storage-ipfs-escrow-docs-reconciliation-2026-05-25.md`: escrow is
  `degraded`, `blocked`, and `design-needed`; existing tx readback is the
  concrete blocker.
- `hardening-readiness-evidence-model-2026-05-25.md`: next lanes must carry
  official docs, SDK/API/source behavior, package behavior, and no-spend proof.
- `9st0.3-escrow-readiness-2026-05-23/readiness-report.md`: existing tx
  readback remained degraded because claimable/balance wrappers did not prove
  product escrow state after confirmation.
- `successor-unblock-readiness-2026-05-23/readiness-aggregation.md` and
  `packet-decision.md`: no successor live packet was authorized.

## Scope

Allowed:

- inspect current package escrow read wrapper behavior
- use the existing tx hash as readback input
- run no-spend readback probes or local tests that do not sign, confirm,
  broadcast, send, claim, refund, upload, or mutate identity
- improve classification, error handling, fixture shape, docs, or tests for
  existing readback behavior
- add or update a package-internal no-spend proof artifact if the command is
  reproducible and public-safe

Not allowed:

- `sendToIdentity`, `claimEscrow`, `refundExpired`, or any equivalent mutation
- new public escrow namespace, CLI command, manifest schema, or action promotion
  before the readback blocker is resolved
- DEM spend, transaction signing, confirmation, broadcast, wallet mutation,
  mainnet, hosted activation, npm release, or secret lookup
- using tx confirmation alone as product success

## Stop Rules

Stop before execution if any of these are true:

- the path requires a mnemonic, private key, signer, live wallet, or secret
- readback requires a new escrow send, claim, refund, or broadcast
- the existing tx cannot be queried without adding spendful or mutating behavior
- the readback result is ambiguous and cannot be classified as `resolved`,
  `degraded`, or `blocked`
- official docs or SDK/API source contradict the planned package classification

## Validation Gates

Minimum local validation for the implementation lane:

- `git diff --check`
- targeted escrow tests or a focused no-spend escrow readback command
- `bd dep cycles --json`
- `bd ready --json`
- `bun run check:package` if package docs, exported references, scripts, or package
  surface change

CI and review gates:

- `check`
- `validate`
- `codex-review`
- inspect and resolve any `chatgpt-codex-connector[bot]` comments before merge

## Excluded Alternatives

Storage write hardening is not first:

- storage has a green no-spend preview and maintained reads, but create/set
  hardening crosses into broadcast/write authority and fee/readback policy.
- choose it only after the escrow readback blocker is either resolved or remains
  explicitly degraded after a no-spend pass.

IPFS is not first:

- no named official IPFS guide is present in the current docs index.
- installed SDK IPFS subpath import is not stable under Bun.
- quote/readback remains blocked on `Unknown message`.

XM is not first:

- official docs exist, but current import behavior crashes through native-module
  loading.
- there is no package namespace, read fixture, gas model, wallet model, or
  no-spend package proof.

Rubic is not first:

- quote and execute must be separated first.
- no no-wallet quote fixture or response contract exists.
- execute remains spendful cross-chain behavior and is blocked.

DemosWork is not first:

- official docs exist, but import/runtime behavior is blocked.
- compile-only fixtures and redaction rules need design before execution or
  package claims.

## Next Bead Shape

Create the implementation follow-up as one scoped bead and one PR:

- title: Harden escrow existing-tx readback wrappers
- type: task
- priority: 1
- owner scope: package escrow readback only
- branch: `codex/escrow-existing-tx-readback-hardening`
- acceptance: existing escrow tx readback is classified with the four evidence
  columns; no send, claim, refund, broadcast, spend, or public API promotion
