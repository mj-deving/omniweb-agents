---
type: roadmap
status: active
updated: 2026-06-12
summary: "One-page active strategy surface. Current lane: post-cleanup architecture convergence."
topic_hint: ["roadmap", "next steps", "active strategy", "architecture convergence", "Understand refresh", "refactor map"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` is re-grounded at `d0a170a3` on 2026-06-12 with no open GitHub PRs at lane creation time.
- The package/root cleanup band is no longer the active queue. It landed through
  helper extraction, stale support-surface retirement, source-barrel retirement,
  and the boundary type-import cap:
  PR #616, PR #618, PR #619, plus commits `ff6ce8a1` and `d0a170a3`.
- The local Understand graph snapshot still points at
  `dd8151e99a69382b89f9319c1ad30b35bb4cf4dd`, so it is stale relative to
  current `main`.
- Execution truth stays in Beads and GitHub. This file names the active order
  and boundaries; it is not the task ledger.

## Active Lane

**Post-cleanup architecture convergence.**

The next lane is to refresh the roadmap after cleanup closeout, rebuild the
whole-repo Understand graph at current `main`, turn graph evidence into a ranked
architecture refactor map, then implement only the first proven bounded cluster.

Do not start a broad refactor from stale graph output. Use the refreshed graph as
a lead generator, then prove each candidate against source imports, package
exports, checks, and architecture docs before changing code.

## Ordered Queue

1. **Roadmap sync: active**
   - Bead: `omniweb-agents-yctp`
   - Scope: docs-only update of this roadmap from live Beads, GitHub, and graph metadata truth.

2. **Whole-repo Understand refresh**
   - Bead: `omniweb-agents-au3k`
   - Scope: refresh local graph at current `main`; keep `.understand-anything/`
     artifacts local/untracked and record graph metadata in Beads.

3. **Ranked architecture refactor map**
   - Bead: `omniweb-agents-19d8`
   - Scope: classify only source-backed candidates: package/root boundary drift,
     duplicate concepts, stale compatibility surfaces, docs/code mismatch, and
     public-export drift.

4. **First proven convergence cluster**
   - Bead: `omniweb-agents-xfs2`
   - Scope: one bounded code/docs/checks PR from the top-ranked cluster. No
     public API widening; create follow-up beads for anything outside the first
     cluster.

Current blocker chain:
`omniweb-agents-yctp -> omniweb-agents-au3k -> omniweb-agents-19d8 -> omniweb-agents-xfs2`

Parent epic:
`omniweb-agents-f6f0`

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
