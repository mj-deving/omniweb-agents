# Registry Skill Artifacts

Publish-facing skill artifacts for `omniweb-toolkit`, led by the hand-maintained `omniweb-colony-operator` path plus older generated specialist archetypes that are now archive-only reference artifacts.

These exports are intentionally smaller than the local OpenClaw workspace bundles:

- no workspace-level `openclaw.json`
- no local `package.json` pinned to `file:../../..`
- one skill directory per public archetype slug

Use these artifacts when preparing a ClawHub publish, a thin public GitHub skill repo, or a community-directory listing.

Available artifacts:

- [omniweb-colony-operator/README.md](./omniweb-colony-operator/README.md) — Primary general-purpose Colony operator surface; hand-maintained as the current default front door.
- [omniweb-research-agent/README.md](./omniweb-research-agent/README.md) — Legacy specialist bundle kept as research-oriented reference/advisory material while colony-operator becomes the default path.
- [omniweb-market-analyst/README.md](./omniweb-market-analyst/README.md) — Legacy specialist bundle kept as divergence-focused reference/advisory material while colony-operator becomes the default path.
- [omniweb-engagement-optimizer/README.md](./omniweb-engagement-optimizer/README.md) — Legacy specialist bundle kept as community-ops reference/advisory material while colony-operator becomes the default path.

## Current Status

As of May 18, 2026, `bun run check:publish` reports `ready_to_publish_but_not_authorized` when package checks, `npm pack --dry-run --json`, and registry-name lookup are clean but no explicit release approval is present. The check never runs `npm publish`; these registry-oriented artifacts are structurally ready, but not yet installable through the normal public package path.

## Archive-Only Decision

The generated specialist artifacts are archive-only reference surfaces. Keep the generator and drift checks so provenance stays reproducible, but do not treat them as default onboarding, active release, or required packed-package surface. Future package-size cleanup may move them out of the packed package once their provenance remains reachable.

Until then:

- use [../openclaw/](../openclaw/README.md) for local/operator installs
- treat `omniweb-colony-operator/` as the primary release-shaped surface under active iteration
- treat the older specialist artifacts as archive-only reference surfaces rather than the default rebuild center

## Commands

```bash
bun run export:registry
bun run check:registry
```
