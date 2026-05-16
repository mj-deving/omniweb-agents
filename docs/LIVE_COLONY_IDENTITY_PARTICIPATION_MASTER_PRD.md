---
type: master-prd
status: frozen
created: 2026-05-16
source_contract: docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md
owner_bead: omniweb-agents-q5k8
summary: "Master PRD for the Wave C official Colony identity participation GoalMode run."
---

# Live Colony Identity Participation - Master PRD

## §0. Frontmatter

- Author: Codex
- Created: 2026-05-16
- Status: FROZEN
- Source contract: `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md`
- Stable anchors: AC-1 through AC-7
- Owner bead: `omniweb-agents-q5k8`
- Launch state: prep-only packet; `/goal` run starts after this packet lands
- Live authorization: identity mutation is authorized only inside the later `/goal` run and only behind explicit execution flags
- Fast gate: `npx tsc --noEmit --pretty false`
- Docs/matrix gate: `npm --prefix packages/omniweb-toolkit run check:verification-matrix`
- Package gate: `npm --prefix packages/omniweb-toolkit run check:package`
- GoalMode specificity gate: `bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md`

## §1. Problem

Wave B.6 proved the maintained Colony Operator can execute a bounded publish cycle with lifecycle/product readback and that OpenClaw/Gregor can activate the bundle in no-spend runtime-host mode.

The remaining Wave C gap is official identity participation:

1. live agent `register`
2. human-link challenge
3. agent claim/signature
4. human approve
5. linked-agent readback
6. unlink cleanup
7. post-cleanup readback

Dry-run identity readiness is not enough. API write responses are not enough. Success requires product readback and cleanup truth.

## §2. Vision

One maintained GoalMode run can prove identity participation honestly:

1. starts from the existing package identity surfaces
2. hardens dry-run and explicit execute gating
3. executes live mutation only after identity-specific confirmation
4. records public state and product readback without secrets
5. cleans up the human-link proof
6. records final pass, degraded, STUCK, or failed state in docs and Beads

## §3. Out Of Scope

- Running live identity mutation during packet prep.
- Browser wallet/provider proof.
- Treating identity as a default autonomous operator action.
- Storing mnemonics, bearer tokens, challenge secrets, approval tokens, signatures, or private operator notes.
- Npm publish, registry install proof, or public launch wording refresh.
- Reopening the frozen request/resolution/execution seam without evidence from this run.
- Broad StorageProgram, escrow, IPFS, XMCore, messaging, or ZK identity proof work.

## §4. Milestones

### §4.1 M0 Packet Creation And Launch Readiness

Create the GoalMode packet and Beads graph, validate the packet, merge the prep PR, and leave the exact `/goal` prompt.

M0 must not run live identity mutation.

Bead: `omniweb-agents-q5k8.1`.

### §4.2 M1 Identity Runner Hardening

Harden `packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts` or an equivalent maintained package entrypoint.

Requirements:

- dry-run default
- live mutation requires `--execute`
- live mutation also requires an identity-specific confirmation flag
- invalid live flag combinations fail before mutation
- proof output redacts challenge/signature/token-like material

Bead: `omniweb-agents-q5k8.2`.

### §4.3 M2 Supervised Identity Capability Truth

Keep `register` and `human-link` as supervised identity actions in Colony Operator truth.

Requirements:

- surface readiness and blockers
- include identity in skipped alternatives where relevant
- keep no-spend default
- do not make identity an autonomous default choice

Bead: `omniweb-agents-q5k8.3`.

### §4.4 M3 Live Register Proof

Execute one bounded live `register` proof through maintained package/runtime paths.

Evidence must include:

- command and commit
- wallet/operator address
- public profile payload without secrets
- register result
- product readback surface
- final verdict

Success requires product readback. API write response alone can only support pending/degraded state.

Bead: `omniweb-agents-q5k8.4`.

### §4.5 M4 Live Human-Link Proof

Execute the official human-link flow:

- create challenge
- sign as agent
- claim link
- approve link
- read linked-agent state

Challenge, signature, token, and approval material must be redacted from artifacts.

Success requires linked-agent readback.

Bead: `omniweb-agents-q5k8.5`.

### §4.6 M5 Cleanup And Post-Cleanup Readback

Run `unlinkAgent` after a successful link proof and prove post-cleanup state.

If cleanup fails, preserve the exact public state and manual cleanup path as STUCK. Do not rerun mutation blindly.

Bead: `omniweb-agents-q5k8.6`.

### §4.7 M6 Optional OpenClaw/Gregor No-Spend Runtime Smoke

Optionally request or integrate a Gregor/OpenClaw no-spend runtime-host smoke for identity readiness.

This milestone is no-spend unless separately authorized. It cannot replace M3-M5 live local identity proof.

Bead: `omniweb-agents-q5k8.7`.

### §4.8 M7 Final Audit

Update roadmap, package references, operator memory, Beads, PR evidence, and §13 only after M3-M6 evidence is real or explicitly STUCK.

Bead: `omniweb-agents-q5k8.8`.

## §5. Proof Model

Every identity proof artifact must record:

- command and git commit
- wallet/operator address without secrets
- execution mode and confirmation flags
- selected identity action and skipped alternatives
- public profile/link target data that is safe to disclose
- mutation result status
- product readback surfaces checked
- cleanup state when applicable
- final verdict and rationale

Artifacts must not record:

- mnemonic
- bearer token
- challenge secret
- signature value
- approval token
- raw auth profile
- private operator notes

## §6. APIs And Interfaces

Prefer existing package-maintained surfaces:

- `omni.colony.register`
- `omni.colony.createAgentLinkChallenge`
- `omni.colony.claimAgentLink`
- `omni.colony.approveAgentLink`
- `omni.colony.getLinkedAgents`
- `omni.colony.unlinkAgent`
- `packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts`
- `buildColonyOperatorCapabilityTruth()` for supervised identity truth

Any new or changed CLI must:

- remain dry-run by default
- require `--execute` for live mutation
- require a second identity-specific confirmation flag for live identity mutation
- support `--state-dir`
- print JSON proof output
- redact secret-like material

## §7. Operator Experience

Before mutation, the operator should see:

1. whether credentials are available
2. which identity action is planned
3. what public state may be changed
4. which explicit flags are required
5. what readback will count as success
6. what cleanup will run

After mutation, the operator should see:

1. public result summary
2. product readback verdict
3. cleanup verdict
4. final pass/degraded/STUCK/failed state

## §8. Test Strategy

- AC-1: packet files exist, validate, and M0 closes only after prep PR lands.
- AC-2: dry-run safety, explicit execute confirmation, and redaction tests.
- AC-3: capability truth reports supervised identity actions without changing default autonomous behavior.
- AC-4: live register proof with product readback.
- AC-5: live human-link proof with linked-agent readback.
- AC-6: unlink cleanup with post-cleanup readback or precise STUCK.
- AC-7: final docs/Beads/PR audit after evidence is real or explicitly STUCK.

## §9. Acceptance Criteria

- [x] **AC-1** Packet creation and launch readiness are complete: brief, PRD, launch prompt, Beads graph, validation, PR merge, and exact `/goal` prompt.
- [x] **AC-2** Maintained identity runner is dry-run safe, requires `--execute` plus identity confirmation for mutation, and redacts secret-like material.
- [ ] **AC-3** Colony Operator capability/decision truth surfaces `register` and `human-link` as supervised identity actions without making them autonomous defaults.
- [ ] **AC-4** One bounded live `register` proof succeeds with product readback, or records precise STUCK/blocker evidence.
- [ ] **AC-5** One bounded live human-link challenge / claim / approve proof succeeds with linked-agent readback, or records precise STUCK/blocker evidence.
- [ ] **AC-6** Cleanup/unlink succeeds with post-cleanup readback, or records precise STUCK state and cleanup instructions.
- [ ] **AC-7** Final audit syncs roadmap, package references, operator memory, Beads, PR evidence, §13, and launch/public claims honestly.

## §10. Anti-Requirements

- Do NOT run live identity mutation during packet prep.
- Do NOT use browser wallet/provider behavior as proof.
- Do NOT count dry-run readiness as live identity proof.
- Do NOT count API write response without product readback as success.
- Do NOT store mnemonics, bearer tokens, challenge secrets, signatures, approval tokens, raw auth profiles, or private operator notes.
- Do NOT make identity an autonomous default action.
- Do NOT advance npm publish or public launch claims in this goal.

## §11. Definition Of Done

The later `/goal` run is complete only when all of these are true:

- [ ] Every §9 acceptance criterion is checked with evidence.
- [ ] `PrdSpecificityGate` passes for this brief/PRD pair.
- [ ] `npx tsc --noEmit --pretty false` exits 0 after code changes.
- [ ] Focused tests for touched code exit 0.
- [ ] `npm --prefix packages/omniweb-toolkit run check:verification-matrix` exits 0.
- [ ] Package gates exit 0 when package docs or behavior change.
- [ ] Register proof includes product readback or exact STUCK/blocker.
- [ ] Human-link proof includes linked-agent readback or exact STUCK/blocker.
- [ ] Cleanup proof includes post-cleanup readback or exact STUCK/blocker.
- [ ] §13 contains changed files, commits, PRs, proof packets, live/no-spend/spend status, and remaining blockers.
- [ ] Beads child milestones are closed or blocked honestly, `bd ready --json` reflects the next real milestone, and `bd dolt push` succeeds.

## §12. Assumptions And Open Questions

- Assumption: Wave C is authorized to run live identity mutation only inside the later `/goal` session.
- Assumption: packet prep stops at launch readiness and does not mutate identity state.
- Assumption: the first live target is the existing configured operator wallet/profile.
- Assumption: human-link cleanup is required for success; cleanup failure is STUCK.
- Assumption: OpenClaw/Gregor identity work is no-spend unless separately authorized.

## §13. Run Log

- 2026-05-16T20:54Z - Prep Beads parent `omniweb-agents-q5k8` created for `LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD`.
- 2026-05-16T20:55Z - Prep child chain created: `q5k8.1 -> q5k8.2 -> q5k8.3 -> q5k8.4 -> q5k8.5 -> q5k8.6 -> q5k8.7 -> q5k8.8`. M0 `q5k8.1` is the packet creation/launch-readiness milestone; M1 `q5k8.2` is the first real `/goal` execution milestone after prep closes.
- 2026-05-16T21:16Z - Prep packet validation passed before PR: `PrdSpecificityGate` PASS; `bun scripts/normalize-doc-frontmatter.ts --check` reported no drift; `git diff --check` passed; `npx tsc --noEmit --pretty false` exited 0; `npm --prefix packages/omniweb-toolkit run build` exited 0 with known zod export warnings; `npm --prefix packages/omniweb-toolkit run check:verification-matrix` returned `ok: true`; `npm --prefix packages/omniweb-toolkit run check:package` exited 0. No live identity mutation was run in prep.
- 2026-05-16T21:41Z - AC-1 confirmed from merged prep PR #417 at commit `735c97fd4921544544dd443d1d56962a68a49160` and Beads M0 closeout. AC-2 M1 runner hardening completed in worktree branch `codex/live-colony-identity-goal-current`: `packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts` now requires `--execute --confirm-identity-mutation` before live mutation, supports phased `register` / `human-link` / `cleanup` / `full` proof runs, writes optional `--proof-out` JSON, and redacts challenge handles, message text, signatures, approval material, and token-like data from proof output. Focused evidence: `node --import tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts --execute --phase register` exited `2` before runtime loading; dry-run proof `node --import tsx packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts --phase register --state-dir /tmp/omni-live-colony-identity-m1 --proof-out /tmp/omni-live-colony-identity-m1/register-dry-run.json` exited `0` with `attempted=false` and required flags recorded; `npx vitest run tests/packages/identity-proof-runner.test.ts tests/packages/colony-operator-capability-truth.test.ts` passed 6 tests; `npx tsc --noEmit --pretty false` exited `0`; `npm --prefix packages/omniweb-toolkit run build` exited `0` with known zod export warnings; `npm --prefix packages/omniweb-toolkit run check:verification-matrix` returned `ok: true`; `git diff --check` exited `0`. Dependency setup note: first `npm install` was interrupted after `onnxruntime-node` postinstall stalled on an unrelated GPU NuGet download; `npm install --ignore-scripts` completed for local validation without changing `package-lock.json`.
