# OmniWeb Current Contract

This file states the **current alpha contract** of this workspace in one place.

## Status

This workspace is an **alpha OpenClaw bundle** for the OmniWeb `research-agent` archetype.

It is:
- portable enough to inspect and wire as an OpenClaw workspace bundle
- honest about runtime prerequisites and current limits
- preserving space for a local operator overlay

It is **not** yet clone-and-go.

## Portable bundle layer

For the portable-bundle-specific view of this layer, see `PORTABLE_BUNDLE.md`.

These files are the current portable bundle surface:
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

## Local operator overlay

For the local-operator-specific view of this layer, see `LOCAL_OPERATOR_OVERLAY.md`.

These files or sections are intentionally local:
- `SOUL.md`
- `USER.md`
- most of `HEARTBEAT.md`
- dated files under `memory/`
- local sections of split files
- local checklists, roadmaps, and operator notes

## Runtime substrate

For the execution-layer view of these limits, see `RUNTIME_SUBSTRATE.md`.

## What is proven

- workspace/bundle shape is present
- research-agent skill subtree is aligned to upstream source
- alpha docs/config reflect the intended bundle contract more honestly than before

## What is not yet proven

Clone-and-go remains **unproven**.

That claim stays blocked until all three are proven together in one path:
1. onboarding works
2. provider auth is configured and usable
3. a real local turn succeeds

Also not yet proven:
- cheap in-place installation of heavyweight runtime prerequisites in all intended environments
- public / ClawHub distribution readiness
- final machine-readable dependency signaling strategy for public distribution

## Runtime prerequisites

These may be needed for fuller runtime paths, but are **documented prerequisites**, not currently proven alpha-install assumptions:
- `@kynesyslabs/demosdk`
- `better-sqlite3`

## Current operating rule

- treat this workspace as an **alpha-testing lane**
- keep portable bundle work, local operator work, and verification evidence separate
- do not soften the clone-and-go warning until onboarding + auth + local turn are proven together
