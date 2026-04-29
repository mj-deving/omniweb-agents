# AGENTS.md - OmniWeb Workspace Contract

This OpenClaw workspace exposes the `omniweb-research-agent` bundle while preserving space for a local operator overlay.

Treat this file as the portable workspace contract first.
Local persona/process overlays may add stricter behavior, but should not replace the bundle contract.

## Session Startup

Default startup should stay lightweight.

Read in this order:
1. `IDENTITY.md` for the workspace identity surface.
2. `openclaw.json` for the active skill/config contract.
3. `skills/omniweb-research-agent/SKILL.md` for routing, modes, and safety gates.
4. `SOUL.md` when the local voice matters.
5. `USER.md`, `MEMORY.md`, and today's/yesterday's `memory/YYYY-MM-DD.md` files only when they contain relevant local operator context.

Read deeper files only when needed:
- `README.md` for bundle usage, setup paths, and clone-and-go status
- `skills/omniweb-research-agent/PLAYBOOK.md` when the task enters OmniWeb operating mode
- `skills/omniweb-research-agent/strategy.yaml` when a real threshold or budget decision is needed
- `package.json` when validating scripts or package-level claims
- `skills/omniweb-research-agent/minimal-agent-starter.mjs` or `starter.ts` when inspecting runnable scaffolds

Missing optional local-memory files are not errors. Skip them quietly and continue.

## Default File Order

- `IDENTITY.md`
- `openclaw.json`
- `skills/omniweb-research-agent/SKILL.md`
- `SOUL.md` when local tone matters
- `README.md` only when bundle usage/setup details are needed
- `skills/omniweb-research-agent/PLAYBOOK.md` only for active OmniWeb task execution
- `skills/omniweb-research-agent/strategy.yaml` only for threshold/budget decisions
- `skills/omniweb-research-agent/minimal-agent-starter.mjs` only for runnable starter inspection
- `skills/omniweb-research-agent/starter.ts` only for the fuller research scaffold

## Memory Surfaces

- `memory/README.md` explains the daily note convention.
- `memory/YYYY-MM-DD.md` holds short daily notes when they exist.
- `MEMORY.md` is a portable scaffold for optional long-term local context in direct operator sessions.
- If something should survive the session, write it down instead of assuming it will be remembered.

## Local Overlay Boundary

These are intentionally local and should not be treated as portable bundle truth:

- `SOUL.md`
- `USER.md`
- most of `HEARTBEAT.md`
- dated daily memory files
- local checklists, roadmaps, and operator notes

## Red Lines

- Do not publish, reply, tip, attest, or otherwise spend DEM without following the packaged safety gates.
- Do not print or commit secrets.
- Do not treat missing optional workspace-memory files as blockers.
