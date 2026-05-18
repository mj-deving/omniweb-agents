---
type: goal-launch
status: active
created: 2026-05-18
source_contract: docs/CONSUMER_SPECTRUM_MASTER_PRD.md
owner_bead: omniweb-agents-spectrum
summary: "Copy/paste launch packet for continuing the consumer-spectrum epic across sessions."
---

# Consumer Spectrum Goal Launch

Use this when resuming the epic:

```text
Execute `omniweb-agents-spectrum` end to end from `docs/CONSUMER_SPECTRUM_MASTER_PRD.md`.

Keep Beads as the execution ledger. Claim one concrete child bead at a time, branch from current `origin/main`, open one PR per bead, inspect Codex review/CI before merge, and push Beads after every durable state change.

Hard boundaries:
- no npm release
- no public registry proof
- no live spend unless a later bead separately authorizes it
- no unsupervised identity mutation
- no blind dead-code deletion before inventory evidence
- no feature widening before official docs, live endpoint response shapes, and local code reachability are compared

Current first implementation lane:
- `omniweb-agents-spectrum.1`: build `check:consumer-spectrum-inventory`

Validation for the first lane:
- `npx vitest run tests/packages/consumer-spectrum-inventory.test.ts`
- `npm --prefix packages/omniweb-toolkit run check:consumer-spectrum-inventory`
- `git diff --check`
- `bd ready --json`
- `bd dolt push`
```
