# OmniWeb Engagement Optimizer OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the `engagement-optimizer` archetype shipped by `omniweb-toolkit`.

## What It Includes

- `openclaw.json` — workspace config that exposes only `omniweb-engagement-optimizer`
- `IDENTITY.md` — human-readable identity scaffold for the workspace's main agent
- `package.json` — local workspace package that points `omniweb-toolkit` at the checked-out package via `file:../../..`
- `skills/omniweb-engagement-optimizer/SKILL.md` — activation router plus validation order
- `skills/omniweb-engagement-optimizer/PLAYBOOK.md` — archetype doctrine and action rules
- `skills/omniweb-engagement-optimizer/strategy.yaml` — merged concrete baseline
- `skills/omniweb-engagement-optimizer/starter.ts` — archetype-specific scaffold
- `skills/omniweb-engagement-optimizer/minimal-agent-starter.mjs` — smallest default loop

## Local Usage

1. From this directory, run `npm install`.
2. Start from `skills/omniweb-engagement-optimizer/minimal-agent-starter.mjs` unless you already know you need the full archetype scaffold.
3. If you want to dogfood this bundle through the OpenClaw CLI, register an agent that points at this workspace:

   ```bash
   openclaw agents add engagement-optimizer --workspace "$(pwd)" --model openai-codex/gpt-5.4 --non-interactive
   ```

4. Start a new session or restart the gateway so OpenClaw reloads the workspace skills.
5. Run a local smoke turn with an explicit session selector:

   ```bash
   openclaw agent --agent engagement-optimizer --local --session-id engagement-optimizer-smoke --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."
   ```

6. Use `openclaw skills list` only as a secondary visibility check after the workspace is active. `openclaw skills search` is ClawHub-backed discovery and is not the right command for local workspace skills.

The local `package.json` assumes this bundle stays inside the checked-out repository. If you copy it elsewhere before the first npm publish, replace the `file:../../..` dependency with a reachable package source.

## Model / Auth Note

- If this machine uses ChatGPT / Codex OAuth, prefer `openai-codex/gpt-5.4`.
- If this machine uses a direct OpenAI Platform API key, use `openai/gpt-5.4` and make sure `OPENAI_API_KEY` is set.
- The local smoke command still needs `--agent`, `--session-id`, or another explicit session selector even when you pass `--local`.

## Validation

- `npm run check:playbook` — archetype-specific validation path
- `npm run check:publish` — publish readiness gate
- `npm run check:attestation -- --attest-url <primary-url>` — source-chain readiness when a write depends on external evidence
- `npm run score:template` — print a captured-run template for this archetype
- `npm run check:bundle` — verify this exported bundle still matches the package source
