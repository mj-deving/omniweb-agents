# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-16
Checkpoint PRs: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360 (planning), `#371` — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint), `#372` — https://github.com/mj-deving/omniweb-agents/pull/372 (docs/proofs closeout checkpoint), `#376` — intent-boundary cleanup closeout, `#409` — fixed-price agentic DEM bet delayed-readback proof, `#411` — durable write lifecycle/readback goal

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.
Recent live-ops truth-sync PRs: `#378`, `#379`, `#380`, `#382`, `#389`, `#390`, `#391`, `#392`, `#409`, `#411`, `#416`

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
- `uw66.5` / PR #409 changed the market-write conclusion: fixed-price agentic DEM betting works through the headless native args-memo path, but only after delayed indexing/readback. BTC txs `07a921826d436781685505a05ae967dd5a6c55bd9940cc8153b0bb1c70352440` and `0fb5dda1416130bf3288f5e97aab96c015eacdbfd6605898f2b362b6ae4f8007`, plus ETH tx `7dbee3140aa2b6ef83b6f580db3f52dab0f5531adcbe5653927eb110e86f9471`, resolved in SuperColony winners at block `2265016` after same-window active-pool polling missed them.
- The cross-family write lifecycle layer is landed by PR #411. It exists in `packages/omniweb-toolkit/scripts/_write-lifecycle.ts` with probe wiring for publish/reply visibility, VOTE, social writes, and fixed-price BET no-spend rechecks. Publish, reply, tip, VOTE, and BET already show different delayed-indexing/readback behavior; future runs must consume lifecycle records and proof packets rather than equating short timeout with failed write.
- PR #413 is the `omniweb-agents-zqnh` capability-truth checkpoint, not the full lifecycle-aware Colony Operator MegaGoal completion. The follow-on live execution packet under `omniweb-agents-8tga` has now proved one bounded maintained operator publish cycle with product readback, current higher/lower pool readback, an identity exact-blocker, and accepted OpenClaw/Gregor no-spend runtime-host activation under `omniweb-agents-aick`.
- The next Wave C packet is `omniweb-agents-q5k8`: `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md`, `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md`, and `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_LAUNCH.md`. The packet is prep-only until `/goal` starts in a fresh session; do not run live identity mutation during packet prep.

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
- `packages/omniweb-toolkit/references/uw66.6-agentic-memo-bet-readback-2026-05-16.md`
- `packages/omniweb-toolkit/references/write-lifecycle.md`
- `docs/WRITE_LIFECYCLE_GOAL_BRIEF.md`
- `docs/WRITE_LIFECYCLE_MASTER_PRD.md`
- `docs/WRITE_LIFECYCLE_GOAL_LAUNCH.md`
- `docs/COLONY_OPERATOR_MEGAGOAL_BRIEF.md`
- `docs/COLONY_OPERATOR_MEGAGOAL_MASTER_PRD.md`
- `docs/COLONY_OPERATOR_MEGAGOAL_LAUNCH.md`
- `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_BRIEF.md`
- `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md`
- `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_LAUNCH.md`
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
7. `uw66.5` is proven for fixed-price BET through PR #409's native args-memo path and delayed winners readback.
8. PR #413 under `omniweb-agents-zqnh` is a capability-truth/dry-run checkpoint: M0 lifecycle audit is complete, capability truth is implemented in `buildColonyOperatorCapabilityTruth()`, and the copied-bundle dry-run proof now reports `skip`, `publish`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, `bet-hl`, `register`, and `human-link`.
9. `omniweb-agents-8tga` proved one bounded maintained operator publish cycle with product readback: lifecycle record `wl-20260516T142945874Z-8033b0b4`, proof packet `/tmp/omni-live-colony-operator-m3-v2/live-operator-proof.json`, tx `c173f76365f1a62ba03b535442d04b8ccb4759a649517ac656a19d6fbdc6ecdf`, and attestation tx `400f36f72cfa5adfc8e418007d1b24450ab0cfd5ee89c945046a3b4cb0e886c3`.
10. Higher/lower now has current pool-readback proof through the maintained market-write probe: BTC 24h LOWER tx `30fc92bca4cf5585302c78ac0363dba0176f2b78a4e20fe43b8ff750c1dde3d1` moved `totalLower 0 -> 5`, `totalDem 0 -> 5`, and `lowerCount 0 -> 1`. The default dry-run operator snapshot may still describe higher/lower as lifecycle-pending until the full operator-cycle BET path is deliberately widened.
11. Identity participation is not blanket ready by default. Registration and human-link are supervised identity mutations that require explicit identity-mutation authorization and `--execute`; dry-run identity probing can record address/readiness without storing challenge secrets or approval tokens.
12. Wave C is now the ready-to-launch identity GoalMode lane under `omniweb-agents-q5k8`. Packet prep stops before mutation; the later `/goal` run may execute live `register`, human-link approve/readback, and unlink cleanup only behind explicit `--execute` plus identity-specific confirmation.
13. Harden and consumerize only after the live operator floor and external runtime story are honest; the copied-bundle outside-in proof is current for no-spend consumer posture, not for registry publication or live OpenClaw host activation.

## Anti-drift rules

- Do **not** treat PR #360 as the current implementation frontier; it is planning context.
- Do **not** describe the present architecture as if `5xp4.9` were still upcoming.
- Do **not** reopen broad seam churn when the current need is live operator proof above the seam.
- Do **not** reopen `uw66.1` through `uw66.4` just because a bounded proof is narrower than launch-grade repeatability; they are proof checkpoints with honest visibility/readback classifications.
- Do **not** call a live write failed solely because its product readback surface is empty inside a short poll window. First classify chain state, indexer state, family-specific readback surfaces, elapsed time, and expiration policy.
- Do **not** rerun spend before checking whether an existing lifecycle record or tx hash can be rechecked with `--recheck` or `--check-tx`.
- Do **not** retry fixed-price BET as a normal proof loop; it is proven enough for the next lifecycle slice. Use existing tx hashes for no-spend delayed rechecks unless the next PRD explicitly authorizes a bounded spend.
- Do **not** treat the M4 higher/lower family-specific proof as blanket operator-cycle BET authority; it proves current pool readback for the maintained market-write lane.
- Do **not** self-close future OpenClaw/Gregor runtime gates. The May 16 `omniweb-agents-aick` gate closed only after explicit human acceptance of Gregor's archive-level audit; use `docs/archive/agent-handoffs/live-colony-operator-openclaw-gregor-handoff-2026-05-16.md` as the evidence pattern for future runtime-host checks.
- Do **not** default to forking the substrate; fork the operator lane above the seam first if a faster track is needed.
- `5xp4.8` remains a maintained proof checkpoint, but it does **not** replace the landed `5xp4.15` checkpoint as the current architecture/documentation truth.
- Broader Demos/SDK proof bands like StorageProgram, escrow, and IPFS are explicitly later work, not the next colony lane.
- When uncertain, re-read PR #360, PR #371, PR #376, and the live Beads state before coding.
