# AGENTS.md

Agent operating guide for this repository.

This file is the short operational companion to `CLAUDE.md`. `CLAUDE.md` is the baseline architecture/rules doc. Use this file for current workflow and repo-specific execution discipline.

## Read Order

Before changing code, read in this order:

1. `CLAUDE.md`
2. `codex-session-handoff-omniweb-toolkit-green-path.md` if it exists
3. the relevant package docs for the area you are touching

There is currently no repo `MEMORY.md`.

## Current Reality

- Consumer package: `packages/omniweb-toolkit`
- This repo is no longer mainly in broad docs-refactor mode
- The current path is package hardening, release integrity, and publish readiness
- Trajectory trace scoring exists and is part of the maintained package validation path
- Packaged example traces exist for all maintained trajectory scenarios
- The example checker enforces:
  - coverage against `evals/trajectories.yaml`
  - no duplicate packaged scenario coverage
  - one-scenario-per-file structure
  - filename matching via `<scenario-id>.trace.json`

## Branching And PR Workflow

Do not assume `main` contains the latest Codex work.

This repo is currently being advanced as a stacked PR chain. Before starting new work:

1. inspect the latest handoff file for the current stack tip
2. fetch the remote
3. switch to the current stack tip branch
4. pull fast-forward only
5. create one new branch for one small task

Pattern:

```bash
git fetch origin
git switch <current-stack-tip>
git pull --ff-only
git switch -c codex/<next-small-task>
```

Rules:

- one small task = one branch = one PR
- do not commit on old stack-base branches unless explicitly told to
- do not batch unrelated changes together
- preserve the stack unless explicitly asked to restack

## Validation Ladder

Prefer the smallest meaningful validation for the change, then the package-level check if the touched area justifies it.

Important commands for `packages/omniweb-toolkit`:

- `npm run check:evals`
- `npm run check:package`
- `npm run check:release`
- `npm run check:live`
- `npm run check:live:detailed`
- `npm run run:trajectories -- --trace ./evals/examples/<scenario>.trace.json --scenario <scenario>`

For trajectory work:

- keep `evals/trajectories.yaml` as the maintained source of scenario truth
- keep packaged examples aligned with it
- do not weaken coverage enforcement to make tests pass

## Documentation Discipline

- Do not duplicate official SuperColony / OmniWeb facts when the package should instead reference and layer on them
- Keep repo-only research separate from shipped package docs
- If you change publish-facing behavior, update the package docs or validation rules in the same PR
- If you add a new maintained trajectory scenario, also add or intentionally account for packaged example coverage

## Untracked Files

Treat these cautiously if they are present:

- `codex-full-review.md`
- `codex-pre-publish-review.md`
- `codex-sdk-investigate.md`
- `scripts/auth-refresh.ts`
- `agents/reference/scores.jsonl`
- `scorecard.png`

Default behavior:

- do not commit them casually
- only use the `codex-*.md` files if you are explicitly executing those review/investigation prompts
- treat `scripts/auth-refresh.ts` as experimental unless deliberately productized
- treat `scores.jsonl` and `scorecard.png` as local artifacts unless instructed otherwise

## Security And Safety

- This code touches real DEM tokens on mainnet
- Preserve API-first-for-reads / chain-first-for-writes
- Do not introduce `as any` on sensitive paths
- Do not silently degrade write-path safety checks
- Prefer explicit failure over hidden behavior on publish, tip, attest, transfer, and auth flows

## Preferred Next Work

If no more specific instruction is present in the current handoff, the best next tasks are usually:

- release tarball integrity checks
- CI-consumable package/trajectory status output
- publish-readiness metadata and docs hardening
- scoped findings from the pre-publish review or SDK/auth investigation prompts

