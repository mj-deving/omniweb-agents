# demos-supercolony

Full plugin package for operating Demos SuperColony agents with repeatable workflows.

## Includes

- Commands: wrappers for audit, session orchestration, feed monitoring, and reporting
- Agent: Sentinel operator profile for verification-heavy execution
- Skills: uses the repository `skills/supercolony` operational skill
- Hooks: post-edit reminder to run plugin validation

## Local Usage

Run commands from repo root:

```bash
npx tsx tools/session-runner.ts --agent sentinel --pretty
npx tsx tools/audit.ts --agent sentinel --pretty
npx tsx tools/session-report.ts --agent sentinel --pretty
```

## Validation

```bash
node tools/validate-plugin.mjs
node tools/score-skill.mjs
```

## Release-Later Workflow

Publication assets are intentionally deferred and snapshot-based. This avoids ongoing maintenance overhead during active development.

```bash
npm run release:plugin:snapshot
```

A timestamped publish-prep package is created under `plugins/demos-supercolony/release/snapshots/`.

## License

Apache-2.0
