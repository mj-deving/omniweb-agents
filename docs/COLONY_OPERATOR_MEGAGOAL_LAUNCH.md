---
type: goal-launch
status: ready
created: 2026-05-16
source_contract: docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md
master_prd: docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md
owner_bead: omniweb-agents-zqnh
---

# Colony Operator MegaGoal Launch Prompt

## Preflight

Run from a clean worktree based on `origin/main` after this launch packet lands:

```bash
codex features list | grep -E "^goals\s"
git status --short --branch
gh pr view 411 --json state,mergeCommit
gh pr view 410 --json state,mergeCommit
bd show omniweb-agents-zqnh --json
bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md
npx tsc --noEmit --pretty false
npm --prefix packages/omniweb-toolkit run check:verification-matrix
```

Launch only from a branch that includes PR #411 and this prep packet.

## Copy/Paste Prompt

```text
/goal Complete docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md against docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md without stopping until the §11 definition of done is satisfied, or until the same blocker fails three times and a STUCK note is written in §13.

Read first:
- CLAUDE.md
- AGENTS.md
- packages/omniweb-toolkit/AGENTS.md
- packages/omniweb-toolkit/SKILL.md
- packages/omniweb-toolkit/TOOLKIT.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/AGENTS.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/README.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/SKILL.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/PLAYBOOK.md
- docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md
- docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md
- docs/WRITE_LIFECYCLE_MASTER_PRD.md
- docs/ROADMAP.md
- packages/omniweb-toolkit/references/write-lifecycle.md
- packages/omniweb-toolkit/references/verification-matrix.md
- packages/omniweb-toolkit/references/launch-proving-matrix.md

Before implementation:
- Verify PR #411 is merged to the base branch.
- Run ./scripts/check-beads-health.sh --fix --sync.
- Inspect bd show omniweb-agents-zqnh --json.
- Create/claim child beads under omniweb-agents-zqnh for coherent implementation slices.
- If multiple slices touch hot files, serialize with the repo merge slot.

Milestones:
- M0: Audit durable write lifecycle/readback from PR #411 and docs/WRITE_LIFECYCLE_MASTER_PRD.md before starting M1. Do not stop after M0.
- M1: Build the multi-action Colony Operator runtime so one maintained loop can choose among skip, publish, reply, react, tip, VOTE, fixed-price BET, and higher/lower BET where available, route through maintained runtime paths, and persist/recheck lifecycle records for wallet-backed writes.
- M2: Prove official colony identity participation: register, link/challenge, claim/approve/readback, and cleanup/unlink where safe. Do not store secrets.
- M3: Prove outside-in consumer use: package/registry/OpenClaw or equivalent consumer install path, starter execution, and truthful capability docs.
- M4: Run completion audit: all PRDs/checklists/docs/roadmap/package references/Beads state agree; required gates pass; final proof packet and completion report exist.

Stable anchors:
- AC-1 lifecycle completion audit
- AC-2 multi-action operator decision/status surface
- AC-3 maintained runtime and lifecycle integration
- AC-4 no-spend multi-action dry-run cycle
- AC-5 bounded operator lifecycle proof packet
- AC-6 official identity participation proof or honest blocker
- AC-7 capability/readiness truth for lifecycle and identity states
- AC-8 outside-in consumer proof
- AC-9 docs/matrix/roadmap/memory/Beads sync
- AC-10 completion audit

Rules:
- Work milestone by milestone, but do not stop after AC-1 or M0.
- Keep live spend behind explicit --execute or --broadcast and within launch-proving-matrix budgets.
- Prefer no-spend delayed rechecks and dry-run operator cycles before any new live write.
- Do not use browser wallet/provider behavior as agentic proof.
- Do not reopen the PolicyActionRequest seam unless a live run proves it wrong.
- Do not declare product success from tx confirmation alone.
- Do not declare final failure solely from a short readback miss; classify pending-chain, pending-indexer, indexed, resolved, degraded, expired, or failed.
- Do not store mnemonics, bearer tokens, challenge secrets, approval tokens, or private operator notes in lifecycle records, identity proof records, proof packets, docs, or Beads.
- After each meaningful code change, run npx tsc --noEmit --pretty false and the focused test for touched code.
- When an anchor is complete, mark its §9 checkbox and append a §13 note with command/evidence.
- Commit coherent slices, open/merge PRs, and push Beads state as work lands.
- If the same blocker fails three times, write a STUCK note in §13 naming the anchor, attempts, exact commands, and needed input, then pause.

Done means:
- every §9 anchor is complete with evidence
- PrdSpecificityGate passes
- npx tsc --noEmit --pretty false exits 0
- focused tests for touched code exit 0
- npm --prefix packages/omniweb-toolkit run check:package exits 0
- npm --prefix packages/omniweb-toolkit run check:evals exits 0
- npm --prefix packages/omniweb-toolkit run check:verification-matrix exits 0
- npm --prefix packages/omniweb-toolkit run check:live exits 0
- npm --prefix packages/omniweb-toolkit run check:live:detailed exits 0
- AC-5 operator/lifecycle proof packet is recorded with real SuperColony/Demos readback or a three-attempt STUCK blocker
- AC-6 identity proof or honest blocked/degraded state is recorded without secrets
- AC-8 outside-in consumer proof is recorded
- §13 contains a completion report with changed files, commits, PRs, proof packets, and live/no-spend/spend status
- Beads child tasks are closed or explicitly blocked/deferred, and bd dolt push succeeds
```
