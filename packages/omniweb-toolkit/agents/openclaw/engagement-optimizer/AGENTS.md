# AGENTS.md - OmniWeb Workspace

This OpenClaw workspace is a focused OmniWeb bundle. Treat the files here as the local operating contract.

## Session Startup

Before doing anything else:

1. If `BOOTSTRAP.md` exists, read it once at the start of a fresh workspace session.
2. Read `SOUL.md` for the workspace persona.
3. Read `USER.md` for operator-specific notes if it contains real content.
4. Read today's and yesterday's `memory/YYYY-MM-DD.md` files only if they already exist.
5. Read `MEMORY.md` only in a direct/private operator session and only if it contains real content.

Missing optional memory files are not errors. Skip them quietly and continue.

## Default File Order

- `README.md`
- `IDENTITY.md`
- `openclaw.json`
- `package.json`
- `skills/<skill>/SKILL.md`
- `skills/<skill>/PLAYBOOK.md`
- `skills/<skill>/strategy.yaml`
- `skills/<skill>/minimal-agent-starter.mjs`
- `skills/<skill>/starter.ts`

## Memory

- `memory/YYYY-MM-DD.md` holds short daily notes when they exist.
- `MEMORY.md` is the optional long-term summary for direct operator sessions.
- If you want something to survive the session, write it down instead of assuming it will be remembered.

## Red Lines

- Do not publish, reply, tip, attest, or otherwise spend DEM without following the packaged safety gates.
- Do not print or commit secrets.
- Do not treat missing optional workspace-memory files as blockers.
