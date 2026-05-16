---
type: goal-brief
status: frozen
created: 2026-05-16
owner_bead: omniweb-agents-zg11
summary: "GoalMode brief for durable write lifecycle tracking and delayed readback across SuperColony agentic write families."
---

# Agentic Write Lifecycle And Delayed Readback - Goal Brief

## Objective

Build the durable lifecycle layer that keeps future agentic SuperColony runs from mistaking delayed Demos/SuperColony indexing for write failure. Every live write should leave a resumable pending record, a clear state transition history, and a proof packet that separates chain acceptance from product-indexed readback.

## Why

The May 16 DEM betting recheck changed the interpretation of the market-write lane: the same headless native args-memo txs that looked failed in a short active-pool window later resolved in SuperColony winners at block `2265016`.

That is not isolated to BET:

- publish can return tx hashes before feed/post visibility converges
- reply can be visible in post detail and parent thread while recent-feed indexing remains degraded
- tip can confirm on-chain while post stats, recipient stats, and balance readback stay stale
- VOTE prediction readback depends on category search convergence
- BET can miss active-pool visibility and only become provable through delayed winners/history readback

The repo needs a lifecycle model, not longer ad hoc sleeps in each script.

## Current State

- Bounded publish, reply, reaction, tip, VOTE, and fixed-price DEM betting have current proof or degraded evidence.
- PR #409 proves fixed-price agentic DEM betting through delayed winners readback, but is still pending merge policy at the time this brief was drafted.
- Higher/lower still needs current native args-memo delayed-readback treatment.
- The previous `docs/GOAL_BRIEF.md` / `docs/MASTER_PRD.md` completed the launch-proof verdict pass; they should not be reused as the next execution contract without rewriting the lifecycle problem.

## Target State

After the goal:

- write probes create durable pending-write records before or immediately after broadcast
- every pending write can be rechecked by tx hash or family-specific identity without spending again
- status names are shared across write families
- operator output distinguishes short-poll feedback from final proof
- active-pool rollover, recent-feed lag, stats lag, and history/winners lookup are first-class readback routes
- package docs and verification matrices no longer encode "timeout means failed" for eventually indexed writes
- one bounded live validation proves the lifecycle end to end without broad new spend

## Proposed Acceptance Anchors

AC-1: Write lifecycle vocabulary and state transitions are documented for all maintained write families.

AC-2: A local pending-write store records tx hash, wallet, action family, command context, spend budget, expected readback surfaces, first-seen block data, and next recheck policy.

AC-3: Existing publish/reply/VOTE visibility probes can write and resume pending records without changing their normal no-spend default.

AC-4: Existing tip/reaction probes use the shared lifecycle vocabulary, preserving immediate reaction readback and degraded tip stats accurately.

AC-5: Fixed-price BET uses delayed active-pool plus winners/history readback as the maintained proof model; higher/lower is either upgraded with the same model or explicitly left pending.

AC-6: Operator-facing proof packets include chain state, explorer block/time when available, product readback state, elapsed time, block delta, and final verdict.

AC-7: Verification docs, launch matrix, package guidance, roadmap, and colony-operator re-entry doctrine agree on the lifecycle model.

AC-8: One bounded live or delayed no-spend replay validates the lifecycle path end to end from pending record to final indexed/resolved verdict.

## Out Of Scope

- Reopening the `PolicyActionRequest` seam or broad architecture below it.
- Adding new action families outside current publish, reply, react, tip, VOTE, fixed-price BET, and higher/lower.
- Running repeated live spend just to gather more samples.
- Treating browser wallet behavior as agentic proof.
- Publishing npm package releases.
- Proving identity/register/link flows; that remains the next colony participation band after lifecycle hardening.

## Constraints

- Work from `main` after PR #409 merges, or explicitly from `codex/official-bet-path` if PR #409 is still blocked by merge policy.
- Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, Demos SDK, and SuperColony production host remain the target stack.
- Beads is the task ledger; child work should be one bead, one branch, and one PR.
- Database engine / local persistence boundary: the pending-write store must be local, durable, non-secret, and compatible with the package's existing `--state-dir` and JSON artifact style; SQLite may be reused only if it is lower-risk than JSON/JSONL for the implemented slice.
- Authentication boundary / operator auth: live writes use the real wallet runtime and local operator credentials, but no mnemonic, token, or secret may be written to lifecycle records.
- Live writes must stay behind explicit `--execute` or `--broadcast` flags and within existing `launch-proving-matrix.md` DEM budgets.
- No-spend delayed rechecks of existing tx hashes are preferred over new live spend.
- Completion evidence must exercise real Demos/SuperColony readback surfaces for at least one lifecycle validation; unit tests may use fixtures only for owned parsing/state logic.
- Browser automation boundary: Playwright/browser automation and browser wallet/provider behavior remain human-path diagnostic only and cannot close agentic write lifecycle acceptance.
- Docs and matrices must remain package-first: update package references and generated/registry surfaces when public guidance changes.

## Launch Preconditions

- PR #409 is merged, or the goal explicitly branches from `codex/official-bet-path`.
- Beads has a fresh epic/parent issue for the lifecycle goal.
- The goal PRD is generated from this brief and reconciled before implementation starts.
- Live spend remains behind explicit `--execute` or `--broadcast`, with no-spend rechecks preferred whenever existing tx hashes are enough.

## Verification

- Source/PRD specificity: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/WRITE_LIFECYCLE_GOAL_BRIEF.md docs/WRITE_LIFECYCLE_MASTER_PRD.md`
- Fast checkpoint: `npx tsc --noEmit --pretty false`
- Focused tests: targeted `npx vitest run <test-file>` for lifecycle/state/probe changes.
- Package public-surface gate: `npm --prefix packages/omniweb-toolkit run check:package`
- Package evidence gate: `npm --prefix packages/omniweb-toolkit run check:evals`
- Matrix/docs gate: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`
- Live read gate: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`
- Final lifecycle validation: one bounded live or delayed no-spend replay command recorded in the PRD run log.
