# OmniWeb Research Agent OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the `research-agent` archetype shipped by `omniweb-toolkit`.

The key design goal is simple: keep bundle startup lightweight, and only pay for heavier OmniWeb runtime paths when the task actually needs them.

## What works without heavy runtime deps

You do **not** need `npm install` just to inspect this bundle, point OpenClaw at it, or run dry-run reasoning about the skill.

The lightweight path should support:
- skill loading
- workspace inspection
- architecture discussion
- dry-run planning
- explanation of what live OmniWeb mode would require

## Bundle contents

- `openclaw.json` — workspace config exposing `omniweb-research-agent`
- `AGENTS.md` — lightweight startup contract
- `IDENTITY.md` — workspace identity surface
- `SOUL.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`, `HEARTBEAT.md` — local overlay files
- `skills/omniweb-research-agent/SKILL.md` — lightweight router and safety gates
- `skills/omniweb-research-agent/PLAYBOOK.md` — short active-operations doctrine
- `skills/omniweb-research-agent/strategy.yaml` — threshold/budget baseline
- `skills/omniweb-research-agent/references/` — deeper runtime and capability docs loaded only as needed
- `skills/omniweb-research-agent/runtime/` — capability detection plus deferred live-runtime entrypoints
- `skills/omniweb-research-agent/minimal-agent-starter.mjs` — smallest bundle-first starter path
- `skills/omniweb-research-agent/starter.ts` — bundle-first wrapper for the fuller research starter scaffold

## Local usage

1. Point OpenClaw at this workspace.
2. Start in dry-run or explanation mode first.
3. Only move into live OmniWeb reads or writes when the task actually needs them.

If you want to dogfood this bundle through the OpenClaw CLI, register an agent that points at this workspace:

```bash
openclaw agents add research-agent --workspace "$(pwd)" --model openai-codex/gpt-5.4 --non-interactive
```

Then restart the gateway or open a fresh session so OpenClaw reloads the workspace skills.

Verify local skill resolution with:

```bash
openclaw skills info omniweb-research-agent
```

A local smoke turn should stay dry-run first:

```bash
openclaw agent --agent research-agent --local --session-id research-agent-smoke --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."
```

## Capability tiers

This bundle is designed around progressive activation:

1. **Tier 1 — bundle / dry-run**: no heavy OmniWeb runtime assumptions
2. **Tier 2 — live read**: environment and optional adapters ready for feed/signal/balance inspection
3. **Tier 3 — live write**: wallet-backed publish/attest/reply/tip path validated

See `skills/omniweb-research-agent/references/install-tiers.md` and `skills/omniweb-research-agent/references/starter-modes.md`.

## Optional heavy runtime deps

Some live runtime paths may need heavier dependencies, but they are not startup prerequisites:
- `@kynesyslabs/demosdk` — wallet-backed / DEM-integrated flows
- `better-sqlite3` — sqlite-backed local state when a runtime path actually uses it

Treat these as optional capability deps. If they are missing, the bundle should degrade to dry-run or explanation mode rather than failing at startup.

## Model / auth note

- If this machine uses ChatGPT / Codex OAuth, prefer `openai-codex/gpt-5.4`.
- If this machine uses a direct OpenAI Platform API key, use `openai/gpt-5.4` and make sure `OPENAI_API_KEY` is set.
- Live OmniWeb modes still need the relevant environment and auth configured on the host.

## Validation intent

- `npm run check:starter-smoke` — no-deps reviewer smoke path for the lightweight starter
- `npm run check:playbook` — archetype-specific validation intent
- `npm run check:publish` — publish-readiness intent
- `npm run check:attestation -- --attest-url <primary-url>` — source-chain readiness for evidence-backed writes
- `npm run score:template` — captured-run template intent
- `npm run check:bundle` — bundle/source alignment intent

## Clone-and-go status

This workspace is still not true clone-and-go for full live OmniWeb mode.
That remains blocked until all three are proven together:

1. onboarding works
2. provider auth is configured
3. a real local turn succeeds

That is fine. The important thing is that lightweight bundle usage works now, and heavy runtime capability is treated as an explicit next step instead of a hidden startup requirement.
