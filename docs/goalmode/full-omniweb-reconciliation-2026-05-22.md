---
type: goal-launch
status: ready-for-goal
created: 2026-05-22
source_contract: docs/ROADMAP.md#phase-25-full-omniweb-endpoint-inventory
prep_bead: omniweb-agents-3005.7
owner_beads:
  - omniweb-agents-6rc3.2
  - omniweb-agents-6rc3.3
  - omniweb-agents-6rc3.4
  - omniweb-agents-3005.1
  - omniweb-agents-3005.2
  - omniweb-agents-3005.3
  - omniweb-agents-3005.4
  - omniweb-agents-3005.5
  - omniweb-agents-3005.6
summary: "No-spend GoalMode packet for the full OmniWeb reconciliation and inventory lane."
---

# Full OmniWeb Reconciliation GoalMode Packet

## Objective

Complete the no-spend reconciliation and inventory lane for the next OmniWeb roadmap band:

1. Reconcile current Colony/Hive proof and manifest truth.
2. Inventory broader Demos, DemosWork, XM/Rubic, storage/IPFS/escrow, identity, attestation, messaging, network, and crypto/ZK-adjacent substrate families.
3. Design future manifest and CLI namespace changes only after the inventories settle.

This packet is launch preparation and execution guidance. It does not authorize live writes, broadcasts, DEM spend, npm release, production hosting, mainnet work, speculative wrappers, broad new CLI namespaces, or capability-manifest schema changes beyond the narrow `omniweb-agents-6rc3.2` manifest coverage fix.

## Starting Truth

- PR #490 merged the full OmniWeb endpoint inventory into `main`.
- The map of record is `packages/omniweb-toolkit/references/full-omniweb-endpoint-inventory-2026-05-22.md`.
- `omniweb-agents-3005` is the parent inventory epic.
- `omniweb-agents-6rc3.2`, `.3`, and `.4` are the existing Colony reconciliation beads reused by this lane.
- `omniweb-agents-3005.1` through `.6` are the broad inventory and design children.
- Spendful successor proofs remain separate in existing beads such as `omniweb-agents-0ctx.*` and `omniweb-agents-5mnk.*`.

## Execution Order

1. `omniweb-agents-6rc3.2` - capability manifest ETH mirror method coverage.
2. `omniweb-agents-6rc3.3` - colony proof-doc reconciliation from a fresh no-spend read sweep.
3. `omniweb-agents-6rc3.4` - maintained runtime-basic Hive read sweep expansion or explicit classification.
4. `omniweb-agents-3005.1` - Demos SDK and node RPC inventory.
5. `omniweb-agents-3005.2` - DemosWork orchestration inventory.
6. `omniweb-agents-3005.3` - XM cross-chain and Rubic bridge inventory.
7. `omniweb-agents-3005.4` - storage, IPFS, and escrow inventory reconciliation only.
8. `omniweb-agents-3005.5` - identity, attestation, messaging, network, and crypto inventory.
9. `omniweb-agents-3005.6` - future manifest and CLI namespace design after inventories settle.

Each item must end with evidence, a merged PR, or an explicit `DEGRADED`, `STUCK`, or `BLOCKED` verdict before the run advances.

## Acceptance Criteria

AC-M0. Fresh base and durable graph.

Evidence target: PR #490 is merged, the checkout starts from current `origin/main`, `bd dolt pull || true` has run, `bd dep cycles --json` is clean, `bd ready --json` reflects the dependency chain, and `omniweb-agents-3005.7` records this packet.

AC-M1. `omniweb-agents-6rc3.2` manifest coverage.

Evidence target: capability discovery includes every ETH mirror pool method exposed by `HiveAPI`, including `omni.colony.getEthHigherLowerPool` and `omni.colony.getEthBinaryPools`. Focused tests must fail if `HiveAPI` and the manifest drift again. Run the focused manifest/discovery tests plus `npm --prefix packages/omniweb-toolkit run check:package`.

AC-M2. `omniweb-agents-6rc3.3` proof-doc reconciliation.

Evidence target: fresh no-spend read sweep evidence reconciles `read-surface-sweep.md`, `verification-matrix.md`, and `full-action-spectrum-read-discovery-proof-2026-05-19.md`. Docs must cite the rerun command/date and preserve production, dev-only, auth-gated, deployment-disabled, degraded, and STUCK distinctions.

AC-M3. `omniweb-agents-6rc3.4` runtime-basic Hive read coverage.

Evidence target: `check-read-surface-sweep` either probes or explicitly classifies runtime-basic reads such as prediction leaderboard, prediction score, agent balance, agent tip stats, and any other missing `HiveAPI` reads. Reference docs must name updated coverage and preserve auth/runtime requirements.

AC-M4. `omniweb-agents-3005.1` Demos SDK/node RPC inventory.

Evidence target: Demos WebSDK and node RPC read/write/sign/broadcast/governance/network methods are mapped to current package coverage, proof status, mutation/spend class, runtime requirements, blockers, and candidate future beads without executing live writes or adding public interfaces.

AC-M5. `omniweb-agents-3005.2` DemosWork inventory.

Evidence target: DemosWork, BaseOperation, ConditionalOperation, native/Web2/XM steps, and sanity-check helpers are classified by mutation class, runtime requirements, package coverage, proof status, blockers, and safe future boundaries. No orchestration wrappers or job runners are added.

AC-M6. `omniweb-agents-3005.3` XM/Rubic bridge inventory.

Evidence target: XM chain adapters, cross-chain identity hooks, and Rubic bridge methods are classified by read/write/spend class, runtime and wallet requirements, proof status, blockers, and next integration candidates. Live bridge, trade, or wallet expansion work remains out of scope.

AC-M7. `omniweb-agents-3005.4` storage/IPFS/escrow reconciliation.

Evidence target: Demos StorageProgram, IPFSOperations, and EscrowTransaction raw SDK surface is reconciled with current `omni.storage`, `omni.ipfs`, `omni.escrow` wrappers and existing `5mnk` live-proof successor beads. No broadcast or spend occurs.

AC-M8. `omniweb-agents-3005.5` identity/attestation/messaging/network/crypto inventory.

Evidence target: Web2, XM, UD, Nomis, PQC identity, DAHR/TLSN, L2PS, instant messaging/IMP, governance-validator-peer reads, encryption, and ZK-adjacent helpers are classified with raw sources, current package surface, proof status, mutation/spend class, runtime requirements, blockers, and safe next beads.

AC-M9. `omniweb-agents-3005.6` future manifest and CLI namespace design.

Evidence target: design proposes namespace boundaries, manifest/schema changes, and staged CLI/API rollout order for non-colony domains only after AC-M4 through AC-M8 settle. Preserve no-spend defaults, explicit live flags, compatibility, and current public-interface stability until later implementation beads.

## Stop Conditions

Stop before live mutation or new public surface if:

- a step would require `--execute`, `--broadcast`, `--confirm-identity-mutation`, token transfer, storage/IPFS/escrow mutation, bridge execution, chat send, profile mutation, or mainnet work
- a proposed change creates broad new CLI namespaces before `3005.6`
- a proposed manifest change is wider than the `6rc3.2` ETH mirror coverage fix
- inventory evidence cannot identify raw source, current package surface, mutation/spend class, or proof status
- package docs and repo roadmap would make conflicting current-truth claims
- two consecutive attempts hit the same runtime or source-access blocker
- Codex/GitHub review finds a blocker that cannot be resolved inside the current bead

Use `DEGRADED` when evidence exists but is thin or deployment-specific. Use `STUCK` when repeated attempts hit the same blocker. Use `BLOCKED` when a required external source, credential, upstream behavior, or prerequisite bead prevents honest progress.

## Validation Ladder

Preparation PR:

```bash
git diff --check
bd dep cycles --json
bd ready --json
```

Manifest/doc reconciliation:

```bash
npm --prefix packages/omniweb-toolkit run check:package
```

Inventory/design PRs:

```bash
git diff --check
rg -n "all operations work|any operation|mainnet|npm release|public registry|live write|broadcast" docs packages/omniweb-toolkit/references
bd dep cycles --json
bd ready --json
```

Use narrower package checks whenever package code, package references, or package validation scripts change.

## Launch Prompt

```text
/goal Execute the no-spend full OmniWeb reconciliation lane from docs/goalmode/full-omniweb-reconciliation-2026-05-22.md.

Start from fresh origin/main. Run bd dolt pull || true, inspect bd ready --json, confirm bd dep cycles --json is clean, and keep Beads as the durable execution ledger. The owner beads, in order, are omniweb-agents-6rc3.2, omniweb-agents-6rc3.3, omniweb-agents-6rc3.4, omniweb-agents-3005.1, omniweb-agents-3005.2, omniweb-agents-3005.3, omniweb-agents-3005.4, omniweb-agents-3005.5, and omniweb-agents-3005.6.

Continue through the sequence until every item has evidence, a merged PR, or an explicit DEGRADED, STUCK, or BLOCKED verdict. Do not stop after the first successful reconciliation slice. Do not run live writes, broadcasts, DEM spend, npm release, production hosting, mainnet, speculative wrappers, broad new CLI namespaces, or capability-manifest schema changes except the narrow 6rc3.2 ETH mirror coverage fix.

For each bead: claim it before implementation, use one branch and PR, run the smallest meaningful validation, inspect CI and Codex review before merge, update Beads with proof paths and verdicts, and push Beads. Work reconciliation first, broad inventories second, and future manifest/CLI design last.
```
