---
type: goal-launch
status: historical-superseded
created: 2026-05-16
source_contract: docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md
master_prd: docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md
owner_bead: omniweb-agents-8tga
---

# Live Colony Operator Execution Launch Prompt

## Current Status: Reference Only

This launch prompt is historical and superseded. It documents how the May 16
live proof ladder was launched; it is not a current execution packet and must
not be used to run live commands.

Do not run publish, reply, identity, BET, wallet, provider-auth, OpenClaw probe,
or `--execute` commands from this packet without a new explicit authorization
packet. A fresh packet must include wallet/operator readiness, budget,
lifecycle capture, product readback criteria, mutation evidence, and stop rules.

Current default posture is no-spend. The 2026-06-04 OpenClaw colony-operator
boundary proof was static/no-spend and kept `executionProven=false`.

## Historical Preflight

Run from a clean worktree based on `origin/main` after this packet lands:

```bash
git status --short --branch
gh pr view 413 --json state,mergeCommit,title
bd show omniweb-agents-8tga --json
bd ready --json
bd gate show omniweb-agents-aick || bd gate list
bun ~/.claude/skills/GoalMode/Tools/PrdSpecificityGate.ts docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md
npx tsc --noEmit --pretty false
npm --prefix packages/omniweb-toolkit run check:verification-matrix
```

`bd ready --json` should show `omniweb-agents-8tga.2` as the next child milestone after M0.

## Historical Copy/Paste Prompt

Reference only. Do not paste this as an active `/goal` without first replacing
it with a new authorization packet for the exact current live operation.

```text
/goal Complete docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md against docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md without stopping until §11 definition of done is satisfied, or until the same blocker fails three times and a STUCK note is written in §13.

Read first:
- CLAUDE.md
- AGENTS.md
- packages/omniweb-toolkit/AGENTS.md
- packages/omniweb-toolkit/SKILL.md
- packages/omniweb-toolkit/TOOLKIT.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/README.md
- packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/CURRENT_DOCTRINE.md
- docs/LIVE_COLONY_OPERATOR_EXECUTION_BRIEF.md
- docs/LIVE_COLONY_OPERATOR_EXECUTION_MASTER_PRD.md
- docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md
- docs/ROADMAP.md
- packages/omniweb-toolkit/references/write-lifecycle.md
- packages/omniweb-toolkit/references/verification-matrix.md
- packages/omniweb-toolkit/references/launch-proving-matrix.md

Before implementation:
- Verify PR #413 is merged as checkpoint truth.
- Run bd dolt pull || true.
- Inspect bd show omniweb-agents-8tga --json.
- Inspect bd ready --json.
- Claim only the current ready child milestone before implementation.
- Preserve the dependency chain 8tga.1 -> 8tga.2 -> 8tga.3 -> 8tga.4 -> 8tga.5 -> 8tga.6 -> 8tga.7 -> 8tga.8.
- Preserve gate omniweb-agents-aick as M6b external OpenClaw/Gregor runtime evidence.

Milestones:
- M0: Confirm PR #413 is merged as capability-truth/dry-run checkpoint. This is already complete.
- M1: Build maintained operator entrypoint: live read -> decision -> resolution -> dry-run/execute -> lifecycle record.
- M2: Ensure decision loop covers skip, publish, reply, react, tip, VOTE, bet-fixed, and status-only bet-hl.
- M3: Execute one bounded live publish/reply operator cycle through the maintained entrypoint and prove product readback.
- M4: Prove current bet-hl delayed readback or record precise STUCK/blocker.
- M5: Run identity register/link live proof only if explicitly authorized and credentials exist; otherwise record exact blocker.
- M6a: Prepare OpenClaw/Gregor handoff packet with exact commands, env requirements, expected outputs, proof paths, and cleanup notes.
- M6b: Wait for Gregor/OpenClaw external runtime-host evidence. Codex must not self-close this gate.
- M7: Final audit only after M3-M6 evidence is real or explicitly STUCK.

Rules:
- First live operator proof targets publish/reply, not BET.
- Keep live writes behind explicit --execute.
- Dry-run/no-spend recheck is useful evidence but cannot count as live operator execution.
- Family-specific probes do not count unless invoked through the maintained operator entrypoint.
- Product readback, not tx confirmation alone, determines success.
- If readback lags, preserve pending lifecycle state and recheck rather than retry spend.
- Do not use browser wallet/provider behavior as agentic proof.
- Do not store mnemonics, bearer tokens, challenge secrets, approval tokens, or private operator notes.
- Do not self-certify the OpenClaw/Gregor external runtime gate.
- Commit coherent slices, open/merge PRs, and push Beads state as work lands.

Done means:
- every §9 acceptance criterion has evidence
- PrdSpecificityGate passes
- npx tsc --noEmit --pretty false exits 0 after code changes
- focused tests for touched code exit 0
- check:verification-matrix exits 0
- live publish/reply operator proof includes product readback and lifecycle proof
- bet-hl is proved or precisely STUCK/degraded
- identity is proved or precisely blocked
- M6b external gate evidence exists or is explicitly blocked by the external owner
- §13 contains final report with changed files, commits, PRs, proof packets, and live/no-spend/spend status
- Beads child tasks and gate state are accurate, and bd dolt push succeeds
```
