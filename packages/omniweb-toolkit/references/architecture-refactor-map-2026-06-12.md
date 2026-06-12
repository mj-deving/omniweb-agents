---
summary: "Ranked architecture refactor map from the 2026-06-12 whole-repo graph refresh."
read_when: "post-cleanup architecture convergence, ranked refactor candidates, package/root boundary planning, Understand graph follow-up"
topic_hint:
  - "architecture refactor map"
  - "Understand graph"
  - "package root boundary"
  - "ranked refactor candidates"
  - "post-cleanup architecture convergence"
---

# Architecture Refactor Map — 2026-06-12

This map turns the refreshed whole-repo graph into bounded implementation
candidates. It is a lead map, not authority to delete public API.

Source snapshot:

- Git HEAD: `34d83a6d62f45cef93c7aec5823e3369d245e4b6`
- Graph mode: deterministic local refresh from `scan-project`, import map,
  tree-sitter structure extraction, and schema validation
- Files analyzed: 1425
- Nodes / edges: 4611 / 5232
- Import edges: 2046
- Layers / tour steps: 6 / 5
- Warnings: 10 oversized graph communities split by batcher; high-degree
  neighbor maps capped for `_shared.ts`, `src/toolkit/colony/schema.ts`, and
  `src/types.ts`; 462 orphan doc/config nodes

## Ranking Rules

Prefer candidates that:

- tighten the package/root ownership boundary
- keep package public exports stable
- have direct import or source proof
- can fit in one small PR with a focused check
- do not require live commands, wallet setup, provider auth, `--execute`,
  `--broadcast`, or spend

Reject candidates when the only evidence is line count, centrality, or stale
docs prose.

## 1. Package-Local Quality-Gate Boundary

Problem:

- Six package source files import `src/toolkit/publish/quality-gate.ts`
  directly.
- The imported helper is pure draft/readiness policy used by package-local
  draft helpers, not runtime wiring.
- This is a clean boundary candidate because it does not require touching
  wallet-backed write execution or public exports first.

Canonical owner:

- Package boundary adapter under `packages/omniweb-toolkit/src/`.

Affected surface:

- `packages/omniweb-toolkit/src/engagement-draft.ts`
- `packages/omniweb-toolkit/src/market-action.ts`
- `packages/omniweb-toolkit/src/market-draft.ts`
- `packages/omniweb-toolkit/src/reply-experiment.ts`
- `packages/omniweb-toolkit/src/research-draft.ts`
- `packages/omniweb-toolkit/src/research-draft-quality.ts`
- root provider: `src/toolkit/publish/quality-gate.ts`

Proof command:

```bash
rg -n "toolkit/publish/quality-gate" packages/omniweb-toolkit/src src tests
```

Expected PR size:

- Small. Add a package-local boundary module if it reduces direct root imports,
  then update the six package callers and focused tests.

Stop rule:

- Stop if the fix changes package public exports, runtime write semantics, or
  `checkPublishQuality` behavior. This cluster is import-boundary work only.

## 2. Package Write Subpath Root Runtime Imports

Problem:

- `packages/omniweb-toolkit/src/write.ts` imports and re-exports root write
  helpers directly from `src/toolkit/*`.
- This is public package surface and touches real DEM/write paths.

Canonical owner:

- Package write subpath plus root toolkit write primitives.

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

Expected PR size:

- Medium. Inventory-only first unless a package-local adapter can be introduced
  without widening or shrinking public exports.

Stop rule:

- Stop before behavior changes, live probes, or export removals. Any semantic
  write change needs its own bead and explicit validation plan.

## 3. Legacy Agent Loop Compatibility Export

Problem:

- `packages/omniweb-toolkit/src/agent.ts` still exposes root
  `runAgentLoop`, `defaultObserve`, and `buildColonyStateFromFeed` as legacy
  compatibility exports.
- Current doctrine says `colony-operator` is the maintained front door and
  legacy root-loop compatibility must not be presented as equal architecture.

Canonical owner:

- Package `./agent` subpath compatibility section.

Affected surface:

- `packages/omniweb-toolkit/src/agent.ts`
- `src/toolkit/agent-loop.ts`
- package docs that describe agent entrypoints

Proof command:

```bash
rg -n "runAgentLoop|defaultObserve|buildColonyStateFromFeed" packages/omniweb-toolkit/src packages/omniweb-toolkit/references tests
```

Expected PR size:

- Small to medium if documentation-only demotion.
- Larger and higher-risk if package exports change.

Stop rule:

- Do not remove or rename these exports without importer proof and package
  release-surface checks. If consumers still depend on them, preserve the
  compatibility export and only tighten docs/tests.

## 4. Minimal-Agent Residual Centrality

Problem:

- `packages/omniweb-toolkit/src/minimal-agent.ts` remains a high-degree file
  in the refreshed graph even after prior seam extraction.
- Existing architecture references still describe it as historically too broad,
  so the next question is whether current code is still overloaded or the docs
  are stale.

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

Expected PR size:

- Audit-sized first. Implementation only if a single responsibility band has
  source proof and focused test coverage.

Stop rule:

- Stop if the evidence is only graph centrality. Classify doc staleness versus
  real code overload before moving code.

## 5. Deprecated Root Shim Retirements

Problem:

- Several root `src/lib/*` and `src/reactive/*` files are deprecated shims over
  newer toolkit locations.
- Some may be dead after the cleanup lane, but importer proof is required.

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

Expected PR size:

- Small per shim family if importer proof is empty.

Stop rule:

- If any live importer remains, migrate that importer first or leave the shim.
  Do not delete a compatibility surface based on `@deprecated` alone.

## First Implementation Recommendation

Start with **Package-Local Quality-Gate Boundary**.

Reason:

- It is the highest-ranked candidate that is package-local, source-backed, and
  unlikely to touch public exports or live write behavior.
- It should reduce direct package-to-root imports without changing runtime
  semantics.
- It has a simple proof command and focused validation path.

Initial validation ladder:

```bash
rg -n "toolkit/publish/quality-gate" packages/omniweb-toolkit/src src tests
bunx vitest run tests/packages/research-draft.test.ts tests/packages/market-draft.test.ts
bun run --cwd packages/omniweb-toolkit check:codebase-reachability
bun run --cwd packages/omniweb-toolkit check:public-export-coverage
```
