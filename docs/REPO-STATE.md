# REPO-STATE — Canonical Repo, Branch/Worktree Inventory & Trunk Policy

> Owner: CTO · Ticket: OMN-2 (Trunk & Governance Reset) · Generated: 2026-06-02
> This document is the source of truth for the canonical repo, its branch/worktree
> disposition, and the trunk + branching policy. It is enforced going forward.

## 1. Canonical Repository (confirmed)

| Field | Value |
|-------|-------|
| Canonical local path | `/home/mj/projects/demos-agents` |
| Remote (`origin`) | `https://github.com/mj-deving/omniweb-agents.git` |
| Shipping package | `packages/omniweb-toolkit` |
| Trunk | `origin/main` (single trunk) |
| Trunk tip @ generation | `95ab8673` — `refactor: split research evidence source helpers (#591)` (2026-06-02) |
| Trunk protection (origin) | **active** — PR required, deletion + non-fast-forward blocked, review threads must resolve, required workflow `.github/workflows/validate-plugin.yml` |
| Open PRs | **0** |

**Confirmation method:** `git remote -v` (origin → omniweb-agents.git), `git log origin/main`,
`gh api repos/mj-deving/omniweb-agents/branches/main` → `protected: true`. The repo folder is
named `demos-agents`; the GitHub repo is `omniweb-agents`; the installable package is
`omniweb-toolkit`. All three refer to the same canonical unit. **No missing credentials —
no CEO escalation required for repo location.**

**Project workspace:** connected this ticket as the project's **primary** workspace
(`cwd=/home/mj/projects/demos-agents`, `repoUrl=…/omniweb-agents.git`, `defaultRef=main`).

## 2. State of Trunk & Working Copy (the problem this resets)

- **Primary checkout is off-trunk and dirty.** `/home/mj/projects/demos-agents` is on feature
  branch `codex/eval-drafts-rubric` (ahead 20 / behind 40 of its own remote), with ~26
  modified/untracked paths and **5 stashes** (one labeled "pre-rebase parking"). Other
  sessions are mid-flight here — surgery on this tree is deferred, not done blind.
- **Local `main` is 360 commits behind `origin/main`** (0 ahead). Last local-main commit
  2026-04-27; trunk is 2026-06-02. The local mirror is stale, not divergent → fast-forward only.
- **Rogue local branch literally named `origin/main`** existed (`refs/heads/origin/main` @ old
  tip `30b06c22`), causing `warning: refname 'origin/main' is ambiguous` on every git op.
  **Pruned this ticket** (see §5).
- **Sprawl:** 536 local + 296 remote branches, **0 open PRs**. The pattern is: PRs merged,
  branches never deleted.

## 3. Branch Inventory

Baseline at generation (excludes the transient `docs/repo-state-omn2` doc branch created for
this PR): **536 local heads, 296 remote heads.**

### 3a. By age (last commit) — the headline

| Age bucket | Local | Remote |
|------------|------:|-------:|
| ≤ 7 days   |   31  |    1   |
| 8–14 days  |  115  |    1   |
| 15–30 days |   41  |   28   |
| **> 30 days (dead)** | **350** | **266** |

With **0 open PRs**, every branch older than the trunk merge that absorbed it is dead weight.

### 3b. By namespace + disposition

| Namespace | Local | Remote | Disposition | Rationale |
|-----------|------:|-------:|-------------|-----------|
| `codex/*` | 383 | 166 | **prune** (merged → now; unmerged → OMN-7) | Agent PR branches; merged ones are in trunk, rest are dead experiments (0 open PRs). |
| `worktree-agent-*` | 38 | 0 | **prune now** | Ephemeral per-agent scratch branches; 35 already merged into trunk, zero work lost. |
| `gregor/*` | 0 | 30 | **prune** (OMN-7, CEO ack) | Remote-only legacy author branches, all > 14 days, 0 open PRs. |
| `claude/*` | 17 | 16 | **prune** (OMN-7) | Agent analysis/audit branches, merged or dead. |
| `openclaw/*` | 0 | 8 | **prune** (OMN-7, CEO ack) | Remote-only proof/preflight branches, all > 30 days. |
| `xiih-*`, `ez4*`, `nkw*`, `repair-pr*`, `omniweb-agents-*`, misc | ~98 | ~76 | **prune** (OMN-7) | One-off experiment/proof lanes, 0 open PRs. |
| `main` | 1 | 1 | **keep** | Trunk. Local mirror fast-forwarded to `origin/main` under OMN-7. |
| `codex/eval-drafts-rubric` | 1 (checked out) | 1 | **convert-to-ticket** (OMN-7) | Current dirty primary checkout, ahead 20 unpushed. Audit → land or abandon, then move checkout to `main`. |
| `origin/main` (rogue local) | — | — | **PRUNED this ticket** | Mis-named local branch; caused ambiguous-ref warnings. |

### 3c. Merge status vs trunk (drives the safe-prune set)

- **73 local branches are fully merged into `origin/main`** → zero-loss to delete (35
  `worktree-agent-*` + 38 others). Exact list: ticket OMN-7 attachment `merged-local-safe-prune.txt`.
- **460 local branches are NOT merged into trunk** → audit-then-prune (attachment
  `unmerged-local.txt`). With 0 open PRs and 350 of them > 30 days, the default is prune.
- **296 remote branches** (attachment `remote-branches.txt`) → prune campaign with CEO ack,
  because remote deletion is high-blast-radius / harder to reverse.

## 4. Worktree Inventory

Git-registered worktrees (`git worktree list`): **2 valid, 0 prunable** (`git worktree prune
--dry-run` is empty).

| Path | Branch | Last active | Disposition | Rationale |
|------|--------|-------------|-------------|-----------|
| `/home/mj/projects/demos-agents` | `codex/eval-drafts-rubric` | live | **keep** | THE primary checkout / connected workspace. Move onto `main` per policy (OMN-7). |
| `/home/mj/projects/demos-agents-worktrees/nkw19-delayed-verdict` | `main` | 2026-04-27 | **prune (worktree)** | Stale; pins the stale local `main`. Remove worktree under OMN-7. |
| `/home/mj/projects/demos-agents-worktrees/omn2-repo-state` | `docs/repo-state-omn2` | live | **transient** | Created for this doc PR; removed on merge. |

On-disk directories under the worktree roots that are **not** git-registered worktrees (leftover
output/archive — safe filesystem cleanup, OMN-7):

- `demos-agents-worktrees/architecture-map-output` — build output, not a worktree → **prune**
- `demos-agents-worktrees/demos-agents-worktrees` — accidental nested dir → **prune**
- `demos-agents-worktree-archive/2026*` (3 timestamped) — explicit archive → **keep ≤ 14 days, then prune**
- `.claude/worktrees/agent-a2325e5d` — Claude agent scratch → **prune**

**Stashes:** 5 present on the primary checkout, owners unknown. **Do not drop** — audit and
attribute under OMN-7 before any reset of the primary checkout.

## 5. Actions Taken This Ticket vs. Ticketed Follow-up

**Done now (safe, isolated, reversible):**
- Confirmed canonical repo + connected it as the project's primary workspace.
- Fetched latest trunk; produced this inventory.
- Pruned the rogue `refs/heads/origin/main` local branch (ended the ambiguous-ref warnings).
- Landed this document to trunk via PR `docs/repo-state-omn2`.

**Deferred to follow-up ticket OMN-7 (deliberately not done blind on an actively-dirty repo):**
- Delete the 73 merged-into-trunk local branches (zero-loss).
- Fast-forward local `main` to `origin/main`; move the primary checkout off
  `codex/eval-drafts-rubric` onto `main` (after auditing its 20 unpushed commits + 5 stashes).
- Audit-then-prune the 460 unmerged local branches and 296 remote branches (remote deletion
  gated on CEO acknowledgment).
- Filesystem cleanup of the non-worktree leftover directories and the stale `nkw19` worktree.

Rationale for deferral: the primary checkout has unpushed work, untracked files, and 5
stashes from other in-flight sessions. Mass branch/worktree surgery while the tree is hot is
high blast radius. OMN-7 executes it when the repo is quiescent, with exact target lists attached.

## 6. Trunk & Branching Policy (enforced going forward)

1. **Single trunk: `main`.** It is always green and the package is always installable from a
   clean checkout of `main`. No second long-lived integration branch.
2. **Trunk is protected.** No direct pushes. All changes land via Pull Request into `main`.
   Required: the trunk CI workflow passes (see OMN-6) and all review threads are resolved.
   Force-push and branch deletion on `main` are forbidden.
3. **Branch naming:** `<type>/<short-slug>` where `type ∈ {feat, fix, docs, refactor, chore,
   test}`. Example: `feat/public-api-manifest`, `docs/repo-state-omn2`. Agent-scratch and
   per-author prefixes (`codex/*`, `gregor/*`, `worktree-agent-*`, bare slugs) are **retired** —
   not created going forward.
4. **One branch = one PR = one ticket.** Every branch maps to an open PR and a tracking issue.
   A branch with no open PR and no ticket is sprawl by definition.
5. **Max branch age: 14 days.** A branch must merge to `main` or be closed/deleted within 14
   days of its first commit. Branches > 14 days with no open PR are pruned on sight.
6. **Merge-to-trunk rule:** squash-merge by default (one logical change = one trunk commit);
   `merge`/`rebase` allowed when preserving history matters. **Delete the source branch on
   merge** (local and remote) — this is the rule whose absence created this sprawl.
7. **Worktrees:** allowed for parallel work, created only under
   `/home/mj/projects/demos-agents-worktrees/<branch-slug>`, one per active branch, removed
   (`git worktree remove`) when its branch merges. No worktree outlives its branch. No nested
   worktree roots, no build output parked under the worktree root.
8. **Local `main` stays a pure mirror** of `origin/main` (fast-forward only, never committed to
   directly).

---

*Maintenance: regenerate §3–§4 counts after the OMN-7 prune campaign and on any future
branch-hygiene audit. The policy (§6) is stable and changes only by CTO decision.*
