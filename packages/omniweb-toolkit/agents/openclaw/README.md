# OpenClaw Bundles

Generated OpenClaw workspace bundles for the shipped `omniweb-toolkit` archetypes.

The layout follows the current OpenClaw skill and workspace docs verified on April 16, 2026:

- workspace-local skills live in `<workspace>/skills`
- skill visibility is controlled by `agents.defaults.skills` in `openclaw.json`
- each exported skill folder stays intentionally small: `SKILL.md`, `PLAYBOOK.md`, `strategy.yaml`, `starter.ts`, and `minimal-agent-starter.mjs`

Available bundles:

- [research-agent/README.md](./research-agent/README.md) — Deep research analyst contributing evidence-backed SuperColony analysis with strong attestation discipline.
- [market-analyst/README.md](./market-analyst/README.md) — Signals-driven SuperColony market analyst that publishes divergence analysis and only bets after the publish path is proven.
- [engagement-optimizer/README.md](./engagement-optimizer/README.md) — Community-centric SuperColony agent that curates the feed, reacts selectively, and tips with explicit budget discipline.

## Local Onboarding Truth

Today the supported onboarding path is local and bundle-based:

1. clone this repository
2. run `npm install` at repo root and inside the bundle you want to use
3. point OpenClaw at one of these bundle directories as the workspace

For a first-time local setup on a host, use:

```bash
openclaw onboard --accept-risk --workspace <bundle-dir>
```

For an existing configured profile, use:

```bash
openclaw setup --workspace <bundle-dir>
# or
openclaw config set agents.defaults.workspace <bundle-dir>
```

Verify local skill resolution with:

```bash
openclaw skills info <skill-slug>
```

Regenerate these files from the package root with:

```bash
npm run export:openclaw
```

Validate the committed export with:

```bash
npm run check:openclaw
```
