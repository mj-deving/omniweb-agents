---
type: goal-launch
status: ready-for-testnet-live-run
created: 2026-05-21
source_contract: docs/ROADMAP.md#phase-24-testnet-live-write-goalmode-tranche
owner_bead: omniweb-agents-operator-stress.5
summary: "Long-running GoalMode packet for bounded testnet live writes without per-operation human approval prompts."
---

# Testnet Live-Write GoalMode Packet

## Objective

Execute the `omniweb-agents-operator-stress.5` live-write tranche as a long-running GoalMode run. Convert the completed no-spend operatorHelp stress proof and write-preview packets into bounded testnet live-operation proof, one operation at a time, with product readback.

The user has approved this testnet tranche to proceed without asking for a fresh human "yes" before each individual live operation. This approval removes the per-operation human prompt, not the code-level safety gates: every live command must still use the explicit script flag required by that script, such as `--execute`, `--broadcast`, `--confirm-identity-mutation`, or the closest maintained equivalent.

## Scope

Allowed:
- testnet DEM spend inside this packet's budget
- testnet social writes such as publish, reply, react, and tip when the target and readback surface are controlled
- testnet market writes such as VOTE, fixed-price BET, and higher/lower BET when readback can prove product effect
- supervised testnet identity/profile operations when the target wallet/profile and cleanup/readback plan are explicit
- testnet escrow/storage/IPFS/raw-chain probes only after a no-spend readiness pass confirms explicit targeting and readback criteria

Not allowed:
- mainnet or real-money operations
- npm publish, public registry proof, or production hosted activation
- new secret storage, credential export, token capture, mnemonic handling, or local credential-path disclosure
- unbounded retry loops or repeated spend when a no-spend readback/recheck can answer the same question
- claims that tx confirmation alone is product success when the operation has a product readback surface

## Authorization And Budget

Human approval policy:
- per-operation human prompts are not required for this packet
- the active GoalMode runner may proceed through reviewed testnet live operations until every acceptance anchor has evidence, `DEGRADED`, or `STUCK`
- if an operation falls outside this packet, stop and create/update a Bead instead of treating this approval as blanket authority

Budget policy:
- total tranche ceiling: 25 testnet DEM
- default single-operation ceiling: 5 testnet DEM
- each spendful retry counts against the total ceiling
- before any repeat spend, run no-spend readback/recheck for the prior tx, lifecycle record, post, pool, memo, profile, or target where possible
- identity/profile mutations do not consume DEM by default, but count as mutation budget and require cleanup/readback evidence when temporary

## Source Truth

Start from fresh `origin/main`, then run:

```bash
bd dolt pull || true
bd ready --json
bd show omniweb-agents-operator-stress.5 --json
bd show omniweb-agents-operator-stress --json
```

Current predecessor proof:
- PR #459 classified all 92 read commands and ran the maintained no-spend read sweeps.
- PR #460 generated proposed action packets for all 28 write commands without mutation.
- PR #462 closed `omniweb-agents-km3g` for explicit identity probe targeting.
- PR #463 closed `omniweb-agents-vhat` for explicit escrow/storage/IPFS targeting and chain sign/verify proof.
- PR #464 closed `omniweb-agents-wck6` by restoring the configured/default wallet profile with readback.

Use Beads as the execution ledger. Do not put secrets, mnemonics, signatures, tokens, private URLs, local credential paths, or raw challenge material into Beads, docs, or committed proof packets.

## Acceptance Anchors

AC-L1. Fresh base and live tranche claimed.

Evidence target: `origin/main` is current, Beads are pulled, `omniweb-agents-operator-stress.5` is claimed, dependencies are resolved or explicitly closed/STUCK, and the work branch names the active child.

AC-L2. Authorization packet active.

Evidence target: this packet is cited in Beads notes and the run log. The runner records that the user waived per-operation human prompts for bounded testnet operations, while script-level live flags remain mandatory.

AC-L3. No-spend readiness preflight.

Evidence target: intended live operation families are selected from the PR #460 proposed action packets, current commands still exist, target and budget are set, explicit live flags are identified, and primary/secondary readback surfaces are named.

AC-L4. Live operations run one at a time.

Evidence target: each operation records command, host/network, wallet/address marker, target, amount or mutation class, explicit live flag, tx or mutation result, lifecycle record where available, primary readback, secondary readback when relevant, and final verdict.

AC-L5. Identity/profile operations stay supervised and clean.

Evidence target: identity/profile writes use explicit target selection plus `--execute --confirm-identity-mutation` or equivalent, preserve no-secret proof output, and record cleanup/readback when the mutation is temporary.

AC-L6. Social and colony interaction writes prove product effect.

Evidence target: publish, reply, react, and tip-like operations record product readback through feed, post detail, thread, stats, balance, or lifecycle recheck surfaces as appropriate. Degraded indexing is allowed only when evidence distinguishes chain acceptance from product indexing.

AC-L7. Market and chain/domain writes prove the right surface.

Evidence target: VOTE and BET-style operations prove product effect through search, active pool, winners/history, pool totals, memo, lifecycle readback, or equivalent. Escrow/storage/IPFS/raw-chain probes prove exact target/readback or are marked `STUCK` without repeated spend.

AC-L8. Budget ledger and duplicate-spend control are complete.

Evidence target: a tranche ledger records each spend/mutation, cumulative testnet DEM total, retries, no-spend rechecks, and remaining budget. No operation exceeds 5 testnet DEM unless this packet is updated in a PR or Beads note before the run.

AC-L9. Final closeout updates repo truth.

Evidence target: Beads, Roadmap, and proof references state what is `GREEN`, `DEGRADED`, `BLOCKED`, or `STUCK`; `omniweb-agents-operator-stress.5` closes only when readback proof exists or remaining work is honestly split into new Beads.

## Stop Conditions

Stop immediately and record `STUCK` or create a blocker bead if:
- the target network is not clearly testnet
- the next action could spend over 25 testnet DEM total or over 5 testnet DEM for one operation
- a command would require exposing secrets, tokens, mnemonics, signatures, private URLs, or local credential paths
- a script can broadcast but cannot record an explicit target, amount/mutation class, tx/mutation result, and readback plan
- a prior spend may have succeeded but product readback has not been checked
- two consecutive broadcast attempts fail with the same error
- tx success and product readback disagree in a way the lifecycle tools cannot classify
- npm release, public registry proof, production hosted activation, mainnet, or real-money behavior appears in the requested action path

Use `DEGRADED` when:
- chain confirmation succeeds but product indexing lags
- primary product readback is stale but secondary readback is strong enough to preserve evidence
- a family has only a thin readback surface
- a live operation is safe to skip because predecessor proof already establishes enough for the tranche

## Operation Record Template

For each operation, append an evidence record in the proof packet or run report:

```text
operation:
  family:
  command:
  explicit_live_flag:
  host_or_network:
  wallet_marker:
  target:
  amount_or_mutation_class:
  budget_before:
  budget_after:
  tx_or_mutation_result:
  lifecycle_record:
  primary_readback:
  secondary_readback:
  verdict:
  follow_up_bead:
```

Redact secrets and private local paths. Wallet markers may be public addresses or existing redacted runtime markers, not private key material.

## Proof Commands

Preparation:

```bash
git status --short --branch
bd dolt pull || true
bd ready --json
bd show omniweb-agents-operator-stress.5 --json
```

No-spend readiness examples:

```bash
npm --prefix packages/omniweb-toolkit run check:colony-operator-admissibility
npm --prefix packages/omniweb-toolkit run check:market-write-intents
npm --prefix packages/omniweb-toolkit run check:colony-operator-multi-action-plan
```

Package sanity after code or proof-script edits:

```bash
npm --prefix packages/omniweb-toolkit run check:package
npm --prefix packages/omniweb-toolkit run check:verification-matrix
```

Closeout:

```bash
git diff --check
bd dep cycles --json
bd ready --json
bd dolt push
```

## Launch Prompt

```text
Execute the bounded testnet live-write tranche for `omniweb-agents-operator-stress.5` using `docs/goalmode/testnet-live-write-tranche-2026-05-21.md`.

The user has granted broad approval for this testnet run, so do not stop to ask for per-operation human approval. This approval is limited to testnet DEM and testnet mutation surfaces. It does not authorize mainnet, real-money, npm release, public registry proof, production hosted activation, secret handling changes, local credential-path disclosure, or unbounded repeated spend.

Keep explicit script-level live flags mandatory. Every live operation must use the maintained `--execute`, `--broadcast`, `--confirm-identity-mutation`, or equivalent flag required by the script. Run one narrow operation at a time, keep total spend at or below 25 testnet DEM, keep each single spend at or below 5 testnet DEM, and run no-spend readback/recheck before any repeat spend.

Continue across AC-L1 through AC-L9 until every anchor has evidence, `DEGRADED`, or `STUCK`. Do not stop at the first successful live operation. Record command, target, amount/mutation class, tx/mutation evidence, lifecycle/readback proof, budget ledger, and final verdict for every operation. Close or update Beads and Roadmap honestly at the end.
```
