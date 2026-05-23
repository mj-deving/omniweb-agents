---
type: goal-launch
status: ready-for-goal
created: 2026-05-23
source_contract: docs/ROADMAP.md#active-band-controlled-0ctx-proof-execution
predecessor_packet: docs/goalmode/testnet-live-write-advanced-domain-successor-2026-05-22.md
prep_bead: omniweb-agents-0ctx.9
owner_beads:
  - omniweb-agents-0ctx.1
  - omniweb-agents-0ctx.3
  - omniweb-agents-0ctx.8
  - omniweb-agents-5mnk.3
  - omniweb-agents-5mnk.4
  - omniweb-agents-0ctx.2
  - omniweb-agents-0ctx.7
  - omniweb-agents-6rc3.5
summary: "Bounded testnet 0ctx controlled proof packet after 3005, 0ctx.4, and 0ctx.5 closeout."
---

# 0ctx Controlled Proof GoalMode Packet

## Objective

Execute the remaining bounded testnet proof lanes after the full OmniWeb
inventory and write/spend truth-hardening closeout.

This packet authorizes a future `/goal` run to perform controlled testnet
writes only inside the lane contracts below. It does not run any proof during
prep and it does not claim the proof beads in advance.

## Starting Truth

- `omniweb-agents-3005` is complete after PRs #490, #491, and #495-#500.
- `omniweb-agents-0ctx.4` is complete: higher/lower amount-floor and proof-status
  surfaces now distinguish the proved PR3 5 DEM pool-readback lane from unproved
  smaller live floors.
- `omniweb-agents-0ctx.5` is complete: market registration helpers are classified
  as owned-transaction recovery surfaces, not standalone spend proof.
- `omniweb-agents-0ctx.6` is complete: live identity, storage, IPFS, and escrow
  mutation probes require an explicit existing `--agent-name` or `--env-path`.
- The selected credential target for wallet-backed advanced-domain proofs is
  `--agent-name colony-operator`.
- The current bounded testnet write authorization was chosen by the user for
  this tranche. It waives per-operation human approval prompts only inside this
  packet, after green no-spend previews, with explicit live flags and controlled
  targets/readbacks.
- Starting budget ledger remains `10 / 25` nominal testnet DEM unless fresh
  Beads/proof evidence updates it before execution.

## Hard Non-Goals

- no mainnet
- no real-money operation
- no npm release or public registry proof
- no production hosted activation
- no secret handling changes or credential-path exposure
- no uncontrolled credential, profile, identity, webhook, or social mutation
- no live operation without target, budget/quote, explicit live flag, controlled
  credential target, and product/readback surface

Tx confirmation alone is never success. Every lane must finish with one of
`GREEN`, `DEGRADED`, `STUCK`, or `BLOCKED` before the run advances.

## Execution Order

1. `omniweb-agents-0ctx.1` - VOTE publish proof refresh.
2. `omniweb-agents-0ctx.3` - owned/current react and tip target selection, then
   at most one eligible social mutation.
3. `omniweb-agents-0ctx.8` - raw chain transfer lane, but only after adding or
   confirming an explicit live transfer gate and owned-recipient readback.
4. `omniweb-agents-5mnk.3` - IPFS upload preview/live only if a concrete quote
   appears.
5. `omniweb-agents-5mnk.4` - escrow send preview/live with controlled recipient
   and readback.
6. `omniweb-agents-0ctx.2` - TLSN preview/quote/redaction lane; live TLSN proof
   only if runtime deps and quote are concrete.
7. Lower-priority closeout: `omniweb-agents-0ctx.7` chat-send gate and
   `omniweb-agents-6rc3.5` webhook receiver gate remain planning/blocked unless
   the run reaches them without unresolved higher-priority proof debt.

## Run Contract

Preflight:

```bash
git fetch origin main --prune
bd dolt pull || true
bd ready --json
bd dep cycles --json
```

Execution rules:

- start from fresh `refs/remotes/origin/main` in a clean worktree
- use one bead, one branch, and one PR per lane
- claim each proof bead only when starting that lane
- inspect CI and Codex review/comments before merge
- push Beads after every durable state change
- use `--agent-name colony-operator` for wallet-backed advanced-domain proofs
  unless the lane records a safer explicit target
- run the lane no-spend preview first and record target, budget/quote, explicit
  live flag, credential target, and readback surface
- stop before any operation whose preview lacks target, budget/quote, explicit
  live flag, controlled credential target, or product/readback surface
- keep every live mutation inside the packet budget

## Lane Contracts

### VOTE - `omniweb-agents-0ctx.1`

No-spend preflight:

```bash
npm --prefix packages/omniweb-toolkit run check:vote-publish -- --verify-limit 5
```

If green, run at most one live `--broadcast`.

Success requires lifecycle evidence plus `search({ category: "VOTE" })` matching
the tx. If category-search readback cannot prove the broadcast, close the lane as
`DEGRADED`, `STUCK`, or `BLOCKED` with evidence instead of retrying spendfully.

### Social React/Tip - `omniweb-agents-0ctx.3`

Run the maintained social scan in no-spend mode first. Do not lower score or
engagement floors to force a target.

If an eligible untouched target exists, execute exactly one react or tip path.
Tip is capped at `1` DEM. Success requires product readback beyond tx evidence:
reaction readback for react, and tip stats, recipient, or balance delta evidence
for tip.

### Raw Transfer - `omniweb-agents-0ctx.8`

Before any live transfer, add or verify a maintained transfer preview/live gate.
The lane must use an owned or controlled recipient, cap the live transfer at
`0.1` DEM, and record sender and recipient balance readback plus tx evidence.

Until that gate and readback exist, live transfer remains `BLOCKED`.

### IPFS - `omniweb-agents-5mnk.3`

Preview with a public non-secret payload. Live upload is allowed only if the
preview produces a concrete quote within `5` DEM.

Success requires CID/upload id plus chain verification, or an explicit
`DEGRADED` classification that explains which product/readback surface failed.

### Escrow - `omniweb-agents-5mnk.4`

Preview the controlled GitHub recipient `phase24-continuation-20260521`.
The live send amount is `0.1` DEM.

Success requires send tx/result plus claimable/balance readback. If wrappers
still return a known unsupported/degraded shape, close honestly as `DEGRADED`
with the wrapper classification.

### TLSN - `omniweb-agents-0ctx.2`

Start with preview only: reviewed public URL, runtime dependency readiness,
redaction plan, and storage fee quote.

Live TLSN proof is allowed only if the quote is concrete and proof material can
be sanitized before any tracked artifact or Beads note is written.

### Chat/Webhook - `omniweb-agents-0ctx.7`, `omniweb-agents-6rc3.5`

No live mutation unless the lane has a controlled room or HTTPS callback,
cleanup policy, owned id, explicit execute gate, and readback. Otherwise these
remain planning/blocked closeout lanes.

## Launch Prompt

```text
/goal Execute the bounded testnet 0ctx controlled proof run from docs/goalmode/0ctx-controlled-proof-run-2026-05-23.md.

Start from fresh refs/remotes/origin/main in a clean worktree. Run bd dolt pull || true, bd ready --json, and bd dep cycles --json before claiming work. Use one bead, one branch, and one PR per lane. Inspect CI and Codex review before merge. Push Beads after every durable state change.

Bounded testnet writes are authorized only inside this packet, only after that lane's no-spend preview is green, only with explicit live flags, only with controlled target/readback, and only within the packet budget. Use --agent-name colony-operator for wallet-backed advanced-domain proofs unless the lane records a safer explicit target.

Execution order:
1. omniweb-agents-0ctx.1 VOTE proof refresh.
2. omniweb-agents-0ctx.3 social react/tip target selection and at most one eligible mutation.
3. omniweb-agents-0ctx.8 raw transfer lane after explicit transfer gate/readback exists.
4. omniweb-agents-5mnk.3 IPFS quote-gated proof.
5. omniweb-agents-5mnk.4 escrow controlled send proof.
6. omniweb-agents-0ctx.2 TLSN preview/quote/redaction proof.
7. If time remains, handle omniweb-agents-0ctx.7 and omniweb-agents-6rc3.5 as gated planning lanes only unless they become fully controlled.

Stop before any operation whose preview lacks target, budget/quote, explicit live flag, controlled credential target, or product/readback surface. Tx confirmation alone is never success.
```

## Prep PR Validation

```bash
git diff --check
bd ready --json
bd dep cycles --json
rg -n "0ctx-controlled-proof-run-2026-05-23|0ctx.1|0ctx.3|0ctx.8|5mnk.3|5mnk.4|0ctx.2" docs/ROADMAP.md docs/goalmode packages/omniweb-toolkit/agents/openclaw/colony-operator
npm --prefix packages/omniweb-toolkit run check:package
```

## Per-Lane Validation

- Always run `git diff --check`, targeted stale-claim `rg`, and the smallest
  package script for the touched lane.
- If package references, manifests, scripts, or exported snapshots change, run
  `npm --prefix packages/omniweb-toolkit run check:package`.
- If a live write happens, require proof artifact, Beads note, budget ledger
  update, and product/readback verdict before merge.
- Before merging each PR, inspect CI plus Codex review/comments and resolve
  actionable findings.
