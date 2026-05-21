---
type: goal-launch
status: ready-for-continuation-preflight
created: 2026-05-21
source_contract: docs/ROADMAP.md#phase-24-testnet-live-write-goalmode-tranche
owner_bead: omniweb-agents-0d7f
predecessor_packet: docs/goalmode/testnet-live-write-tranche-2026-05-21.md
summary: "Continuation packet for Phase 24 after PR #470 VOTE RPC fallback."
---

# Testnet Live-Write Continuation GoalMode Packet

## Objective

Continue Phase 24 from current truth after PR #470:

- nominal tranche spend starts at `10 / 25` testnet DEM
- fixed-price BET and higher/lower BET are `GREEN` with product readback
- VOTE is no longer blocked on node3 specifically; it is gated on healthy RPC candidate selection, `rpcSelection` proof, and a fresh no-spend preflight
- social remains target-thin until maintained discovery finds an eligible target or a reviewed controlled-target policy exists
- escrow, storage, IPFS, and raw-chain domains need controlled target/readback decomposition before mutation

The existing testnet authorization still waives per-operation human approval prompts inside this bounded packet. It does not waive script-level live flags, target proof, spend ceilings, no-spend rechecks, or product readback.

## Bead Graph

Parent epic: `omniweb-agents-0d7f`.

Execution children:
- `omniweb-agents-0d7f.1` - roadmap and mirror sync after VOTE fallback
- `omniweb-agents-0d7f.2` - this continuation packet
- `omniweb-agents-0d7f.3` - VOTE fallback no-spend proof
- `omniweb-agents-0d7f.4` - VOTE bounded live publish
- `omniweb-agents-j333` - social target recheck
- `omniweb-agents-0d7f.5` - social policy or controlled-target packet
- `omniweb-agents-0d7f.6` - one social live mutation
- `omniweb-agents-5mnk` - advanced-domain target decomposition
- `omniweb-agents-0d7f.7` - lowest-risk advanced-domain proof
- `omniweb-agents-0d7f.8` - Phase 24 continuation closeout

## Allowed Operations

Allowed:
- no-spend proof commands, readback checks, and target discovery
- one bounded VOTE `publishVote --broadcast` only after green no-spend fallback proof
- one social react, reply, or tip only after target policy is satisfied
- advanced-domain no-spend or lowest-risk controlled proof after target decomposition
- Beads, roadmap, mirror, and proof-reference updates required for closeout

Not allowed:
- mainnet or real-money operations
- npm release, public registry proof, or production hosted activation
- secret handling changes, credential export, token capture, mnemonic handling, private URL capture, or local credential-path disclosure
- new wallet/profile targets unless the active bead names cleanup and readback
- old macro/posting beads or unrelated operator lanes
- treating tx confirmation alone as product success

## Budget Ledger

Starting ledger:

```text
total_ceiling: 25 testnet DEM
single_operation_default_ceiling: 5 testnet DEM
already_spent_nominal: 10 testnet DEM
remaining_nominal: 15 testnet DEM
green_spend_so_far:
  - PR #466 fixed-price BTC 30m BET: 5 testnet DEM
  - PR #467 BTC 24h higher/lower lower BET: 5 testnet DEM
non_spend_attempts:
  - PR #468 VOTE broadcast retry failed before tx/lifecycle creation; balance stayed 1737
```

Every spendful retry counts against the total ceiling. Before any repeat spend, run no-spend readback or recheck for the prior tx, lifecycle record, post, pool, memo, profile, or target where possible.

## Acceptance Criteria

AC-C1. Fresh `origin/main`, Beads pulled, graph current.

Evidence target: branch starts from current `origin/main`, Beads are synced, `bd show omniweb-agents-0d7f --json` shows the continuation graph, and `bd dep cycles --json` is empty.

AC-C2. Roadmap and mirror reflect PR #470 VOTE fallback truth.

Evidence target: `docs/ROADMAP.md`, `packages/omniweb-toolkit/agents/openclaw/colony-operator/MEMORY.md`, and `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md` mention PR #470, `rpcSelection`, node2/discus fallback, and no node3-only stop rule.

AC-C3. Budget ledger starts at `10 / 25` testnet DEM.

Evidence target: run notes and closeout preserve the starting ledger and only increment it for actual spendful operations with readback evidence.

AC-C4. VOTE no-spend fallback proof captured with `rpcSelection`.

Evidence target: run:

```bash
npm --prefix packages/omniweb-toolkit run check:vote-publish -- --verify-limit 5
```

Capture command shape, `rpcSelection`, target prices, category-search readback surface, and proof that no mutation occurred.

AC-C5. Optional VOTE live publish runs once, with lifecycle and category-search readback.

Evidence target: only if AC-C4 is green, run the maintained command once with `--broadcast`, record `rpcSelection`, tx/lifecycle result, category-search readback, budget impact, and final verdict. Do not count success from tx alone.

AC-C6. Social target availability is honestly classified.

Evidence target: work `omniweb-agents-j333` by rerunning maintained social target discovery and classify the result as target-thin, policy-thin, auth-gated, runtime-broken, or ready.

AC-C7. Optional social mutation runs once only after target policy is satisfied.

Evidence target: run maintained `probe-social-writes` preview before any `--execute`; if eligible, run exactly one react/reply/tip mutation and count it only when product readback proves effect.

AC-C8. Advanced-domain targets are decomposed before mutation.

Evidence target: work `omniweb-agents-5mnk` by splitting escrow, storage, IPFS, and raw-chain into separate controlled target/readback beads. Each child names target, mutation class, command, explicit live flag, and readback proof.

AC-C9. Optional advanced-domain live proof runs only with explicit target/readback.

Evidence target: execute only the first lowest-risk advanced-domain child after AC-C8. Prefer no-spend/raw-chain sign-verify before spendful escrow, storage, or IPFS mutation.

AC-C10. Final report updates Beads, Roadmap, proof references, and leftovers.

Evidence target: final closeout marks each lane `GREEN`, `DEGRADED`, `STUCK`, or `BLOCKED`, updates the budget ledger and proof references, pushes Beads, and prepares a successor packet only if unfinished work remains.

## Stop Conditions

Stop immediately and record `STUCK`, `BLOCKED`, or a follow-up bead if:

- mainnet, real-money, npm release, public registry proof, production hosted activation, secret handling changes, or local credential-path disclosure appears in scope
- any operation would exceed `25` total testnet DEM or the `5` DEM single-operation default without a prior packet/Beads update
- a prior possible mutation lacks no-spend readback or recheck
- two consecutive attempts fail with the same runtime error
- tx confirmation and product readback disagree and lifecycle tools cannot classify it
- target, mutation class, explicit live flag, or product readback surface is not explicit before a live operation

## Proof Commands

Prep:

```bash
git fetch origin main
git status --short --branch
bd dolt pull || true
bd ready --json
bd show omniweb-agents-0d7f --json
bd dep cycles --json
```

VOTE no-spend:

```bash
npm --prefix packages/omniweb-toolkit run check:vote-publish -- --verify-limit 5
```

VOTE live, only after green no-spend proof:

```bash
npm --prefix packages/omniweb-toolkit run check:vote-publish -- --verify-limit 5 --broadcast
```

Social:

```bash
npm --prefix packages/omniweb-toolkit run check:social-writes -- --help
npm --prefix packages/omniweb-toolkit run check:social-writes -- --feed-limit 200
```

Advanced domains:

```bash
npx tsx packages/omniweb-toolkit/scripts/probe-escrow.ts --help
npx tsx packages/omniweb-toolkit/scripts/probe-storage.ts --help
npx tsx packages/omniweb-toolkit/scripts/probe-ipfs.ts --help
```

Closeout:

```bash
git diff --check
bd ready --json
bd dep cycles --json
bd dolt push
```

## Launch Prompt

```text
Execute the Phase 24 testnet live-write continuation using docs/goalmode/testnet-live-write-continuation-2026-05-21.md and parent bead omniweb-agents-0d7f.

Start from fresh origin/main, pull Beads, and verify the graph. The ledger starts at 10 / 25 testnet DEM. BET and higher/lower are already green; do not rerun them unless a no-spend recheck shows a concrete need.

First prove VOTE fallback no-spend with check-vote-publish and capture rpcSelection. PR #470 removed the node3-only blocker, so select a healthy RPC candidate such as node2/discus through the maintained fallback path before any mutation. Run at most one VOTE --broadcast only after no-spend proof is green, and count it as success only with lifecycle plus category-search readback.

In parallel after packet setup, work social target availability through omniweb-agents-j333. Do not lower score >=85 and engagement >=5 just to force mutation. If a target is eligible, run exactly one react/reply/tip mutation after preview and prove product effect. If no target is eligible, produce the policy/controlled-target packet instead.

Before advanced-domain mutation, work omniweb-agents-5mnk and split escrow, storage, IPFS, and raw-chain into controlled target/readback beads. Execute only the lowest-risk child after target planning, preferring no-spend/raw-chain sign-verify before spendful mutation.

Keep explicit script-level live flags mandatory, stay under the 25 DEM total and 5 DEM single-operation default ceilings, stop on the packet stop conditions, and close out with Beads, Roadmap, proof references, budget ledger, and GREEN/DEGRADED/STUCK/BLOCKED statuses.
```
