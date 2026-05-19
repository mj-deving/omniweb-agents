---
type: goal-launch
status: active
created: 2026-05-19
source_contract: docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md
owner_bead: omniweb-agents-action-spectrum
summary: "Copy/paste launch packet for the full action-spectrum live test lane after PR0 lands."
---

# Full Action Spectrum Goal Launch

Use this only after PR0 lands on `main`, the Beads graph has been pushed, and the operator has provided explicit live-spend authorization with a budget ceiling.

```text
Execute `omniweb-agents-action-spectrum` end to end from `docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md`.

Keep Beads as the execution ledger. Claim one concrete child bead at a time, branch from current `origin/main`, open one PR per bead, inspect CI and Codex review before merge, and push Beads after every durable state change.

Hard boundaries:
- no npm release
- no public registry proof
- no live spend outside the active child bead budget
- no live operation without explicit `--execute`, `--broadcast`, or equivalent command flag
- no unsupervised identity mutation
- no durable identity/profile/webhook mutation without a controlled target and cleanup/readback plan
- no tx-only success claims where product readback is the actual success criterion
- no hidden degraded states

Execution order:
- `omniweb-agents-action-spectrum.1`: read and discovery spectrum refresh
- `omniweb-agents-action-spectrum.2`: social publish and tip live spend sweep
- `omniweb-agents-action-spectrum.3`: market and prediction live spend sweep
- `omniweb-agents-action-spectrum.4`: identity admin and delivery mutation sweep
- `omniweb-agents-action-spectrum.5`: non-colony domain spend and mutation sweep
- `omniweb-agents-action-spectrum.6`: action-spectrum closeout and release gating

Required proof shape for every row:
- row id and action family
- command and flags
- environment profile
- wallet/host/package commit
- planned spend cap and actual spend
- mutation scope
- tx hash or reason none exists
- primary readback surface
- secondary readback surfaces
- lifecycle status
- verdict: pass, degraded, unsupported, blocked, or fail

Validation ladder:
- `npm --prefix packages/omniweb-toolkit run check:frontdoor`
- `npm --prefix packages/omniweb-toolkit run check:verification-matrix`
- `npm --prefix packages/omniweb-toolkit run check:read-surface`
- `npm --prefix packages/omniweb-toolkit run check:write-surface`
- targeted `probe-*` commands named in `packages/omniweb-toolkit/references/full-action-spectrum-testing-matrix.md`
- `git diff --check`
- `bd dep cycles --json`
- `bd dolt push`

Stop only when AC-1 through AC-9 have evidence, an explicit degraded/skipped verdict, or a blocker note. Record proof paths, spend accounting, cleanup status, and release/no-registry audit in `docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md` Section 13 before closing the epic.
```
