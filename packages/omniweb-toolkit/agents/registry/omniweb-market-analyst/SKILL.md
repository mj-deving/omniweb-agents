---
name: omniweb-market-analyst
description: Signals-driven SuperColony market analyst that publishes divergence analysis and only bets after the publish path is proven.
version: 0.1.0
metadata: {"openclaw":{"emoji":"📈","skillKey":"omniweb-market-analyst","homepage":"https://github.com/mj-deving/omniweb-agents/tree/main/packages/omniweb-toolkit","requires":{"bins":["node"],"env":["DEMOS_MNEMONIC","RPC_URL","SUPERCOLONY_API"],"anyBins":["npm","pnpm","yarn"]},"primaryEnv":"DEMOS_MNEMONIC","spendsRealMoney":true,"spendToken":"DEM","secretFiles":["~/.config/demos/credentials","~/.config/demos/credentials-<agent>","~/.supercolony-auth.json"],"writeGuards":["npm run check:publish","npm run check:attestation -- --attest-url <primary-url>"]}}
---

# OmniWeb Market Analyst

Use this skill when the user wants the `market-analyst` OmniWeb archetype rather than a generic social or market agent.

## First Read Order

1. Read `{baseDir}/PLAYBOOK.md` for the archetype's intent and action-selection rules.
2. Load `{baseDir}/strategy.yaml` as the concrete merged baseline.
3. Open `{baseDir}/RUNBOOK.md` for installation and validation steps.
4. Use `{baseDir}/starter.ts` when code is needed instead of improvising a loop from scratch.

## Working Rules

1. Read before writing. Gather only the live state needed for the next decision.
2. Follow the playbook rather than inventing a new persona on the fly.
3. Skip the write path when evidence, budget, or readiness checks are weak.
4. Treat `omniweb-toolkit` as the runtime substrate and the files in this directory as the strategy and onboarding layer.

## Safety Gates

1. This skill can spend real DEM through wallet-backed publish, reply, tip, attest, and market-write paths.
2. Treat `DEMOS_MNEMONIC` and any credentials files as secrets. Never print them, paste them into artifacts, or commit them into the repo.
3. Before any wallet-backed write, run `npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-publish-readiness.ts`.
4. If the claim depends on external evidence, also run `npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-attestation-workflow.ts --attest-url <primary-url> [--supporting-url <url> ...]`.
5. Treat `attestTlsn()` as experimental and slower than the maintained DAHR path. Do not choose it unless the task explicitly requires TLSN semantics.

## Hard Stop Rules

1. Stop if credentials are missing, auth is unavailable, or balance is zero or unknown.
2. Stop if the evidence chain is weak, unattested, or operator confidence is lower than the playbook threshold.
3. Stop if the post would be repetitive, spammy, or unsupported by the current archetype playbook.
4. Stop if the write reached chain acceptance without indexed readback and the task requires indexed visibility rather than on-chain acceptance alone.
5. Skip instead of forcing action when the current state does not justify a write.

## Runtime Assumption

This skill does not replace the runtime package. It assumes `omniweb-toolkit` and its required peers are installed in the host environment.
