---
summary: Checklist for keeping the baseline colony-operator path central while demoting or archiving stale specialist and mixed-era surfaces.
read_when: You are cleaning the repo front path or deciding what stays first-class versus supporting or archival.
---

# Repo Surface Cleanup Checklist

Use this checklist to move the repo toward a cleaner front path around the playbook-owned colony-operator baseline.

## First-class: keep central

### Colony-operator baseline and entrypoints
- [ ] `agents/openclaw/colony-operator/README.md` stays the default OpenClaw bundle story
- [ ] `references/colony-operator-baseline.md` stays the shortest durable statement of the baseline operator
- [ ] `references/repo-surface-policy.md` stays the canonical classification rule for repo surfaces
- [ ] keep `agents/openclaw/README.md` aligned so colony-operator is plainly the default path

### Minimum honest proof set
- [ ] keep one baseline dry-run / no-spend operator proof
- [ ] keep one supervised live publish checkpoint as a release gate, not as the repo's architectural center
- [ ] keep one readback / visibility truth proof
- [ ] keep one outside-in consumer / install proof
- [ ] remove wording that implies broader live guarantees than those proofs actually support

## Demote: keep but stop centering

### Specialist bundles
- [ ] keep `agents/openclaw/research-agent/` as legacy/reference, not default path
- [ ] keep `agents/openclaw/market-analyst/` as legacy/reference, not default path
- [ ] keep `agents/openclaw/engagement-optimizer/` as legacy/reference, not default path
- [ ] review references that still present specialist bundles as the center of gravity

### Advanced proof and research machinery
- [ ] review `references/research-e2e-matrix-2026-04-18.md` and linked matrix surfaces for demoted framing
- [ ] review broad publish / wave / coverage proof docs and ensure they read as expansion or audit material, not default launch story
- [ ] move large scenario or sweep language out of front-door docs unless it supports the minimum honest proof set directly

### Heavy starter behavior
- [ ] thin `skills/omniweb-colony-operator/starter.ts` so it stops owning topic/action/writing policy beyond a minimal proof scaffold (`15f9`)
- [ ] keep `minimal-agent-starter.mjs` as the simplest shell and avoid implying that heavy scaffold behavior is the default operator loop
- [ ] make sure doctrine files always outrank starter scaffolds in the reader's mental model

## Archive or salvage-only

### Mixed-era salvage
- [ ] treat `f0zn` stash content as archaeology only
- [ ] extract doctrine/hygiene fragments surgically
- [ ] discard mixed research-matrix/runtime residue that no longer supports the current baseline

### Superseded narratives
- [ ] identify launch or capability docs that still flatten dry-run, live checkpoint, and broad live guarantee into one claim
- [ ] archive one-off proof bundles that no longer validate a current first-class claim
- [ ] move stale specialist-first framing out of front-path docs

## Execution order

1. Land doctrine/default-path truth (`5hny` / PR #342)
2. Thin colony-operator starter and remove harness leakage (`15f9`)
3. Demote advanced research runtime and restore simple default path (`lolz`)
4. Mine `f0zn` surgically for still-valid doctrine/hygiene fragments only
5. Continue front-path cleanup until the repo front door matches current doctrine
