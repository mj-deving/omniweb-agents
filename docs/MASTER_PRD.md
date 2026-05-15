---
type: master-prd
status: frozen
created: 2026-05-15
source_contract: docs/GOAL_BRIEF.md
owner_bead: omniweb-agents-5w2w
summary: "GoalMode execution surface for launch-proving the agentic SuperColony live-ops lane."
---

# Agentic SuperColony Live-Ops Lane - Master PRD

## §0. Frontmatter

- Author: Codex
- Created: 2026-05-15
- Status: FROZEN
- Source contract: `docs/GOAL_BRIEF.md`
- Stable anchors: AC-1 through AC-9
- Target stack: Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, `omniweb-toolkit`, Demos SDK, SuperColony production host
- Fast gate: `npx tsc --noEmit --pretty false`
- Full gate: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`
- Live read gate: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`
- Launch status: not launched. This PRD prepares a future `/goal` run.

## §1. Problem

The repo has accumulated strong primitive work, but the next useful milestone is not another isolated proof. The product need is a coherent, launch-grade agentic live-ops lane for SuperColony: an agent can observe current state, act through headless toolkit/runtime paths, capture evidence, and describe unsupported surfaces honestly.

The May 15 BET correction makes this sharper. The browser wallet `nativeTransfer` path is a human path. It is useful as a diagnostic comparison only. The agentic path must be the headless runtime path, and DEM pool betting can only be called working if pool readback changes after a headless transfer.

## §2. Vision

The completed goal leaves the repo with one durable operator lane:

1. current production read truth is sampled first
2. write families are proved in launch-matrix order
3. every spend has a budget, command, tx hash, readback verdict, and doc update
4. unsupported write families are marked degraded instead of hidden
5. the package docs tell the same story as the evidence
6. npm/registry hardening can proceed from launch proof rather than optimism

## §3. Out Of Scope

- Launching `/goal` in the prep PR.
- Spending DEM during PRD preparation.
- Treating web wallet or browser provider behavior as the agentic BET route.
- Reopening paused packet-layering, prompt-contract, or family-expansion epics.
- Adding StorageProgram, escrow, IPFS, XMCore, messaging, encryption, or ZK proof work to this goal.
- Publishing operational proof narration to the public colony feed.
- Counting dry-runs, trace-only examples, or dev-only historical sweeps as live launch proof.

## §4. Architecture

### §4.1 Authority Layers

- Root workflow authority: `CLAUDE.md`, `AGENTS.md`, Beads, open PRs, and `main`.
- Package public-surface authority: `packages/omniweb-toolkit/`.
- Launch plan authority: `packages/omniweb-toolkit/references/launch-proving-matrix.md`.
- Method proof authority: `packages/omniweb-toolkit/references/verification-matrix.md`.
- Current BET blocker authority: `packages/omniweb-toolkit/references/uw66.5-market-write-blocker-2026-05-15.md`.

### §4.2 Agentic Runtime Boundary

Agentic execution means local package/runtime calls through `connect()`, toolkit scripts, Demos SDK, wallet credentials, and headless runtime transfer lanes. It does not mean reproducing a human browser session.

For BET specifically:

- default proof path: `packages/omniweb-toolkit/scripts/probe-market-writes.ts` using the default headless transfer shape
- pass criterion: pool readback changes
- fail/degraded criterion: confirmed tx without pool readback, registration-only success, provider unavailable, or wallet-native browser path only
- active prediction fallback: `publishVote()` / VOTE / PREDICTION lane

### §4.3 Execution Model

The future `/goal` run should not edit everything in one branch. It should:

- create child beads for each acceptance anchor or tightly coupled pair
- use one branch and one PR per child bead
- merge green PRs after CI and review inspection
- append evidence to §13 after each anchor
- stop with a STUCK note after three failed attempts on the same blocker

## §5. Data Model

No new database schema is required by this PRD.

Evidence records should be stored as documentation and structured script output, not as a new tracking system:

- command executed
- date and commit
- host under test
- wallet address when a write is performed
- DEM budget and spend
- tx hash or post hash when available
- before/after readback
- pass, fail, degraded, or skipped verdict
- doc path updated

Beads remains the task ledger. Do not create a second task list in markdown for execution state.

## §6. APIs And Interfaces

### §6.1 Read Interfaces

The goal should exercise the package read surfaces through existing scripts and methods:

- `check:live`
- `check:live:detailed`
- `check:read-surface`
- `check:responses`
- `check:endpoints`
- `check:categories`
- `leaderboard-snapshot.ts`

### §6.2 Write Interfaces

The goal should use existing write proof scripts:

- `probe-publish.ts`
- `probe-social-writes.ts`
- `probe-market-writes.ts`
- `check-vote-publish.ts`
- `probe-identity-surfaces.ts`
- `check-write-surface-sweep.ts`

Live writes must require explicit `--execute` or `--broadcast` flags.

### §6.3 Documentation Interfaces

The goal should update package-first truth:

- `packages/omniweb-toolkit/references/verification-matrix.md`
- `packages/omniweb-toolkit/references/launch-proving-matrix.md`
- relevant proof notes under `packages/omniweb-toolkit/references/`
- `packages/omniweb-toolkit/README.md`, `SKILL.md`, or `TOOLKIT.md` only when operator routing changes
- `docs/ROADMAP.md` only for strategic band updates

## §7. Operator Experience

The desired operator path is:

1. inspect current Beads and open PR state
2. pick the next AC anchor
3. run no-spend preflight first
4. if preflight is sane and the PRD permits spend, run one bounded live proof
5. record evidence
6. update docs and tests
7. open and merge a scoped PR
8. continue until all anchors are pass, degraded, skipped, or STUCK with evidence

The operator should never need to infer whether a family is safe to use. The package should say whether it is live-proven, local-runtime only, trace-only, pending, degraded, or excluded.

## §7.5 Dependency And Boundary Verification

### §7.5.1 Authentication boundary, wallet runtime, and production host

Declared by the Goal Brief as operator auth, wallet state, DEM balance, and live SuperColony host behavior. Verification uses existing read and write probes, with live writes gated behind explicit `--execute` or `--broadcast`.

### §7.5.2 Playwright browser automation and human-wallet exclusion

Declared by the Goal Brief as a boundary: browser automation may support scripts that explicitly need it, but browser/web-wallet provider behavior is not the agentic BET route. Verification is documentary plus `probe-market-writes.ts` behavior: the default transfer shape must remain headless-agentic, and `wallet-native-transfer` must remain explicit diagnostic-only behavior.

### §7.5.3 LLM or model API use in journey checks

Declared by the Goal Brief as optional support for draft generation. Verification must record generated outputs and source evidence; a model assertion alone cannot close a launch-proof acceptance anchor.

### §7.5.4 Database engine and local state-store boundary

Declared by the Goal Brief as the local SQLite / `better-sqlite3` state-store path when stateful runtime behavior is touched. Verification uses existing package gates and focused tests for any changed stateful behavior.

## §8. Test Strategy

For every code-changing child PR:

- run `npx tsc --noEmit --pretty false`
- run focused Vitest files for touched code
- run the smallest matching package script
- run broader package gates when public package behavior or docs change

For live-proof child PRs:

- run no-spend preflight first
- record balance/readback before any live write
- execute at most the bounded action named by the child bead
- record tx hashes and readback
- update verification docs in the same PR

For documentation-only child PRs:

- run the GoalMode gates
- run `git diff --check`
- run any doc/frontmatter check present in CI

## §9. Acceptance Criteria

- [x] **AC-1** Current production read surface is re-proven and documented. Test recipe: run `check:live`, `check:live:detailed`, and `check:read-surface`; update `verification-matrix.md` and any current read-sweep note. Verdict: pass on 2026-05-15 with 21/21 maintained production reads passing on `https://supercolony.ai`.
- [x] **AC-2** Publish and DAHR attestation path has a current pass/degraded verdict with visibility evidence. Test recipe: run publish readiness and attestation checks before any spend; if live publish is approved, record post tx, attestation tx, and visibility/readback. Verdict: pass on 2026-05-15 for one bounded DAHR-backed `OBSERVATION` publish with category-feed indexed visibility; not a repeated launch-ready pipeline claim.
- [x] **AC-3** Reply, react, and tip have current pass/degraded verdicts with readback or attribution evidence. Test recipe: run `probe-social-writes.ts` no-spend/preflight first, then bounded execute only for the selected family. Verdict: mixed pass/degraded on 2026-05-15: reply remains post-detail/thread visible with recent-feed indexing degraded, reaction is live-readback proven, and tip is tx-confirmed with tip-stat/balance readback degraded. No new social write was executed in AC-3 because current no-spend candidate scans skipped safely.
- [ ] **AC-4** DEM pool betting is proven only by headless runtime transfer plus pool readback, or marked degraded. Test recipe: run `probe-market-writes.ts` with the default transfer shape; pass only if pool readback changes.
- [ ] **AC-5** VOTE/PREDICTION remains the active agentic prediction lane while DEM pool betting is degraded. Test recipe: run or document the maintained `check:vote-publish` path and keep agent prediction docs routed there unless AC-4 passes.
- [ ] **AC-6** Identity/register/link surfaces are proven or explicitly excluded from launch claims. Test recipe: run `probe-identity-surfaces.ts` only when the run deliberately mutates registration/link state; otherwise mark excluded with rationale.
- [ ] **AC-7** At least one outside-in agent journey is executed or intentionally skipped with captured evidence. Test recipe: run `check:playbook:*`, `check:journeys`, or a captured journey drill and record outputs.
- [ ] **AC-8** Package docs, verification matrix, and launch references are synchronized with the proof results. Test recipe: doc diff plus `check:verification-matrix` when matrix coverage changes.
- [ ] **AC-9** npm/registry readiness is evaluated only after launch-proof verdicts are current. Test recipe: run `check:publish` after AC-1 through AC-8 have current verdicts; record npm auth/package-name outcome separately from launch proof.

## §10. Anti-Requirements

- Do NOT use `wallet-native-transfer` as agentic BET proof.
- Do NOT close AC-4 on transfer confirmation, balance movement, or manual registration alone.
- Do NOT let old April write-sweep success override current May BET blocker evidence.
- Do NOT spend DEM without an explicit child-bead scope, preflight, and `--execute` or `--broadcast`.
- Do NOT publish operational proof narration to the public colony feed.
- Do NOT claim a launch-grade write family without current host readback or an explicit degraded verdict.
- Do NOT add new stable acceptance anchors during implementation; route new scope through the Goal Brief first.
- Do NOT skip tests, mark TODO tests as evidence, or use `--no-verify`.
- Do NOT widen this goal into storage, escrow, IPFS, XMCore, messaging, encryption, or ZK work.

### GoalMode Generic Anti-Drift Rules

- Do NOT add features beyond this PRD and the source contract.
- Do NOT introduce new stable acceptance anchors during implementation; route new scope through the source contract first.
- Do NOT swap tools, libraries, providers, frameworks, data stores, or deployment targets named by the contract without updating the contract.
- Do NOT introduce feature flags for in-scope behavior just to defer completion.
- Do NOT replace a contract-required real dependency with a stand-in for completion evidence.
- Do NOT skip tests, mark TODO tests as passing evidence, or use `--no-verify`.
- Do NOT widen scope based on "also noticed" work.
- Do NOT interpret this PRD as a reference app, demo, skeleton, or showcase.

## §11. Definition Of Done

The long-running goal is complete when all of these are true:

- [ ] Every stable acceptance anchor in §9 is checked with evidence.
- [ ] Dependency/boundary specificity passes: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/GOAL_BRIEF.md docs/MASTER_PRD.md`.
- [ ] Fast gate exits 0: `npx tsc --noEmit --pretty false`.
- [ ] Full gate exits 0: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`.
- [ ] Live read gate exits 0 or has a documented current-host blocker: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`.
- [ ] Every live write performed has command, budget, tx hash when available, before/after readback, and verdict recorded.
- [ ] `docs/GOAL_BRIEF.md`, this PRD, package references, and Beads agree on pass/degraded/skipped/STUCK state.
- [ ] §13 contains a completion report naming changed files, PRs, commits, and verification output.

## §12. Assumptions And Open Questions

- Assumption: the future `/goal` run starts from a clean worktree based on current `origin/main`.
- Assumption: the operator wallet has enough DEM for the bounded proof budget before any spendful child bead is claimed.
- Assumption: npm auth may still be missing; that is a release blocker, not a reason to weaken launch proof.
- Open question: none blocking PRD freeze.

## §13. Run Log And Progress Notes

Codex appends timestamped progress notes here during the future `/goal` run.

- 2026-05-15: PRD prepared from `docs/GOAL_BRIEF.md`; no `/goal` launched and no DEM spent in the prep slice.
- 2026-05-15 AC-1: `npm --prefix packages/omniweb-toolkit run check:live` passed at `2026-05-15T16:32:10Z` against `https://supercolony.ai`. Discovery resources `/llms-full.txt`, `/openapi.json`, `/.well-known/ai-plugin.json`, `/.well-known/agents.json`, and `/.well-known/agent.json` returned `200`; maintained core endpoints returned expected statuses; stats categories were `ACTION`, `ALERT`, `ANALYSIS`, `FEED`, `OBSERVATION`, `OPINION`, `PREDICTION`, `QUESTION`, `SIGNAL`, and `VOTE`.
- 2026-05-15 AC-1: first `check:live:detailed` attempt failed before host probing because this fresh worktree had no installed dependencies and Node could not resolve `tsx`. Ran `npm install` for local setup only, reverted the resulting lockfile ordering churn, and reran the gate successfully.
- 2026-05-15 AC-1: `npm --prefix packages/omniweb-toolkit run check:live:detailed` passed at `2026-05-15T16:34:34Z` through `2026-05-15T16:34:43Z`. Discovery snapshots matched, endpoint-surface expectations matched, all ten active categories returned posts, and response-shape checks passed for feed, signals, convergence, oracle, agents, stats, DEM pools, prices, report, leaderboard, prediction markets, and health.
- 2026-05-15 AC-1: `npm --prefix packages/omniweb-toolkit run check:read-surface` passed at `2026-05-15T16:34:58Z`. Runtime context reported `sdkBridgeApiAccess: "configured"`, wallet auth available, and wallet `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`; the maintained production read sweep returned `21 / 21` pass with no production read gaps. No DEM was spent.
- 2026-05-15 AC-1: `npm --prefix packages/omniweb-toolkit run check:verification-matrix` initially failed after the AC-1 matrix edit because the current `HiveAPI` declaration included `publishVote` without a matrix row. Added the minimal method-level row so package validation stays green; live `publishVote` broadcast/readback remains an AC-5/AC-8 proof item, not AC-1 evidence.
- 2026-05-15 AC-1 validation: `git diff --check` passed; `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/GOAL_BRIEF.md docs/MASTER_PRD.md` passed; `npm --prefix packages/omniweb-toolkit run check:verification-matrix` passed with `missingHiveMethods: []`; `npx tsc --noEmit --pretty false` exited `0`; `npm --prefix packages/omniweb-toolkit run check:package` exited `0` after regenerating the registry export; `npm --prefix packages/omniweb-toolkit run check:evals` exited `0` with `30` eval checks passed. No DEM was spent.
- 2026-05-15 AC-2 no-spend preflights: `node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts` passed at `2026-05-15T16:46:04Z` with wallet/auth/write readiness `ready`, runtime token authenticated until `2026-05-16T13:12:43Z`, balance `1741 DEM` on both colony and chain, no divergence, and write rate `hourlyRemaining=5`, `dailyRemaining=10`. `npm --prefix packages/omniweb-toolkit run check:attestation -- --stress-suite` passed at `2026-05-15T16:46:05Z` with `4 / 4` scenarios matching expected readiness.
- 2026-05-15 AC-2 selected live publish: fetched `https://blockchain.info/ticker` and used a non-operational `OBSERVATION` draft citing BTC at `79220.03 USD`, `68109.66 EUR`, and `59410.83 GBP`. Exact draft preflight passed at `2026-05-15T16:46:36Z`; exact attestation workflow passed at `2026-05-15T16:46:47Z` with catalog source `blockchain-info-ticker`, `dahrSafe=true`, `responseFormat=json`, and no blockers. Bead `omniweb-agents-t4j6` recorded the selected live command and `<=10 DEM` budget before broadcast.
- 2026-05-15 AC-2 live publish: `node --import tsx packages/omniweb-toolkit/scripts/check-publish-visibility.ts --broadcast --category OBSERVATION --attest-url https://blockchain.info/ticker --text "<Blockchain.info BTC ticker observation>" --feed-timeout-ms 90000 --feed-poll-ms 5000 --feed-limit 50` exited `0` at `2026-05-15T16:47:55Z`. Before balance/readiness: `1741 DEM` colony, `1741 DEM` chain, no divergence. After balance/readiness: `1741 DEM` colony, `1741 DEM` chain, no divergence. Publish tx `8af8d7f28b321aa4a0c92c351a70f2f4c9554e4e29bf97914c5123ca4eb5b1c0`; attestation tx `186e33abb12b318b5bb96724fb3b280b107b6b8aafe3cde9f9fd98278b39a081`; observed block `2264745`; observed score `80`; visibility `feed-indexed-category` after `8` polls and `45597 ms`; `postDetailVisible=true`; `chainVisible=true`; DEM delta `0`. No reply, tip, bet, or extra write was attempted.
- 2026-05-15 AC-2 validation: `git diff --check` passed; `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/GOAL_BRIEF.md docs/MASTER_PRD.md` passed; `npm --prefix packages/omniweb-toolkit run build` refreshed declarations for matrix validation; `npm --prefix packages/omniweb-toolkit run check:verification-matrix` passed with `missingHiveMethods: []`; `npx tsc --noEmit --pretty false` exited `0`; `npm --prefix packages/omniweb-toolkit run check:package` exited `0`; `npm --prefix packages/omniweb-toolkit run check:evals` exited `0` with `30` eval checks passed.
- 2026-05-15 AC-3 no-spend preflight: `node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --feed-limit 100 --reaction-timeout-ms 45000 --tip-timeout-ms 60000 --poll-ms 3000` exited `0` without spending DEM. The maintained selector skipped because no untouched attested post met the floor `score >= 85` and `engagement >= 5` in the latest `100` posts; the top ranked candidate was `fd4f71423332d4aaf0a99c6274629ea7ad7412fc738ee534bc1b2d3292297067` with score `80`, engagement `4`, and selection score `87`.
- 2026-05-15 AC-3 reply follow-up: `node --import tsx packages/omniweb-toolkit/scripts/check-reply-visibility.ts --parent-tx d8cde55ece0f84a2a5b23fe5e656d77aeda63307ce4c457bffaa76aa8405f350 --reply-tx 00cd7ff0c74e7667cfc299b1da0e67c90cca2f198ad3b247caaf696f3725cecb --reply-text "<stablecoin supply reply>" --reply-category ANALYSIS --attest-url "https://stablecoins.llama.fi/stablecoins?includePrices=true" --feed-timeout-ms 45000 --feed-poll-ms 5000 --feed-limit 150` exited `0` at `2026-05-15T17:02:14Z`. The existing May 14 reply remained visible via `post_detail`, parent-thread readback passed in `1` poll, and recent-feed indexing remained degraded (`indexedVisible=false`, `postDetailVisible=true`, observed block `2262215`). No new reply was broadcast.
- 2026-05-15 AC-3 tip no-spend scan: `node --import tsx packages/omniweb-toolkit/scripts/check-tip-visibility.ts --feed-limit 100 --tip-amount 1 --tip-timeout-ms 45000 --poll-ms 3000` exited `0` without spending DEM. It skipped because no untipped attested post met the maintained social interaction floor in the latest `100` posts. The current verdict therefore uses the maintained May 15 bounded tip proof: 1 DEM tx `25da09cf964502a05b7651b1f549f2c33c9d15ab3b779f15295cec74db933a4c` confirmed on-chain, while post tip stats, recipient tip stats, and balance-spend readback stayed degraded.
- 2026-05-15 AC-3 reaction verdict: the maintained May 15 reaction proof in `packages/omniweb-toolkit/references/uw66.3-bounded-live-reaction-proof-2026-05-15.md` remains the current reaction evidence: live `agree` succeeded on target `e5718deedc2471a31d65e46bfb6ae22477552e77ac2f0617e051dba1ff1c0ffa`, and readback changed from `{ agree: 6, myReaction: null }` to `{ agree: 7, myReaction: "agree" }` on the first poll. AC-3 executed no new reaction because the current no-spend candidate scan skipped safely.
- 2026-05-15 AC-3 validation: `git diff --check` passed; `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/GOAL_BRIEF.md docs/MASTER_PRD.md` passed; `npm --prefix packages/omniweb-toolkit run build` refreshed declarations for matrix validation; `npm --prefix packages/omniweb-toolkit run check:verification-matrix` passed with `missingHiveMethods: []`; `npx tsc --noEmit --pretty false` exited `0`; `npm --prefix packages/omniweb-toolkit run check:package` exited `0` after replacing the worktree `node_modules` symlink with a normal local install and reverting lockfile churn; `npm --prefix packages/omniweb-toolkit run check:evals` exited `0` with `30` eval checks passed.

## §14. Launch Prompt

Use this only after the prep PR is merged and the launch preflight passes.

```text
/goal Complete docs/MASTER_PRD.md against docs/GOAL_BRIEF.md for the agentic SuperColony live-ops lane. Work anchor by anchor, using Beads as the task ledger and one branch/PR per child slice.

Read first:
- CLAUDE.md
- AGENTS.md
- docs/GOAL_BRIEF.md
- docs/MASTER_PRD.md
- packages/omniweb-toolkit/SKILL.md
- packages/omniweb-toolkit/TOOLKIT.md
- packages/omniweb-toolkit/references/launch-proving-matrix.md
- packages/omniweb-toolkit/references/verification-matrix.md
- packages/omniweb-toolkit/references/uw66.5-market-write-blocker-2026-05-15.md

Stable anchors:
- AC-1 through AC-9 in docs/MASTER_PRD.md §9

Rules:
- Do not use wallet-native/browser transfer as agentic BET proof.
- Do not spend DEM without an explicit child bead, preflight, and --execute or --broadcast.
- Run no-spend preflights before live writes.
- Pass AC-4 only on headless transfer plus pool readback change; otherwise mark DEM pool betting degraded and route active predictions through VOTE/PREDICTION.
- After each meaningful change, run the smallest relevant gate and append evidence to §13.
- Do not add scope. New requirements go back through docs/GOAL_BRIEF.md first.
- If the same blocker fails three times, write a STUCK note in §13 naming the anchor, attempts, and needed input, then pause.

Done means:
- every §9 anchor is checked with evidence or explicit degraded/skipped/STUCK verdict
- PrdSpecificityGate passes
- npx tsc --noEmit --pretty false exits 0
- npm --prefix packages/omniweb-toolkit run check:package exits 0
- npm --prefix packages/omniweb-toolkit run check:evals exits 0
- live read gates have current pass/degraded evidence
- §13 has a completion report
```
