# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-25
Checkpoint PRs: `#555` roadmap reset, `#556` README architecture trim

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not
drift back into older architecture ladders or proof packets.

## Status Quo

- `docs/ROADMAP.md` is the active strategy authority and should stay one page.
- Beads and GitHub PRs are execution truth.
- `packages/omniweb-toolkit/` is the package authority for API, capability,
  readiness, admissibility, lifecycle, and verification facts.
- Historical proof ladders belong in archives or package references, not in the
  active roadmap or this mirror.
- Colony Operator is a maintained consumer/re-entry bundle over the toolkit, not
  a parallel control plane.

## Architecture Rule

One concept gets one authority:

- capability truth: package runtime registry
- readiness/admissibility/lifecycle/verification: derived runtime/package views
- active strategy: `docs/ROADMAP.md`
- execution state: Beads and GitHub
- history and proof detail: `docs/archive/` plus package references
- operator strategy: thin playbooks and OpenClaw bundle docs

The current README and stack diagram collapse the old `Operator surface` and
`Proof loop` language into **Proof & Operations**. Treat CLI probes, package
checks, proof packets, and no-spend previews as one harness.

## Active Product Order

1. Storage no-spend ergonomics.
2. DemosWork / XM / Rubic import-boundary proof.
3. IPFS / escrow only if new evidence changes their current blocked/degraded
   posture.

## Anti-Drift Rules

- Do not append completed proof ladders back into `docs/ROADMAP.md`.
- Do not copy package reference content into this mirror when a link is enough.
- Do not describe action admissibility, guardrails, capability discovery, or the
  proof/operations harness as upcoming architecture work; they are current
  surfaces to use and harden from evidence.
- Do not treat the closed controlled proof packet, 9st0 runway, 04c5 hardening,
  xqlb cleanup, g2iv self-audit, or fcui raw-transfer closeout as live-write
  authority.
- Do not run live storage/IPFS/escrow broadcast from `default-runtime`; any
  mutation needs explicit existing credential targeting and a fresh packet.
- Do not promote raw-transfer base-unit/fractional DEM support. Installed-runtime
  proof remains integer-only.

## Current Boundaries

- Default proof posture: read-first and no-spend.
- No npm/public registry publication claim.
- No production hosted activation claim.
- No mainnet spend, wallet mutation, upload, broadcast, secret handling change,
  or uncontrolled credential/profile mutation from this reset.
- Future live work must spell out official-doc evidence, SDK/API/source behavior,
  package behavior, no-spend proof, budget, target, command, live flags,
  mutation/tx evidence, product readback criteria, stop rules, and ledger update.

## Re-Entry Checklist

1. Read `CLAUDE.md`, `AGENTS.md`, and the package-local `AGENTS.md`.
2. Pull Beads, inspect `bd ready --json`, and inspect open PRs.
3. Read `docs/ROADMAP.md` for active strategy.
4. Use this file only as a short mirror; if it conflicts with package truth,
   package truth wins.
