---
type: roadmap
status: active
updated: 2026-05-25
summary: "One-page active strategy surface. Historical proof ladders now live in the roadmap archive and package references; Beads/GitHub remain execution truth."
topic_hint: ["roadmap", "next steps", "architecture trim", "active strategy", "colony-operator"]
---

# Roadmap

> Active strategy only. Execution state lives in Beads and GitHub. Historical detail lives in [the archived pre-trim roadmap](archive/roadmaps/roadmap-2026-05-25-pre-trim.md), package references, and PR history.

## Current Truth

- `main` has completed the full OmniWeb endpoint reconciliation, 0ctx/sc96/9st0/04c5 hardening lanes, xqlb cleanup, g2iv self-audit, fcui raw-transfer unit closeout, storage no-spend ergonomics, and DemosWork/XM/Rubic import-boundary proof.
- Raw DEM transfer remains **integer DEM only**. Installed-runtime base-unit payload support is not proven.
- DemosWork, XM, and Rubic remain raw-only package surfaces: XM is `blocked`/`design-needed`, Rubic quote is `design-needed` while execute is `blocked`, and DemosWork is `blocked`/`design-needed`.
- The maintained proof posture is read-first and no-spend by default. Any future live write needs a fresh explicit packet with budget, wallet/agent target, command, mutation evidence, product readback criteria, and stop rules.
- `omniweb-toolkit` is the primary package authority. Repo docs should link package references instead of duplicating long platform facts.
- The colony-operator mirror under `packages/omniweb-toolkit/agents/openclaw/colony-operator/` is a re-entry mirror, not a second roadmap.

## Active Product Hardening Order

1. **Storage no-spend ergonomics**: complete; package preview ergonomics landed without live-write authorization.
2. **DemosWork / XM / Rubic import-boundary proof**: complete; all three remain raw-only and blocked or design-needed, with no public wrapper or fixture promotion.
3. **IPFS / escrow only with new evidence**: no active implementation lane. Revisit only after concrete official-doc, SDK/API, import-stability, quote/readback, or product-readback evidence changes the current degraded or blocked posture.

## Architecture Trim Principle

One concept gets one authority:

- package API, capability, readiness, admissibility, lifecycle, and verification truth belongs in `packages/omniweb-toolkit/`
- active strategy belongs here in `docs/ROADMAP.md`
- execution state belongs in Beads and GitHub PRs
- historical proof ladders belong in `docs/archive/` or package reference artifacts
- colony-operator memory mirrors the current re-entry contract and should stay short

The runtime story should read as one capability registry with derived readiness, admissibility, lifecycle, and verification views. The proof/ops story should read as one harness that includes CLI probes, package checks, proof packets, and no-spend previews.

## Explicitly Not Next

- no runtime/code/API cleanup in this architecture-trim lane
- no npm publish, public registry claim, or production hosted activation without explicit release authorization
- no mainnet spend, wallet mutation, or live broadcast from this roadmap reset
- no new broad architecture ladder appended to the active roadmap
- no duplicate control-plane concepts when a link to the package authority or archive is enough

## Pointers

- Archived pre-trim roadmap: [docs/archive/roadmaps/roadmap-2026-05-25-pre-trim.md](archive/roadmaps/roadmap-2026-05-25-pre-trim.md)
- Package verification matrix: [packages/omniweb-toolkit/references/verification-matrix.md](../packages/omniweb-toolkit/references/verification-matrix.md)
- Endpoint inventory: [packages/omniweb-toolkit/references/live-endpoints.md](../packages/omniweb-toolkit/references/live-endpoints.md)
- Package front door: [packages/omniweb-toolkit/README.md](../packages/omniweb-toolkit/README.md)
- Repo front door: [README.md](../README.md)
