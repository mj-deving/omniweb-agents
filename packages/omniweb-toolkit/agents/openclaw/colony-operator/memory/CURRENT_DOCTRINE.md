# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-15
Checkpoint PRs: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360 (planning), `#371` — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint), `#372` — https://github.com/mj-deving/omniweb-agents/pull/372 (docs/proofs closeout checkpoint), `#376` — intent-boundary cleanup closeout

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.
Recent live-ops truth-sync PRs: `#378`, `#379`, `#380`, `#382`, `#389`, `#390`, `#391`, `#392`

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
- `uw66.3` is now live-reaction proven in the bounded sense: the maintained social-write probe executed an `agree` reaction and readback confirmed the target moved from `agree: 6` to `agree: 7` with `myReaction: "agree"` on the first poll.
- `uw66.4` is now live-tip proven in the bounded sense: the maintained tip-only probe sent `1 DEM`, returned tx `25da09cf964502a05b7651b1f549f2c33c9d15ab3b779f15295cec74db933a4c`, and confirmed it on-chain at block `2263010`; post/recipient tip stats and balance readback remained stale.
- `uw66.5` is currently blocked by `omniweb-agents-3myq`: the maintained fixed-price market-write probe first sent a plain 5 DEM `SOL` transfer tx and chain verification confirmed it, but `/api/bets/place` rejected registration as `wrong_tx_type` and pool readback stayed unchanged. A raw `content.type: "transfer"` envelope is not a valid local workaround: it can confirm, but it does not produce the pool inflow registration verifies, and manually adding balance GCR edits fails node confirmation with `GCREdit mismatch`. A later memo-bearing `native-content-memo` transfer tx (`4acb9f76d54a96415e77d3639af591355efd42f598850295852c4cfea72cf4f1`, memo `HIVE_BET:SOL:89:4h`) confirmed at block `2264378` from the expected wallet and moved balance readback `1747 -> 1741`, but the SOL 4h pool stayed `totalBets=0,totalDem=0`; manual registration recovery returned `wrong_sender`. `native-data-memo` was confirm-only validated, not broadcast, to preserve the one-5-DEM-attempt cap.

## Canonical sources

- `packages/omniweb-toolkit/references/2026-05-08-supercolony-substrate-status-map.md`
- `packages/omniweb-toolkit/references/playbook-owned-policy-contract.md`
- `packages/omniweb-toolkit/references/playbook-policy-implementation-plan.md`
- PR #371 / commit `a6129ee3`
- PR #372 / commit `33606051`+
- PR #376 / intent-boundary cleanup closeout
- PR #378 / commit `c49693c7`
- PR #389 / commit `abd08f8444bd`
- PR #391 / commit `5ee8839e`
- PR #392 / commit `eab82eb3`
- `packages/omniweb-toolkit/references/uw66.1-bounded-live-publish-proof-2026-05-14.md`
- `packages/omniweb-toolkit/references/uw66.2-bounded-live-reply-proof-2026-05-14.md`
- `packages/omniweb-toolkit/references/uw66.3-bounded-live-reaction-proof-2026-05-15.md`
- `packages/omniweb-toolkit/references/uw66.4-bounded-live-tip-proof-2026-05-15.md`
- `packages/omniweb-toolkit/references/uw66.5-market-write-blocker-2026-05-15.md`
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
4. `uw66.2` is closed as the reply proof slice: accepted reply tx and attestation tx are chain-confirmed, parent-thread readback is confirmed, and recent-feed indexing remains degraded rather than hidden.
5. `uw66.3` is closed as the reaction proof slice: maintained `agree` execution succeeded and first-poll readback confirmed the reaction.
6. `uw66.4` is closed as the tip proof slice: a 1 DEM tip tx is confirmed on-chain, while post/recipient stats and balance readback remained degraded.
7. `uw66.5` is blocked by `omniweb-agents-3myq`: current market-write registration/pool readback rejects or ignores confirmed native transfer txs, raw `transfer` envelopes are disproven, and the memo-bearing native candidate still does not produce verified pool inflow.
8. The immediate next move is agentic adoption, not human-path adoption: keep the maintained proof on the headless runtime transfer lane, treat `wallet-native-transfer` as a human/browser diagnostic candidate only, require pool readback as the only pass condition, and keep active agent predictions on the proven VOTE/PREDICTION lane while headless DEM pool readback remains unavailable.
9. After market-write, continue with one maintained multi-action cycle, then official identity participation (`register`, human-link challenge/claim/approve/unlink`).
10. Harden and consumerize only after the live operator floor is real.

## Anti-drift rules

- Do **not** treat PR #360 as the current implementation frontier; it is planning context.
- Do **not** describe the present architecture as if `5xp4.9` were still upcoming.
- Do **not** reopen broad seam churn when the current need is live operator proof above the seam.
- Do **not** reopen `uw66.1` through `uw66.4` just because a bounded proof is narrower than launch-grade repeatability; they are proof checkpoints with honest visibility/readback classifications.
- Do **not** retry `uw66.5` as a normal proof loop until `omniweb-agents-3myq` is resolved; the current blocker is memo-bearing transfer plus inflow compatibility between the SDK/runtime transfer path, node GCR validation, and SuperColony bet registration/indexing.
- Do **not** default to forking the substrate; fork the operator lane above the seam first if a faster track is needed.
- `5xp4.8` remains a maintained proof checkpoint, but it does **not** replace the landed `5xp4.15` checkpoint as the current architecture/documentation truth.
- Broader Demos/SDK proof bands like StorageProgram, escrow, and IPFS are explicitly later work, not the next colony lane.
- When uncertain, re-read PR #360, PR #371, PR #376, and the live Beads state before coding.
