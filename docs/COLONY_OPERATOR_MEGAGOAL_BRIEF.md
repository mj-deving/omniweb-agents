---
type: megagoal-brief
status: draft-gated
created: 2026-05-16
depends_on:
  - docs/WRITE_LIFECYCLE_MASTER_PRD.md
  - omniweb-agents-zg11
summary: "Post-lifecycle MegaGoal scaffold for a lifecycle-aware Colony Operator from multi-action runtime through identity participation and outside-in consumer proof."
---

# Lifecycle-Aware Colony Operator MegaGoal Brief

## Objective

Ship a lifecycle-aware Colony Operator from durable write proof through multi-action operation, official identity participation, and outside-in package proof.

This is a MegaGoal scaffold, not the active execution contract. It should become a frozen Master PRD only after `docs/WRITE_LIFECYCLE_MASTER_PRD.md` is complete and its final interfaces are known.

## Launch Gate

Do not launch this MegaGoal until the durable write lifecycle goal is complete or explicitly audited as complete:

- `omniweb-agents-zg11` is closed, or a fresh audit confirms it is complete.
- `docs/WRITE_LIFECYCLE_MASTER_PRD.md` §9 and §11 are fully checked with evidence.
- The lifecycle store, recheck commands, status vocabulary, and proof packet shape are available on `main`.
- Roadmap, package references, and colony-operator re-entry doctrine agree on the lifecycle model.

If the MegaGoal is launched before those are true, M0 must be "finish or audit the lifecycle goal" and no later milestone may start until M0 is complete.

## MegaGoal Statement

One maintained Colony Operator should be able to:

1. read live SuperColony surfaces
2. choose among currently proved action families
3. execute through maintained runtime paths
4. persist lifecycle records for wallet-backed writes
5. recheck delayed outcomes without spending again
6. prove official identity participation
7. ship an outside-in consumer/install proof
8. leave docs, matrices, roadmap, Beads, and proof packets synchronized

## Milestones

### M0: Durable Write Lifecycle

Status: active prerequisite.

Complete `docs/WRITE_LIFECYCLE_MASTER_PRD.md` first. This milestone owns the pending-write store, shared statuses, resumable no-spend rechecks, proof packets, docs/matrix sync, and one lifecycle validation.

Exit criteria:

- all lifecycle ACs are complete
- required gates pass
- one final lifecycle validation exists
- lifecycle interfaces are stable enough for the operator runtime to consume

### M1: Multi-Action Colony Operator Runtime

Build one maintained operator loop that can choose among:

- `skip`
- `publish`
- `reply`
- `react`
- `tip`
- `VOTE`
- `bet-fixed`
- `bet-hl`, if current higher/lower proof is available; otherwise report it as lifecycle-pending/degraded rather than pretending it is complete

Expected work:

- action-intent model covers all currently proved action families
- execution routes through maintained runtime paths, not one-off scripts
- wallet-backed actions create or update lifecycle records
- no-spend dry run can plan across all action families
- bounded validation proves the operator can produce a lifecycle proof packet

### M2: Official Colony Identity Participation

Prove the official identity participation band after the operator can already act and report lifecycle truth.

Expected work:

- register flow proof
- human-link challenge / claim / approve / readback proof
- cleanup/unlink only where safe and explicitly bounded
- no secrets or operator credentials persisted
- identity capability truth exposed in operator readiness

### M3: Outside-In Consumer Proof

Only after the live operator lane and identity participation are truthful, prove the consumer/install path.

Expected work:

- npm or registry install path unblocked
- outside-in package consumer proof
- OpenClaw or equivalent starter install proof
- public package docs describe actual capabilities rather than aspirational support
- package checks and live read checks pass from a consumer posture

### M4: Completion Audit

Close the MegaGoal by auditing that the repo tells one story.

Expected work:

- roadmap, package references, launch matrices, colony-operator memory, Beads, PRs, and proof packets agree
- final report lists changed files, commits, PRs, proof packets, live/no-spend status, and gates
- remaining deferred work is explicitly outside the MegaGoal

## Anti-Requirements

- Do not reopen the `PolicyActionRequest` seam unless a live run proves it wrong.
- Do not add new write families beyond the current operator band.
- Do not use browser wallet/provider behavior as agentic proof.
- Do not spend DEM without an explicit `--execute` or `--broadcast` flag and budget note.
- Do not start identity work before lifecycle-aware multi-action operation exists.
- Do not publish or claim consumer readiness before outside-in install proof exists.
- Do not store secrets in lifecycle records, identity proof records, or proof packets.

## Draft Launch Prompt

Use this only after the launch gate is satisfied, or after explicitly making M0 an audit/finish milestone:

```text
/goal Ship the lifecycle-aware Colony Operator MegaGoal: complete M0 through M4 without stopping until the final definition of done is satisfied, or until the same blocker fails three times and a STUCK note is recorded.

M0: Durable write lifecycle/readback. If docs/WRITE_LIFECYCLE_MASTER_PRD.md is not complete, finish or audit it first.

M1: Build the multi-action Colony Operator runtime so one maintained operator loop can choose among skip, publish, reply, react, tip, VOTE, fixed-price BET, and higher/lower BET where available, route through maintained runtime paths, and persist/recheck lifecycle records for wallet-backed writes.

M2: Prove official colony identity participation: register, link/challenge/approve/readback, and cleanup where safe. Do not store secrets.

M3: Prove outside-in consumer use: package/registry/OpenClaw or equivalent consumer install path, starter execution, and truthful capability docs.

M4: Run completion audit: all PRDs/checklists/docs/roadmap/package references/Beads state agree; required gates pass; final proof packet and completion report exist.

Rules:
- Keep live spend behind explicit --execute or --broadcast.
- Prefer no-spend delayed rechecks over new writes.
- Do not use browser wallet behavior as agentic proof.
- Do not reopen the PolicyActionRequest seam unless a live run proves it wrong.
- Commit coherent slices, open/merge PRs, push Beads state.
- Record evidence after each milestone.
```
