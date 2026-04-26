# Beads Bootstrap And Recovery

This repo uses Beads as the shared task ledger. Code is durable through
GitHub branches and PRs; task state is durable through the Beads Dolt database.

## Canonical Database

Use these values when verifying or recovering Beads:

```text
backend: dolt
mode: embedded
database: omniweb_agents
project_id: da77df22-f217-4564-905e-759bb744b93c
issue prefix: omniweb-agents
primary Dolt remote: git+https://github.com/mj-deving/omniweb-agents.git
backup remote: https://doltremoteapi.dolthub.com/mj-deving/omniweb-agents-beads
```

The primary shared database travels through the GitHub repository's Dolt ref.
The DoltHub remote is a backup, not the normal day-to-day coordination target.

## Fresh Clone Rule

Do not run `bd init` in this repo unless intentionally creating a new Beads
database for a separate project. `bd init` can create a shadow local database
named `beads`, which will not contain repo tasks such as
`omniweb-agents-hj6l`, `omniweb-agents-8b6n`, or `omniweb-agents-up5l`.

On a fresh clone, try:

```bash
bd bootstrap
bd context --json
bd show omniweb-agents-hj6l --json
```

If bootstrap reports no existing project, creates an empty DB, or cannot see
known `omniweb-agents-*` IDs, recover from the canonical Dolt DB:

```bash
scripts/restore-beads-db.sh
bd context --json
bd show omniweb-agents-hj6l --json
bd dolt pull
```

## Shadow DB Recovery

When a clone already has a bad local Beads DB, preserve it first:

```bash
mv .beads .beads.shadow.$(date +%Y%m%d%H%M%S)
git checkout origin/main -- .beads/PRIME.md
scripts/restore-beads-db.sh
```

The recovery script clones the GitHub-hosted Dolt database into:

```text
.beads/embeddeddolt/omniweb_agents
```

and writes the canonical embedded-mode metadata expected by `bd`.

## Normal Sync Loop

For cross-machine coordination:

```bash
bd dolt pull
# inspect / claim / note / close beads
bd dolt push
```

If DoltHub backup freshness matters for an external tester, a maintainer with
the canonical ledger can also run:

```bash
bd backup sync
```

That is separate from the normal `bd dolt push` GitHub-backed coordination
loop.
