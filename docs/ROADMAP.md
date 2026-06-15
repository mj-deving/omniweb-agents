---
type: roadmap
status: active
updated: 2026-06-15
summary: "One-page active strategy surface. Current lane: roadmap-driven architecture refactors."
topic_hint: ["roadmap", "next steps", "active strategy", "architecture refactor roadmap", "atlas", "refactor map"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` is re-grounded at `ebdf330e` on 2026-06-15 after the architecture
  atlas landed in PR #625.
- The graph and roadmap cluster is complete enough to drive the next lane:
  roadmap sync in PR #622, ranked refactor map in PR #623, package-local
  quality-gate boundary in PR #624, and architecture atlas in PR #625.
- Active strategy now lives in
  [Architecture Refactor Roadmap](architecture-refactor-roadmap.md).
- Execution truth stays in Beads and GitHub. This file points to the active
  strategic surface; it is not the task ledger.

## Active Lane

**Roadmap-driven architecture refactors.**

Use the architecture refactor roadmap to choose the next bounded lane, then keep
implementation work in Beads. Do not start broad source edits from graph
centrality alone. Every code PR needs fresh importer proof, a stop rule, and the
smallest meaningful validation ladder.

## Ordered Lanes

See [Architecture Refactor Roadmap](architecture-refactor-roadmap.md) for the
stable lane plan:

1. Package write subpath root-runtime import inventory.
2. Package write boundary adapter/refactor, only if inventory proves a safe move.
3. Legacy `./agent` compatibility export demotion, docs/tests first.
4. Minimal-agent overload audit, implementation only after source proof.
5. Deprecated root shim cleanup, one shim family per PR after empty importer proof.

Parent Beads epic: `omniweb-agents-s993`.

## Design Boundaries

- No live commands, no `--execute`, no wallet/provider setup, no provider auth,
  and no spend in this lane.
- Understand artifacts under `.understand-anything/` stay local analysis state;
  durable results belong in Beads plus tracked docs only when needed.
- The refactor map must name a problem, canonical owner, affected surface, proof
  command, expected PR size, and stop rule for every ranked candidate.
- Any removal or demotion needs importer proof. If importer proof shows a surface
  is live, reclassify or migrate first instead of deleting.
- Package exports remain controlled by `packages/omniweb-toolkit/package.json`
  and the package public-export checks.
- Keep the active roadmap short. Put historical detail in archives, references,
  and PR history instead of rebuilding a task ledger here.

## Pointers

- Architecture control map:
  [docs/architecture-control-map.md](architecture-control-map.md)
- Package/root ownership map:
  [packages/omniweb-toolkit/references/whole-project-boundary-map.md](../packages/omniweb-toolkit/references/whole-project-boundary-map.md)
- Runtime/control map:
  [packages/omniweb-toolkit/references/control-map.md](../packages/omniweb-toolkit/references/control-map.md)
- Package public surface:
  [packages/omniweb-toolkit/package.json](../packages/omniweb-toolkit/package.json)
- Repo state and branch policy:
  [docs/REPO-STATE.md](REPO-STATE.md)
