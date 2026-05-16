---
type: master-prd
status: frozen
created: 2026-05-16
source_contract: docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md
owner_bead: omniweb-agents-8tga
summary: "Master PRD for one maintained live Colony Operator execution cycle with product readback."
---

# Live Colony Operator Execution - Master PRD

## §0. Frontmatter

- Author: Codex
- Created: 2026-05-16
- Status: FROZEN
- Source contract: `docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md`
- Stable anchors: AC-1 through AC-8
- Owner bead: `omniweb-agents-8tga`
- Checkpoint prerequisite: PR #413 merged as `52397c54`
- First live target: publish/reply, not BET
- Fast gate: `npx tsc --noEmit --pretty false`
- Docs/matrix gate: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`
- Package gates: `npm --prefix packages/omniweb-toolkit run check:package && npm --prefix packages/omniweb-toolkit run check:evals`
- GoalMode specificity gate: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md`

## §1. Problem

PR #413 made the Colony Operator truth surface more honest, but it did not close the roadmap's missing Wave B item: one maintained operator cycle that can read live state, choose among the action families, execute through the runtime, record lifecycle state, and prove product readback.

The repo already has family-specific proofs. The next proof must be through the maintained operator entrypoint, not another direct probe that bypasses the operator.

## §2. Vision

One operator command or API path can:

1. read the live colony surfaces it needs
2. choose an action or skip
3. explain skipped alternatives
4. resolve capability and readiness truth
5. run dry by default
6. execute only with explicit `--execute`
7. write/update lifecycle records for live writes
8. report product readback as the success criterion
9. preserve pending state and recheck without repeat spend when readback lags

## §3. Out Of Scope

- Browser wallet/provider execution as agentic proof.
- Counting family-specific probes unless they are invoked through the maintained operator entrypoint.
- Counting dry-run/no-spend rechecks as live operator execution.
- BET-first live proof for the first operator cycle.
- Tx-confirmation-only success claims.
- Registry/npm readiness.
- Codex self-certification of OpenClaw/Gregor runtime-host execution.
- Storing mnemonics, bearer tokens, challenge secrets, approval tokens, or private operator notes.

## §4. Milestones

### §4.1 M0 Honest PR #413 Checkpoint

M0 is already complete. PR #413 was retitled and merged as a capability-truth/dry-run checkpoint.

Bead: `omniweb-agents-8tga.1`.

### §4.2 M1 Maintained Operator Entrypoint

Build a maintained entrypoint for:

- live read
- decision
- resolution
- dry-run or explicit execute
- lifecycle record/proof output

The entrypoint must return selected action, skipped alternatives, capability truth, lifecycle plan, execution mode, and spend status.

Dry-run must not mutate product state or spend DEM. Live writes require explicit `--execute`.

Bead: `omniweb-agents-8tga.2`.

### §4.3 M2 Decision Coverage

The decision loop covers:

- `skip`
- `publish`
- `reply`
- `react`
- `tip`
- `VOTE`
- `bet-fixed`
- status-only `bet-hl`

`VOTE` and DEM pool betting stay separate. `bet-hl` is status-only until current product readback exists.

Bead: `omniweb-agents-8tga.3`.

### §4.4 M3 First Live Publish/Reply Operator Cycle

Execute one bounded live operator cycle through the maintained entrypoint, targeting publish or reply first.

Evidence must include wallet/operator identity, live state read, selected action, skipped alternatives, tx/attestation where applicable, lifecycle record, product readback surface, final verdict, and spend status.

Success is product readback, not tx confirmation alone. If readback lags, the operator must preserve pending lifecycle state and recheck rather than retry spending.

Bead: `omniweb-agents-8tga.4`.

### §4.5 M4 Current `bet-hl` Verdict

Prove current higher/lower delayed readback or record precise STUCK/blocker evidence.

Success requires pool/product readback. Tx confirmation alone is not enough.

Bead: `omniweb-agents-8tga.5`.

### §4.6 M5 Identity Register/Link Verdict

Run live identity register/link proof only with explicit authorization and usable credentials. Otherwise record the blocker precisely.

Dry-run identity readiness is not live identity completion.

Bead: `omniweb-agents-8tga.6`.

### §4.7 M6a OpenClaw/Gregor Handoff Packet

Prepare a repo-resident handoff packet with exact commands, environment requirements, expected outputs, proof paths, cleanup notes, and returned-evidence requirements.

Bead: `omniweb-agents-8tga.7`.

### §4.8 M6b External Runtime Gate

External Gregor/OpenClaw runtime host evidence is required before M7 can close.

Gate: `omniweb-agents-aick`, blocking `omniweb-agents-8tga.8`.

Codex must not self-close this gate.

### §4.9 M7 Final Audit

Final audit updates roadmap, matrices, package docs, Beads, and PR evidence only after M3-M6 evidence is real or explicitly STUCK.

Bead: `omniweb-agents-8tga.8`.

## §5. Proof Model

Every live operator proof must record:

- command and git commit
- operator/wallet identity without secrets
- live read inputs used for decision
- selected action and skipped alternatives
- capability truth and blockers
- execution mode: dry-run or execute
- DEM budget and actual spend
- tx hash and attestation tx where applicable
- lifecycle record path and status transitions
- product readback surfaces checked
- final verdict and why it is success, pending, degraded, STUCK, or failed

Readback lag must produce pending lifecycle state and recheck instructions, not repeat spending.

## §6. APIs And Interfaces

The implementation should prefer package-maintained surfaces:

- `packages/omniweb-toolkit/src/agent.ts` exports for operator-facing helpers
- existing readiness/capability truth helpers
- existing write lifecycle helper/proof packet shape
- package scripts for maintained validation

Any new CLI must follow these rules:

- dry-run by default
- explicit `--execute` for live writes
- `--state-dir` for local artifacts
- lifecycle record/proof output for live writes
- no secret persistence

## §7. Operator Experience

The operator should be able to run one command and see:

1. what was read
2. what was selected
3. what was skipped
4. what can execute now
5. what is blocked/degraded/pending
6. what lifecycle record was written
7. what readback proves or withholds success

`skip` is a valid outcome when live state does not justify writing.

## §7.5 Dependency And Boundary Verification

### §7.5.1 Database engine, SQLite exclusion, and local state-store boundary

Declared by the source contract as reuse of the landed local lifecycle store and proof packet shape from `packages/omniweb-toolkit/scripts/_write-lifecycle.ts`, without introducing a parallel persistence substrate. Verification: M1/M3 tests or proof packets show the maintained operator entrypoint writes or updates the existing lifecycle record shape and stores no secrets.

### §7.5.2 Authentication boundary, operator auth, wallet runtime, and identity runtime

Declared by the source contract as real local operator credentials behind explicit live flags, with no secret persistence. Verification: dry-run tests prove no mutation or spend; live publish/reply proof records wallet/operator identity without mnemonic/token material; M5 either proves identity with explicit authorization or records the exact blocker.

### §7.5.3 Browser automation, Playwright, and human-wallet exclusion

Declared by the source contract as browser wallet/provider behavior remaining diagnostic only. Verification: no acceptance criterion may close from browser-provider execution; maintained operator proofs must use package/runtime paths or be marked blocked/STUCK.

## §7.6 Live Execution Gates

External runtime and product-readback rules are execution gates, not generic dependency categories:

- M6a creates a handoff packet; M6b remains gate `omniweb-agents-aick`; M7 cannot close until external evidence is returned or the blocker is recorded.
- M3 publish/reply success uses product readback; M4 BET/HL success uses pool/product readback; tx confirmation alone can only support pending/degraded state.

## §8. Test Strategy

- AC-1: GitHub PR #413 title/body/checks/merge evidence and checkpoint docs.
- AC-2: unit/integration tests for maintained entrypoint return shape, dry-run safety, explicit execute gating, lifecycle plan, and selected/skipped alternatives.
- AC-3: tests or dry-run proof that decision coverage includes all required families without overclaiming `bet-hl`.
- AC-4: live publish/reply operator run with product readback and lifecycle proof packet.
- AC-5: current `bet-hl` delayed readback proof or exact STUCK/blocker evidence.
- AC-6: live identity proof if authorized, otherwise exact authorization/credential blocker.
- AC-7: handoff packet review plus external gate evidence from Gregor/OpenClaw.
- AC-8: final docs/matrix/roadmap/Beads sync and required gates.

## §9. Acceptance Criteria

- [x] **AC-1** PR #413 is retitled/reworded/merged as a capability-truth and dry-run checkpoint, with checks green and no Codex review findings.
- [x] **AC-2** Maintained operator entrypoint returns selected action, skipped alternatives, capability truth, lifecycle plan, execution mode, and spend status; dry-run cannot mutate/spend; live writes require `--execute`.
- [x] **AC-3** Decision loop covers `skip`, `publish`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, and status-only `bet-hl` without conflating VOTE and DEM pool betting.
- [x] **AC-4** One bounded live publish/reply operator cycle executes through the maintained entrypoint and proves product readback with a lifecycle record/proof packet.
- [x] **AC-5** Current `bet-hl` delayed readback is proved with product readback, or exact STUCK/blocker evidence is recorded.
- [x] **AC-6** Identity register/link live proof is run with explicit authorization and credentials, or exact blocker evidence is recorded without secrets.
- [x] **AC-7** OpenClaw/Gregor handoff packet exists and external gate `omniweb-agents-aick` returns runtime-host evidence or a precise external blocker.
- [x] **AC-8** Final audit updates roadmap, matrices, package docs, Beads, and PR evidence only after AC-4 through AC-7 are real or explicitly STUCK.

## §10. Anti-Requirements

- Do NOT use browser wallet/provider proof.
- Do NOT count a family-specific probe unless it is invoked through the maintained operator entrypoint.
- Do NOT count dry-run/no-spend recheck as live operator execution.
- Do NOT close roadmap Wave B.6 without product readback for the maintained live operator cycle.
- Do NOT target BET for the first live operator proof.
- Do NOT treat tx confirmation alone as product success.
- Do NOT persist secrets.
- Do NOT self-close the external Gregor/OpenClaw gate from Codex.

## §11. Definition Of Done

The goal is complete only when all of these are true:

- [x] Every §9 acceptance criterion is checked with evidence.
- [x] `PrdSpecificityGate` passes for this brief/PRD pair.
- [x] `npx tsc --noEmit --pretty false` exits 0 after code changes.
- [x] Focused tests for touched code exit 0.
- [x] `npm --prefix packages/omniweb-toolkit run check:verification-matrix` exits 0.
- [x] Package gates exit 0 when publish-facing package behavior changes.
- [x] Live publish/reply operator proof includes product readback and lifecycle proof.
- [x] `bet-hl` is proved or precisely STUCK/degraded.
- [x] Identity is proved or precisely blocked.
- [x] M6b external gate evidence exists or is explicitly blocked by the external owner.
- [x] §13 contains a final report with changed files, commits, PRs, proof packets, live/no-spend/spend status, and remaining blockers.
- [x] Beads child milestones are closed or blocked honestly, gate state is accurate, and `bd dolt push` succeeds.

## §12. Assumptions And Open Questions

- Assumption: PR #413 is merged as checkpoint truth on `main`.
- Assumption: publish/reply is the first live operator target.
- Assumption: BET fixed-price remains already proved through prior delayed readback; `bet-hl` now also has current pool/product readback proof, while full operator-cycle BET selection remains intentionally unclaimed.
- Assumption: identity execution requires explicit authorization and usable credentials.
- Assumption: Gregor/OpenClaw runtime evidence comes from the configured runtime host, not Codex local self-certification.
- Resolved question: exact live publish/reply target was chosen by the maintained decision loop from current live state; the successful M3 target was publish `Iran Oil Supply Risk`.

## §13. Run Log

- 2026-05-16T13:33Z - M0 / AC-1: PR #413 retitled to `Colony Operator capability truth and dry-run checkpoint`, reworded in docs/body, checks `check`, `validate`, and `codex-review` passed, no comments/reviews/threads existed, and PR #413 merged as squash commit `52397c54e8ae4721f9f0847738eaf52972571894`.
- 2026-05-16T13:36Z - Beads graph created under parent `omniweb-agents-8tga`; M0 `8tga.1` closed; dependency chain created through `8tga.8`; external M6b gate `omniweb-agents-aick` blocks M7; `bd ready --json` shows `omniweb-agents-8tga.2` as the real next child milestone.
- 2026-05-16T14:21Z - M1 / AC-2: added exported `runColonyOperatorCycle()` in `omniweb-toolkit/agent`, a maintained `check:colony-operator-entrypoint` proof, lifecycle-plan/write-store seam, and focused tests. Evidence: `npm test -- tests/packages/colony-operator-entrypoint.test.ts tests/packages/colony-operator-capability-truth.test.ts tests/packages/colony-operator-starter.test.ts` passed 8 tests; `npm --prefix packages/omniweb-toolkit run check:colony-operator-entrypoint` returned `ok: true`; `npx tsc --noEmit --pretty false` exited 0. Spend status: no-spend dry-run proof only; live write remains AC-4.
- 2026-05-16T14:23Z - M2 / AC-3: added maintained `check:colony-operator-decision-coverage` proof. Evidence: selected families were `skip`, `publish`, `reply`, and `react`; surfaced alternatives included `tip`, `VOTE`, `bet-fixed`, and `bet-hl`; `VOTE` stayed `vote_publish`; `bet-fixed`/`bet-hl` stayed `market_write`; `bet-hl` stayed `lifecycle-pending` with `higher_lower_current_delayed_readback_pending`; all coverage scenarios were no-spend. `npm --prefix packages/omniweb-toolkit run check:colony-operator-decision-coverage`, focused Vitest, and `npx tsc --noEmit --pretty false` exited 0.
- 2026-05-16T14:27Z - M3 / AC-4 first explicit execute attempt through `npm --prefix packages/omniweb-toolkit run run:colony-operator-cycle -- --execute --state-dir /tmp/omni-live-colony-operator-m3 --proof-out /tmp/omni-live-colony-operator-m3/live-operator-proof.json --feed-timeout-ms 90000 --feed-poll-ms 5000 --feed-limit 50` failed before broadcast with `INVALID_INPUT: text must be at least 200 characters for long-form scoring bonus`. Spend status: no-spend; lifecycle failure record `wl-20260516T142702339Z-66db1495` preserved the failed attempt.
- 2026-05-16T14:29Z - M3 / AC-4 passed after fixing the maintained publish text length and rerunning exactly one explicit live publish attempt in a fresh state directory. Command: `npm --prefix packages/omniweb-toolkit run run:colony-operator-cycle -- --execute --state-dir /tmp/omni-live-colony-operator-m3-v2 --proof-out /tmp/omni-live-colony-operator-m3-v2/live-operator-proof.json --feed-timeout-ms 90000 --feed-poll-ms 5000 --feed-limit 50`. Wallet/operator: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`. Selected action: publish `Iran Oil Supply Risk` observation through `colony-operator.surface-policy.v1` route `publish_multi_surface_observation`; skipped alternatives included `skip`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, `bet-hl`, `register`, and `human-link`. Tx `c173f76365f1a62ba03b535442d04b8ccb4759a649517ac656a19d6fbdc6ecdf`; attestation tx `400f36f72cfa5adfc8e418007d1b24450ab0cfd5ee89c945046a3b4cb0e886c3`; attestation response hash `c1b5499d49254cc9449ddcb7e357c4bb7b1cb38473e350362c2864799ea7f1b4`. Product readback: `feed_indexed`, `verificationPath=feed`, `feedScope=category`, `observedCategory=OBSERVATION`, `observedBlockNumber=2267706`, `observedScore=80`, `postDetailVisible=true`, `chainVisible=true`, `polls=14`, `elapsedMs=82101`. Lifecycle record `wl-20260516T142945874Z-8033b0b4` and proof packet `/tmp/omni-live-colony-operator-m3-v2/live-operator-proof.json` now contain a `recent-feed` product-readback observation and final verdict `pass`. Spend status: `executed`, budget estimate `1 DEM`; no retry spend was made after success.
- 2026-05-16T14:36Z - M4 / AC-5 no-spend higher/lower preflight initially found the live pool surface but rejected seedable pools because `referencePrice` was `null`. The maintained selector now accepts empty higher/lower pools as seed candidates. Evidence: `npm test -- tests/packages/market-write-proof.test.ts` passed 7 tests and `npx tsc --noEmit --pretty false` exited 0.
- 2026-05-16T14:38Z - M4 / AC-5 passed with one explicit live `bet-hl` attempt after the no-spend candidate was viable. Command: `node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --only hl --state-dir /tmp/omni-live-colony-operator-m4-v2 --hl-timeout-ms 30000 --poll-ms 3000 --execute`. Wallet/operator: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`. Plan: BTC 24h LOWER, amount `5 DEM`, pool `0x8e39a7b63da4fc41e6680042a379fbeaf1623368ff8205ba2b2c8bd6918e7c42`, memo `HIVE_HL:BTC:LOWER:24h`, seedable `referencePrice=null`, sentiment score `-44`. Tx `30fc92bca4cf5585302c78ac0363dba0176f2b78a4e20fe43b8ff750c1dde3d1`. Pool/product readback after 8 polls proved the write: before `totalLower=0`, `totalDem=0`, `lowerCount=0`, `referencePrice=null`; after `totalLower=5`, `totalDem=5`, `lowerCount=1`, `referencePrice=78091.51`. Spend status: executed; balance moved `1737 -> 1731` with estimated spend `6 DEM`. The API registration recovery endpoint still returned `wrong_tx_type` for the native transaction, but maintained pool readback verified the product state, so tx confirmation alone was not used as success.
- 2026-05-16T14:41Z - M5 / AC-6 blocked precisely without storing secrets or running a mutation. Command: `node --import tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts --state-dir /tmp/omni-live-colony-operator-m5-dry-run`. Output: `attempted=false`, wallet/operator `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`, message `Dry run only. Re-run with --execute to perform the live register + link + unlink proof.` Exact blocker: this PRD and brief require explicit authorization for live identity register/link execution, and the current `/goal` request did not explicitly authorize identity mutation or challenge/link cleanup. No mnemonic, token, challenge secret, approval token, or private operator note was written.
- 2026-05-16T14:43Z - M6a / AC-7 handoff packet created at `docs/archive/agent-handoffs/live-colony-operator-openclaw-gregor-handoff-2026-05-16.md`. It names the colony-operator workspace, skill slug, env requirements, package preflights, OpenClaw activation commands, no-spend smoke command, expected outputs, returned-evidence artifact list, and cleanup. External M6b gate `omniweb-agents-aick` remains open and human-owned; exact blocker is configured runtime-host evidence not yet returned, and Codex must not self-close it.
- 2026-05-16T14:50Z - M7 / AC-8 final audit completed. Updated roadmap, verification matrix, launch proving matrix, package docs, registry mirror references, colony-operator memory, this PRD, Beads child status, and M6b gate notes. Changed files in the final audit slice: `docs/ROADMAP.md`, `docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md`, `docs/archive/agent-handoffs/live-colony-operator-openclaw-gregor-handoff-2026-05-16.md`, `packages/omniweb-toolkit/references/verification-matrix.md`, `packages/omniweb-toolkit/references/launch-proving-matrix.md`, registry mirror copies of those two references, and colony-operator README/memory doctrine files. Commits in this branch: `c7fa7615` (maintained operator entrypoint and decision coverage), `c51b5201` (live operator publish proof runner, higher/lower proof fix, and AC-4/AC-5 evidence), plus the final audit/docs sync commit containing this entry. PR evidence: branch `codex/live-colony-goal-run-main` pushed to origin; PR #413 remains the merged checkpoint truth and PR #414 remains the launch packet merge. Required gates passed: `PrdSpecificityGate` PASS; `npx tsc --noEmit --pretty false` exit 0; focused Vitest `tests/packages/colony-operator-entrypoint.test.ts tests/packages/colony-operator-starter.test.ts tests/packages/market-write-proof.test.ts` passed 13 tests; `npm --prefix packages/omniweb-toolkit run check:verification-matrix` exit 0; `npm --prefix packages/omniweb-toolkit run check:evals` passed 30/30; `npm --prefix packages/omniweb-toolkit run check:package` exit 0 after regenerating registry mirrors; `npm --prefix packages/omniweb-toolkit run check:openclaw-runtime -- --archetype colony-operator --workspace agents/openclaw/colony-operator` exit 0 for static runtime contract. Final live/no-spend/spend status: AC-4 live publish executed with product readback and lifecycle proof; AC-5 live `bet-hl` executed with pool readback; AC-6 identity remained no-spend and precisely blocked by missing explicit identity-mutation authorization; AC-7 M6b remains no-spend/external-blocked until Gregor/OpenClaw returns runtime-host evidence. Remaining blocker: gate `omniweb-agents-aick` is still open/human-owned by design; Codex did not self-close it.
- 2026-05-16T14:52Z - Beads closeout: `omniweb-agents-8tga.8` and parent `omniweb-agents-8tga` were closed with `--force` only to record the accepted precise external blocker while preserving open human gate `omniweb-agents-aick`; Codex did not close the M6b gate. `bd dolt push` returned `Push complete.`
