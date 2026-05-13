# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-13
Checkpoint PRs: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360 (planning), `#371` — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint), `#372` — https://github.com/mj-deving/omniweb-agents/pull/372 (docs/proofs closeout checkpoint), `#376` — intent-boundary cleanup closeout

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.
Recent live-ops truth-sync PRs: `#378`, `#379`, `#380`, `#382`

Quick re-entry card: `packages/omniweb-toolkit/agents/openclaw/colony-operator/memory/NEXT_BAND_CHEAT_SHEET.md`

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
  - a shared seam that is landed through `5xp4.15`
  - substrate/runtime ownership of capability truth, readiness, execution, and verification
  - explicit capability/readiness truth before wallet-backed writes
- The docs/proofs realignment slice `5xp4.15` is closed by PR #372, and PR #376 closes the intent-boundary cleanup that removed lingering policy-side readiness leakage.
- The next execution band is **not** another broad architecture rewrite. It is a frozen-seam colony live-ops lane: finish `0z87` + `5xp4.8`, keep the thin waist stable for one wave, prove real multi-action colony execution above it, then harden lower layers from live evidence.
- Current live blocker truth below `uw66.1` is no longer the older node-balance ambiguity alone: the active blocker is upstream auth instability plus DAHR/Web2 proxy startup failure, while `node2` remains unusable because raw chain balance is still `0 DEM` even when colony/API balance surfaces can read `1000 DEM`.

## Canonical sources

- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- PR #371 / commit `a6129ee3`
- PR #372 / commit `33606051`+
- PR #376 / intent-boundary cleanup closeout
- PR #378 / commit `c49693c7`
- `packages/omniweb-toolkit/references/2026-05-12-node3-web2-proxy-handoff.md`
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

## Current next band

1. `0z87` and `5xp4.8` are now closed; keep that closeout pair as the gate that opened the frozen-seam live-ops band.
2. Freeze the thin waist for one live-ops wave: `PolicyActionRequest`, resolved status truth, and the execution/verification envelope should not churn casually.
3. The blocker-truth/diagnosis wave is already landed through PR #382; `uw66.1` now stays parked until upstream auth/proxy conditions change enough to justify one fresh bounded rerun.
4. The immediate next move is an upstream-quality handoff/fix slice for the hosted auth + node3/Web2 proxy failure, not another blind spend-bearing retry.
5. After that blocker clears, prove real operator execution across `publish`, `reply`, `react`, `tip`, `bet`, then official identity participation (`register`, human-link challenge/claim/approve/unlink`).
6. Harden and consumerize only after the live operator floor is real.

## Anti-drift rules

- Do **not** treat PR #360 as the current implementation frontier; it is planning context.
- Do **not** describe the present architecture as if `5xp4.9` were still upcoming.
- Do **not** reopen broad seam churn when the current need is live operator proof above the seam.
- Do **not** keep brute-retrying `uw66.1` while hosted auth or proxy truth is unstable; rerun only when the preconditions are explicit and materially changed.
- Do **not** default to forking the substrate; fork the operator lane above the seam first if a faster track is needed.
- `5xp4.8` remains a maintained proof checkpoint, but it does **not** replace the landed `5xp4.15` checkpoint as the current architecture/documentation truth.
- Broader Demos/SDK proof bands like StorageProgram, escrow, and IPFS are explicitly later work, not the next colony lane.
- When uncertain, re-read PR #360, PR #371, PR #376, and the live Beads state before coding.
