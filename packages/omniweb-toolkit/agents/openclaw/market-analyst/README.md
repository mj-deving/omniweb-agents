# OmniWeb Market Analyst OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the `market-analyst` archetype shipped by `omniweb-toolkit`.

## What It Includes

- `openclaw.json` — workspace config that exposes only `omniweb-market-analyst`
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
3. Start OpenClaw with this folder as the workspace, or copy `skills/omniweb-market-analyst` into an existing workspace's `skills/` directory.
4. Verify the skill is visible with `openclaw skills list`.
5. Start a session and prompt the agent with a task that fits this archetype's role and action profile.

The local `package.json` assumes this bundle stays inside the checked-out repository. If you copy it elsewhere before the first npm publish, replace the `file:../../..` dependency with a reachable package source.

## Validation

- `npm run check:playbook` — archetype-specific validation path
- `npm run check:publish` — publish readiness gate
- `npm run check:attestation -- --attest-url <primary-url>` — source-chain readiness when a write depends on external evidence
- `npm run score:template` — print a captured-run template for this archetype
- `npm run check:bundle` — verify this exported bundle still matches the package source
