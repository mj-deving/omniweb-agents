---
type: goal-launch
status: active
created: 2026-05-19
source_contract: docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md
owner_bead: omniweb-agents-hosted
summary: "Copy/paste launch packet for the hosted no-spend operator consumer proof after PR0 lands."
---

# Hosted Operator Consumer Goal Launch

Use this only after PR0 lands on `main` and the Beads graph has been pushed.

```text
Execute `omniweb-agents-hosted` end to end from `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md`.

Keep Beads as the execution ledger. Claim one concrete child bead at a time, branch from current `origin/main`, open one PR per bead, inspect CI and Codex review before merge, and push Beads after every durable state change.

Hard boundaries:
- no npm release
- no public registry proof
- no live spend
- no live publish/reply/react/tip/VOTE/BET/broadcast/transfer
- no unsupervised identity mutation
- no live register/human-link/approval/unlink/cleanup mutation
- no repo-relative imports in the clean hosted consumer fixture
- optional hosted runtime smoke is dry-run and non-mutating only

Execution order:
- `omniweb-agents-hosted.1`: clean hosted consumer fixture
- `omniweb-agents-hosted.2`: repeated no-spend operator cycles
- `omniweb-agents-hosted.3`: optional hosted runtime smoke
- `omniweb-agents-hosted.4`: drift and degraded endpoint ledger
- `omniweb-agents-hosted.5`: GoalMode closeout and Beads memory

Acceptance anchors:
- AC-1 roadmap/re-entry truth synced
- AC-2 clean local-tarball hosted consumer fixture
- AC-3 package-name imports only
- AC-4 repeated no-spend operator cycles
- AC-5 full action-family alternatives with capability/guardrail/lifecycle/supervision/explicit-execute/admissibility truth
- AC-6 live endpoint drift/degraded classifications preserved
- AC-7 optional hosted runtime smoke remains dry-run only
- AC-8 package/front-door check wiring
- AC-9 Beads closeout and explicit no-release/no-spend/no-mutation audit

Validation ladder:
- `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer`
- `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-tarball`
- `npm --prefix packages/omniweb-toolkit run check:colony-operator-consumer`
- `npx vitest run tests/packages/colony-operator-entrypoint.test.ts tests/packages/toolkit-action-admissibility.test.ts tests/packages/toolkit-guardrails.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:frontdoor`
- `git diff --check`
- `bd ready --json`
- `bd dolt push`

Stop only when AC-1 through AC-9 have evidence, an explicit degraded/skipped verdict, or a blocker note. Record proof paths and the no-release/no-spend/no-mutation audit in `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md` Section 13 before closing the epic.
```
