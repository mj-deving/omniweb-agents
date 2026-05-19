---
type: goal-brief
status: active
created: 2026-05-19
owner_bead: omniweb-agents-action-spectrum
summary: "Source contract for proving the full OmniWeb read/write action spectrum under explicit live-spend authorization."
---

# Full Action Spectrum Goal Brief

## Objective

Prepare a GoalMode-backed live test lane that proves which OmniWeb operations can be read, planned, executed, and verified today.

This is the successor to the hosted no-spend operator consumer proof. The hosted proof showed that a clean external-style consumer can install the local tarball and produce honest no-spend action packets. This lane moves to live action-spectrum proof: every recommended read and every write or mutation family must either pass with evidence, degrade with a precise reason, or be marked unsupported/blocked with no launch claim.

## Hard Boundaries

- No live spend in PR0.
- No live operation without an explicit child bead, branch, command, budget ceiling, wallet/host record, and operator authorization.
- No npm release or public registry proof.
- No unsupervised identity mutation.
- No long-lived identity/profile mutation without a throwaway or explicitly approved target profile.
- No webhook mutation without a controlled callback URL and cleanup plan.
- No market-write success claim from tx confirmation alone; pool, winners, or history readback is the primary proof.
- No publish/reply success claim from tx confirmation alone; feed, detail, or thread readback must be recorded separately.
- No tip success claim from tx confirmation alone; tip stats and balance/readback drift must remain visible.
- No storage, IPFS, escrow, or raw chain transfer run without bounded spend and readback criteria.

## Inputs

- `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md`
- `docs/ROADMAP.md`
- `packages/omniweb-toolkit/SKILL.md`
- `packages/omniweb-toolkit/TOOLKIT.md`
- `packages/omniweb-toolkit/references/capabilities-guide.md`
- `packages/omniweb-toolkit/references/verification-matrix.md`
- `packages/omniweb-toolkit/references/launch-proving-matrix.md`
- `packages/omniweb-toolkit/references/write-surface-sweep.md`
- `packages/omniweb-toolkit/references/toolkit-guardrails.md`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md`
- `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/NEXT_BAND_CHEAT_SHEET.md`

## Acceptance Anchors

AC-1. The full action-spectrum matrix exists and covers all exported read, write, mutation, and helper families.

AC-2. Every matrix row has environment, command or missing-harness gap, spend/mutation class, explicit authorization requirement, success/readback criteria, and degraded verdict vocabulary.

AC-3. Read and discovery execution stays no-spend and records current host drift instead of assuming stale proof.

AC-4. Social, publish, reply, attestation, tip, and VOTE writes have explicit preflight, spend cap, execute/broadcast flag, tx evidence, and product readback criteria.

AC-5. Market writes separate fixed-price BET, higher/lower BET, VOTE prediction, manual registration recovery, and unsupported binary registration paths.

AC-6. Identity, human-link, webhooks, and deprecated identity wrappers stay supervised and require controlled mutation targets plus cleanup/readback.

AC-7. Escrow, storage, IPFS, and raw chain operations are included as first-class Demos-domain proof rows, not left as vague future work.

AC-8. The roadmap and colony-operator re-entry mirror identify `omniweb-agents-action-spectrum` as the next lane without overwriting the completed consumer-spectrum `omniweb-agents-spectrum` history.

AC-9. Closeout updates verification/proof references and Beads memory with proven, degraded, unsupported, or blocked status for every row.

## Beads

Parent epic: `omniweb-agents-action-spectrum`.

- `omniweb-agents-action-spectrum.0`: PR0 - full action-spectrum matrix scaffold.
- `omniweb-agents-action-spectrum.1`: PR1 - read and discovery spectrum refresh.
- `omniweb-agents-action-spectrum.2`: PR2 - social publish and tip live spend sweep.
- `omniweb-agents-action-spectrum.3`: PR3 - market and prediction live spend sweep.
- `omniweb-agents-action-spectrum.4`: PR4 - identity admin and delivery mutation sweep.
- `omniweb-agents-action-spectrum.5`: PR5 - non-colony domain spend and mutation sweep.
- `omniweb-agents-action-spectrum.6`: PR6 - action-spectrum closeout and release gating.

Sequence:

`action-spectrum.0 -> action-spectrum.1 -> action-spectrum.2/action-spectrum.3 -> action-spectrum.4 -> action-spectrum.5 -> action-spectrum.6`

## Done

The lane is done only when every full-spectrum row has evidence or an explicit degraded/unsupported/blocked verdict, all spend is reconciled against the approved budget, identity/admin cleanup is verified, Beads are pushed, and no npm release or public registry proof is claimed.
