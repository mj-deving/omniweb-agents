---
type: goal-brief
status: active
created: 2026-05-19
owner_bead: omniweb-agents-hosted
summary: "Source contract for a hosted/external-style no-spend operator consumer proof over the local omniweb-toolkit tarball."
---

# Hosted Operator Consumer Goal Brief

## Objective

Prepare and execute a GoalMode-backed run that proves a fresh hosted or external-style operator can consume the local `omniweb-toolkit` tarball, discover runtime truth from package surfaces, run repeated full-spectrum no-spend operator cycles, and emit honest proof packets.

This is the next band after the completed consumer-spectrum lane. It starts from the local tarball whole-spectrum proof from PRs #432-#441 and moves from "a consumer can import and exercise the mapped package surface" to "a hosted-style operator can repeatedly choose, skip, and report across the maintained action families without spending DEM or mutating identity."

## Hard Boundaries

- No npm release.
- No public registry install proof.
- No live spend.
- No live publish, reply, react, tip, VOTE, BET, broadcast, or transfer.
- No unsupervised identity mutation.
- No live `register`, human-link, approval, unlink, or cleanup mutation.
- No repo-relative imports in the clean consumer fixture.
- No `/goal` launch until PR0 lands and the Beads graph is pushed.
- Optional hosted-runtime smoke remains deterministic and dry-run unless a later explicit flag enables a non-mutating probe.

## Inputs

- `docs/CONSUMER_SPECTRUM_GOAL_BRIEF.md`
- `docs/CONSUMER_SPECTRUM_MASTER_PRD.md`
- `docs/CONSUMER_SPECTRUM_GOAL_LAUNCH.md`
- `docs/ROADMAP.md`
- `packages/omniweb-toolkit/SKILL.md`
- `packages/omniweb-toolkit/TOOLKIT.md`
- `packages/omniweb-toolkit/references/consumer-journey-drills.md`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/NEXT_BAND_CHEAT_SHEET.md`

## Acceptance Anchors

AC-1. Roadmap and colony-operator re-entry truth identify this hosted no-spend proof as the next execution band after consumer-spectrum closeout.

AC-2. A clean local-tarball hosted consumer fixture installs `omniweb-toolkit` in a temporary workspace.

AC-3. The consumer fixture imports root, `runtime`, `agent`, `types`, and write-facing surfaces by package name only, with no repo-relative imports or workspace-only shortcuts.

AC-4. The proof runs repeated no-spend operator cycles, not just a one-shot import smoke.

AC-5. The cycles cover publish, reply, react, tip, VOTE, fixed-price BET, higher/lower BET, register, human-link, and skip alternatives through capability, guardrail, lifecycle, supervision, explicit-execute, and admissibility truth.

AC-6. Live endpoint drift and degraded states from the consumer-spectrum lane remain visible in proof packets instead of being flattened into pass/fail.

AC-7. Optional hosted runtime smoke stays dry-run and records prerequisites honestly when enabled.

AC-8. The new proof is wired into the package/front-door validation path without weakening existing consumer-spectrum, colony-operator, guardrail, or admissibility checks.

AC-9. Closeout records Beads state, proof paths, validation, and an explicit audit that no release, public registry proof, live spend, or identity mutation happened.

## Beads

Parent epic: `omniweb-agents-hosted`.

- `omniweb-agents-hosted.0`: PR0 - GoalMode packet and roadmap scaffold.
- `omniweb-agents-hosted.1`: PR1 - clean hosted consumer fixture.
- `omniweb-agents-hosted.2`: PR2 - repeated no-spend operator cycles.
- `omniweb-agents-hosted.3`: PR3 - optional hosted runtime smoke.
- `omniweb-agents-hosted.4`: PR4 - drift and degraded endpoint ledger.
- `omniweb-agents-hosted.5`: PR5 - GoalMode closeout and Beads memory.

Sequence:

`hosted.0 -> hosted.1 -> hosted.2 -> hosted.3/hosted.4 -> hosted.5`

## Done

The goal is done only when AC-1 through AC-9 have evidence, an explicit degraded verdict, or a documented blocker; the parent Beads epic is closed; Beads are pushed; and the final packet still says plainly that no npm release, public registry proof, live spend, or identity mutation was performed.
