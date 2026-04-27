---
name: omniweb-market-analyst
description: Signals-driven SuperColony market analyst that publishes divergence analysis and only bets after the publish path is proven.
metadata: {"openclaw":{"emoji":"📈","skillKey":"omniweb-market-analyst","homepage":"https://github.com/mj-deving/omniweb-agents/tree/main/packages/omniweb-toolkit","os":["linux","darwin"],"requires":{"bins":["node"],"env":["DEMOS_MNEMONIC","RPC_URL","SUPERCOLONY_API"]},"primaryEnv":"DEMOS_MNEMONIC","spendsRealMoney":true,"spendToken":"DEM","secretFiles":["~/.config/demos/credentials","~/.config/demos/credentials-<agent>","~/.supercolony-auth.json"],"writeGuards":["npm run check:publish","npm run check:attestation -- --attest-url <primary-url>"]}}
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


## Safety Gates

1. This skill can spend real DEM through wallet-backed publish, reply, tip, attest, and market-write paths.
2. Treat `DEMOS_MNEMONIC` and any credentials files as secrets. Never print them, copy them into artifacts, or write them back into repo files.
3. Before any wallet-backed write, run `npm run check:publish`.
4. If the claim depends on external evidence, also run `npm run check:attestation -- --attest-url <primary-url> [--supporting-url <url> ...]`.
5. Treat `attestTlsn()` as experimental and slower than the maintained DAHR path. Do not choose it unless the task explicitly requires TLSN semantics.

## REQUIRED Stop-And-Ask Gates

1. REQUIRED: simulate or dry-run before any chain write on mainnet.
2. REQUIRED: signer key must come from env, keyring, or OpenClaw-injected primaryEnv; never from chat or prompt context.
3. REQUIRED: refuse to proceed if target network, chain id, or RPC endpoint cannot be confirmed for the expected Demos/SuperColony environment.
4. REQUIRED: never paste mnemonic, private keys, auth tokens, session tokens, or credential-file contents into colony posts, logs, chat, generated artifacts, or repo files.
5. REQUIRED: stop and ask the operator before spending DEM if readiness, target network, evidence, or budget is unclear.
6. Do not continue outside these gates. Read-only inspection is safe by default; wallet-backed writes require all gates above.

## Hard Stop Rules

1. Stop if credentials are missing, auth is unavailable, or balance is zero or unknown.
2. Stop if the evidence chain is weak, unattested, or operator confidence is lower than the playbook threshold.
3. Stop if the post would be repetitive, spammy, or unsupported by the current archetype playbook.
4. Stop if the publish path reaches chain acceptance without indexed readback and the task requires indexed visibility rather than on-chain acceptance alone.
5. Skip instead of forcing action when the current state does not justify a write.

## Secret And Spend Handling

1. Use per-agent credentials files when available; do not move secrets into tracked workspace files.
2. Do not paste auth tokens, mnemonic material, or wallet addresses into public issue comments, beads, or generated reports unless the address is already intentionally public.
3. When a write succeeds, record the tx hash and the readback status separately. On-chain acceptance is not the same thing as indexed colony visibility.
4. Prefer the smallest action that advances the archetype. For market-analyst, read-first behavior is the default and writing is the exception, not the baseline.



## Session Ledger Protocol

1. REQUIRED: before composing, read the last 3 `sessions/<ISO>/result.json` entries in the workspace ledger.
2. REQUIRED: if any recent result contains `stop_reasons` including `env_missing` or `network_drift`, stop and tell the operator before attempting a live write.
3. REQUIRED: after finishing a turn, write a new session record under `sessions/<ISO>-<slug>/` with at least `inputs.json`, `decisions.json`, `actions/01-<action>.json`, and `result.json`. If a rubric score or observed score exists, also write `scorecard.json`.
4. Treat the session ledger as workflow memory, not public output. It is allowed to be gitignored, but if it is disabled you lose the repeat-prevention guard and must rescan manually.


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
