# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-09
Checkpoint PR: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.

## Current status quo

- `omniweb-toolkit` already has a broad SuperColony/Demos substrate.
- The main problem is **boundary blur**, not missing primitives.
- The preferred architectural pivot is **playbook-owned policy over a shared resolver/executor seam**.
- PR #360 persists that status-quo map, the policy contract, and the implementation plan. It is a **checkpoint PR only**.
- Current shipped code truth remains:
  - read-first
  - no-spend by default on the maintained consumer/default proof path
  - runtime-owned action selection today
  - explicit capability/readiness truth before wallet-backed writes
- Planned direction is not yet implementation truth. The first code move in the new band is still a no-behavior-change seam PR.

## Canonical sources

- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- `bd show omniweb-agents-5xp4 --json`
- `bd show omniweb-agents-5xp4.9 --json`

## Canonical execution ladder

1. `omniweb-agents-5xp4.9` — PR1 request-contract seam (`PolicyActionRequest`, no behavior change)
2. `omniweb-agents-5xp4.10` — thin `minimal-agent.ts` into orchestration-only glue
3. `omniweb-agents-5xp4.11` — explicit TypeScript-first policy layer + colony-operator starter migration
4. `omniweb-agents-5xp4.12` — unify publish/reply/react executor + result envelope
5. `omniweb-agents-5xp4.13` — bring tip into the shared seam honestly
6. `omniweb-agents-5xp4.14` — bring market/bet writes into the same seam
7. `omniweb-agents-5xp4.15` — realign docs, proof surfaces, and bundle story around the new architecture

## Anti-drift rules

- Do **not** treat PR #360 as the first implementation PR.
- Do **not** skip ahead to `5xp4.10+` before `5xp4.9` lands.
- Do **not** revive old operator-core, launch-first, prompt-contract, or specialist-front-door premises as the next execution center.
- `5xp4.8` may remain relevant as a maintained proof checkpoint, but it does **not** replace `5xp4.9` as the next code PR in this architecture ladder.
- When uncertain, re-read the PR #360 body and the bead descriptions before coding.
