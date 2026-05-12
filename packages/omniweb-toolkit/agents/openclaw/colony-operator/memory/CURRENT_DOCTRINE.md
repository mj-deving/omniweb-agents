# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-12
Checkpoint PRs: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360 (planning), `#371` — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint), `#372` — https://github.com/mj-deving/omniweb-agents/pull/372 (docs/proofs closeout checkpoint), `#378` — https://github.com/mj-deving/omniweb-agents/pull/378 (node/API blocker-truth closeout)

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.

## Current status quo

- `omniweb-toolkit` already has a broad SuperColony/Demos substrate.
- The main problem was **boundary blur**, not missing primitives.
- The preferred architectural pivot is **playbook-owned policy over a shared request/resolution/execution seam**.
- PR #360 persists the planning map, policy contract, and implementation plan. It is a **historical planning checkpoint**, not the current code frontier.
- Current shipped code truth is now:
  - read-first
  - no-spend by default on the maintained consumer/default proof path
  - an explicit policy layer that owns reads, conditions, routes, and full-surface action requests
  - an intent layer that normalizes those requests and abstracts routing to colony primitives
  - a shared seam that is landed through `5xp4.14`
  - substrate/runtime ownership of capability truth, readiness, execution, and verification
  - explicit capability/readiness truth before wallet-backed writes
- The docs/proofs realignment slice `5xp4.15` is now closed by PR #372.
- In the frozen-seam colony live-ops band, `uw66.14` is now merged as PR #378 and the active blocker has narrowed: node3 balance truth is aligned again, but the spend-bearing publish path still fails on `dahr.startProxy() timed out after 30000ms`.
- `uw66.1` therefore remains blocked, but specifically on `dahr_web2_proxy_failure`, not on balance divergence.

## Canonical sources

- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- PR #371 / commit `a6129ee3`
- PR #372 / commit `33606051`+
- PR #378 / commit `c49693c7`
- `bd show omniweb-agents-5xp4 --json`
- `bd show omniweb-agents-5xp4.15 --json`

## Canonical execution ladder

1. `omniweb-agents-5xp4.9` — PR1 request-contract seam (`PolicyActionRequest`, no behavior change) ✅ landed
2. `omniweb-agents-5xp4.10` — thin `minimal-agent.ts` into orchestration-only glue ✅ landed
3. `omniweb-agents-5xp4.11` — explicit TypeScript-first policy layer + colony-operator starter migration ✅ landed
4. `omniweb-agents-5xp4.12` — unify publish/reply/react executor + result envelope ✅ landed
5. `omniweb-agents-5xp4.13` — bring tip into the shared seam honestly ✅ landed
6. `omniweb-agents-5xp4.14` — bring market/bet writes into the same seam ✅ landed
7. `omniweb-agents-5xp4.15` — realign docs, proof surfaces, and bundle story around the new architecture ✅ landed

## Current live-ops re-entry truth

- `omniweb-agents-uw66.14` is complete and merged.
- `omniweb-agents-uw66.18` is the current bounded blocker-truth slice.
- PR #379 (`uw66.15`) and PR #380 (`uw66.16`) confirmed that balance truth is aligned again on the maintained node3 path and that attestation can reproduce the `dahr.startProxy() timed out after 30000ms` failure below full publish.
- Fresh cross-node follow-up now shows an additional global auth blocker: `https://supercolony.ai/api/auth/challenge` returns `500`, while the same path on `node2`, `node3`, and `demosnode.discus` returns `404`, so node switching cannot bypass auth by repointing the API base.
- True per-node spend-path reruns now split the remaining blocker by route: `node2` currently reports raw chain balance `0` and fails attestation with insufficient balance, while `node3` and `demosnode.discus` still fail on `dahr.startProxy() timed out after 30000ms`.
- The next honest retry rule is: do not keep spending into repeated blind publish attempts until either the global auth challenge surface recovers or one RPC route materially changes its spend-path behavior enough to justify one new bounded rerun.

## Anti-drift rules

- Do **not** treat PR #360 as the current implementation frontier; it is planning context.
- Do **not** describe the present architecture as if `5xp4.9` were still upcoming.
- Do **not** revive old operator-core, launch-first, prompt-contract, or specialist-front-door premises as the next execution center.
- `5xp4.8` remains a maintained proof checkpoint, but it does **not** replace the landed `5xp4.15` checkpoint as the current architecture/documentation truth.
- When uncertain, re-read PR #360, PR #371, and the live Beads state before coding.
