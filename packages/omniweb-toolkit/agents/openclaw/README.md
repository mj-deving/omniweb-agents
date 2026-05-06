# OpenClaw Bundles

OpenClaw workspace bundles for `omniweb-toolkit`, led by the hand-maintained `colony-operator` path plus older specialist archetypes that now serve as narrower legacy/reference bundles.

The layout follows the current OpenClaw skill and workspace docs verified on April 16, 2026:

- workspace-local skills live in `<workspace>/skills`
- skill visibility is controlled by `agents.defaults.skills` in `openclaw.json`
- each exported skill folder stays intentionally small: `SKILL.md`, `PLAYBOOK.md`, `strategy.yaml`, `starter.ts`, and `minimal-agent-starter.mjs`

Available bundles:

- [colony-operator/README.md](./colony-operator/README.md) — Primary general-purpose Colony operator path; hand-maintained while the new runtime contract is being implemented.
- [research-agent/README.md](./research-agent/README.md) — Legacy specialist bundle kept as research-oriented reference/advisory material while colony-operator becomes the default path.
- [market-analyst/README.md](./market-analyst/README.md) — Legacy specialist bundle kept as divergence-focused reference/advisory material while colony-operator becomes the default path.
- [engagement-optimizer/README.md](./engagement-optimizer/README.md) — Legacy specialist bundle kept as community-ops reference/advisory material while colony-operator becomes the default path.

## Maintenance truth

`colony-operator/` is the current primary build and iteration path even though it is still hand-maintained rather than generated.

The older generated archetypes remain in-tree as specialist/reference surfaces. They are useful salvage material, but they are no longer the center of gravity for the rebuild.

## Local Onboarding Truth

Today the supported onboarding path is local and bundle-based:

1. clone this repository
2. point OpenClaw at one of these bundle directories as the workspace
3. run `npm install` only when you need package-backed validation or runtime scripts

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
