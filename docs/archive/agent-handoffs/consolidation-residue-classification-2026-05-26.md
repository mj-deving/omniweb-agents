# Consolidation Residue Classification - 2026-05-26

## Scope

Bead: `omniweb-agents-fyc1.2`

Branch: `codex/consolidation-residue-pr2`

Base: `refs/remotes/origin/main` at `e94225686f1825fcf372b0cb7a9a6c3057ba1d4a`

Purpose: classify local branch/worktree residue before cleanup. No deletion performed.

## Commands

Branch scan:

```bash
tmp=/tmp/consolidation-pr2-branches.tsv
: > "$tmp"
for b in $(git branch --no-merged refs/remotes/origin/main --format='%(refname:short)'); do
  plus=$(git cherry refs/remotes/origin/main "$b" 2>/dev/null | awk '$1=="+"{c++} END{print c+0}')
  minus=$(git cherry refs/remotes/origin/main "$b" 2>/dev/null | awk '$1=="-"{c++} END{print c+0}')
  files=$(git diff --name-only refs/remotes/origin/main..."$b" 2>/dev/null | wc -l)
  date=$(git log -1 --format=%cs "$b" 2>/dev/null || true)
  subject=$(git log -1 --format=%s "$b" 2>/dev/null || true)
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$b" "$date" "$plus" "$minus" "$files" "$subject" >> "$tmp"
done
```

Summary commands:

```bash
awk -F '\t' 'BEGIN{branches=0; plusBranches=0; noPlus=0; filesZero=0} {branches++; if ($3+0>0) plusBranches++; else noPlus++; if ($5+0==0) filesZero++} END{print "branches="branches; print "with_plus="plusBranches; print "without_plus="noPlus; print "zero_diff_files="filesZero}' /tmp/consolidation-pr2-branches.tsv
awk -F '\t' '$2 >= "2026-05-25" {count++; if ($3+0>0) plus++; else noplus++} END{print "recent="count; print "recent_with_plus="plus+0; print "recent_without_plus="noplus+0}' /tmp/consolidation-pr2-branches.tsv
```

## Counts

Current post-PR2-worktree counts:

- worktrees: `307`
- local branches: `516`
- open GitHub PRs: `0`
- local branches not ancestor-merged into `refs/remotes/origin/main`: `440`
- local branches ancestor-merged into `refs/remotes/origin/main`: `76`

Patch-equivalence scan:

- scanned not-ancestor-merged local branches: `440`
- `git cherry` with no `+` commits: `240`
- `git cherry` with one or more `+` commits: `200`
- zero-diff branches among scanned set: `0`

Recent May 25-26 slice:

- recent local branches in scan: `38`
- recent branches with no `+` commits: `32`
- recent branches with `+` commits: `6`

## Classification Rules

`merged-via-squash`:

- `git cherry refs/remotes/origin/main <branch>` returns only `-` commits
- no open PR exists
- branch is local residue from an already-merged squash PR
- cleanup may be safe later, but not in this lane

`obsolete-duplicate`:

- branch still has `+` commits, but GitHub shows the head branch already merged
- diff overlaps a newer merged mainline outcome or roadmap-trim truth
- no unique current successor is proven from branch/path evidence

`unique-salvage-candidate`:

- branch has `+` commits
- branch diff contains a still-useful change not present on `refs/remotes/origin/main`
- branch has current Beads/roadmap authority or clear path evidence
- result in this pass: none proven

`private/local-artifact`:

- root untracked artifact dirs/files and worktree-local scratch state
- not suitable for PR or cleanup without owner-specific approval

`unsafe-to-touch`:

- branch has `+` commits and no recent merged-PR proof in this pass
- branch predates the current roadmap reset or belongs to a historical/live-write family
- no cleanup authorized; defer branch-by-branch salvage/closure to successor beads only if PR3 finds live backlog authority

## Recent May 25-26 Branches

Classified as `merged-via-squash`:

- `codex/04c5-1-truth-sync`: cherry `-`; patch-equivalent to main
- `codex/04c5-2-demos-source-map`: cherry `-`; patch-equivalent to main
- `codex/04c5-3-storage-ipfs-escrow`: cherry `-`; patch-equivalent to main
- `codex/classify-shipped-scripts`: cherry `-`; patch-equivalent to main
- `codex/classify-skill-self-audit-gate`: cherry `-`; patch-equivalent to main
- `codex/complete-reference-frontmatter`: cherry `-`; patch-equivalent to main
- `codex/consolidation-residue-pr1`: PR #569 merged; cherry `-`
- `codex/dead-supercolony-toolkit-name-cleanup`: cherry `-`; patch-equivalent to main
- `codex/demoswork-xm-rubic-pr1`: PR #562 merged; cherry `-`
- `codex/demoswork-xm-rubic-pr2`: PR #563 merged; cherry `-`
- `codex/demoswork-xm-rubic-pr3`: PR #564 merged; cherry `-`
- `codex/demoswork-xm-rubic-pr4`: PR #565 merged; cherry `-`
- `codex/document-shipped-script-help`: cherry `-`; patch-equivalent to main
- `codex/escrow-existing-tx-readback-hardening`: cherry `-`; patch-equivalent to main
- `codex/fix-registry-reference-links`: cherry `-`; patch-equivalent to main
- `codex/ipfs-escrow-refresh-pr1`: PR #566 merged; cherry `-`
- `codex/ipfs-escrow-refresh-pr2`: PR #567 merged; cherry `-`
- `codex/ipfs-escrow-refresh-pr4`: PR #568 merged; cherry `-`
- `codex/legacy-openclaw-bundle-decision`: cherry `-`; patch-equivalent to main
- `codex/next-product-hardening-decision`: cherry `-`; patch-equivalent to main
- `codex/raw-transfer-preview-units`: cherry `-`; patch-equivalent to main
- `codex/raw-transfer-unit-closeout`: cherry `-`; patch-equivalent to main
- `codex/raw-transfer-unit-evidence`: cherry `-`; patch-equivalent to main
- `codex/readme-architecture-trim`: cherry `-`; patch-equivalent to main
- `codex/readme-fireworks-visuals`: cherry `-`; patch-equivalent to main
- `codex/reconcile-bun-command-policy`: cherry `-`; patch-equivalent to main
- `codex/roadmap-closeout-after-04c5`: cherry `-`; patch-equivalent to main
- `codex/roadmap-reset-mirror-closeout`: cherry `-`; patch-equivalent to main
- `codex/storage-no-spend-pr1`: PR #558 merged; cherry `-`
- `codex/storage-no-spend-pr2`: PR #559 merged; cherry `-`
- `codex/storage-no-spend-pr3`: cherry `-`; patch-equivalent to main
- `codex/storage-no-spend-pr4`: cherry `-`; patch-equivalent to main

Classified as `obsolete-duplicate`:

- `codex/04c5-4-xm-rubic-demoswork`: PR #535 merged; diff still shows package reference files, but current roadmap says DemosWork/XM/Rubic proof is complete and raw-only
- `codex/04c5-5-readiness-evidence-model`: PR #536 merged; diff overlaps readiness evidence model and registry export surfaces already superseded by current package references
- `codex/04c5-6-next-hardening-lane`: PR #537 merged; current roadmap has moved to no active IPFS/escrow lane without new evidence
- `codex/clean-stale-script-aliases`: PR #541 merged; residual diff overlaps script/package cleanup already integrated or superseded
- `codex/reduce-package-reference-surface-6tn0`: PR #543 merged; residual diff overlaps package reference-surface trim already integrated or superseded
- `codex/roadmap-reset-active`: PR #555 merged; residual diff overlaps active-roadmap reset already on main

Recent slice result:

- unique salvage candidates: `0`
- private/local artifacts: `0` branch-level items; root untracked artifacts remain private/local outside PR2
- unsafe-to-touch: `0` recent items after GitHub merged-PR checks

## Spot Checks

Patch-equivalent spot checks, all `git cherry` `-` and matching merged PR history:

- `codex/consolidation-residue-pr1`: PR #569 merged
- `codex/demoswork-xm-rubic-pr1`: PR #562 merged
- `codex/demoswork-xm-rubic-pr2`: PR #563 merged
- `codex/demoswork-xm-rubic-pr3`: PR #564 merged
- `codex/demoswork-xm-rubic-pr4`: PR #565 merged
- `codex/ipfs-escrow-refresh-pr1`: PR #566 merged
- `codex/ipfs-escrow-refresh-pr2`: PR #567 merged
- `codex/ipfs-escrow-refresh-pr4`: PR #568 merged
- `codex/storage-no-spend-pr1`: PR #558 merged
- `codex/storage-no-spend-pr2`: PR #559 merged

Residual-plus spot checks, all already merged and obsolete by current main/roadmap truth:

- `codex/04c5-4-xm-rubic-demoswork`: PR #535 merged
- `codex/04c5-5-readiness-evidence-model`: PR #536 merged
- `codex/04c5-6-next-hardening-lane`: PR #537 merged
- `codex/clean-stale-script-aliases`: PR #541 merged
- `codex/reduce-package-reference-surface-6tn0`: PR #543 merged
- `codex/roadmap-reset-active`: PR #555 merged

## Older Plus-Commit Branches

The remaining `194` plus-commit branches are classified as `unsafe-to-touch` for cleanup purposes in this lane.

Reason:

- they have real patch deltas against current `refs/remotes/origin/main`
- they are older than the May 25-26 consolidation window
- open PR count is `0`
- the active roadmap says execution truth is Beads/GitHub, active strategy is trimmed, and no product/runtime/live-write lane should be revived from branch names alone
- PR3 must reconcile deferred/blocked Beads before any older branch is promoted to a successor task

Observed family clusters among plus-commit branches:

- `claude/*`: 14
- repeated April `docs(gotchas): TLSN section v3` descendants: multiple branches with same head subject and 19 plus commits
- live/write/research proof branches from April
- old toolkit/runtime hardening branches from April
- isolated worktree-agent branches
- old IPFS/escrow/storage/readiness candidate branches outside the current active roadmap

Result:

- no older branch is approved for deletion
- no older branch is promoted as salvage in PR2
- PR3 backlog triage is the next authority check

## Worktree Classification

Worktree-level result:

- worktrees tied to `git cherry` no-plus branches: cleanup candidates later, not now
- worktrees tied to recent obsolete-duplicate branches: cleanup candidates later, not now
- worktrees tied to older plus branches: unsafe-to-touch until a successor bead cites exact branch/path evidence
- active audit worktrees `consolidation-residue-pr1` and `consolidation-residue-pr2`: keep until lane closeout
- root untracked artifact directories/files: private/local-artifact; not touched

## Decision

PR2 finds no proven `unique-salvage-candidate`.

Next lane:

- PR3 should triage the `44` deferred and `4` blocked Beads against `refs/remotes/origin/main`
- if PR3 finds a live backlog item that maps to an older plus-commit branch, create a narrow successor bead with exact branch/path evidence
- otherwise keep older plus-commit branches classified as unsafe-to-touch and let PR4 produce cleanup commands only
