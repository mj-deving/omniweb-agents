# Release Pack (Manual)

This directory is intentionally manual and snapshot-based.

Purpose:

- Keep day-to-day development lightweight.
- Generate publish-ready metadata only when you decide to publish.

## Workflow

1. Continue normal development in repository files.
2. When needed, generate a snapshot:

```bash
npm run release:plugin:snapshot
```

3. Edit only the generated snapshot files for external publication polish.

Note: `release/snapshots/` is gitignored by default so snapshots do not create day-to-day maintenance burden.

## Why this exists

You do not need to maintain marketplace metadata on every code change. This flow defers that work until publication time.
