---
type: goal-launch
status: ready
created: 2026-05-16
source_contract: docs/WRITE_LIFECYCLE_GOAL_BRIEF.md
master_prd: docs/WRITE_LIFECYCLE_MASTER_PRD.md
owner_bead: omniweb-agents-zg11
---

# Write Lifecycle GoalMode Launch Prompt

## Preflight

Run from a clean worktree:

```bash
codex features list | grep -E "^goals\s"
git status --short --branch
gh pr view 409 --json state,mergeStateStatus,headRefOid,statusCheckRollup
bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/WRITE_LIFECYCLE_GOAL_BRIEF.md docs/WRITE_LIFECYCLE_MASTER_PRD.md
npx tsc --noEmit --pretty false
npm --prefix packages/omniweb-toolkit run check:verification-matrix
```

Launch only after PR #409 is merged, or explicitly keep this branch as the base.

## Copy/Paste Prompt

```text
/goal Complete docs/WRITE_LIFECYCLE_MASTER_PRD.md against docs/WRITE_LIFECYCLE_GOAL_BRIEF.md without stopping until the §11 definition of done is satisfied, or until the same blocker fails three times and a STUCK note is written in §13.

Read first:
- CLAUDE.md
- AGENTS.md
- packages/omniweb-toolkit/AGENTS.md
- docs/WRITE_LIFECYCLE_GOAL_BRIEF.md
- docs/WRITE_LIFECYCLE_MASTER_PRD.md
- docs/ROADMAP.md
- packages/omniweb-toolkit/references/uw66.6-agentic-memo-bet-readback-2026-05-16.md
- packages/omniweb-toolkit/references/write-surface-sweep.md
- packages/omniweb-toolkit/references/verification-matrix.md
- packages/omniweb-toolkit/references/launch-proving-matrix.md

Before implementation:
- Verify whether PR #409 is merged. If it is not merged, continue only if this worktree is intentionally based on codex/official-bet-path.
- Run bd dolt pull || true.
- Inspect bd show omniweb-agents-zg11 --json.
- Create/claim child beads under omniweb-agents-zg11 for coherent implementation slices.

Stable anchors:
- AC-1 lifecycle vocabulary
- AC-2 pending-write store
- AC-3 publish/reply/VOTE lifecycle integration
- AC-4 tip/reaction lifecycle integration
- AC-5 BET fixed-price and higher/lower lifecycle model
- AC-6 proof packets
- AC-7 docs/matrix/roadmap sync
- AC-8 final lifecycle validation

Rules:
- Work checkpoint by checkpoint, but do not stop after AC-1; continue until all AC-1 through AC-8 are closed or STUCK.
- Keep live spend behind explicit --execute or --broadcast and within launch-proving-matrix budgets.
- Prefer no-spend delayed rechecks of existing tx hashes over new live writes.
- Do not use browser wallet/provider behavior as agentic proof.
- Do not declare failure solely from a short readback timeout; classify pending-chain, pending-indexer, indexed, resolved, degraded, expired, or failed.
- Do not store secrets in lifecycle records or proof packets.
- Do not add new write families or reopen the PolicyActionRequest seam.
- After each meaningful code change, run npx tsc --noEmit --pretty false and the focused test for touched code.
- When an anchor is complete, mark its §9 checkbox and append a §13 note with command/evidence.
- Commit coherent slices and push branches/Beads state as work lands.
- If the same blocker fails three times, write a STUCK note in §13 naming the anchor, attempts, and needed input, then pause.

Done means:
- every §9 anchor is complete with evidence
- PrdSpecificityGate passes
- npx tsc --noEmit --pretty false exits 0
- focused tests for touched code exit 0
- npm --prefix packages/omniweb-toolkit run check:package exits 0
- npm --prefix packages/omniweb-toolkit run check:evals exits 0
- npm --prefix packages/omniweb-toolkit run check:verification-matrix exits 0
- npm --prefix packages/omniweb-toolkit run check:live exits 0
- npm --prefix packages/omniweb-toolkit run check:live:detailed exits 0
- AC-8 final lifecycle validation is recorded with command, proof packet, and spend/no-spend status
- §13 contains a completion report with changed files, commits, PRs, and verification output
```
