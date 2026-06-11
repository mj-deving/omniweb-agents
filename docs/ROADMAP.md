---
type: roadmap
status: active
updated: 2026-06-11
summary: "One-page active strategy surface. Current lane: package/root readability cleanup sequencing."
topic_hint: ["roadmap", "next steps", "active strategy", "package/root cleanup", "helper extraction", "Understand refresh", "architecture map"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` was re-grounded at `b31b5091` on 2026-06-11 with no open GitHub PRs.
- The old post-`lng8` closeout lane is done and no longer the active queue:
  `omniweb-agents-a8q1` and `omniweb-agents-li6j` are closed.
- The current package/root cleanup band has already landed three merged PRs:
  `omniweb-agents-rglh` via PR #612, `omniweb-agents-33p9` via PR #613, and
  `omniweb-agents-u36h` via PR #614.
- The local Understand graph snapshot still points at
  `42bd41bf089340e535db1712c8e2f21909c89ad7`, so it is stale relative to
  current `main` and should be refreshed only after the next package helper
  extraction lands.
- Execution truth stays in Beads and GitHub. This file names the active order
  and boundaries; it is not the task ledger.

## Active Lane

**Package/root readability cleanup.**

The next band is no longer copied-bundle proof or post-`lng8` closeout. The
current lane is to finish the small package-local helper cleanup, refresh the
Understand graph against current code, then use that refreshed graph to publish
the concise architecture map before attempting a bounded consolidation.

## Ordered Queue

1. **Roadmap sync: active**
   - Bead: `omniweb-agents-nj8x`
   - Scope: docs-only update of this roadmap from live Beads + merged PR truth.

2. **Package-local `uniqueStrings` extraction: next**
   - Bead: `omniweb-agents-ah20`
   - Scope: package `src/` only; no root imports, no public export widening.

3. **Understand refresh after helper extraction**
   - Bead: `omniweb-agents-uu0r`
   - Scope: refresh local Understand graph after `ah20`; keep generated graph
     state local/untracked and record the outcome in Beads.

4. **Current architecture map**
   - Bead: `omniweb-agents-i713`
   - Scope: concise human/agent-readable map from the refreshed graph and
     current package/root ownership docs.

5. **First consolidation cluster**
   - Bead: `omniweb-agents-jypj`
   - Scope: one bounded consolidation or demotion after the refreshed graph and
     architecture map identify the best concrete cluster.

Current blocker chain:
`omniweb-agents-nj8x -> omniweb-agents-ah20 -> omniweb-agents-uu0r -> omniweb-agents-i713 -> omniweb-agents-jypj`

## Design Boundaries

- No live commands, no `--execute`, no wallet/provider setup, no provider auth,
  and no spend in this lane.
- Package helper cleanup stays package-local unless a later bead explicitly
  widens the ownership boundary with proof.
- Understand artifacts under `.understand-anything/` stay local analysis state;
  durable results belong in Beads plus tracked docs only when needed.
- Keep the active roadmap short. Put historical detail in archives, references,
  and PR history instead of rebuilding a task ledger here.

## Pointers

- Helper duplication audit:
  [packages/omniweb-toolkit/references/helper-duplication-audit-2026-06-11.md](../packages/omniweb-toolkit/references/helper-duplication-audit-2026-06-11.md)
- Package/root ownership map:
  [packages/omniweb-toolkit/references/whole-project-boundary-map.md](../packages/omniweb-toolkit/references/whole-project-boundary-map.md)
- Runtime/control map:
  [packages/omniweb-toolkit/references/control-map.md](../packages/omniweb-toolkit/references/control-map.md)
- Archived pre-trim roadmap:
  [docs/archive/roadmaps/roadmap-2026-05-25-pre-trim.md](archive/roadmaps/roadmap-2026-05-25-pre-trim.md)
- Repo state and branch policy:
  [docs/REPO-STATE.md](REPO-STATE.md)
