# Consolidation Residue Inventory - 2026-05-26

## Scope

Bead: `omniweb-agents-fyc1.1`

Branch: `codex/consolidation-residue-pr1`

Artifact purpose: inventory only. No cleanup. No branch deletion. No worktree deletion. No spend, live write, npm publish, public API mutation, or runtime promotion.

Timestamp: `2026-05-26T18:41:39+02:00`

Authoritative refs:

- `refs/remotes/origin/main`: `a0a2e197516e1cda56ae9698914a5506daae5222`
- PR1 worktree `HEAD`: `a0a2e197516e1cda56ae9698914a5506daae5222`
- PR1 worktree status before this artifact: clean against `remotes/origin/main`

## Starting Premise

Before creating the audit epic:

- `bd ready --json`: `0`
- `bd list --status=in_progress --json`: `0`
- open GitHub PRs: `0`
- blocked/deferred Beads total: `48`
- root checkout: dirty; read-only for this lane

After creating and claiming the audit lane:

- `bd ready --json`: `1`
- ready item: parent epic `omniweb-agents-fyc1`
- `bd list --status=in_progress --json`: `1`
- in-progress item: `omniweb-agents-fyc1.1`
- `bd list --status=deferred --json`: `44`
- `bd list --status=blocked --json`: `4`
- open GitHub PRs: `0`

## Root Checkout State

Command:

```bash
git status -sb
```

Observed:

- branch: `codex/eval-drafts-rubric`
- upstream: `origin/codex/eval-drafts-rubric`
- divergence: ahead `20`, behind `40`
- modified/staged-ish tracked paths: `1`
- untracked paths: `43`
- total porcelain entries: `44`

Tracked dirty path:

- `.gitignore`

Conclusion:

- root checkout remains coordination/read-only for this lane
- all tracked artifact work belongs in clean worktrees based on `refs/remotes/origin/main`

## Git Residue Counts

Commands:

```bash
git worktree list --porcelain | awk '/^worktree /{c++} END{print c+0}'
git branch --format='%(refname:short)' | wc -l
git branch -r --format='%(refname:short)' | wc -l
git branch -vv | rg '\[.*: gone\]' | wc -l
git branch --no-merged refs/remotes/origin/main --format='%(refname:short)' | wc -l
git branch --merged refs/remotes/origin/main --format='%(refname:short)' | wc -l
```

Observed after creating the PR1 worktree:

- worktrees: `306`
- local branches: `515`
- remote branches: `296`
- local branches with gone upstreams: `163`
- local branches not ancestor-merged into `refs/remotes/origin/main`: `439`
- local branches ancestor-merged into `refs/remotes/origin/main`: `76`

Adjustment note:

- subtract `1` from worktrees and local branches to compare with the pre-PR1 suspicion: PR1 added `consolidation-residue-pr1` and branch `codex/consolidation-residue-pr1`
- adjusted baseline: `305` worktrees, `514` local branches

Recent branch sample:

```text
codex/consolidation-residue-pr1 -> a0a2e197, tracks remotes/origin/main
codex/ipfs-escrow-refresh-pr4 -> 7682c287, gone upstream
codex/ipfs-escrow-refresh-pr2 -> 808d0ab5, gone upstream
codex/ipfs-escrow-refresh-pr1 -> 4d334e3a, gone upstream
codex/demoswork-xm-rubic-pr4 -> c96ab9c3, gone upstream
codex/demoswork-xm-rubic-pr3 -> e24123a3, gone upstream
codex/demoswork-xm-rubic-pr2 -> e0a02437, gone upstream
codex/demoswork-xm-rubic-pr1 -> 7ab5d5a3, gone upstream
codex/storage-no-spend-pr4 -> c50e281c, gone upstream
codex/storage-no-spend-pr3 -> ad3a6f9b, gone upstream
```

## GitHub PR State

Command:

```bash
gh pr list --repo mj-deving/omniweb-agents --state open --json number,title,headRefName,baseRefName,updatedAt
```

Observed:

- open PR count: `0`
- raw JSON: `[]`

## Beads State

Commands:

```bash
bd ready --json | jq 'length'
bd list --status=in_progress --json | jq 'length'
bd list --status=deferred --json | jq 'length'
bd list --status=blocked --json | jq 'length'
bd dep cycles --json
```

Observed after epic creation:

- ready count: `1`
- in-progress count: `1`
- deferred count: `44`
- blocked count: `4`
- dependency cycles: `[]`

Audit graph created:

- parent: `omniweb-agents-fyc1`
- PR1: `omniweb-agents-fyc1.1`
- PR2: `omniweb-agents-fyc1.2`
- PR3: `omniweb-agents-fyc1.3`
- PR4: `omniweb-agents-fyc1.4`
- dependency order: `fyc1.1` blocks `fyc1.2`; `fyc1.2` blocks `fyc1.3`; `fyc1.3` blocks `fyc1.4`

## Origin/Main Roadmap Truth

Command:

```bash
git show refs/remotes/origin/main:docs/ROADMAP.md | sed -n '1,90p'
```

Observed front matter:

- type: `roadmap`
- status: `active`
- updated: `2026-05-25`
- summary: one-page active strategy surface; historical proof ladders in archive/package references; Beads/GitHub remain execution truth

Current truth bullets:

- `main` has completed full OmniWeb endpoint reconciliation, 0ctx/sc96/9st0/04c5 hardening, xqlb cleanup, g2iv self-audit, fcui raw-transfer unit closeout, storage no-spend ergonomics, and DemosWork/XM/Rubic import-boundary proof
- raw DEM transfer remains integer DEM only; installed-runtime base-unit payload support is not proven
- DemosWork, XM, and Rubic remain raw-only package surfaces; blocked or design-needed
- maintained proof posture is read-first and no-spend by default
- future live writes need a fresh explicit packet with budget, wallet/agent target, command, mutation evidence, product readback criteria, and stop rules
- `omniweb-toolkit` is the primary package authority
- colony-operator mirror is re-entry mirror, not a second roadmap

Active product hardening order:

- storage no-spend ergonomics: complete
- DemosWork / XM / Rubic import-boundary proof: complete
- IPFS / escrow: no active implementation lane; revisit only with new concrete official-doc, SDK/API, import-stability, quote/readback, or product-readback evidence

Explicit not-next items:

- no runtime/code/API cleanup in architecture-trim lane
- no npm publish, public registry claim, or production hosted activation without explicit release authorization
- no mainnet spend, wallet mutation, or live broadcast from roadmap reset
- no new broad architecture ladder appended to active roadmap
- no duplicate control-plane concepts when package authority/archive link is enough

## PR2 Input

PR2 should start from:

```bash
git branch --no-merged refs/remotes/origin/main --format='%(refname:short)'
for b in $(git branch --no-merged refs/remotes/origin/main --format='%(refname:short)'); do
  git cherry refs/remotes/origin/main "$b"
done
```

Required classification buckets:

- `merged-via-squash`
- `obsolete-duplicate`
- `unique-salvage-candidate`
- `private/local-artifact`
- `unsafe-to-touch`

Stop rules:

- do not delete local branches
- do not delete worktrees
- do not revive stale product lanes from branch names alone
- salvage only when branch/path evidence is unique against `refs/remotes/origin/main`
