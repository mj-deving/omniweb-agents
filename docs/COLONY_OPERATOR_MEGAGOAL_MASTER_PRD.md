---
type: master-prd
status: frozen
created: 2026-05-16
source_contract: docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md
owner_bead: omniweb-agents-zqnh
summary: "GoalMode execution surface for the lifecycle-aware Colony Operator MegaGoal."
---

# Lifecycle-Aware Colony Operator MegaGoal - Master PRD

## §0. Frontmatter

- Author: Codex
- Created: 2026-05-16
- Status: FROZEN
- Source contract: `docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md`
- Stable anchors: AC-1 through AC-10
- Owner bead: `omniweb-agents-zqnh`
- Prerequisite: PR #411 / `cd08ca5d8ec17af67207886b44d7771b7b4935fd` is merged to `main`
- Target stack: Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, Demos SDK, SuperColony production host, OpenClaw bundle surfaces
- Fast gate: `npx tsc --noEmit --pretty false`
- Docs/matrix gate: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`
- Package gates: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`
- Live read gates: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`
- GoalMode specificity gate: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md`

## §1. Problem

The repo now has bounded proof for publish, reply, react, tip, VOTE prediction, fixed-price DEM pool betting, and durable write lifecycle rechecks. Those are still mostly family-specific proof paths. They do not yet add up to one maintained Colony Operator that can choose among action families, execute through the maintained runtime, report lifecycle truth, prove official identity participation, and demonstrate that an outside consumer can use the package without workspace-only wiring.

The next run should not re-prove the web wallet human path, rerun spend because indexing lag is confusing, or reopen the `PolicyActionRequest` seam. It should turn the landed lifecycle layer into the operator floor.

## §2. Vision

One maintained Colony Operator can:

1. inspect the live colony surfaces it needs
2. choose `skip`, `publish`, `reply`, `react`, `tip`, VOTE prediction, fixed-price BET, or higher/lower BET where currently proved
3. route through maintained toolkit/runtime paths
4. persist and recheck wallet-backed write lifecycle records
5. report blocked, degraded, pending, indexed, resolved, and failed states honestly
6. prove official identity participation without persisting secrets
7. prove outside-in consumer/install use
8. leave roadmap, package references, launch matrices, Beads, PRs, and proof packets synchronized

## §3. Out Of Scope

- Reopening the `PolicyActionRequest` seam unless a live operator run proves it wrong.
- Using browser wallet/provider behavior as agentic proof.
- Adding new action families beyond the current operator band.
- Spending DEM without explicit `--execute` or `--broadcast`, a budget note, and a recorded reason.
- Starting broad consumer launch polish before operator and identity truth exist.
- Publishing npm or claiming registry readiness before outside-in proof exists.
- Storing mnemonics, bearer tokens, challenge secrets, approval tokens, or private operator notes in lifecycle records, identity records, proof packets, docs, or Beads.
- Treating tx confirmation alone as product success or a short readback miss as final failure.

## §4. Architecture

### §4.1 M0 Lifecycle Completion Audit

M0 verifies that the completed lifecycle goal is usable as the operator input layer. It must not redo PR #411 unless the audit finds an actual breakage on `main`.

The audit must confirm:

- `docs/WRITE_LIFECYCLE_MASTER_PRD.md` §9 and §11 remain checked.
- `packages/omniweb-toolkit/scripts/_write-lifecycle.ts` is present and exported/used by maintained probes.
- `packages/omniweb-toolkit/references/write-lifecycle.md`, `verification-matrix.md`, and `launch-proving-matrix.md` agree on statuses and recheck surfaces.
- Maintained no-spend recheck commands exist for publish/reply, VOTE, social writes, and fixed-price BET.
- Any lifecycle record/proof packet consumed by later milestones is non-secret and reproducible enough for audit.

### §4.2 M1 Multi-Action Operator Runtime

M1 builds one maintained operator loop above the frozen seam. The loop must be able to read, choose, and resolve intent across:

- `skip`
- `publish`
- `reply`
- `react`
- `tip`
- `VOTE`
- `bet-fixed`
- `bet-hl` only when current proof exists; otherwise it must be represented as blocked, lifecycle-pending, or degraded

The operator should prefer no-spend dry-run cycles while proving routing. Wallet-backed executions must delegate to existing maintained runtime/probe paths and write lifecycle records when a tx or product identity exists.

### §4.3 M2 Official Colony Identity Participation

M2 proves the identity participation band after M1 exists. It covers:

- register flow proof
- human-link challenge creation
- claim / approval / readback proof
- cleanup or unlink only where safe and explicitly bounded
- capability/readiness truth that says whether identity actions are available, blocked, degraded, or complete

M2 must preserve the same non-secret evidence discipline as the lifecycle layer.

### §4.4 M3 Outside-In Consumer Proof

M3 proves that a consumer can install or use the package/bundle from outside the repo's internal workspace wiring.

Acceptable proof surfaces include:

- package tarball or registry install posture
- OpenClaw bundle copied-consumer proof
- starter execution from a temp consumer workspace
- capability docs that describe actual current behavior
- package checks from the consumer posture

M3 must not claim npm/public registry readiness unless the registry path itself is tested.

### §4.5 M4 Completion Audit

M4 closes the MegaGoal by proving the repo tells one story:

- PRDs and launch docs match final behavior.
- Package references and verification matrices match final behavior.
- Roadmap and colony-operator memory mirror match final behavior.
- Beads owner and child tasks reflect completed/deferred work.
- Proof packets, command logs, commits, PRs, gates, live/no-spend status, and remaining explicit deferrals are recorded.

## §5. Data And Proof Model

The MegaGoal should reuse the landed lifecycle record/proof shape rather than inventing a parallel store.

Required proof details for wallet-backed operator paths:

- action family and operator decision
- command and commit
- wallet address or non-secret operator identity
- spend budget and amount
- tx hash, attestation tx hash, target post hash, asset/horizon/round, or identity action ID as applicable
- lifecycle status transitions
- readback surfaces checked
- chain block/time, explorer link, elapsed time, and block delta when available
- final verdict and whether it matched by tx hash, wallet/author, price/direction, target post, identity address, or round

Identity proof records may store non-secret challenge/readback identifiers, but must not store challenge secrets, approval tokens, mnemonics, bearer tokens, or private notes.

## §6. APIs And Interfaces

### §6.1 Operator Runtime Interfaces

The runtime may add package-internal helpers or exported types when needed, but the preferred path is to compose existing toolkit/runtime primitives:

- action intent construction above the seam
- runtime readiness and capability truth below the seam
- maintained probe/helper execution for wallet-backed writes
- lifecycle record/proof packet integration for tx-bearing paths

Do not make the playbook a hidden executor. The playbook chooses strategy; the runtime resolves capability, execution, and verification truth.

### §6.2 CLI Interfaces

Any new CLI or script surface should follow existing package patterns:

- no-spend by default
- explicit `--execute` or `--broadcast` for live writes
- `--state-dir` for local artifacts where applicable
- `--record-lifecycle`, `--recheck`, `--check-tx`, or equivalent for lifecycle paths
- `--proof-out` or deterministic proof packet output for final evidence

### §6.3 Documentation Interfaces

When behavior changes, update the package-first truth surfaces in the same slice:

- `packages/omniweb-toolkit/references/write-lifecycle.md`
- `packages/omniweb-toolkit/references/verification-matrix.md`
- `packages/omniweb-toolkit/references/launch-proving-matrix.md`
- `packages/omniweb-toolkit/references/consumer-journey-drills.md` or `minimal-consumer-artifact.md` when consumer posture changes
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/*` when the bundle truth changes
- `docs/ROADMAP.md`
- Beads notes and gates

## §7. Operator Experience

The final operator flow should be:

1. run a read-first no-spend cycle
2. receive a decision with action family, rationale, and capability status
3. optionally execute a bounded wallet-backed action with explicit flag
4. receive lifecycle status rather than a binary false failure on short timeout
5. later run no-spend rechecks where indexing is delayed
6. inspect one proof packet that explains chain state, product readback, and final verdict
7. know whether identity and consumer surfaces are ready, blocked, degraded, or deferred

`skip` is a valid successful action. The operator should not write just to prove it can write.

## §7.5 Dependency And Boundary Verification

### §7.5.1 Database engine, SQLite exclusion, and local state-store boundary

Declared by the source contract as reuse of the landed local lifecycle store and proof packet shape from `packages/omniweb-toolkit/scripts/_write-lifecycle.ts`, without replacing it with SQLite or another database engine unless the source contract changes. Verification: M0 audits the existing store; M1 wallet-backed paths write or update lifecycle records through the landed helper; tests or proof packets assert no secrets are persisted.

### §7.5.2 Authentication boundary, operator auth, wallet runtime, and identity runtime

Declared by the source contract as real local operator credentials for live writes and identity actions, with no secret persistence. Verification: dry-run/readiness tests cover missing/blocked credentials; any live proof records wallet/address and capability state without printing or storing mnemonic, token, challenge secret, approval token, or private operator note.

### §7.5.3 Browser automation, Playwright, and human-wallet exclusion

Declared by the source contract as browser wallet/provider behavior remaining human-path diagnostic only. Verification: no AC may be closed by a browser `nativeTransfer` provider proof; agentic DEM pool and operator proofs must use maintained headless runtime paths or be marked degraded/blocked.

## §8. Test Strategy

- AC-1: audit command outputs plus source file references for PR #411 lifecycle artifacts.
- AC-2: focused unit/integration tests for operator action intent and status routing.
- AC-3: focused tests or dry-run proof for execution routing and lifecycle record/proof integration.
- AC-4: no-spend multi-action dry-run proving action selection across the supported family vocabulary.
- AC-5: bounded operator validation with lifecycle proof packet; prefer no-spend delayed recheck or cheapest explicitly authorized write.
- AC-6: identity/register/link tests or live bounded proof with secret redaction checks.
- AC-7: capability/readiness tests and docs for degraded/blocked identity and higher/lower states.
- AC-8: consumer-posture install/run proof.
- AC-9: docs/matrix/roadmap/memory/Beads sync checks.
- AC-10: final gates, completion report, PR/commit/proof packet audit.

## §9. Acceptance Criteria

- [ ] **AC-1** M0 lifecycle completion audit confirms PR #411 artifacts are present on `main`, usable by the operator, and recorded in §13. Test recipe: inspect lifecycle PRD/checks, lifecycle helper, references, and maintained recheck commands without live spend.
- [ ] **AC-2** The multi-action operator decision surface covers `skip`, `publish`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, and `bet-hl` status truth without reopening the `PolicyActionRequest` seam. Test recipe: focused tests prove action/status normalization and higher/lower degraded or available state.
- [ ] **AC-3** Wallet-backed operator execution routes through maintained runtime paths and lifecycle record/proof integration. Test recipe: focused tests plus a dry-run or no-spend recheck proof showing lifecycle handoff for at least one tx-bearing family.
- [ ] **AC-4** A no-spend multi-action dry-run cycle demonstrates reading live or fixture-backed colony surfaces and planning across the action families. Test recipe: command output/proof artifact records selected action, skipped alternatives, capability truth, and no-spend status.
- [ ] **AC-5** One bounded operator validation produces a lifecycle proof packet from a maintained operator path. Test recipe: prefer no-spend delayed recheck; if live write is needed, it must use explicit `--execute`/`--broadcast`, budget note, tx hash, and product readback.
- [ ] **AC-6** Official identity participation is proved or honestly blocked: register, link/challenge, claim/approve/readback, and safe cleanup/unlink where applicable. Test recipe: record proof packet/readback and redaction check; if blocked, record exact command, blocker, and readiness state.
- [ ] **AC-7** Operator capability/readiness truth exposes lifecycle and identity states, including blocked/degraded/pending statuses. Test recipe: focused tests and docs show user-facing status text is truthful.
- [ ] **AC-8** Outside-in consumer proof passes from a package/registry/OpenClaw or equivalent consumer posture. Test recipe: isolated temp consumer command output, package source, and result are recorded.
- [ ] **AC-9** Package references, launch matrices, roadmap, colony-operator memory, and Beads agree on final capability truth. Test recipe: doc diff plus `check:verification-matrix` and package/frontdoor gates when relevant.
- [ ] **AC-10** Completion audit closes the MegaGoal with changed files, commits, PRs, proof packets, spend/no-spend status, deferred work, and required gates recorded in §13. Test recipe: final gate block exits 0 or records a STUCK blocker after three failed attempts.

## §10. Anti-Requirements

- Do NOT stop after AC-1. M0 is only the audit gate.
- Do NOT treat browser wallet/provider behavior as the agentic path.
- Do NOT retry spend before checking existing lifecycle records and known tx hashes.
- Do NOT declare pool, feed, stats, identity, or consumer success without the relevant readback/proof surface.
- Do NOT make package docs more optimistic than the proven runtime.
- Do NOT hide degraded states behind generic success.
- Do NOT use markdown TODOs as task state; use Beads child tasks under `omniweb-agents-zqnh`.

### GoalMode Generic Anti-Drift Rules

- Do NOT add features beyond this PRD and the source contract.
- Do NOT introduce new stable acceptance anchors during implementation; route new scope through the source contract first.
- Do NOT swap tools, libraries, providers, frameworks, data stores, or deployment targets named by the contract without updating the contract.
- Do NOT introduce feature flags for in-scope behavior just to defer completion.
- Do NOT mock owned components in integration or acceptance tests unless the contract explicitly permits it.
- Do NOT replace a contract-required real dependency with a stand-in for completion evidence.
- Do NOT skip tests, mark TODO tests as passing evidence, or use `--no-verify`.
- Do NOT widen scope based on "also noticed" work.
- Do NOT interpret this PRD as a reference app, demo, skeleton, or showcase.

## §11. Definition Of Done

The goal is complete when all of these are true:

- [ ] Every stable acceptance anchor in §9 is checked with evidence.
- [ ] Dependency/boundary specificity passes: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md`.
- [ ] Fast gate exits 0: `npx tsc --noEmit --pretty false`.
- [ ] Focused tests for touched code exit 0.
- [ ] Package gates exit 0: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`.
- [ ] Docs/matrix gate exits 0: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`.
- [ ] Live read gates exit 0: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`.
- [ ] At least one operator/lifecycle proof packet includes real SuperColony/Demos readback or records a three-attempt STUCK blocker.
- [ ] Identity participation proof or honest blocked/degraded state is recorded with no secrets.
- [ ] Outside-in consumer proof is recorded.
- [ ] §13 contains a completion report with changed files, commits, PRs, proof packets, live/no-spend/spend status, and deferred work.
- [ ] Beads child tasks are closed or explicitly blocked/deferred, and `bd dolt push` succeeds.

## §12. Assumptions And Open Questions

- Assumption: PR #411 is the lifecycle base and remains merged on `main`.
- Assumption: fixed-price DEM pool betting is agentically proved through headless native args-memo plus delayed winners readback; higher/lower still needs current proof or truthful degraded state.
- Assumption: one bounded live attempt may be used only when explicitly flagged and budgeted; no-spend lifecycle rechecks are preferred.
- Assumption: identity/linking may require real operator auth and can be blocked by missing credentials; if so, the correct outcome is a precise readiness/blocker state, not fake proof.
- Open question: whether outside-in proof should use registry install, `npm pack` tarball install, copied OpenClaw bundle, or all of them. AC-8 requires at least one honest consumer posture and docs must name which one passed.

## §13. Run Log

Record milestone evidence here during GoalMode execution. Each entry should include date, AC, commands, changed files, proof packet paths, PRs, spend/no-spend status, and blockers.

- 2026-05-16 prep: PR #411 is merged at `cd08ca5d8ec17af67207886b44d7771b7b4935fd`; `omniweb-agents-zg11` is closed; owner epic for this MegaGoal is `omniweb-agents-zqnh`.
