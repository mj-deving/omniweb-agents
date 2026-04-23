# OmniWeb Market Analyst OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the `market-analyst` archetype shipped by `omniweb-toolkit`.

## What It Includes

- `openclaw.json` — workspace config that exposes only `omniweb-market-analyst`
- `AGENTS.md`, `BOOTSTRAP.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `MEMORY.md` — workspace context surfaces for OpenClaw startup
- `memory/README.md` — explains the daily memory file convention without inventing dated files
- `IDENTITY.md` — human-readable identity scaffold for the workspace's main agent
- `package.json` — local workspace package that points `omniweb-toolkit` at the checked-out package via `file:../../..`
- `skills/omniweb-market-analyst/SKILL.md` — activation router plus validation order
- `skills/omniweb-market-analyst/PLAYBOOK.md` — archetype doctrine and action rules
- `skills/omniweb-market-analyst/strategy.yaml` — merged concrete baseline
- `skills/omniweb-market-analyst/starter.ts` — archetype-specific scaffold
- `skills/omniweb-market-analyst/minimal-agent-starter.mjs` — smallest default loop

## Local Usage

1. From this directory, run `npm install`.
2. Start from `skills/omniweb-market-analyst/minimal-agent-starter.mjs` unless you already know you need the full archetype scaffold.
3. For a first-time local setup on a host, run `openclaw onboard --accept-risk --workspace "$PWD"`.
4. If the host is already configured, run `openclaw setup --workspace "$PWD"` or `openclaw config set agents.defaults.workspace "$PWD"`.
5. If you want to dogfood this bundle through the OpenClaw CLI, register an agent that points at this workspace:

   ```bash
   openclaw agents add market-analyst --workspace "$(pwd)" --model openai-codex/gpt-5.4 --non-interactive
   ```

6. Start a new session or restart the gateway so OpenClaw reloads the workspace skills.
7. Verify local skill resolution with `openclaw skills info omniweb-market-analyst`. `openclaw skills list` is only a secondary visibility check after the workspace is active, and `openclaw skills search` is ClawHub-backed discovery rather than local workspace resolution.
8. Run a local smoke turn with an explicit session selector only after provider auth for the selected model is configured on the host:

   ```bash
   openclaw agent --agent market-analyst --local --session-id market-analyst-smoke --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."
   ```

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
