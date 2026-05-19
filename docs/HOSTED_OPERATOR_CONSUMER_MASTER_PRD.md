---
type: master-prd
status: active
created: 2026-05-19
source_contract: docs/HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md
owner_bead: omniweb-agents-hosted
summary: "GoalMode execution surface for the hosted/external-style no-spend operator consumer proof."
---

# Hosted Operator Consumer Proof - Master PRD

## Section 0. Frontmatter

- Author: Codex
- Created: 2026-05-19
- Status: ACTIVE
- Source contract: `docs/HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md`
- Stable anchors: AC-1 through AC-9
- Owner bead: `omniweb-agents-hosted`
- First implementation bead: `omniweb-agents-hosted.0`
- Target stack: Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, local `npm pack` tarball
- No-release gate: no npm publish, no public registry install claim, no public registry proof
- No-spend gate: default checks must not spend DEM, broadcast writes, or mutate identity

## Section 1. Problem

The completed consumer-spectrum lane proved a local tarball whole-spectrum consumer install and mapped the package against official docs, live endpoint shapes, public exports, transport consumers, read/profile/scoring/verification consumers, chat/webhook consumers, market reads, and no-spend market write intents.

That still does not prove the next hosted-operator posture. A hosted or external-style operator needs repeated cycles that install from the package artifact, discover runtime capability and admissibility from exported package surfaces, choose or skip among maintained action families, preserve degraded endpoint truth, and emit proof packets that are useful to a later GoalMode closeout.

## Section 2. Vision

A clean hosted-style consumer can install the local `omniweb-toolkit` tarball and run a deterministic no-spend operator loop that reports:

- observed live/read context
- selected action and skipped alternatives
- capability status
- guardrail status
- lifecycle status
- supervision requirement
- explicit-execute requirement
- admissibility status
- endpoint drift or degraded state
- final no-spend verdict

The proof should feel like a hosted runtime rehearsal, not a repo-local unit test. It must still be honest that it is not a public registry install, not a live spend run, and not an identity-mutation run.

## Section 3. Out Of Scope

- Publishing the package to npm.
- Installing from the public npm registry.
- Claiming public registry readiness from a local tarball.
- Live multi-action spend.
- Live publish, reply, react, tip, VOTE, BET, broadcast, or transfer.
- Live register, human-link, approval, unlink, or identity cleanup mutation.
- Treating optional hosted smoke as OpenClaw/Gregor production activation.
- Hiding advertised-but-404, auth-needed, unsupported, deployment-drift, server-error, supervised, or explicit-execute-required states.

## Section 4. Architecture

### Section 4.1 PR0 GoalMode Packet

PR0 adds this PRD, the goal brief, launch prompt, Beads graph, roadmap band, and colony-operator re-entry mirror.

PR0 must not implement the hosted proof itself and must not launch `/goal`.

### Section 4.2 Clean Hosted Consumer Fixture

The fixture must:

- build and pack the local package
- create a temporary clean consumer workspace
- install the tarball into that workspace
- import package surfaces by package name only
- fail if repo-relative imports or workspace-local shortcuts are used
- avoid registry install claims
- avoid mutations and spend

Required package-name import surfaces:

- `omniweb-toolkit`
- `omniweb-toolkit/runtime`
- `omniweb-toolkit/agent`
- `omniweb-toolkit/types`
- any maintained write-facing export path used by the current package contract

### Section 4.3 Repeated No-Spend Operator Cycles

The proof must run repeated cycles across the maintained full-spectrum alternatives:

- skip
- publish
- reply
- react
- tip
- VOTE
- fixed-price BET
- higher/lower BET
- register
- human-link

Every cycle must keep the final verdict no-spend unless a future PRD explicitly changes this contract. This PRD does not authorize that change.

### Section 4.4 Runtime Truth Model

Each selected action and skipped alternative must preserve:

- capability truth: what exists
- guardrail truth: whether the planned inputs are safe
- lifecycle truth: whether the family is plan-only, dry-run, pending, indexed, resolved, degraded, or blocked
- supervision truth: whether human review or identity-specific confirmation is required
- explicit-execute truth: whether a live action would require `--execute`, `--broadcast`, or an equivalent explicit flag
- admissibility truth: whether the requested action can be planned or executed now

### Section 4.5 Drift And Degraded Ledger

The hosted proof must retain the consumer-spectrum lane's degraded vocabulary:

- `advertised_but_404`
- `auth_needed`
- `unsupported`
- `deployment_drift`
- `server_error`
- `supervised`
- `explicit_execute_required`

These states are not failures by themselves. They are failures only if the proof hides them, collapses them into green success, or treats them as release/spend authority.

### Section 4.6 Optional Hosted Runtime Smoke

Default hosted smoke is static and deterministic. Any runtime probe must be explicitly flagged and non-mutating.

When enabled, the probe records:

- host prerequisites
- package install shape
- dry-run command shape
- proof output path
- no publish/spend/broadcast verdict
- exact reason any hosted prerequisite is missing

## Section 5. Acceptance Anchors

AC-1. Roadmap and re-entry truth are synced.

Evidence target: `docs/ROADMAP.md`, `packages/omniweb-toolkit/agents/openclaw/colony-operator/MEMORY.md`, `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md`, and `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/NEXT_BAND_CHEAT_SHEET.md` name this as the next band and preserve no-release/no-spend/no-mutation boundaries.

AC-2. Clean local-tarball hosted consumer fixture exists.

Evidence target: `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer` builds the package, packs it, installs it in a temp workspace, and reports a clean no-spend verdict.

AC-3. Package-name imports only.

Evidence target: the hosted consumer check fails on repo-relative imports and proves root/runtime/agent/types/write-facing imports by package name.

AC-4. Repeated no-spend operator cycles.

Evidence target: proof packets contain at least two deterministic no-spend cycles and preserve selected/skipped action truth for each cycle.

AC-5. Full action-family alternatives.

Evidence target: proof packets include publish, reply, react, tip, VOTE, fixed-price BET, higher/lower BET, register, human-link, and skip alternatives with capability/guardrail/lifecycle/supervision/explicit-execute/admissibility statuses.

AC-6. Drift and degraded classifications preserved.

Evidence target: proof output validates advertised-but-404, auth-needed, unsupported, deployment-drift, server-error, supervised, and explicit-execute-required classifications where applicable.

AC-7. Optional hosted runtime smoke remains dry-run only.

Evidence target: default check is deterministic and non-mutating; optional flag records host prerequisites and dry-run smoke output without publish, spend, or broadcast.

AC-8. Package/front-door check wiring.

Evidence target: the hosted proof is wired into the relevant package checks without weakening `check:consumer-spectrum-tarball`, `check:colony-operator-consumer`, guardrail, admissibility, or front-door gates.

AC-9. Closeout and audit.

Evidence target: `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md` Section 13 records proof paths, validation commands, Beads closeout, and explicit no-release/no-spend/no-mutation audit.

## Section 6. Beads

- `omniweb-agents-hosted`: parent epic.
- `omniweb-agents-hosted.0`: PR0 - GoalMode packet and roadmap scaffold.
- `omniweb-agents-hosted.1`: PR1 - clean hosted consumer fixture.
- `omniweb-agents-hosted.2`: PR2 - repeated no-spend operator cycles.
- `omniweb-agents-hosted.3`: PR3 - optional hosted runtime smoke.
- `omniweb-agents-hosted.4`: PR4 - drift and degraded endpoint ledger.
- `omniweb-agents-hosted.5`: PR5 - GoalMode closeout and Beads memory.

Dependency order:

`hosted.0 -> hosted.1 -> hosted.2 -> hosted.3/hosted.4 -> hosted.5`

## Section 7. Validation Ladder

PR0:

- `git diff --check`
- `bd dep cycles --json`
- `bd show omniweb-agents-hosted --json`
- `bd show omniweb-agents-hosted.0 --json`

PR1 through PR4:

- `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer`
- `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-tarball`
- `npm --prefix packages/omniweb-toolkit run check:colony-operator-consumer`
- `npx vitest run tests/packages/colony-operator-entrypoint.test.ts tests/packages/toolkit-action-admissibility.test.ts tests/packages/toolkit-guardrails.test.ts`

PR5:

- `npm --prefix packages/omniweb-toolkit run check:frontdoor`
- `git diff --check`
- `bd ready --json`
- `bd dolt push`

## Section 8. Launch Preconditions

Do not launch `/goal` until:

1. PR0 lands on `main`.
2. The Beads graph exists and has no dependency cycles.
3. `omniweb-agents-hosted.1` is the next ready implementation bead.
4. The operator confirms the run remains no-release, no-registry, no-spend, and no-mutation.

## Section 9. Stop And Degraded Rules

Stop only when every AC has evidence, an explicit degraded/skipped verdict, or a blocker note.

Use degraded instead of retrying forever when:

- the same hosted-runtime prerequisite is missing after three equivalent checks
- a live endpoint keeps returning an already-classified drift state
- a hosted smoke probe cannot run without mutating, publishing, broadcasting, or spending
- a package export is absent and needs a separate package-surface design decision

## Section 10. Proof Packet Minimum Shape

Each proof packet must include:

- `runId`
- `generatedAt`
- `packageVersion`
- `tarballPath` or equivalent local artifact reference
- `consumerWorkspace`
- `cycleIndex`
- `observedContext`
- `selectedAction`
- `skippedAlternatives`
- `actions`
- `driftLedger`
- `noSpendVerdict`
- `releaseVerdict`
- `identityMutationVerdict`
- `validationCommands`

Each action entry must include:

- `family`
- `capability`
- `guardrail`
- `lifecycle`
- `supervision`
- `explicitExecute`
- `admissibility`
- `selected`
- `reason`

## Section 11. Definition Of Done

The epic is done when:

- AC-1 through AC-9 are satisfied or explicitly degraded
- proof packets are reproducible from package checks
- roadmap and re-entry mirror match the closeout truth
- Beads parent and child tasks are closed or intentionally left blocked with evidence
- Beads are pushed
- no npm release, public registry proof, live spend, or identity mutation is claimed

## Section 12. Non-Goals For Future Agents

Do not use this PRD to:

- publish to npm
- prove a public registry install
- authorize spend
- authorize identity mutation
- replace the consumer-spectrum inventory
- delete old code without reachability evidence
- turn OpenClaw/Gregor hosted smoke into a production activation claim

## Section 13. Execution Log

### 2026-05-19 - PR0 scaffold

- Created parent epic `omniweb-agents-hosted` and child beads `omniweb-agents-hosted.0` through `omniweb-agents-hosted.5`.
- Claimed `omniweb-agents-hosted.0` for the GoalMode packet and roadmap scaffold.
- Added the hosted no-spend GoalMode packet.
- No `/goal` launch performed.
- No npm release, public registry proof, live spend, broadcast, or identity mutation performed.

### 2026-05-19 - PR1 clean hosted consumer fixture

- Claimed `omniweb-agents-hosted.1` after PR0 merged.
- Added `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer`.
- The hosted check builds, packs, and installs the local `omniweb-toolkit` tarball into a temporary clean consumer workspace.
- The generated consumer proof imports only package-name surfaces: `omniweb-toolkit`, `omniweb-toolkit/runtime`, `omniweb-toolkit/agent`, `omniweb-toolkit/types`, and `omniweb-toolkit/write`.
- The proof script audits its import specifiers and fails on repo-relative or workspace-local package shortcuts.
- The `/write` package subpath now avoids broad toolkit-barrel runtime imports so no-spend helper imports do not require the optional Demos SDK peer at module-load time.
- Validation passed:
  - `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer`
  - `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-tarball`
  - `npm --prefix packages/omniweb-toolkit run check:colony-operator-consumer`
  - `npm --prefix packages/omniweb-toolkit run check:public-export-coverage`
  - `npx vitest run tests/packages/colony-operator-entrypoint.test.ts tests/packages/toolkit-action-admissibility.test.ts tests/packages/toolkit-guardrails.test.ts`
  - `git diff --check`
- PR1 satisfies AC-2 and AC-3. AC-4 through AC-7 remain for later beads; AC-8 front-door wiring remains for PR5.
- No npm release, public registry proof, live spend, broadcast, live write, or identity mutation performed.

### 2026-05-19 - PR2 repeated no-spend operator cycles

- Claimed `omniweb-agents-hosted.2` after PR1 merged.
- Extended `check:hosted-operator-consumer` to emit repeated proof packets from the clean local-tarball consumer.
- Proof packet 1 selects `react`; proof packet 2 selects `bet-fixed`.
- Each packet includes observed context, selected action, skipped alternatives, all action-family entries, drift ledger, no-spend verdict, release verdict, identity-mutation verdict, and validation commands.
- Each packet covers `skip`, `publish`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, `bet-hl`, `register`, and `human-link` with capability, guardrail, lifecycle, supervision, explicit-execute, admissibility, selected, and reason fields.
- The spend-bearing `bet-fixed` packet remains no-spend: mode is dry-run, live execution is disabled, `canExecuteNow` is false, and `actualSpendPerformed` is false.
- Validation passed:
  - `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer`
  - `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-tarball`
  - `npm --prefix packages/omniweb-toolkit run check:colony-operator-consumer`
  - `npx vitest run tests/packages/colony-operator-entrypoint.test.ts tests/packages/toolkit-action-admissibility.test.ts tests/packages/toolkit-guardrails.test.ts`
  - `git diff --check`
- PR2 satisfies AC-4 and AC-5. AC-6 through AC-8 remain for later beads.
- No npm release, public registry proof, live spend, broadcast, live write, or identity mutation performed.

### 2026-05-19 - PR3 optional hosted runtime smoke

- Claimed `omniweb-agents-hosted.3` after PR2 merged.
- Added optional hosted runtime smoke support to `check:hosted-operator-consumer`.
- Default hosted smoke output is static-only, deterministic, non-mutating, no-spend, no-broadcast, and no-identity-mutation.
- Runtime host prerequisite probes require `--run-hosted-runtime-smoke`.
- Dry-run smoke command execution additionally requires an explicit `--hosted-smoke-command` value and is blocked if the command includes `--execute`, `--broadcast`, or lacks an explicit dry-run/no-spend instruction.
- Optional prerequisite probe validation ran with `--run-hosted-runtime-smoke`; it recorded Node, OpenClaw, and Gregor CLI prerequisite statuses, skipped smoke command execution because no explicit command was provided, and did not publish, spend, broadcast, or mutate identity.
- Validation passed:
  - `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer`
  - `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer -- --skip-build --run-hosted-runtime-smoke`
  - `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-tarball`
  - `npm --prefix packages/omniweb-toolkit run check:colony-operator-consumer`
  - `npx vitest run tests/packages/colony-operator-entrypoint.test.ts tests/packages/toolkit-action-admissibility.test.ts tests/packages/toolkit-guardrails.test.ts`
  - `git diff --check`
- PR3 satisfies AC-7. AC-6 and AC-8 remain for later beads.
- No npm release, public registry proof, live spend, broadcast, live write, or identity mutation performed.
