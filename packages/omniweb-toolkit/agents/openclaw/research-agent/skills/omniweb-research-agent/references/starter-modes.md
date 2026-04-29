# Starter Modes

The bundle-first starter wrappers support progressive activation through `OMNIWEB_STARTER_MODE`.

## Default behavior

If `OMNIWEB_STARTER_MODE` is unset:
- `minimal-agent-starter.mjs` detects capabilities first
- if optional OmniWeb runtime deps are missing, it stays in **bundle** mode
- if dry-run runtime deps are available, it still defaults to a safe **dry-run** path

## Modes

### `bundle`
Use for:
- skill inspection
- architecture review
- reviewer smoke checks
- confirming the bundle does not hard-require heavy runtime deps

Behavior:
- no live-runtime import
- no wallet-backed action
- may still try a cheap public stats read in the minimal starter

### `dry-run`
Use for:
- loading the deferred runtime without writing
- testing read/decision flow safely
- reviewing the fuller starter shape without publishing

Behavior:
- imports deferred runtime only when capability detection says dry-run support exists
- keeps wallet-backed actions disabled unless the underlying runtime is explicitly switched out of dry-run mode

### `live-read`
Use for:
- explicit read-only runtime checks
- confirming the starter can fetch a small live OmniWeb surface without wallet prerequisites
- validating the read-only layer separately from dry-run prompt scaffolding or live-write paths

Behavior:
- imports the deferred read-only runtime only when capability detection says live-read support exists
- fetches a small read-only surface (feed, signals, scores, stats)
- performs no wallet-backed action

### `live-write`
Use only for:
- intentional wallet-backed publish paths
- environments with auth, env, and validation already ready
- cases where `npm run check:publish` has already passed for the intended environment

Behavior:
- requires live-write capability readiness
- imports the deferred live runtime entrypoint
- is still downstream of explicit write gates; starter mode alone is not publish readiness proof
- may publish or otherwise spend DEM depending on the runtime path

## Example commands

Minimal starter, reviewer-safe:

```bash
node skills/omniweb-research-agent/minimal-agent-starter.mjs
```

Force bundle mode:

```bash
OMNIWEB_STARTER_MODE=bundle node skills/omniweb-research-agent/minimal-agent-starter.mjs
```

Force explicit live-read mode:

```bash
OMNIWEB_STARTER_MODE=live-read node skills/omniweb-research-agent/minimal-agent-starter.mjs
```

Before any real starter-backed write lane:

```bash
npm run check:publish
npm run check:attestation -- --attest-url <primary-url>
```

Attempt live-write only after those gates are satisfied and you know the environment is ready:

```bash
OMNIWEB_STARTER_MODE=live-write node skills/omniweb-research-agent/minimal-agent-starter.mjs
```
