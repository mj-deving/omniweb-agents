---
type: goal-launch
status: ready
created: 2026-05-16
source_contract: docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md
master_prd: docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md
owner_bead: omniweb-agents-q5k8
---

# Live Colony Identity Participation Launch Prompt

## Preflight

Run from a clean worktree based on `origin/main` after this packet lands:

```bash
git status --short --branch
bd dolt pull || true
bd show omniweb-agents-q5k8 --json
bd ready --json
bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md
npx tsc --noEmit --pretty false
npm --prefix packages/omniweb-toolkit run check:verification-matrix
```

`bd ready --json` should show `omniweb-agents-q5k8.2` as the first real `/goal` execution milestone after M0 prep is closed.

## Copy/Paste Prompt

```text
/goal Complete docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md against docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md without stopping until §11 definition of done is satisfied, or until the same blocker fails three times and a STUCK note is written in §13.

Read first:
- CLAUDE.md
- AGENTS.md
- packages/omniweb-toolkit/AGENTS.md
- packages/omniweb-toolkit/SKILL.md
- packages/omniweb-toolkit/TOOLKIT.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/README.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md
- docs/ROADMAP.md
- docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md
- docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md
- docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md
- packages/omniweb-toolkit/references/verification-matrix.md
- packages/omniweb-toolkit/references/launch-proving-matrix.md
- packages/omniweb-toolkit/references/identity-surface-sweep-2026-04-17.md

Before implementation:
- Run bd dolt pull || true.
- Inspect bd show omniweb-agents-q5k8 --json.
- Inspect bd ready --json.
- Claim only the current ready child milestone before implementation.
- Preserve the dependency chain q5k8.1 -> q5k8.2 -> q5k8.3 -> q5k8.4 -> q5k8.5 -> q5k8.6 -> q5k8.7 -> q5k8.8.
- Confirm M0 is closed by the prep PR and q5k8.2 is the first real execution milestone.

Milestones:
- M0: Packet creation and launch readiness. This is complete before this /goal starts.
- M1: Harden maintained identity proof runner and dry-run safety.
- M2: Surface register and human-link as supervised identity capability/decision truth.
- M3: Execute one bounded live register proof with product readback.
- M4: Execute one bounded live human-link challenge / claim / approve proof with linked-agent readback.
- M5: Execute unlink cleanup with post-cleanup readback.
- M6: Optionally prove OpenClaw/Gregor no-spend identity runtime readiness, or record exact blocker.
- M7: Final audit sync across roadmap, package references, operator memory, Beads, PR evidence, and §13.

Rules:
- Live identity mutation is authorized only inside this /goal run.
- Do not run mutation without explicit --execute plus an identity-specific confirmation flag.
- Dry-run/no-spend readiness is useful but cannot count as live identity participation.
- API write responses do not count as success without product readback.
- Register success requires product readback of the public agent profile or equivalent official surface.
- Human-link success requires linked-agent readback after approve.
- Cleanup success requires unlink plus post-cleanup readback.
- Do not use browser wallet/provider behavior as proof.
- Do not store mnemonics, bearer tokens, challenge secrets, signatures, approval tokens, raw auth profiles, or private operator notes.
- Keep identity supervised; do not make it a default autonomous operator action.
- Commit coherent slices, open/merge PRs, and push Beads state as work lands.

Done means:
- every §9 acceptance criterion has evidence
- PrdSpecificityGate passes
- npx tsc --noEmit --pretty false exits 0 after code changes
- focused tests for touched code exit 0
- check:verification-matrix exits 0
- register proof has product readback or precise STUCK/blocker
- human-link proof has linked-agent readback or precise STUCK/blocker
- cleanup proof has post-cleanup readback or precise STUCK/blocker
- §13 contains final report with changed files, commits, PRs, proof packets, live/no-spend/spend status, and remaining blockers
- Beads child tasks are closed or blocked honestly, bd ready reflects the real next milestone, and bd dolt push succeeds
```
