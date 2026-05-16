---
type: megagoal-brief
status: frozen
created: 2026-05-16
owner_bead: omniweb-agents-q5k8
depends_on:
  - docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md
  - omniweb-agents-8tga
summary: "Source contract for preparing and launching the Wave C live Colony identity participation goal."
---

# Live Colony Identity Participation Brief

## Objective

Prepare the next GoalMode run for Wave C: prove official Colony identity participation through maintained package/runtime paths.

This prep slice creates the launch packet and Beads graph only. It must stop when the packet is ready to launch. The later `/goal` run performs any live identity mutation.

The frozen Master PRD is `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md`.

## Starting Truth

Wave B.6 is complete enough to advance:

- PR #413 is only the Colony Operator capability-truth / dry-run checkpoint.
- PR #415 proves one bounded maintained operator publish cycle with product readback and current higher/lower pool readback.
- PR #416 syncs accepted OpenClaw/Gregor no-spend runtime-host evidence.
- Identity remains unproved as a live official participation path.

The repo already has a maintained identity probe at `packages/omniweb-toolkit/scripts/probe-identity-surfaces.ts` and package methods for:

- `register`
- `createAgentLinkChallenge`
- `claimAgentLink`
- `approveAgentLink`
- `getLinkedAgents`
- `unlinkAgent`

## Prep Boundary

This implementation slice must:

- create the brief, Master PRD, and launch prompt
- encode the Beads parent and child dependency chain
- validate the packet
- merge the prep PR
- leave an exact `/goal` prompt for a fresh session

This implementation slice must not:

- run `--execute` for identity
- create, approve, or unlink live identity state
- store mnemonics, bearer tokens, challenge secrets, approval tokens, signatures, or private operator notes
- claim identity participation is proved

## Goal Run Milestones

### M0: Packet Creation And Launch Readiness

Status: complete after this prep PR lands.

Creates this packet, validates it, syncs Beads, and leaves the exact launch prompt.

Bead: `omniweb-agents-q5k8.1`.

### M1: Identity Runner Hardening

Harden the maintained identity proof runner and dry-run safety before any live mutation.

The runner must remain dry-run by default. Live identity mutation requires explicit `--execute` plus an identity-specific confirmation flag.

Bead: `omniweb-agents-q5k8.2`.

### M2: Supervised Identity Capability Truth

Connect `register` and `human-link` into Colony Operator capability and decision truth as supervised identity actions.

Identity must not become an autonomous default action. The operator may surface readiness and skipped identity alternatives, but mutation remains explicit.

Bead: `omniweb-agents-q5k8.3`.

### M3: Live Register Proof

Execute one bounded live `register` proof through the maintained package/runtime path.

Success requires product readback of the public agent profile or equivalent official surface. API write response alone is not success.

Bead: `omniweb-agents-q5k8.4`.

### M4: Live Human-Link Proof

Execute the official human-link challenge / agent signature / claim / approve path.

Success requires linked-agent product readback after approve. Challenge, signature, and approval-token material must not be persisted.

Bead: `omniweb-agents-q5k8.5`.

### M5: Cleanup And Post-Cleanup Readback

Run `unlinkAgent` after a successful link proof and prove the linked-agent state is cleaned up.

If cleanup fails, record STUCK with the exact public-state cleanup path. Do not hide cleanup failure behind an otherwise successful link proof.

Bead: `omniweb-agents-q5k8.6`.

### M6: Optional OpenClaw/Gregor No-Spend Runtime Smoke

Optionally prove identity readiness from a configured OpenClaw/Gregor runtime host.

This milestone is no-spend by default. It must not perform live identity mutation unless separately authorized.

Bead: `omniweb-agents-q5k8.7`.

### M7: Final Audit

Update roadmap, package references, operator memory, Beads, PR evidence, and this PRD after M3-M6 evidence is real or explicitly STUCK.

Bead: `omniweb-agents-q5k8.8`.

## Anti-Requirements

- Do not run live identity mutation during packet prep.
- Do not use browser wallet/provider behavior as proof.
- Do not count dry-run identity readiness as live identity completion.
- Do not count API write success without product readback.
- Do not persist secrets, signatures, challenge secrets, approval tokens, or private operator notes.
- Do not make identity an autonomous default operator action.
- Do not advance Wave D npm/public-launch claims until Wave C evidence is merged and audited.

## Beads

Parent epic: `omniweb-agents-q5k8`.

Dependency order:

`q5k8.1 -> q5k8.2 -> q5k8.3 -> q5k8.4 -> q5k8.5 -> q5k8.6 -> q5k8.7 -> q5k8.8`

After prep closes M0, `bd ready --json` should show `omniweb-agents-q5k8.2` as the first real `/goal` milestone.
