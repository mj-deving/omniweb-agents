---
type: goal-launch
status: ready-for-goal
created: 2026-05-22
source_contract: docs/ROADMAP.md#phase-24-testnet-live-write-goalmode-tranche
predecessor_packet: docs/goalmode/testnet-live-write-successor-2026-05-21.md
prep_bead: omniweb-agents-wm9s
owner_beads:
  - omniweb-agents-5mnk.2
  - omniweb-agents-5mnk.3
  - omniweb-agents-5mnk.4
summary: "Fresh advanced-domain successor packet after PR #483 explicit mutation-probe targeting."
---

# Testnet Live-Write Advanced-Domain Successor Packet

## Objective

Prepare the next long-running `/goal` run for the leftover Phase 24 advanced-domain work after PR #483:

- storage, IPFS, and escrow are the only intended mutation lanes
- each lane must start with a no-spend preview
- live `--broadcast` requires an explicit existing credential target through `--agent-name` or `--env-path`
- at most one spendful advanced-domain mutation may land in one PR
- success requires product/readback evidence, not only a tx or mutation result

This packet is a prep artifact only. It does not run a live write, spend DEM, mutate identity, publish to npm, prove public registry install, activate production hosting, disclose secret paths, or authorize mainnet/real-money work.

## Starting Truth

- PR #482 completed the no-spend write/spend sweep and opened follow-up child beads.
- PR #483 completed `omniweb-agents-0ctx.6`: identity, storage, IPFS, and escrow mutation probes now refuse live mutation unless an explicit existing `--agent-name` or `--env-path` target is provided.
- Fixed-price BET is `GREEN` via PR #466 with `5` testnet DEM and product readback.
- Higher/lower BET is `GREEN` via PR #467 with `5` testnet DEM and product readback.
- VOTE is `GREEN` via PR #476 with category-search product readback.
- Social remains `BLOCKED/DEGRADED` via PR #477 because no eligible untouched attested target met score `>=85` and engagement `>=5`.
- Raw-chain advanced-domain proof is `GREEN` via PR #478 with no spend and no broadcast.
- Official SuperColony agent identity guidance says profile names are slugified with lowercase `a-z`, digits, and hyphens only. The selected Phase 24 credential profile name is `colony-operator`; it is a valid role-style slug but must still resolve locally before any preview can count as green.
- Nominal spend remains `10 / 25` testnet DEM.

## Execution Order

1. Start from fresh `origin/main`, run `bd dolt pull || true`, inspect `bd ready --json`, and claim exactly one child bead.
2. Prefer storage first (`omniweb-agents-5mnk.2`) because it has a fixed planned cost and a concrete readback field. IPFS (`.3`) and escrow (`.4`) remain valid if live preview evidence shows storage is blocked.
3. Run the selected child bead's no-spend preview and record target, public address, redacted runtime target, budget/quote, explicit live flag, and readback surface.
4. If the preview is green and the packet stop conditions are clear, run at most one live `--broadcast` in that PR.
5. Close out Roadmap, Beads, proof references, budget ledger, and final `GREEN`, `DEGRADED`, `STUCK`, or `BLOCKED` verdict before moving to the next child.

## Acceptance Criteria

AC-A1. The run starts from current `origin/main`, with Beads pulled and dependency cycles checked.

AC-A2. The selected child bead is claimed before execution and notes name the no-spend preview, explicit credential target mode, budget/quote, and readback surface.

AC-A3. Every storage/IPFS/escrow preview records a public address and redacted `runtimeTarget`; proof artifacts must not include local env/state paths.

AC-A4. Live `--broadcast` is refused unless an explicit existing `--agent-name` or `--env-path` is provided. A missing explicit target is a correct pre-mutation failure.

AC-A5. A single PR may contain at most one spendful advanced-domain mutation.

AC-A6. Success is counted only when product/readback evidence matches the operation. Tx or mutation result alone is insufficient.

AC-A7. The ledger stays under `25` total testnet DEM and `5` DEM per operation unless this packet is updated before execution.

AC-A8. Social, VOTE, raw transfer, npm release, public registry proof, production hosting, mainnet, and secret-handling changes stay out of scope.

## Stop Conditions

Stop before mutation if:

- no explicit existing credential target is selected
- target, mutation class, explicit live flag, cost, quote, or readback surface is unclear
- the preview only proves `default-runtime` and no explicit target has been re-run
- the proof would persist a local credential path or secret-like value
- the selected operation would exceed `5` DEM or push total nominal spend above `25` DEM
- two consecutive attempts fail with the same runtime error
- product readback disagrees with tx/mutation evidence and lifecycle tooling cannot classify it

## Proof Commands

Preflight:

```bash
git fetch origin main --prune
bd dolt pull || true
bd ready --json
bd dep cycles --json
```

Choose one explicit credential target form before any live `--broadcast`:

```bash
# Selected Phase 24 agent target. It must already be provisioned locally.
--agent-name colony-operator

# Existing env target, allowed when the path is available locally.
--env-path <existing-env-file>
```

Storage preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-storage.ts --agent-name colony-operator --program-name phase24-continuation-20260521-storage --proof-out packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/storage-preview-colony-operator.json
```

Storage live, only after green preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-storage.ts --agent-name colony-operator --program-name phase24-continuation-20260521-storage --broadcast --proof-out packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/storage-live.json
```

IPFS preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --agent-name colony-operator --filename phase24-continuation-2026-05-21.txt --content 'Phase 24 continuation controlled IPFS proof, public testnet payload, no secrets.' --proof-out packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/ipfs-preview.json
```

IPFS live, only after green preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --agent-name colony-operator --filename phase24-continuation-2026-05-21.txt --content 'Phase 24 continuation controlled IPFS proof, public testnet payload, no secrets.' --broadcast --proof-out packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/ipfs-live.json
```

Escrow preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --platform github --username phase24-continuation-20260521 --amount 0.1 --message 'Phase 24 continuation controlled escrow proof' --proof-out packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/escrow-preview.json
```

Escrow live, only after green preview:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --agent-name colony-operator --platform github --username phase24-continuation-20260521 --amount 0.1 --message 'Phase 24 continuation controlled escrow proof' --broadcast --proof-out packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/escrow-live.json
```

## Launch Prompt

```text
/goal Execute the Phase 24 advanced-domain successor from docs/goalmode/testnet-live-write-advanced-domain-successor-2026-05-22.md.

Start from fresh origin/main, run bd dolt pull, inspect bd ready, and claim exactly one of omniweb-agents-5mnk.2, omniweb-agents-5mnk.3, or omniweb-agents-5mnk.4. Prefer storage first unless current preview evidence makes it blocked. Do not run VOTE, social mutation, raw transfer, npm release, public registry proof, production hosted activation, mainnet, or secret-handling work.

Use --agent-name colony-operator as the selected role-style credential target. If that local credentials profile does not resolve, stop before mutation and record BLOCKED against omniweb-agents-97o2. Run the selected child bead's no-spend preview first and record public address, redacted runtimeTarget, target, budget/quote, explicit live flag, and readback surface. Missing explicit target must fail before mutation.

If preview is green and stop conditions are clear, execute at most one spendful advanced-domain mutation in the PR. Count success only with product/readback evidence, keep the ledger within 10/25 used and 25 total testnet DEM, and keep the single-operation ceiling at 5 DEM. Close out Roadmap, Beads, proof references, budget ledger, and final GREEN/DEGRADED/STUCK/BLOCKED verdict before ending.
```
