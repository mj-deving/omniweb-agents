# OmniWeb Research Agent OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the `research-agent` archetype shipped by `omniweb-toolkit`.

For the current alpha boundary between the portable bundle layer, the local operator overlay, and the runtime substrate, see `OMNIWEB_CURRENT_CONTRACT.md`.

## What It Includes

- `openclaw.json` — workspace config that exposes only `omniweb-research-agent`
- `AGENTS.md`, `BOOTSTRAP.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `MEMORY.md` — workspace context surfaces for OpenClaw startup
- `memory/README.md` — explains the daily memory file convention without inventing dated files
- `IDENTITY.md` — human-readable identity scaffold for the workspace's main agent
- `package.json` — local workspace package describing validation intent and bundle expectations
- `skills/omniweb-research-agent/SKILL.md` — activation router plus validation order
- `skills/omniweb-research-agent/PLAYBOOK.md` — archetype doctrine and action rules
- `skills/omniweb-research-agent/strategy.yaml` — merged concrete baseline
- `skills/omniweb-research-agent/starter.ts` — archetype-specific scaffold
- `skills/omniweb-research-agent/minimal-agent-starter.mjs` — smallest default loop

## Local Usage

1. You do **not** need `npm install` just to inspect or point OpenClaw at this bundle.
2. Start from `skills/omniweb-research-agent/minimal-agent-starter.mjs` unless you already know you need the full archetype scaffold.
3. For a first-time local setup on a host, run `openclaw onboard --accept-risk --workspace "$PWD"`.
4. If the host is already configured, run `openclaw setup --workspace "$PWD"` or `openclaw config set agents.defaults.workspace "$PWD"`.
5. If you want to dogfood this bundle through the OpenClaw CLI, register an agent that points at this workspace:

   ```bash
   openclaw agents add research-agent --workspace "$(pwd)" --model openai-codex/gpt-5.4 --non-interactive
   ```

6. Start a new session or restart the gateway so OpenClaw reloads the workspace skills.
7. Verify local skill resolution with `openclaw skills info omniweb-research-agent`. `openclaw skills list` is only a secondary visibility check after the workspace is active, and `openclaw skills search` is ClawHub-backed discovery rather than local workspace resolution.
8. Run a local smoke turn with an explicit session selector only after provider auth for the selected model is configured on the host:

   ```bash
   openclaw agent --agent research-agent --local --session-id research-agent-smoke --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."
   ```

The local `package.json` assumes this bundle stays inside the checked-out repository. If you copy it elsewhere before the first npm publish, replace the `file:../../..` dependency with a reachable package source.

## Local operator layer

This workspace can preserve a local operator layer for per-user memory, style, and workflow. Files like `SOUL.md`, `USER.md`, most of `HEARTBEAT.md`, and dated files under `memory/` are intentionally local and should not be confused with the portable skill contract.

## Runtime Prerequisites

Some runtime paths may need heavier dependencies, but this alpha workspace should not force npm to resolve them up front during routine inspection or dogfooding.

Treat these as documented prerequisites rather than proven clone-and-go installs:
- `@kynesyslabs/demosdk` — needed for full wallet-backed / DEM-integrated flows
- `better-sqlite3` — needed when a runtime path actually requires sqlite-backed local state

At the moment, neither prerequisite is fully proven clone-and-go in this workspace.

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

## What still blocks true clone-and-go

This workspace is not clone-and-go yet.
That claim stays blocked until all three are proven together:

1. onboarding works
2. provider auth is configured and usable
3. a real local turn succeeds

Heavy runtime prerequisites are documented above, but their installability and end-to-end use are still part of the alpha validation story rather than a solved portability guarantee.
