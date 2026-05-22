# CURRENT_DOCTRINE.md

Status: active
Updated: 2026-05-22
Checkpoint PRs: `#360` — https://github.com/mj-deving/omniweb-agents/pull/360 (planning), `#371` — https://github.com/mj-deving/omniweb-agents/pull/371 (market-write merge checkpoint), `#372` — https://github.com/mj-deving/omniweb-agents/pull/372 (docs/proofs closeout checkpoint), `#376` — intent-boundary cleanup closeout, `#409` — fixed-price agentic DEM bet delayed-readback proof, `#411` — durable write lifecycle/readback goal, `#419` — Wave D release-readiness without npm release, `#427` — toolkit guardrails, `#428/#429` — action admissibility, `#431` — no-spend maintained operator-cycle proof, `#432-#441` — completed no-release consumer-spectrum/codebase map and local tarball whole-spectrum proof, `#443-#447 + PR5` — completed hosted no-spend operator consumer GoalMode proof, `omniweb-agents-action-spectrum` — completed full-operation matrix lane, `#458-#460` — completed no-spend operatorHelp read-stress/write-preview pass, `#462-#464` — safety blockers closed for the testnet live-write tranche, `#465-#468` — bounded testnet live-write tranche proof and STUCK/degraded closeout, `#470` — VOTE RPC candidate fallback and `rpcSelection` proof, `#471-#478` — Phase 24 continuation with green VOTE and raw-chain proof plus social target-thin closeout, `#482` — write/spend sweep, `#483` — explicit mutation-probe credential targeting, `omniweb-agents-5mnk.2` — storage preview blocked before mutation by missing explicit agent profile

Purpose: hold the exact colony-operator re-entry truth so fresh sessions do not drift back into older premises.
Recent live-ops truth-sync PRs: `#378`, `#379`, `#380`, `#382`, `#389`, `#390`, `#391`, `#392`, `#409`, `#411`, `#416`, `#418`, `#419`, `#427`, `#428`, `#429`, `#431`, `#432`, `#433`, `#434`, `#435`, `#436`, `#437`, `#438`, `#439`, `#440`, `#441`, `#443`, `#444`, `#445`, `#446`, `#447`, `#470`, `#471`, `#472`, `#474`, `#475`, `#476`, `#477`, `#478`, `#482`, `#483`

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
- PR #413 is the `omniweb-agents-zqnh` capability-truth checkpoint, not the full lifecycle-aware Colony Operator MegaGoal completion. The follow-on live execution packet under `omniweb-agents-8tga` proved one bounded maintained operator publish cycle with product readback, current higher/lower pool readback, the earlier pre-q5k8 identity blocker, and accepted OpenClaw/Gregor no-spend runtime-host activation under `omniweb-agents-aick`.
- Wave C `omniweb-agents-q5k8` has now locally proved supervised identity participation through maintained package paths: live `register` with product readback, official human-link challenge/claim/approve/readback, and unlink cleanup with post-cleanup readback. Identity remains supervised and requires `--execute --confirm-identity-mutation`; it is not a default autonomous operator action.
- PR #419 completes Wave D release-readiness without npm release, public registry proof, or broad launch claims.
- Wave E / `omniweb-agents-capsurf` is complete through PRs #420-#426: the toolkit/runtime layer owns the maintained capability surface a fresh colony operator inspects for supported actions, params, proof status, response depth, readiness, lifecycle, and execution boundaries. Skills/playbooks stay strategy-focused and should not re-teach protocol mechanics.
- PR #427 completed the toolkit guardrail surface. PRs #428/#429 completed `omniweb-agents-admissibility`: capability answers what exists, guardrails answer whether it is safe, and action admissibility answers whether this specific action can be planned or executed right now.
- PR #431 completed `uw66.6`: the maintained multi-action operator-cycle report surface now observes live context, selects an action, surfaces maintained alternatives, runs capability/guardrail/lifecycle/supervision/explicit-execute/admissibility truth, and emits a no-spend verdict unless a specific live effect is separately authorized.
- The no-release consumer-spectrum lane is complete through PRs #432-#441. It compared official SuperColony docs/discovery, actual live endpoint response shapes, local toolkit/code reachability, public exports, transport/read/chat/webhook/market consumers, market write intents, and a clean local tarball whole-spectrum consumer install proof.
- Beads epic `omniweb-agents-spectrum` is complete. This lane did not authorize npm release, public registry proof, live multi-action spend, or unsupervised identity mutation.
- The hosted no-spend operator consumer lane is complete through `omniweb-agents-hosted`: a hosted/external-style proof over the local tarball. Its GoalMode packet is `docs/HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md`, `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md`, and `docs/HOSTED_OPERATOR_CONSUMER_GOAL_LAUNCH.md`. It proves clean tarball install, package-name imports, repeated full-spectrum no-spend operator cycles, capability/guardrail/lifecycle/supervision/explicit-execute/admissibility truth, drift/degraded proof packets, optional dry-run-only hosted smoke, and front-door check wiring. It does not authorize npm release, public registry proof, live spend, production hosted activation, or unsupervised identity mutation.
- The full action-spectrum matrix lane is complete. The no-spend `omniweb-agents-operator-stress` read/write-preview pass is complete through PRs #458-#460, with GoalMode packet/status in `docs/goalmode/colony-operator-stress-test-2026-05-19.md`. PR #459 classified 92 reads as 48 green, 33 thin, 6 auth-gated, 5 degraded, and 0 missing-param/dev-only/broken, while preserving the 1h/12h pool horizon HTTP 400 drift. PR #460 generated proposed action packets for all 28 writes without mutation.
- The Phase 24 testnet live-write tranche has current proof through PRs #465-#478 plus post-sweep hardening through PRs #482-#483. Green: fixed-price BTC 30m BET, BTC 24h higher/lower lower BET, and VOTE, all with product readback. VOTE was STUCK on `node3.demos.sh` 502 in PR #468, PR #470 fixed the node3-only blocker with RPC candidate fallback and `rpcSelection`, PR #472 proved no-spend fallback, and PR #476 ran exactly one VOTE live publish: tx `68532c333cd78f2451cad8c3f376be4292399807c4552fb38d788f7a52e482af`, lifecycle verdict `pass`, category-search matched tx. Social remains DEGRADED/BLOCKED because PR #474's 500-post preview found no untouched attested target meeting score >=85 and engagement >=5; PR #477 preserves that floor and forbids forced mutation without a fresh eligible target or separate controlled-target plan. Advanced domains are decomposed by PR #475; PR #478 proved raw-chain sign/read as no-spend/no-broadcast with redacted signature, verified message, balance 1737, and block `2298490`. PR #483 requires explicit existing `--agent-name` or `--env-path` before live storage/IPFS/escrow broadcast. The May 22 storage preview for `omniweb-agents-5mnk.2` stopped before mutation because `--agent-name mj-codex-proof-agent` was not found, so there is no public address, quote, readback, broadcast, or DEM spend for storage yet. Nominal DEM spend remains 10/25; storage is blocked until an explicit target resolves, while IPFS and escrow remain unattempted child-bead follow-ups.

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
- `packages/omniweb-toolkit/references/uw66.6-maintained-operator-cycle-proof-2026-05-18.md`
- `docs/ROADMAP.md` completed lane: consumer spectrum and codebase reality map through PRs #432-#441
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
- `docs/CONSUMER_SPECTRUM_GOAL_BRIEF.md`
- `docs/CONSUMER_SPECTRUM_MASTER_PRD.md`
- `docs/CONSUMER_SPECTRUM_GOAL_LAUNCH.md`
- `docs/HOSTED_OPERATOR_CONSUMER_GOAL_BRIEF.md`
- `docs/HOSTED_OPERATOR_CONSUMER_MASTER_PRD.md`
- `docs/HOSTED_OPERATOR_CONSUMER_GOAL_LAUNCH.md`
- `docs/FULL_ACTION_SPECTRUM_GOAL_BRIEF.md`
- `docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md`
- `docs/FULL_ACTION_SPECTRUM_GOAL_LAUNCH.md`
- `docs/goalmode/testnet-live-write-continuation-2026-05-21.md`
- `docs/goalmode/testnet-live-write-successor-2026-05-21.md`
- `docs/goalmode/testnet-live-write-advanced-domain-successor-2026-05-22.md`
- `packages/omniweb-toolkit/references/testnet-live-write-continuation-2026-05-21/phase24-continuation-closeout.json`
- `packages/omniweb-toolkit/references/full-action-spectrum-testing-matrix.md`
- `docs/ROADMAP.md` Wave E / `omniweb-agents-capsurf` and post-Wave-E action admissibility
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
12. Wave C `omniweb-agents-q5k8` proved live local identity participation on May 16, 2026: register proof `/tmp/omni-live-colony-identity-m3-final/register-proof.json`, human-link proof `/tmp/omni-live-colony-identity-m4/human-link-proof.json`, and cleanup proof `/tmp/omni-live-colony-identity-m5/cleanup-proof.json`. The proof packets redacted challenge/signature/token-like material and kept identity supervised.
13. Harden and consumerize only after the live operator floor and external runtime story are honest; the copied-bundle outside-in proof is current for no-spend consumer posture, not for registry publication or external hosted OpenClaw/Gregor live identity mutation.
14. Wave D release-readiness is complete without release, and Wave E toolkit-owned capability surface is complete through `omniweb-agents-capsurf` / PRs #420-#426.
15. Toolkit guardrails are complete via PR #427, and action admissibility is complete via PRs #428/#429: the toolkit owns the admissibility API, selected actions and multi-action dry-run plans carry per-action admissibility, and `executeResolvedIntent()` fails closed before side effects unless final admissibility is `allowed`.
16. `uw66.6` proves the maintained multi-action operator-cycle report surface in no-spend mode: observed context, selected action, all maintained alternatives, per-action capability/guardrail/lifecycle/supervision/explicit-execute/admissibility status, and final verdict. BET/higher-lower widening is deliberate follow-up inside that lane, not default authority to spend.
17. The consumer-spectrum lane is complete: PR #433 added the inventory gate; PR #434 classified codebase reachability and found no static dead/orphaned or duplicate/superseded local code; PR #435 normalized public exports; PRs #436-#439 widened transport, read/profile, chat/webhook, and market reads; PR #440 added no-spend market write intents; PR #441 proved the clean local tarball whole-spectrum consumer journey.
18. Future cleanup or widening must cite those inventories/checks. Do not delete code simply because it looks old, and do not treat the local tarball proof as npm release or public registry evidence.
19. Hosted no-spend operator consumer proof is complete through `omniweb-agents-hosted`: clean local-tarball install, package-name imports, repeated no-spend full-spectrum cycles, optional dry-run hosted smoke, drift/degraded ledger, and front-door check wiring.
20. `omniweb-agents-action-spectrum` is complete. `omniweb-agents-operator-stress` is complete for the default no-spend pass through PRs #458-#460: read-surface stress first, write previews second.
21. Phase 24 continuation `omniweb-agents-0d7f` is complete through PRs #471-#478: VOTE is green through fallback no-spend plus one live publish/readback, social is target-thin DEGRADED/BLOCKED, and raw-chain advanced proof is green with no spend/no broadcast.
22. The next prepared `/goal` packet is `docs/goalmode/testnet-live-write-advanced-domain-successor-2026-05-22.md`. Further spendful advanced work belongs to storage/IPFS/escrow child beads `omniweb-agents-5mnk.2` / `.3` / `.4`, must start with no-spend preview, and must use explicit existing `--agent-name` or `--env-path` before live `--broadcast`. Storage already tried `--agent-name mj-codex-proof-agent` on May 22 and is blocked until that target exists or a different explicit existing target is selected.

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
- Do **not** use Wave E, guardrails, or the completed admissibility layer as permission to publish to npm, prove public registry install, rewrite the broad substrate, or run live multi-action spend. Those are explicitly deferred unless separately authorized.
- Do **not** treat action admissibility as still upcoming/current architecture work. It is complete via PRs #428/#429.
- Do **not** treat `uw66.6` as still upcoming/current architecture work. It is complete via PR #431.
- Do **not** treat the consumer-spectrum/live-shape/codebase inventory as still upcoming/current architecture work. It is complete via PRs #432-#441.
- Do **not** release, publish to npm, prove public registry install, or do release follow-up in this lane.
- Do **not** relaunch `omniweb-agents-hosted` as release, public-registry, live-spend, or production hosted-activation work; those need a separate explicit lane.
- Do **not** treat the hosted no-spend proof as production hosted activation, live spend authority, or public registry evidence.
- Do **not** treat `omniweb-agents-operator-stress.0` or `.1` as live spend authority. They are roadmap/packet prep; the default stress run is read-only plus write previews.
- Do **not** interpret the May 21 testnet approval as unlimited authority. It waives per-operation human prompts only for the bounded testnet tranche; code-level live flags, budget, target, readback, and stop conditions still apply.
- Do **not** run live storage/IPFS/escrow broadcast from `default-runtime`; PR #483 made explicit existing credential targeting part of the mutation guardrail.
- Do **not** reuse `omniweb-agents-spectrum` for this new lane; that ID is historical consumer-spectrum closeout in docs.
- Do **not** widen package behavior or delete old code before the inventory has compared official docs, live endpoint shapes, and local code reachability.
- Do **not** let skills/playbooks become the protocol mechanics source of truth again. Wave E moved capability discovery, params, proof tiers, response-depth access, readiness, lifecycle, and execution truth into toolkit/runtime surfaces; the admissibility layer consumes that truth instead of re-teaching it.
- `5xp4.8` remains a maintained proof checkpoint, but it does **not** replace the landed `5xp4.15` checkpoint as the current architecture/documentation truth.
- Broader Demos/SDK proof bands like StorageProgram, escrow, and IPFS are now included in the action-spectrum matrix, but execution remains gated behind the dedicated non-colony child bead and explicit budget.
- When uncertain, re-read PR #360, PR #371, PR #376, and the live Beads state before coding.
