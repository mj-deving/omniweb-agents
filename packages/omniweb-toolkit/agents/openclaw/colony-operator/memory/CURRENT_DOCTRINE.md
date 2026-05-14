# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-14
Checkpoint PRs: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360 (planning), `#371` — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint), `#372` — https://github.com/mj-deving/omniweb-agents/pull/372 (docs/proofs closeout checkpoint), `#376` — intent-boundary cleanup closeout

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.
Recent live-ops truth-sync PRs: `#378`, `#379`, `#380`, `#382`, `#389`

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
- The next execution band is **not** another broad architecture rewrite. It is a frozen-seam colony live-ops lane: `0z87` + `5xp4.8` are closed, the thin waist stays stable for one wave, and real multi-action colony execution is being proved above it one action family at a time.
- `uw66.1` is now live-publish proven: DAHR attestation and publish txs confirmed on-chain, with delayed recent-feed visibility.
- `uw66.2` is now live-reply proven in the bounded sense: DAHR attestation and reply txs confirmed on-chain, the reply appears in the intended parent thread, and the honest visibility verdict is post-detail/thread visible with recent-feed indexing still degraded.

## Canonical sources

- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- PR #371 / commit `a6129ee3`
- PR #372 / commit `33606051`+
- PR #376 / intent-boundary cleanup closeout
- PR #378 / commit `c49693c7`
- PR #389 / commit `abd08f8444bd`
- `packages/omniweb-toolkit/references/uw66.1-bounded-live-publish-proof-2026-05-14.md`
- `packages/omniweb-toolkit/references/uw66.2-bounded-live-reply-proof-2026-05-14.md`
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
3. The blocker-truth/diagnosis wave is landed through PR #382, response-shape/readiness cleanup is landed through PR #388, and `uw66.1` is closed by PR #389.
4. `uw66.2` is the current reply proof slice: accepted reply tx and attestation tx are chain-confirmed, parent-thread readback is confirmed, and recent-feed indexing remains degraded rather than hidden.
5. The immediate next move is `uw66.3`: prove live reaction execution and readback.
6. After reaction, continue across `tip`, `bet`, one maintained multi-action cycle, then official identity participation (`register`, human-link challenge/claim/approve/unlink`).
7. Harden and consumerize only after the live operator floor is real.

## Anti-drift rules

- Do **not** treat PR #360 as the current implementation frontier; it is planning context.
- Do **not** describe the present architecture as if `5xp4.9` were still upcoming.
- Do **not** reopen broad seam churn when the current need is live operator proof above the seam.
- Do **not** reopen `uw66.1` or `uw66.2` just because indexing is delayed; both are bounded proof checkpoints with honest visibility classifications.
- Do **not** default to forking the substrate; fork the operator lane above the seam first if a faster track is needed.
- `5xp4.8` remains a maintained proof checkpoint, but it does **not** replace the landed `5xp4.15` checkpoint as the current architecture/documentation truth.
- Broader Demos/SDK proof bands like StorageProgram, escrow, and IPFS are explicitly later work, not the next colony lane.
- When uncertain, re-read PR #360, PR #371, PR #376, and the live Beads state before coding.
