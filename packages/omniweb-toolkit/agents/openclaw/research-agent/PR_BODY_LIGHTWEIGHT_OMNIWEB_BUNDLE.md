## Summary

Refactor the OmniWeb OpenClaw bundle toward a lightweight-first architecture.

This change reduces startup context weight, turns the skill docs into a progressive router, and moves heavier OmniWeb runtime entrypoints behind explicit capability detection and deferred imports.

## Why

OpenClaw upstream is not expected to ship a startup-weight fix for this path soon.
So the bundle needs to get cheaper on its own:

- less mandatory startup reading
- clearer separation between bundle contract and live runtime
- no hidden assumption that heavy OmniWeb deps must exist just to inspect or load the bundle
- safer measured progression from explanation → dry-run → live read → live write

## What changed

### Docs / contract
- slim `AGENTS.md` startup path
- rewrite `skills/omniweb-research-agent/SKILL.md` into a lightweight router
- shorten `PLAYBOOK.md` into active doctrine only
- rewrite `README.md` around lightweight-first usage and progressive activation
- add targeted references:
  - `references/install-tiers.md`
  - `references/runtime-architecture.md`
  - `references/live-read.md`
  - `references/live-write.md`
  - `references/starter-modes.md`

### Runtime surface
- add `runtime/capability-detect.mjs`
- move old heavy minimal starter to `runtime/minimal-live-starter.mjs`
- keep the fuller starter logic behind a deferred runtime import path
- turn `minimal-agent-starter.mjs` into a bundle-first wrapper
- turn `starter.ts` into a bundle-first wrapper with deferred runtime imports

### Validation surface
- add a cheap smoke script path for reviewers via `npm run check:starter-smoke`

## Behavior after this change

### What should work without heavy runtime deps
- skill loading
- workspace inspection
- architecture discussion
- dry-run planning
- reviewer smoke check of the lightweight starter

### What still requires optional runtime setup
- live feed/signal/balance runtime paths
- wallet-backed publish / attest / reply / tip flows
- any DEM-spending path

## Reviewer notes

### Cheap smoke check
```bash
npm run check:starter-smoke
```

Expected result:
- starter prints detected capabilities
- stays in bundle mode cleanly when OmniWeb runtime deps are missing
- does not crash just because optional runtime deps are absent

### Explicit mode examples
```bash
OMNIWEB_STARTER_MODE=bundle node skills/omniweb-research-agent/minimal-agent-starter.mjs
OMNIWEB_STARTER_MODE=live-write node skills/omniweb-research-agent/minimal-agent-starter.mjs
```

## Tradeoffs

- `starter.ts` still depends on a TS-capable runtime path when actually executed in deferred mode
- this PR improves architecture and startup behavior first; it does not claim full clone-and-go live runtime
- live-write validation remains intentionally gated behind env/auth/tooling availability

## Result

The bundle now behaves like a lightweight OpenClaw contract with optional OmniWeb capability layers, instead of behaving like a heavy live runtime by default.
