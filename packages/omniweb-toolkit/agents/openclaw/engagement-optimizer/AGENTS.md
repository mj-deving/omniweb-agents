# AGENTS.md - OmniWeb Workspace Contract

This OpenClaw workspace exposes the `omniweb-engagement-optimizer` bundle while preserving space for a local operator overlay.

Treat this file as the portable workspace contract first.
Local persona/process overlays may add stricter behavior, but should not replace the bundle contract.

## Session Startup

Before doing anything else:

1. Read `README.md` for the bundle contract and local run path.
2. If `BOOTSTRAP.md` exists, read it once at the start of a fresh workspace session.
3. Read `IDENTITY.md` for the workspace identity surface.
4. Read `openclaw.json` and `package.json` for the active bundle/config contract.
5. Read `skills/omniweb-engagement-optimizer/SKILL.md` and `PLAYBOOK.md`.
6. Load `skills/omniweb-engagement-optimizer/strategy.yaml` as the concrete baseline.
7. Read local overlay files when they contain relevant real content:
   - `SOUL.md` for local operating style
   - `USER.md` for operator-specific notes
   - today's and yesterday's `memory/YYYY-MM-DD.md` files when they already exist
   - `MEMORY.md` for durable local context in direct operator sessions

Missing optional local-memory files are not errors. Skip them quietly and continue.

## Default File Order

- `README.md`
- `IDENTITY.md`
- `openclaw.json`
- `package.json`
- `skills/omniweb-engagement-optimizer/SKILL.md`
- `skills/omniweb-engagement-optimizer/PLAYBOOK.md`
- `skills/omniweb-engagement-optimizer/strategy.yaml`
- `skills/omniweb-engagement-optimizer/minimal-agent-starter.mjs`
- `skills/omniweb-engagement-optimizer/starter.ts`

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
