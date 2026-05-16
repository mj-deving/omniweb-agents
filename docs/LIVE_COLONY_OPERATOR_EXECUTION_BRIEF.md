---
type: megagoal-brief
status: frozen
created: 2026-05-16
owner_bead: omniweb-agents-8tga
depends_on:
  - docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md
  - omniweb-agents-zqnh
summary: "Source contract for proving one maintained live Colony Operator cycle with product readback."
---

# Live Colony Operator Execution Brief

## Objective

Close the real roadmap gap left after PR #413: prove one maintained Colony Operator cycle that can read live state, choose an action, execute through the runtime, record lifecycle state, and prove product readback.

The frozen Master PRD is `docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md`.

## Starting Truth

PR #413 is merged as `52397c54` and is only a capability-truth / dry-run checkpoint.

It proves:

- capability truth for `skip`, `publish`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, status-only `bet-hl`, `register`, and `human-link`
- no-spend dry-run proof
- fixed-price BET no-spend delayed readback for an existing tx
- copied-bundle consumer proof

It does not prove:

- a maintained live operator execution cycle
- live identity register/link execution
- current higher/lower delayed readback
- OpenClaw/Gregor runtime-host execution
- registry/npm readiness

## Milestones

### M0: Honest PR #413 Checkpoint

Status: complete.

Retitle/reword PR #413 as a capability-truth and dry-run checkpoint, inspect checks and Codex review, then merge it.

### M1: Maintained Operator Entrypoint

Build the maintained entrypoint:

1. live read
2. decision
3. resolution
4. dry-run or explicit execute
5. lifecycle record/proof output

It must return selected action, skipped alternatives, capability truth, lifecycle plan, and execution mode. Dry-run must not mutate or spend.

### M2: Decision Coverage

The decision loop must cover:

- `skip`
- `publish`
- `reply`
- `react`
- `tip`
- `VOTE`
- `bet-fixed`
- status-only `bet-hl`

`VOTE` remains separate from DEM pool betting. `bet-hl` cannot be upgraded until current product readback exists.

### M3: First Live Operator Cycle

Execute one bounded live publish/reply operator cycle with explicit `--execute`.

Required evidence:

- wallet/operator identity
- live state read
- selected action and skipped alternatives
- tx hash and attestation tx where applicable
- lifecycle record/proof packet
- product readback surface
- final verdict
- spend status

If readback lags, preserve pending lifecycle state and recheck. Do not retry spend just to force convergence.

### M4: Current `bet-hl` Verdict

Prove current `bet-hl` delayed readback or record a precise STUCK/blocker.

Success requires pool/product readback, not tx confirmation alone.

### M5: Identity Register/Link Verdict

Run live identity register/link proof only if explicitly authorized and usable credentials exist.

If authorization or credentials are missing, record the exact blocker. Dry-run identity readiness is not completion.

### M6a: OpenClaw/Gregor Handoff Packet

Codex prepares a repo-resident handoff packet with:

- exact commands
- env requirements
- expected outputs
- proof paths
- cleanup notes
- evidence contract for the external run

### M6b: External OpenClaw/Gregor Runtime Gate

Gregor/OpenClaw runs on the configured runtime host and returns evidence.

Codex must not self-close this gate. The Beads gate is `omniweb-agents-aick`.

### M7: Final Audit

Update roadmap, matrices, package docs, Beads, and PR evidence only after M3-M6 evidence is real or explicitly STUCK.

## Anti-Requirements

- No browser wallet path counts as agentic proof.
- No family-specific probe counts unless invoked through the maintained operator entrypoint.
- No dry-run or no-spend recheck counts as live operator execution.
- No roadmap completion without product readback for the live operator cycle.
- No BET-first live proof for the first execution cycle; target publish/reply first.
- No success from tx confirmation alone.
- No secret persistence in docs, proof packets, lifecycle records, or Beads.
- No Codex self-certification of the OpenClaw/Gregor external runtime gate.

## Constraints

- Database engine / local state-store boundary: reuse the landed lifecycle store and proof packet shape from `packages/omniweb-toolkit/scripts/_write-lifecycle.ts`; do not introduce SQLite or a parallel persistence substrate for this goal.
- Authentication boundary / operator auth / wallet runtime: live writes and identity actions require real local operator credentials and explicit live flags, but no mnemonic, token, challenge secret, approval token, or private operator note may be written to artifacts.
- Browser automation boundary / Playwright exclusion: browser wallet/provider behavior remains diagnostic only and cannot close any live operator execution acceptance criterion.

Additional execution rules:

- External runtime boundary / OpenClaw-Gregor gate: Codex may prepare the handoff and integrate returned evidence, but the configured runtime host evidence must come from Gregor/OpenClaw.
- Product-readback boundary: product readback, not tx confirmation alone, determines success for live operator execution and BET/pool work.

## Beads

Parent epic: `omniweb-agents-8tga`.

Dependency order:

`8tga.1 -> 8tga.2 -> 8tga.3 -> 8tga.4 -> 8tga.5 -> 8tga.6 -> 8tga.7 -> 8tga.8`

Gate:

- `omniweb-agents-aick` blocks `8tga.8` as M6b external OpenClaw/Gregor runtime evidence.

`bd ready --json` should show the real next child milestone, not the whole graph.
