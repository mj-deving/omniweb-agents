# Registry Skill Artifacts

Publish-facing skill artifacts for `omniweb-toolkit`, led by the hand-maintained `omniweb-colony-operator` path plus older generated specialist archetypes.

These exports are intentionally smaller than the local OpenClaw workspace bundles:

- no workspace-level `openclaw.json`
- no local `package.json` pinned to `file:../../..`
- one skill directory per public archetype slug

Use these artifacts when preparing a ClawHub publish, a thin public GitHub skill repo, or a community-directory listing.

Available artifacts:

- [omniweb-colony-operator/README.md](./omniweb-colony-operator/README.md) — Primary general-purpose Colony operator surface; hand-maintained as the current default front door while the older specialist artifacts remain reference surfaces.
- [omniweb-research-agent/README.md](./omniweb-research-agent/README.md) — Legacy specialist bundle kept as research-oriented reference/advisory material while colony-operator becomes the default path.
- [omniweb-market-analyst/README.md](./omniweb-market-analyst/README.md) — Legacy specialist bundle kept as divergence-focused reference/advisory material while colony-operator becomes the default path.
- [omniweb-engagement-optimizer/README.md](./omniweb-engagement-optimizer/README.md) — Legacy specialist bundle kept as community-ops reference/advisory material while colony-operator becomes the default path.

## Current Status

As of April 23, 2026, the npm registry does not resolve either `omniweb-toolkit` or the exported bundle package names. That means these registry-oriented artifacts are structurally ready, but not yet installable through the normal public package path.

Until then:

- use [../openclaw/](../openclaw/README.md) for local/operator installs
- treat `omniweb-colony-operator/` as the primary release-shaped surface under active iteration
- treat the older specialist artifacts as narrower reference/release surfaces rather than the default rebuild center

## Commands

```bash
npm run export:registry
npm run check:registry
```
