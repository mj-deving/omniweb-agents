# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# omniweb-agents

OmniWeb toolkit for the Demos Network — the full stack, not just SuperColony. Consumer package: `omniweb-toolkit`. Handles real DEM tokens on mainnet.

**Architecture (ADR-0021):** `connect()` returns `OmniWeb` with 6 domains: `omni.colony` (SuperColony social), `omni.identity` (linking + lookup), `omni.escrow` (trustless tipping), `omni.storage` (on-chain databases), `omni.ipfs` (file storage), `omni.chain` (core ops). See `packages/omniweb-toolkit/src/colony.ts`.

**North star:** `supercolony-agent-starter` + `supercolony.ai/llms-full.txt`. Our toolkit layers typed primitives + guardrails on top of the official API. Don't duplicate what supercolony.ai provides — reference it, layer on it.

## Prerequisites

- **Node.js 22+** required (for `node:sqlite` built-in per ADR-0016). NOT Bun — demosdk NAPI crash (ADR-0004).
- **tsx** as the TypeScript runner for all CLI and script invocations.

## Build & Run

- `npm test` — full vitest suite; prefer the smallest relevant test first
- `npx vitest run tests/packages/<file>.test.ts` — run a single test file
- `npx vitest run -t "test name"` — run tests matching a name pattern
- `npx tsc --noEmit` — must pass with zero errors
- `npm --prefix packages/omniweb-toolkit run build` — tsup bundle (needed before `check:release`)
- `npx tsx cli/session-runner.ts --agent sentinel --pretty` — run V3 loop

**Test quality gate:** `tests/setup-test-quality.ts` runs as vitest globalSetup and rejects any test without assertions. Every `it()`/`test()` must contain `expect()` or `assert` calls, or the entire suite fails.

### Package validation ladder

Run from repo root or with `--prefix packages/omniweb-toolkit`:

- `check:package` — structural self-audit + release-surface audit (deterministic, offline)
- `check:evals` — trajectory spec validation + example coverage + eval assertions
- `check:release` — `npm pack --dry-run` tarball contents: required files, forbidden files, export targets
- `check:live` — shell-curl smoke test (endpoints, discovery, categories)
- `check:live:detailed` — TypeScript probes: discovery drift, endpoint surface, categories, response shapes (14 endpoints)

## Monorepo Structure

This is an npm workspaces monorepo with one publishable package:

```
src/                              # Full agent runtime (not published)
├── toolkit/                      # Mechanism layer — primitives, strategy, publish, guards
├── lib/                          # Policy layer — attestation, auth, LLM, scoring, sources
├── actions/                      # Action executors (publish, attest)
├── adapters/                     # External integrations
└── plugins/                      # Reputation system
cli/                              # Operator CLI tools (session-runner, audit, etc.)
agents/                           # Agent definitions (YAML + Markdown personas)
config/                           # Source catalogs, strategy configs
tests/                            # All tests (vitest) — mirrors src/ structure
packages/omniweb-toolkit/         # Consumer package (published as omniweb-toolkit)
├── src/                          # Package source — imports from ../../src/ via relative paths
├── config/doctrine/              # YAML doctrine files (metric semantics, claim bounds)
├── assets/                       # Agent starter templates (research, market, engagement)
├── playbooks/                    # Per-archetype strategy playbooks
├── references/                   # Audited reference docs (response shapes, guardrails, scoring)
├── evals/                        # Trajectory specs and evaluation harness
└── scripts/                      # Package validation scripts (check:*, export:*)
```

**Key architectural pattern:** `packages/omniweb-toolkit/src/` imports from root `src/` via `../../../src/` paths during development. tsup bundles everything at build time, so consumers just `import { connect } from "omniweb-toolkit"`. The package has three subpath exports: `.` (connect + types), `./agent` (agent loop + domain helpers), `./types` (pure types).

The `toolkit/` vs `lib/` split is enforced by `tests/architecture/boundary.test.ts` (ADR-0002): toolkit = mechanism (what can happen), lib = policy (what should happen).

## Documentation

**The package is the single source of truth.** Everything in `docs/` is downstream.

Every agent must read `AGENTS.md` immediately after reading this file. `CLAUDE.md` defines repo-wide architecture and constraints; `AGENTS.md` defines the execution workflow.

Bead creation must be evidence-first at creation time, not enriched later:
- use `--description` for the what/why
- use `--context` for execution details, blockers, or acceptance shape
- use `--notes` for SOURCES/provenance such as audit docs, tx hashes, PRs, and live artifact paths
- canonical pattern:
  `bd create "Issue title" --description "What/why" --context "Fix surface, blockers, or acceptance shape" --notes "SOURCES: audit doc, tx hash, PR, artifact path; kn entry: durable repo fact if needed"`

## Session Bootstrap

After reading this file, immediately load the root `AGENTS.md`.

- Beads is the task ledger and durable shared memory.
- Use `main` for merged code truth and open PRs for in-flight work.
- Local memory or handoff files are convenience only unless this repo explicitly says otherwise.
- If Claude hooks are installed, let `bd prime` inject current Beads context automatically.

- Use root `AGENTS.md` for workflow, Beads usage, PR discipline, and shared-state reconstruction.
- If a nearer nested `AGENTS.md` exists for the files you are editing, read that next and follow its local instructions.
- Reconstruct current state from Beads (`bd ready`, `bd memories`, relevant `bd show` / `bd blocked` lookups), `main`, and open GitHub PRs.
- Local Claude memory files are pointer/index material only. They are not authoritative current state and must not replace Beads, `main`, open PRs, or `AGENTS.md`.
- Durable handoff deliverables under `docs/archive/agent-handoffs/` should be tracked when they drive doctrine, priorities, experiment choice, or execution order.

| Location | Authority | What |
|----------|-----------|------|
| `AGENTS.md` | **Workflow** | Required execution workflow: read order, beads usage, PR discipline, merge discipline, and multi-agent coordination. |
| `packages/omniweb-toolkit/` | **Primary** | SKILL.md (activation router), GUIDE.md (methodology), references/, evals/, scripts/, playbooks/, asset templates. Codex-authored. All API shapes, capabilities, categories, guardrails, scoring, attestation, discovery, interaction patterns live here. |
| `docs/decisions/` | **Unique** | ADRs — repo-level architectural constraints. `Status: accepted` = active. |
| `docs/ROADMAP.md` | **Unique** | Authoritative strategic tracker; live phase, completed bands, open work items. Read its front-matter for the current phase rather than hardcoding it here. |
| `docs/INDEX.md` | **Unique** | Project history. |
| `docs/archive/agent-handoffs/` | **Session continuity** | Dated audit / strategy handoffs (`*-YYYY-MM-DD.md`). The most-recent ones are the live strategic context for live-session-testing work — read the latest 2-3 before iterating on agent strategy. |
| `.ai/guides/` | **Supplementary** | 6 guides: CLI reference, SDK interaction, RPC, gotchas, templates, colony DB. |
| `docs/research/` | **Supplementary** | SDK research, `supercolony-discovery/` (llms-full.txt, openapi.json, A2A card). |
| `docs/primitives/` | **Redundant** | 15 files including README — fully superseded by package `references/`. Retire when convenient. |
| `docs/design-consumer-toolkit.md` | **Downstream** | Phase 20 design spec — largely delivered in the package. |
| `docs/rules/` | **Supplementary** | 7 project behavioral rules. |

**When in doubt, read the package first.** If `docs/` and the package disagree, the package wins.

## Principles

**API-first for reads, chain-first for writes** (ADR-0018). SuperColony reads prefer API (faster, enriched). Chain SDK is always-available fallback. Writes (publish, transfer, attest, escrow) stay on-chain. OmniWeb domains beyond colony (identity, escrow, storage, ipfs, chain) use SDK/RPC directly.

**Security-first.** Multi-source verification, no silent failures on payment paths, atomic rollback, security tests before implementation.

**Score-formula awareness.** Per ADR-0008, post score = `Base 20 + DAHR 40 + Confidence 5 + LongText(>200ch) 15 + Reactions(5+) 10 + Reactions(15+) 10`. Attested compact posts floor at 80; only earned reactions move the slope from 80 to 90+. The 80 ceiling on a single publish is structural, not a tuning failure.

**SDK compliance.** Lookup: package references/ → `docs/research/` → SDK MCP → codebase. No `as any`. See `.ai/guides/sdk-interaction-guidelines.md`.

**Toolkit vs strategy.** Mechanism = `src/toolkit/`. Policy = `src/lib/`. Mixed = split. Enforced by `tests/architecture/boundary.test.ts`. See `docs/architecture-plumbing-vs-strategy.md`.

**Toolkit is infrastructure, not orchestration.** Consumer experience: `npm install omniweb-toolkit` → import → call primitives. No strategy engine or verification gates required. Strategy lives in `docs/archive/agent-handoffs/` and operator scripts, not in package code.

## Conventions

- **TDD** — tests before implementation, committed together.
- **Fix ALL review findings** — Fabric, `/simplify`, Codex. Zero skips without user approval.
- **Before merge, read the PR review output** — CI alone is not enough. Inspect PR comments/reviews, especially `chatgpt-codex-connector[bot]`, before merging or enabling auto-merge.
- **Session start** — read `CLAUDE.md`, then root `AGENTS.md`, then any nearer nested `AGENTS.md`, then the relevant package docs, then `bd ready`, then open PRs if overlap is likely.
- **Coordination source** — reconstruct state from `main`, open GitHub PRs, beads, and repo docs. Do not depend on manual Codex-to-Claude handoff.
- **Agent workflow** — one bead = one branch = one PR. Use GitHub PRs as the merge unit and beads as the live task ledger.
- **Parallel agents** — use separate worktrees. If two tasks touch the same files heavily, serialize them instead of racing.
- **Coordination parent dirs are read-only.** In any directory whose sibling is `*-worktrees/` (e.g. `/home/mj/projects/demos-agents` whose sibling is `demos-agents-worktrees/`), do NOT edit tracked files. The parent dir is a coordination home — `main` is held by another worktree (`bd worktree list` shows which) and the parent's current branch is incidental. All work happens in a worktree off `origin/main`. **Canonical creation:** raw `git worktree add -b <branch> ../demos-agents-worktrees/<name> origin/main` — this is the only form that *guarantees* an `origin/main` base. The helper `scripts/create-worktree.sh <name>` works too, but its second arg becomes the new branch *name* (not a base), and the single-arg form bases on whatever the parent's current HEAD is — which in this repo is routinely an incidental/stale branch, not `origin/main`. Use the helper only after confirming HEAD is already `origin/main`. Editing in the parent creates phantom dirty files that are usually already on main; see bead `omniweb-agents-t9ck` for a real instance of this footgun.
- **Merge slot** — acquire `omniweb-agents-merge-slot` (`bd merge-slot acquire`) before rebasing or landing conflict-heavy work in shared hot files: `packages/omniweb-toolkit/src/hive.ts`, `packages/omniweb-toolkit/src/index.ts`, `src/toolkit/supercolony/api-client.ts`, live validation scripts. Release it promptly.
- **Beads hygiene** — beads content should be treated as public workflow metadata. Never store secrets, credentials, tokens, or private operational notes in beads.
- Commit messages: clear "why", prefixed by area. kebab-case files.
- Sessions that make repo changes should usually end with commit + push or an open PR; pure audit/review sessions do not need a commit.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
- In multi-agent operation, sync Beads from Dolt at session start and again after major bead changes; if `bd dolt pull` reports the branch-selection error, repair tracking once with `cd .beads/embeddeddolt/omniweb_agents && dolt push --set-upstream origin main`.
<!-- END BEADS INTEGRATION -->
