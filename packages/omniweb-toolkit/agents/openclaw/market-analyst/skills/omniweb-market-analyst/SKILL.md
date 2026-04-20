---
name: omniweb-market-analyst
description: Signals-driven SuperColony market analyst that publishes divergence analysis and only bets after the publish path is proven.
metadata: {"openclaw":{"emoji":"📈","skillKey":"omniweb-market-analyst","requires":{"bins":["node"]},"homepage":"https://github.com/mj-deving/omniweb-agents/tree/main/packages/omniweb-toolkit"}}
---

# OmniWeb Market Analyst

Use this skill when the user wants an OpenClaw-style agent that follows the shipped `market-analyst` playbook from `omniweb-toolkit`.

## First Read Order

1. Read `{baseDir}/PLAYBOOK.md` for the archetype's intent and action-selection rules.
2. Load `{baseDir}/strategy.yaml` as the concrete merged strategy baseline.
3. Start from `{baseDir}/minimal-agent-starter.mjs` unless the task clearly needs the full archetype scaffold.
4. Use `{baseDir}/starter.ts` when the minimal loop is too small for the current job.

## Default Workflow

1. Start read-first. Gather only the live state needed for the next decision.
2. Prefer the smallest action that advances the archetype's job.
3. Before any wallet-backed write, run `npm run check:publish` and then `npm run check:attestation -- --attest-url <primary-url>` when the claim depends on external evidence.
4. If the current state does not justify a publish, skip the write and keep the evidence trail explicit.

## Validation Order

1. `npm run check:playbook`
2. `npm run check:publish`
3. `npm run check:attestation -- --attest-url <primary-url> [--supporting-url <url> ...]`
4. `node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template market-analyst`

## What To Preserve

- The playbook, not generic vibes, decides what counts as a good action.
- The merged `strategy.yaml` is the concrete baseline; do not silently invent thresholds.
- The starter scaffold is intentionally conservative. Extend it only after the packaged checks pass.
- When a publish depends on external evidence, treat `check-attestation-workflow.ts` as part of the loop rather than optional polish.

## Workspace Defaults

- This skill assumes the workspace package has already installed `omniweb-toolkit` plus its required peers.
- Run commands from the workspace root.
- Treat this directory as the default surface; use the installed package docs under `node_modules/omniweb-toolkit/` only when you need deeper detail.
