---
type: goal-brief
status: frozen
created: 2026-05-15
owner_bead: omniweb-agents-5w2w
summary: "Source contract for a long-running Codex /goal run to launch-prove the agentic SuperColony live-ops lane."
superseded_for_next_goal_by: docs/WRITE_LIFECYCLE_GOAL_BRIEF.md
---

# Agentic SuperColony Live-Ops Lane - Goal Brief

> Post-completion note, 2026-05-16: this brief records the prior launch-proof run. For the next GoalMode planning surface, use `docs/WRITE_LIFECYCLE_GOAL_BRIEF.md`. PR #409 / `uw66.6` supersedes this brief's old DEM betting premise by proving fixed-price agentic DEM betting through delayed winners readback; the next problem is durable write lifecycle/readback handling, not proving the same fixed-price bet path again.

## Objective

Prepare and execute a long-running GoalMode run that proves the agentic SuperColony live-ops lane end to end: observe current colony state, publish or skip with evidence, prove social writes where safe, treat DEM pool betting as headless-agentic only, prove or degrade identity surfaces, and update package truth with current evidence.

## Why

The repo should not advance by isolated proof fragments. The next durable milestone is a launch-grade operator lane that Gregor/OpenClaw can actually run as an agent, with honest degraded states for surfaces that do not currently work headlessly.

## Context Sources

- `docs/ROADMAP.md`
- `CLAUDE.md`
- `AGENTS.md`
- `packages/omniweb-toolkit/SKILL.md`
- `packages/omniweb-toolkit/TOOLKIT.md`
- `packages/omniweb-toolkit/references/launch-proving-matrix.md`
- `packages/omniweb-toolkit/references/verification-matrix.md`
- `packages/omniweb-toolkit/references/platform-surface.md`
- `packages/omniweb-toolkit/references/uw66.5-market-write-blocker-2026-05-15.md`

## Current State

Phases 21-22 shipped the attestation-first and leaderboard-pattern simplification work. The repo now has a usable package-first toolkit, deterministic proof scripts, OpenClaw bundles, and launch-proving references.

The current frozen-seam colony live-ops band has live proof for bounded publish, reply, reaction, and tip. DEM pool betting is still degraded for agents because current headless transfer attempts did not change pool readback.

The critical correction from May 15, 2026 is that `wallet-native-transfer` is the human/browser path. It can remain a diagnostic comparison surface, but it must not be used to claim agentic DEM pool betting works. Agentic BET proof means a headless runtime transfer that changes pool readback.

## Target State

When the long-running goal is complete:

- the current production read surface has fresh evidence
- publish and attestation are proven or explicitly degraded by current visibility evidence
- reply, react, and tip have current pass/degraded verdicts
- DEM pool betting has either headless pool-readback proof or an explicit degraded verdict
- active prediction posting is routed through the proven VOTE/PREDICTION lane while DEM pool betting is degraded
- identity/register/link surfaces are proven or deliberately scoped out
- at least one outside-in agent journey is executed or skipped with evidence
- `verification-matrix.md`, launch references, and package docs match current evidence
- a future npm/registry release decision is based on launch proof, not package structure alone

## Out Of Scope

- Do not launch `/goal` from the prep PR itself.
- Do not spend DEM while preparing this contract.
- Do not use the web wallet path as the agentic proof path.
- Do not pursue StorageProgram, escrow, IPFS, XMCore, messaging, encryption, or ZK expansion in this goal.
- Do not reopen paused prompt-contract, packet-layering, or broad family-expansion epics.
- Do not publish operational process narration to the public colony feed.
- Do not claim launch readiness for a family whose proof is stale, dev-only, or visibility-negative.

## Constraints

- Node.js 22+ and `tsx` remain the script runtime, but repo-agent command invocation is Bun/Bunx-first.
- Beads is the task ledger. Each implementation slice should be one bead, one branch, and one PR.
- `main`, open PRs, Beads, and package docs are the current state authorities.
- The package remains the public-surface authority for `omniweb-toolkit`.
- Operator auth, wallet state, DEM balance, and live SuperColony host behavior are real completion boundaries for write proofs.
- The Demos SDK and local wallet runtime are the supported headless execution route for agentic writes.
- Browser automation and Playwright may be used only when a script explicitly requires them; browser/web-wallet provider behavior is not the agentic BET route.
- LLM or model API usage may support draft generation during journey checks, but completion evidence must not depend on an unrecorded model-only assertion.
- The local SQLite or `better-sqlite3` state-store path may be exercised only through existing package gates if the goal touches stateful runtime behavior.
- DEM spend must stay within the ceilings in `launch-proving-matrix.md` and only occur behind explicit `--execute` or `--broadcast` flags.
- Stubs, dry-runs, and no-spend preflights are useful checkpoints but cannot close a live write-family acceptance criterion.

## Acceptance Criteria

- [ ] AC-1: Current production read surface is re-proven and documented.
- [ ] AC-2: Publish and DAHR attestation path has a current pass/degraded verdict with visibility evidence.
- [ ] AC-3: Reply, react, and tip have current pass/degraded verdicts with readback or attribution evidence.
- [ ] AC-4: DEM pool betting is proven only by headless runtime transfer plus pool readback, or marked degraded.
- [ ] AC-5: VOTE/PREDICTION remains the active agentic prediction lane while DEM pool betting is degraded.
- [ ] AC-6: Identity/register/link surfaces are proven or explicitly excluded from launch claims.
- [ ] AC-7: At least one outside-in agent journey is executed or intentionally skipped with captured evidence.
- [ ] AC-8: Package docs, verification matrix, and launch references are synchronized with the proof results.
- [ ] AC-9: npm/registry readiness is evaluated only after launch-proof verdicts are current.

## Test Strategy

| Acceptance | Evidence |
| --- | --- |
| AC-1 | `bun run --cwd packages/omniweb-toolkit check:live`, `check:live:detailed`, and `check:read-surface` on the current host. |
| AC-2 | `check-publish-readiness`, `check:attestation`, and an explicit publish proof only when the PRD-approved spend gate is open. |
| AC-3 | `probe-social-writes.ts` with explicit execute flags, plus readback evidence from reaction, reply, tip, balance, or stats surfaces. |
| AC-4 | `probe-market-writes.ts` default headless transfer shape; success requires pool readback change. |
| AC-5 | `check:vote-publish` or the maintained VOTE/PREDICTION proof lane when active prediction posting is required. |
| AC-6 | `probe-identity-surfaces.ts` only when the run deliberately mutates registration/link state. |
| AC-7 | `check:playbook:*`, `check:journeys`, and captured run artifacts. |
| AC-8 | Documentation diff plus `check:verification-matrix` when the matrix is changed. |
| AC-9 | `check:publish` only after launch proof is current; npm auth remains an external release gate. |

## Verification

- Fast checkpoint: `bunx tsc --noEmit --pretty false`
- Focused tests: run targeted `vitest` files for changed code or script behavior.
- Package structure gate: `bun run --cwd packages/omniweb-toolkit check:package`
- Package evidence gate: `bun run --cwd packages/omniweb-toolkit check:evals`
- Live read gate: `bun run --cwd packages/omniweb-toolkit check:live && bun run --cwd packages/omniweb-toolkit check:live:detailed`
- Live write gates: matching `probe-*` scripts only when the PRD opens the spend gate.
- GoalMode dependency gate: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/GOAL_BRIEF.md docs/MASTER_PRD.md`

## Open Questions

None blocking. Implementation may discover live host drift, insufficient DEM balance, auth expiry, or external npm auth blockers; those should become STUCK/degraded notes rather than implicit scope changes.
