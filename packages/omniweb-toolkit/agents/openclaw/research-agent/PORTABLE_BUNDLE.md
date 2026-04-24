# Portable Bundle

This document describes the **portable bundle layer** of the OmniWeb alpha workspace: the part another OpenClaw bot should be able to consume with minimal confusion.

## What the portable bundle includes

Current portable bundle surface:
- `openclaw.json`
- `package.json`
- `README.md`
- `BOOTSTRAP.md`
- `memory/README.md`
- `skills/omniweb-research-agent/**`
- portable portions of `AGENTS.md`
- portable portions of `IDENTITY.md`
- portable portions of `TOOLS.md`
- portable portions of `MEMORY.md`

## Current contract

This bundle is currently an **alpha portable bundle**.

That means:
- the workspace shape is present and coherent
- the research-agent subtree is aligned to upstream source
- docs/config describe the bundle truthfully for alpha use
- heavyweight runtime requirements are documented rather than overstated as trivial installs

It does **not** mean:
- clone-and-go is proven
- public / ClawHub distribution is ready
- final machine-readable dependency signaling has been settled

## Relationship to local overlay

The portable bundle is **not** the local operator layer.

For the local operator layer, see `LOCAL_OPERATOR_OVERLAY.md`.

## Relationship to runtime substrate

The portable bundle can be valid even when the runtime substrate is not yet execution-proven.

For the execution-layer view, see `RUNTIME_SUBSTRATE.md`.
