# REPO-STATE — Canonical Repo, Branch/Worktree Inventory & Trunk Policy

> Owner: CTO · Ticket: OMN-2 (Trunk & Governance Reset) · Generated: 2026-06-02
> This document is the source of truth for the canonical repo, its branch/worktree
> disposition, and the trunk + branching policy. It is enforced going forward.

## 1. Canonical Repository (confirmed)

| Field | Value |
|-------|-------|
| Canonical local path | `/home/USER/projects/demos-agents` |
| Remote (`origin`) | `https://github.com/mj-deving/omniweb-agents.git` |
| Shipping package | `packages/omniweb-toolkit` |
| Trunk | `origin/main` (single trunk) |
| Trunk tip @ generation | `95ab8673` — `refactor: split research evidence source helpers (#591)` (2026-06-02) |
| Trunk tip @ repair audit | `64734ec4` — `docs(repo-state): canonical repo, branch/worktree inventory + trunk policy (OMN-2) (#592)` (2026-06-02) |
| Trunk protection (origin) | **active** — PR required, deletion + non-fast-forward blocked, review threads must resolve, required workflow `.github/workflows/validate-plugin.yml` |
| Open PRs @ repair audit | **3 stale / 0 mergeable** — #593, #594, #595 all `DIRTY`; all superseded by merged main commits and scheduled for closure |

**Confirmation method:** `git remote -v` (origin → omniweb-agents.git), `git log origin/main`,
`gh api repos/mj-deving/omniweb-agents/branches/main` → `protected: true`. The repo folder is
named `demos-agents`; the GitHub repo is `omniweb-agents`; the installable package is
`omniweb-toolkit`. All three refer to the same canonical unit. **No missing credentials —
no CEO escalation required for repo location.**

**Project workspace:** connected this ticket as the project's **primary** workspace
(`cwd=/home/USER/projects/demos-agents`, `repoUrl=…/omniweb-agents.git`, `defaultRef=main`).

## 2. State of Trunk & Working Copy (the problem this resets)

> **✅ OMN-12 EXECUTED 2026-06-02.** All local prune steps below are complete. Remote prune
> (296 branches) is pending CEO acknowledgment. See §5 for the updated action log.

**Before (at generation — 2026-06-02):**
- Primary checkout was on `codex/eval-drafts-rubric` (ahead 20 / behind 40), ~26 untracked paths, 5 stashes
- Local `main` was 360 commits behind `origin/main` (pure fast-forward)
- Rogue `refs/heads/origin/main` local branch caused ambiguous-ref warnings (pruned by OMN-2)
- 536 local + 296 remote branches, 0 open PRs

**After OMN-12 (as generated):**
- Primary checkout was on `main`, synced to `origin/main` (`95ab8673`, 2026-06-02)
- All 5 stashes dropped (all contents verified superseded or targeting deleted files)
- Local branch count: **5** (`main` + `docs/repo-state-omn2` worktree + 3 rescued keeper branches with open PRs)
- Remote branch count: **~300** (pending CEO-gated prune; see §3c and §5)
- Open PRs: 5 (#592 OMN-2 doc, #593 colony-operator fix, #594 arch docs, #595 control-map, plus OMN-12 tracking)
- Worktree count: 2 (`/home/USER/projects/demos-agents` on `main`; `/home/USER/projects/demos-agents-worktrees/omn2-repo-state` on `docs/repo-state-omn2`)

**Repair audit (2026-06-02, after #592 merged):**
- `origin/main` is `64734ec4`.
- Open GitHub PRs are **3**, all `DIRTY`: #593, #594, #595.
- #593 has no remaining starter-cap delta: current main already contains `MAX_OBSERVATION_POST_CHARS = 280` in the package asset, generated OpenClaw starter bundles, and `tests/packages/minimal-agent-starter-asset.test.ts`.
- #594 is superseded by merged PR #586 plus the current main control map; its remaining alignment commit cherry-picks empty.
- #595 is superseded by merged PR #585 plus the current main control map; its export-alignment commit conflicts by trying to restore older package-only wording over the newer active-operator flow.
- Local worktrees before this repair branch: root checkout only. During this repair: root checkout plus `/home/USER/projects/demos-agents-worktrees/pr-surface-repair`.
- Local branches during this repair: `main`, three stale rescued `codex/*` branches, and `fix/pr-surface-repair`.
- Remote branch count after `git fetch --prune`: **299** heads. Remote prune remains CEO-gated and is not part of this corrective PR.

## 3. Branch Inventory

Baseline at generation (2026-06-02): **536 local heads, 296 remote heads.**
Post-OMN-12 (2026-06-02): **5 local heads, ~300 remote heads** (remote prune pending CEO ack).

### 3a. By age (last commit) — baseline at generation

| Age bucket | Local (baseline) | Remote (baseline) |
|------------|---------------:|------------------:|
| ≤ 7 days   |   31  |    1   |
| 8–14 days  |  115  |    1   |
| 15–30 days |   41  |   28   |
| **> 30 days (dead)** | **350** | **266** |

### 3b. By namespace + disposition

| Namespace | Local (baseline) | Remote (baseline) | Disposition | Status |
|-----------|-------:|-------:|-------------|--------|
| `codex/*` | 383 | 166 | **prune** | ✅ Local pruned (OMN-12); remote pending CEO ack |
| `worktree-agent-*` | 38 | 0 | **prune** | ✅ Local pruned (OMN-12) |
| `gregor/*` | 0 | 30 | **prune (CEO ack)** | ⏳ Remote pending CEO ack |
| `claude/*` | 17 | 16 | **prune** | ✅ Local pruned (OMN-12); remote pending CEO ack |
| `openclaw/*` | 0 | 8 | **prune (CEO ack)** | ⏳ Remote pending CEO ack |
| `xiih-*`, `ez4*`, `nkw*`, `repair-pr*`, `omniweb-agents-*`, misc | ~98 | ~76 | **prune** | ✅ Local pruned (OMN-12); remote pending CEO ack |
| `main` | 1 | 1 | **keep** | ✅ Local `main` fast-forwarded to `origin/main` |
| `codex/eval-drafts-rubric` | 1 | 1 | **abandoned** | ✅ All 20 local commits verified superseded; branch deleted (OMN-12) |
| Rescued keepers (3) | 3 | 3 | **keep — open PRs** | ✅ PRs #593 #594 #595 opened (OMN-12) |
| `origin/main` (rogue local) | — | — | **PRUNED** | ✅ Done (OMN-2) |

### 3c. Merge status vs trunk (drives the safe-prune set)

- **73 local branches were fully merged into `origin/main`** → deleted zero-loss (OMN-12). 35
  `worktree-agent-*` + 38 others. Source: OMN-12 attachment `merged-local-safe-prune.txt`.
- **460 local branches were NOT merged into trunk** → audited and pruned (OMN-12). 4 had genuine
  unlanded work; PRs opened (#592, #593, #594, #595). Remaining 456 deleted. 3 keepers remain as
  active PR branches. Source: OMN-12 attachment `unmerged-local.txt`.
- **~300 remote branches** remain → prune campaign with CEO ack required. Source: OMN-12
  attachment `remote-branches.txt`. Pending approval request (see §5).

## 4. Worktree Inventory

Post-OMN-12 generated state: **2 valid worktrees, 0 prunable.**

| Path | Branch | Status | Notes |
|------|--------|--------|-------|
| `/home/USER/projects/demos-agents` | `main` | ✅ live | Primary checkout, now on trunk |
| `/home/USER/projects/demos-agents-worktrees/omn2-repo-state` | `docs/repo-state-omn2` | ✅ active | OMN-2 doc PR worktree; removed on merge |

Repair audit state after #592 merged:

- `/home/USER/projects/demos-agents` remains the coordination/root checkout.
- `/home/USER/projects/demos-agents-worktrees/omn2-repo-state` is gone.
- `/home/USER/projects/demos-agents-worktrees/pr-surface-repair` is the temporary repair worktree for this corrective PR and should be removed after merge/closeout.

**Previously stale worktree — removed by OMN-12:**
- `nkw19-delayed-verdict` (was on `main`, pinning stale local main, last active 2026-04-27) → removed

**Non-worktree leftover directories — removed by OMN-12:**
- `demos-agents-worktrees/architecture-map-output` — ✅ removed (build output images)
- `demos-agents-worktrees/demos-agents-worktrees` — ✅ removed (accidental nested dir)
- `.claude/worktrees/agent-a2325e5d` — ✅ removed (empty Claude agent scratch)

**Archive:**
- `demos-agents-worktree-archive/2026*` (3 timestamped, all from 2026-06-02) — within 14-day retention; apply ≤14-day policy on next hygiene pass

**Stashes:** All 5 audited and dropped by OMN-12:
- stash@{0}: `.gitignore` + AGENTS.md — superseded
- stash@{1}: `.gitignore` worktree entries — stale worktrees
- stash@{2}: retired root action executor code — file deleted from main in `98c002a3`
- stash@{3}: `.gitignore` worktree entry — stale
- stash@{4}: `.gitignore` worktree entries — stale

## 5. Actions Taken

### OMN-2 (this document)
- Confirmed canonical repo + connected it as the project's primary workspace.
- Fetched latest trunk; produced this inventory.
- Pruned the rogue `refs/heads/origin/main` local branch (ended the ambiguous-ref warnings).
- Landed this document to trunk via PR `docs/repo-state-omn2` (#592).
- Deferred all branch surgery to [OMN-12](/OMN/issues/OMN-12) (primary checkout was dirty).

### OMN-12 (prune campaign — 2026-06-02) ✅
- **Stash audit:** All 5 stashes attributed and dropped (all superseded or targeting deleted files).
- **Checkout moved:** Discarded stale `.gitignore` change; switched primary checkout to `main`;
  fast-forwarded 360 commits to `origin/main` (`95ab8673`).
- **Worktree:** Removed stale `nkw19-delayed-verdict` worktree (April test artifacts, empty pending-verdicts.json).
- **Filesystem:** Removed 3 leftover dirs (`architecture-map-output`, nested `demos-agents-worktrees`, `.claude/worktrees/agent-a2325e5d`).
- **73 merged local branches deleted** (zero-loss; from `merged-local-safe-prune.txt`).
- **460 unmerged local branches audited:**
  - 4 branches with genuine unlanded work rescued with open PRs:
    - [docs/repo-state-omn2] → PR #592 (OMN-2 deliverable)
    - [codex/colony-operator-convergence] → PR #593 (cap starter observation text)
    - [codex/refresh-architecture-docs] → PR #594 (refresh architecture docs)
    - [codex/architecture-control-map-clean] → PR #595 (align control map with exports)
  - 457 branches deleted
- `codex/eval-drafts-rubric`: All 20 local commits verified superseded by merged PRs; branch deleted.

### PR surface repair (2026-06-02) ✅
- #592 is merged and `origin/main` is `64734ec4`.
- #593, #594, and #595 were re-audited against current `origin/main`; each branch is stale/dirty and no longer contains a safe, unmerged delta to merge as-is.
- Repair action: close #593, #594, and #595 as superseded rather than force-pushing or merging their stale branch histories.
- Corrective evidence lives in this document; no code/runtime behavior changes are part of this repair.

### Remaining: CEO-gated remote prune
- ~300 remote branches still pending deletion.
- Approval requested from CEO (all > 14 days, 0 open PRs, high blast-radius operation).
- Closure condition for OMN-12: CEO acknowledges → `git push origin --delete` for all branches
  in the `remote-branches.txt` attachment that have no open PR.

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
   `/home/USER/projects/demos-agents-worktrees/<branch-slug>`, one per active branch, removed
   (`git worktree remove`) when its branch merges. No worktree outlives its branch. No nested
   worktree roots, no build output parked under the worktree root.
8. **Local `main` stays a pure mirror** of `origin/main` (fast-forward only, never committed to
   directly).

---

*Maintenance: regenerate §3–§4 counts after the CEO-gated remote prune ([OMN-12](/OMN/issues/OMN-12))
and on any future branch-hygiene audit. The policy (§6) is stable and changes only by CTO decision.*
