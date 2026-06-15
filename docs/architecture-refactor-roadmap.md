---
summary: "Stable architecture refactor lane plan that turns atlas and graph evidence into ordered Beads work."
topic_hint:
  - "architecture refactor roadmap"
  - "post-atlas refactor lanes"
  - "package write boundary"
  - "legacy agent compatibility"
  - "minimal-agent audit"
  - "root shim cleanup"
---

# Architecture Refactor Roadmap

This is the stable planning layer for the next architecture refactors. It names
the lanes and proof gates; execution status, owners, claims, blockers, and
sequencing live in Beads.

Current baseline:

- Architecture atlas: PR #625, `docs/architecture-atlas.md`.
- Ranked refactor map: `packages/omniweb-toolkit/references/architecture-refactor-map-2026-06-12.md`.
- Package-local quality-gate boundary: complete in PR #624.
- Active Beads parent: `omniweb-agents-s993`.

Do not use this document as authority to delete public API. Every code change
below needs fresh importer proof immediately before the PR that changes code.

## Lane 1: Package Write Subpath Inventory

Problem:

- `packages/omniweb-toolkit/src/write.ts` imports root toolkit write helpers
  directly.
- The subpath is public package surface and sits near real DEM/write behavior,
  so implementation must not start from graph pressure alone.

Canonical owner:

- Package write subpath and root toolkit write primitives.

Affected surface:

- `packages/omniweb-toolkit/src/write.ts`
- `src/toolkit/sdk-bridge.ts`
- `src/toolkit/safe-transfer.ts`
- `src/toolkit/supercolony/bet-memos.ts`
- `src/toolkit/types.ts`
- `src/toolkit/supercolony/types.ts`

Proof command:

```bash
rg -n "from ['\\\"]../../../src/toolkit/(sdk-bridge|safe-transfer|supercolony|types)" packages/omniweb-toolkit/src/write.ts
bun run --cwd packages/omniweb-toolkit check:public-export-coverage
```

Stop rule:

- Stop at inventory if the safe owner boundary is unclear, public exports would
  change, or semantic write behavior would move.

Validation ladder:

```bash
git diff --check
bun run --cwd packages/omniweb-toolkit check:public-export-coverage
bun run --cwd packages/omniweb-toolkit check:package
```

## Lane 2: Package Write Boundary Refactor

Problem:

- If lane 1 proves a bounded owner boundary, the public write subpath may still
  need a package-local adapter to reduce direct root imports.
- If lane 1 does not prove that boundary, implementation would be speculative.

Canonical owner:

- Package write adapter over root toolkit write primitives.

Affected surface:

- `packages/omniweb-toolkit/src/write.ts`
- any new package-local write adapter module
- focused package export and release-surface checks

Proof command:

```bash
# Replace write-adapter.ts with the actual adapter file(s); do not scan the whole package src tree.
rg -n "from ['\\\"]../../../src/toolkit" \
  packages/omniweb-toolkit/src/write.ts \
  packages/omniweb-toolkit/src/write-adapter.ts
bun run --cwd packages/omniweb-toolkit check:public-export-coverage
bun run --cwd packages/omniweb-toolkit check:release
```

Stop rule:

- Stop if the adapter would widen, shrink, or rename package exports, or if the
  change needs live probes, provider auth, wallet setup, `--execute`,
  `--broadcast`, or spend.

Validation ladder:

```bash
git diff --check
bun run --cwd packages/omniweb-toolkit check:package
bun run --cwd packages/omniweb-toolkit check:release
```

## Lane 3: Legacy Agent Compatibility Demotion

Problem:

- `packages/omniweb-toolkit/src/agent.ts` still exposes legacy root-loop
  compatibility exports such as `runAgentLoop`, `defaultObserve`, and
  `buildColonyStateFromFeed`.
- Current doctrine makes `colony-operator` the maintained front door; legacy
  compatibility should not read as equal architecture.

Canonical owner:

- Package `./agent` subpath compatibility section.

Affected surface:

- `packages/omniweb-toolkit/src/agent.ts`
- package docs and references describing agent entrypoints
- tests that lock package public surface

Proof command:

```bash
rg -n "runAgentLoop|defaultObserve|buildColonyStateFromFeed" packages/omniweb-toolkit/src packages/omniweb-toolkit/references tests
bun run --cwd packages/omniweb-toolkit check:public-export-coverage
```

Stop rule:

- Do not remove or rename exports without importer proof and release-surface
  evidence. If live consumers remain plausible, demote docs/tests first and
  leave compatibility exports intact.

Validation ladder:

```bash
git diff --check
bun run --cwd packages/omniweb-toolkit check:package
bun run --cwd packages/omniweb-toolkit check:release
```

## Lane 4: Minimal-Agent Responsibility Audit

Problem:

- `packages/omniweb-toolkit/src/minimal-agent.ts` remains graph-central after
  prior seam extraction.
- Centrality can mean real overload, or it can mean stale documentation around
  a now-acceptable orchestrator.

Canonical owner:

- Package minimal-agent seam below the colony-operator route.

Affected surface:

- `packages/omniweb-toolkit/src/minimal-agent.ts`
- `packages/omniweb-toolkit/src/minimal-agent/*`
- `packages/omniweb-toolkit/src/minimal-agent-executor.ts`
- `packages/omniweb-toolkit/src/minimal-agent-verifier.ts`
- `tests/packages/minimal-agent.test.ts`

Proof command:

```bash
rg -n "from ['\\\"]\\.\\/minimal-agent|from ['\\\"]\\.\\.\\/minimal-agent|minimal-agent" packages/omniweb-toolkit/src tests/packages
```

Stop rule:

- Stop if evidence is only graph centrality. Implementation starts only after
  source proof identifies one bounded responsibility band with focused tests.

Validation ladder:

```bash
git diff --check
bunx vitest run tests/packages/minimal-agent.test.ts
bun run --cwd packages/omniweb-toolkit check:package
```

## Lane 5: Deprecated Root Shim Cleanup

Problem:

- Several root `src/lib/*` and `src/reactive/*` files are deprecated shims over
  newer toolkit locations.
- Some may be dead after cleanup work, but `@deprecated` is not proof.

Canonical owner:

- Root internal compatibility layer.

Affected surface:

- `src/lib/sources/*.ts`
- `src/lib/sources/providers/*.ts`
- `src/lib/network/*.ts`
- `src/reactive/*.ts`

Proof command:

```bash
rg -n "src/lib/(sources|network)|src/reactive|\\.\\./lib/(sources|network)|\\.\\./\\.\\./lib/(sources|network)|\\.\\./reactive" src packages tests cli scripts
```

Stop rule:

- One shim family per PR. If any live importer remains, migrate that importer
  first or leave the shim. Empty importer proof is required immediately before
  deletion.

Validation ladder:

```bash
git diff --check
bunx vitest run tests/architecture/boundary.test.ts
bun run --cwd packages/omniweb-toolkit check:codebase-reachability
```
