---
type: master-prd
status: frozen
created: 2026-05-16
source_contract: docs/WRITE_LIFECYCLE_GOAL_BRIEF.md
owner_bead: omniweb-agents-zg11
summary: "GoalMode execution surface for durable agentic write lifecycle tracking and delayed readback."
---

# Agentic Write Lifecycle And Delayed Readback - Master PRD

## §0. Frontmatter

- Author: Codex
- Created: 2026-05-16
- Status: FROZEN
- Source contract: `docs/WRITE_LIFECYCLE_GOAL_BRIEF.md`
- Stable anchors: AC-1 through AC-8
- Target stack: Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, Demos SDK, SuperColony production host
- Fast gate: `npx tsc --noEmit --pretty false`
- Focused gate: targeted `npx vitest run <test-file>` for touched lifecycle/state/probe code
- Full package gate: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`
- Docs/matrix gate: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`
- Live read gate: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`
- Launch precondition: PR #409 merged, or the run explicitly bases from `codex/official-bet-path`

## §1. Problem

Agentic writes currently return mixed evidence at different speeds. A tx hash, chain confirmation, product API readback, feed visibility, stats readback, active-pool presence, and resolved winners/history readback are not the same event.

The May 16 fixed-price BET recheck proved the risk: short active-pool polling made the headless native args-memo path look failed, while delayed winners readback later proved the bets at block `2265016`. Publish, reply, tip, VOTE, and reaction already show related timing differences.

The repo needs a durable lifecycle layer so future operator runs can pause, resume, and recheck writes without spending again or declaring false failure.

## §2. Vision

Every maintained agentic write produces a durable lifecycle record:

1. the intended action and spend budget
2. the broadcast or no-spend context
3. tx hash or family-specific identity
4. expected readback surfaces
5. chain/explorer observations
6. product-indexed observations
7. final verdict and proof packet

Operators should be able to say: "this write is pending indexer," "this write is resolved in winners," "this reply is thread-visible but feed-degraded," or "this tip is chain-confirmed but stats-degraded" without re-running the spend path.

## §3. Out Of Scope

- Reopening the `PolicyActionRequest` seam or broad architecture below it.
- Adding new action families beyond publish, reply, react, tip, VOTE, fixed-price BET, and higher/lower.
- Repeated live spend for sample collection.
- Browser-wallet provider behavior as agentic proof.
- npm publication or registry release.
- Identity/register/link proof.
- StorageProgram, escrow, IPFS, XMCore, messaging, encryption, or ZK expansion.

## §4. Architecture

### §4.1 Lifecycle Vocabulary

The package should expose or document one shared vocabulary:

- `planned`: preflight selected a write but no tx exists
- `broadcasted`: write call returned a tx hash or equivalent identity
- `pending-chain`: tx identity exists but chain confirmation is not yet known
- `chain-confirmed`: chain/RPC/explorer confirms the tx
- `pending-indexer`: chain state exists but product API readback has not converged
- `indexed`: product API readback found the write on an expected live surface
- `resolved`: product lifecycle completed, such as BET winners/history or prediction resolution
- `degraded`: one required readback route failed while another weaker surface succeeded
- `expired`: configured recheck window elapsed without sufficient proof
- `failed`: broadcast or validation failed before a durable pending record can be completed

AC-1 and AC-7 own the documentation alignment for this vocabulary.

### §4.2 Pending Write Store

Add a package-local lifecycle store that follows the existing `--state-dir` artifact style. It should be local and non-secret. The preferred default is a JSON/JSONL store under a state directory, not a new external service.

The store must support:

- creating a record at or before broadcast
- updating a record after tx hash return
- appending observations and transitions
- listing pending records
- rechecking one record by ID or tx hash
- emitting a proof packet

AC-2 owns this store.

### §4.3 Family Adapters

Each write family keeps its own readback logic but reports through the shared lifecycle envelope:

- publish: tx, attestation tx, post detail, category/feed search, chain fallback
- reply: tx, attestation tx, post detail, parent-thread readback, feed visibility
- react: target post, reaction type, count delta, wallet-specific `myReaction`
- tip: transfer tx, target post, post tip stats, recipient tip stats, balance fallback
- VOTE: publish tx, attestation tx, category search, prediction payload
- fixed-price BET: memo transfer tx, active pool, winners/history, asset/horizon/round
- higher/lower: memo transfer tx, higher/lower pool, winners/history when available

AC-3 through AC-5 own adapter integration.

### §4.4 Proof Packet

A proof packet is structured JSON plus any markdown summary already produced by the probe. It must preserve:

- command and commit
- wallet address
- action family and action-specific key
- spend budget and amount spent
- tx hash and chain block when available
- explorer URL/time when available
- product readback surfaces checked
- elapsed time and block delta when known
- final lifecycle status

AC-6 owns proof packet shape.

## §5. Data Model

The pending-write record should include at least:

- `id`: stable local ID
- `createdAt`, `updatedAt`
- `actionFamily`: `publish | reply | react | tip | vote | bet-fixed | bet-hl`
- `status`: shared lifecycle status
- `walletAddress`
- `command`
- `commit`
- `budget`: amount and token/write-rate slot where relevant
- `txHash`, `attestationTxHash`, or `targetPostHash` when relevant
- `asset`, `horizon`, `roundEnd`, `memo`, `predictedPrice`, `direction` when relevant
- `expectedReadback`: list of surfaces
- `observations`: timestamped chain/product observations
- `finalVerdict`: pass/degraded/expired/failed with rationale

The store must not contain secrets, mnemonics, auth tokens, or private operator notes.

## §6. APIs And Interfaces

### §6.1 Library/Module Interfaces

Implementation may introduce package-internal helpers for:

- lifecycle record creation/update
- status transition validation
- family-specific readback adapters
- proof packet rendering

The public package surface should change only if needed by existing probes or agent bundles.

### §6.2 CLI Interfaces

Existing probes should grow flags without breaking current defaults:

- `--state-dir PATH` for lifecycle persistence where missing
- `--record-lifecycle` or equivalent when a command should persist records
- `--check-tx HASH` / `--recheck ID` for no-spend delayed rechecks
- `--proof-out PATH` when an explicit proof packet path is useful

No default command should spend DEM unless it already requires `--execute` or `--broadcast`.

### §6.3 Documentation Interfaces

Update package-first truth:

- `packages/omniweb-toolkit/references/verification-matrix.md`
- `packages/omniweb-toolkit/references/launch-proving-matrix.md`
- `packages/omniweb-toolkit/references/write-surface-sweep.md`
- `packages/omniweb-toolkit/references/publish-visibility-sweep.md` if publish/reply language changes
- `packages/omniweb-toolkit/references/uw66.6-agentic-memo-bet-readback-2026-05-16.md` if BET readback language changes
- `docs/ROADMAP.md`
- colony-operator re-entry memory files when strategy changes

## §7. Operator Experience

The intended operator flow:

1. run a no-spend preflight
2. optionally execute a bounded write with explicit flag
3. receive a short-window status that may be `pending-indexer`
4. later run a no-spend recheck by record ID or tx hash
5. receive a final proof packet
6. docs and Beads reflect the final verdict

The operator should not need to remember which endpoint to poll after a round rolls over or which surface is stronger for a family.

## §7.5 Dependency And Boundary Verification

### §7.5.1 Database engine and local state-store boundary

Declared by the source contract as a local durable pending-write store compatible with `--state-dir` and JSON artifact style, with SQLite reuse allowed only if it is lower-risk than JSON/JSONL for the implemented slice. Verification: focused tests create temp state dirs, assert record create/update/recheck/proof behavior, and assert secrets are not persisted. If SQLite is used, tests must exercise the actual database engine rather than a mock.

### §7.5.2 Authentication boundary, operator auth, and wallet runtime

Declared by the source contract as real wallet runtime and local operator auth for live writes, with no secrets persisted to lifecycle records. Verification: tests cover dry-run/no-spend defaults; final lifecycle validation records command, budget, wallet address, and whether any DEM was spent without printing credentials or tokens.

### §7.5.3 Browser automation and human-wallet exclusion

Declared by the source contract as Playwright/browser automation and browser wallet/provider behavior remaining human-path diagnostic only. Verification: docs and probes do not use `wallet-native-transfer` or browser-provider behavior to close agentic lifecycle acceptance.

## §8. Test Strategy

- AC-1: doc tests/checks plus review of vocabulary use in references.
- AC-2: unit tests for lifecycle store, transitions, non-secret persistence, and idempotent rechecks.
- AC-3: focused tests for publish/reply/VOTE probe lifecycle recording and no-spend resume behavior.
- AC-4: focused tests for tip/reaction lifecycle statuses, including immediate reaction and degraded tip stats.
- AC-5: fixed-price BET no-spend delayed recheck against known txs; higher/lower either tested or documented pending.
- AC-6: proof packet unit tests and one real proof packet artifact.
- AC-7: docs/matrix/registry gates.
- AC-8: final live or delayed no-spend validation with command output recorded in §13.

## §9. Acceptance Criteria

- [ ] **AC-1** Write lifecycle vocabulary and state transitions are documented for all maintained write families. Test recipe: update package references and run doc/matrix checks.
- [ ] **AC-2** A local pending-write store records tx hash, wallet, action family, command context, spend budget, expected readback surfaces, first-seen block data, and next recheck policy. Test recipe: focused unit tests with temp state dirs.
- [ ] **AC-3** Existing publish/reply/VOTE visibility probes can write and resume pending records without changing their normal no-spend default. Test recipe: focused probe tests plus dry-run command checks.
- [ ] **AC-4** Existing tip/reaction probes use the shared lifecycle vocabulary, preserving immediate reaction readback and degraded tip stats accurately. Test recipe: focused tests and/or no-spend probe replay.
- [ ] **AC-5** Fixed-price BET uses delayed active-pool plus winners/history readback as the maintained proof model; higher/lower is either upgraded with the same model or explicitly left pending. Test recipe: no-spend `--check-tx` recheck of known fixed-price txs and higher/lower verdict update.
- [ ] **AC-6** Operator-facing proof packets include chain state, explorer block/time when available, product readback state, elapsed time, block delta, and final verdict. Test recipe: proof packet fixture/unit test plus one generated packet.
- [ ] **AC-7** Verification docs, launch matrix, package guidance, roadmap, and colony-operator re-entry doctrine agree on the lifecycle model. Test recipe: doc diff, `check:verification-matrix`, and package/frontdoor gates when relevant.
- [ ] **AC-8** One bounded live or delayed no-spend replay validates the lifecycle path end to end from pending record to final indexed/resolved verdict. Test recipe: record the command, output, and proof packet in §13.

## §10. Anti-Requirements

- Do NOT reopen broad seam architecture.
- Do NOT spend DEM without an explicit child bead, budget note, and `--execute`/`--broadcast`.
- Do NOT use browser wallet/provider behavior as agentic proof.
- Do NOT declare failure solely from a short readback timeout.
- Do NOT add new write families.
- Do NOT publish npm releases.
- Do NOT mutate identity/register/link state.
- Do NOT store secrets in lifecycle records.

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
- [ ] Dependency/boundary specificity passes: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/WRITE_LIFECYCLE_GOAL_BRIEF.md docs/WRITE_LIFECYCLE_MASTER_PRD.md`.
- [ ] Fast gate exits 0: `npx tsc --noEmit --pretty false`.
- [ ] Focused tests for touched code exit 0.
- [ ] Full package gate exits 0: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`.
- [ ] Docs/matrix gate exits 0: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`.
- [ ] Live read gate exits 0: `npm --prefix packages/omniweb-toolkit run check:live && npm --prefix packages/omniweb-toolkit run check:live:detailed`.
- [ ] AC-8 final lifecycle validation is recorded with command, output path, proof packet, and spend/no-spend status.
- [ ] `docs/WRITE_LIFECYCLE_GOAL_BRIEF.md`, this PRD, package references, Beads, and roadmap agree on pass/degraded/pending state.
- [ ] §13 contains a completion report naming changed files, PRs, commits, and verification output.

## §12. Assumptions And Open Questions

- Assumption: Existing fixed-price BET tx hashes are sufficient for at least one no-spend delayed lifecycle validation.
- Assumption: A JSON/JSONL state-dir store is adequate unless implementation proves SQLite reuse is lower-risk.
- Assumption: PR #409 should be merged before launch; if not, the launch prompt must explicitly accept `codex/official-bet-path` as the base.
- Open question: none blocking before launch.

## §13. Run Log And Progress Notes

Codex appends timestamped progress notes here during `/goal` runs:

- AC closed with evidence.
- Verification command and result.
- STUCK note after repeated failures on the same blocker.
- Completion report with changed files, commits, PRs, and final gates.
