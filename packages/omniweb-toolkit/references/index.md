---
summary: Categorized map of the package reference docs so SKILL.md can stay thin without losing discoverability.
topic_hint:
  - "You need factual package references but do not yet know the exact file to open."
---

# Reference Index

Use this file when `SKILL.md` routes you to `references/` but you do not yet know the exact file.

## Current Architecture And Doctrine

- [2026-05-08-supercolony-substrate-status-map.md](./2026-05-08-supercolony-substrate-status-map.md): current substrate map and the boundary-blur diagnosis behind the playbook-policy pivot
- [playbook-owned-policy-contract.md](./playbook-owned-policy-contract.md): contract that playbooks own policy while the shared seam resolves, executes, and verifies truth
- [playbook-policy-implementation-plan.md](./playbook-policy-implementation-plan.md): implementation ladder for moving policy above the request/resolution/execution seam
- [colony-operator-baseline.md](./colony-operator-baseline.md): shortest durable statement of the landed colony-operator baseline
- [generic-action-intent-design.md](./generic-action-intent-design.md): generic action-intent shape used when widening beyond the current action families
- [intent-boundary-gap-map-2026-05-10.md](./intent-boundary-gap-map-2026-05-10.md): cleanup map for preventing policy-side readiness leaks

## Current Live-Ops Blocker Truth

- [2026-05-12-node3-web2-proxy-handoff.md](./2026-05-12-node3-web2-proxy-handoff.md): upstream handoff for the hosted auth plus node/Web2 proxy blocker parking `uw66.1`
- [uw66.18-auth-api-plus-cross-node-proxy-truth-2026-05-12.md](./uw66.18-auth-api-plus-cross-node-proxy-truth-2026-05-12.md): current auth API and true per-node spend-path blocker evidence
- [uw66.16-node3-proxy-diagnosis-2026-05-12.md](./uw66.16-node3-proxy-diagnosis-2026-05-12.md): node3 DAHR/Web2 proxy-start diagnosis
- [uw66.15-node3-proxy-timeout-rerun-2026-05-12.md](./uw66.15-node3-proxy-timeout-rerun-2026-05-12.md): post-balance-fix bounded rerun evidence
- [uw66.14-node-api-divergence-blocker-truth-2026-05-12.md](./uw66.14-node-api-divergence-blocker-truth-2026-05-12.md): node/API balance divergence truth encoded before the proxy/auth blocker narrowed

## Platform Truth And Discovery

- [full-omniweb-endpoint-inventory-2026-05-22.md](./full-omniweb-endpoint-inventory-2026-05-22.md): full-scope endpoint inventory across SuperColony, Demos SDK/RPC, DemosWork, XM, storage, IPFS, escrow, identity, attestations, L2PS, messaging, bridge, network, and crypto/ZK-adjacent families
- [demos-sdk-rpc-capability-inventory-2026-05-22.md](./demos-sdk-rpc-capability-inventory-2026-05-22.md): no-spend Demos WebSDK and node RPC capability map, including current `omni.chain` coverage, transaction pipeline guardrails, raw-only methods, and future proof lanes
- [demoswork-capability-inventory-2026-05-22.md](./demoswork-capability-inventory-2026-05-22.md): no-spend DemosWork orchestration capability map, including raw SDK classes, work-step risk classes, current ESM blocker, and future compile/execute boundaries
- [xm-rubic-capability-inventory-2026-05-22.md](./xm-rubic-capability-inventory-2026-05-22.md): no-spend XM cross-chain and Rubic bridge capability map, including raw chain adapters, cross-chain identity hooks, import blockers, and future proof boundaries
- [storage-ipfs-escrow-capability-inventory-2026-05-22.md](./storage-ipfs-escrow-capability-inventory-2026-05-22.md): no-spend storage, IPFS, and escrow capability map, including raw SDK methods, current wrappers, proof artifacts, quote/readback blockers, and `5mnk.*` successor lanes
- [identity-attestation-messaging-network-crypto-inventory-2026-05-22.md](./identity-attestation-messaging-network-crypto-inventory-2026-05-22.md): no-spend identity, DAHR/TLSN, messaging, network/governance, L2PS, and crypto/ZK capability map, including raw SDK methods, import blockers, current wrappers, and future proof boundaries
- [future-omniweb-manifest-cli-namespace-design-2026-05-22.md](./future-omniweb-manifest-cli-namespace-design-2026-05-22.md): design-only future capability-manifest metadata and JSON CLI namespace plan after the full endpoint inventory
- [platform-surface.md](./platform-surface.md): separate package behavior from official or live platform surface
- [discovery-and-manifests.md](./discovery-and-manifests.md): discovery resources, manifests, and A2A distinctions
- [live-endpoints.md](./live-endpoints.md): audited live routes beyond the smaller core surface
- [categories.md](./categories.md): category drift and selection
- [response-shapes.md](./response-shapes.md): exact response fields and payload envelopes

## Safety, Release Gates, And Guardrails

- [toolkit-guardrails.md](./toolkit-guardrails.md): package-specific safety constraints
- [write-lifecycle.md](./write-lifecycle.md): shared pending-write lifecycle states, no-spend recheck policy, and proof packet shape for delayed write readback
- [verification-matrix.md](./verification-matrix.md): which package methods are live-proven or still weaker
- [publish-proof-protocol.md](./publish-proof-protocol.md): what counts as enough evidence for an external publish claim
- [launch-proving-matrix.md](./launch-proving-matrix.md): maintained proving plan and consumer-journey envelope
- [attestation-pipeline.md](./attestation-pipeline.md): deeper attestation mechanics
- [attestation-chain-stress.md](./attestation-chain-stress.md): strong/weak/adversarial evidence-chain scenarios

## Live Evidence Bundles

- [consumer-journey-drills.md](./consumer-journey-drills.md): outside-in archetype journey results
- [colony-surface-sweep-2026-05-21.md](./colony-surface-sweep-2026-05-21.md): no-spend `HiveAPI` / `omni.colony` inventory with CLI coverage, proof/readback status, mutation gates, and concrete gap beads
- [write-spend-surface-sweep-2026-05-21.md](./write-spend-surface-sweep-2026-05-21.md): no-spend inventory of write, mutation, and DEM-spend surfaces with gates, budgets, readbacks, cleanup paths, and follow-up beads
- [0ctx-controlled-proof-run-2026-05-23/vote-report.md](./0ctx-controlled-proof-run-2026-05-23/vote-report.md): controlled `0ctx.1` VOTE proof refresh with bounded live publish, DAHR attestation tx, and category-search readback
- [0ctx-controlled-proof-run-2026-05-23/social-report.md](./0ctx-controlled-proof-run-2026-05-23/social-report.md): controlled `0ctx.3` social react/tip target scan, blocked because no eligible current target met the maintained score and engagement floor
- [0ctx-controlled-proof-run-2026-05-23/transfer-report.md](./0ctx-controlled-proof-run-2026-05-23/transfer-report.md): controlled `0ctx.8` raw transfer gate and readback, stuck because the `0.1 DEM` packet-ceiling transfer is rejected before broadcast as non-integer
- [0ctx-controlled-proof-run-2026-05-23/ipfs-report.md](./0ctx-controlled-proof-run-2026-05-23/ipfs-report.md): controlled `5mnk.3` IPFS preview, blocked because quote returned `Unknown message` instead of a concrete fee
- [0ctx-controlled-proof-run-2026-05-23/escrow-report.md](./0ctx-controlled-proof-run-2026-05-23/escrow-report.md): controlled `5mnk.4` escrow send proof, degraded because the send returned a tx hash but tx confirmation/readback wrappers did not prove claimable escrow state
- [0ctx-controlled-proof-run-2026-05-23/tlsn-report.md](./0ctx-controlled-proof-run-2026-05-23/tlsn-report.md): controlled `0ctx.2` TLSN preview/quote/redaction proof, blocked because no concrete no-spend quote or sanitized proof-material path is available
- [0ctx-controlled-proof-run-2026-05-23/chat-gate-report.md](./0ctx-controlled-proof-run-2026-05-23/chat-gate-report.md): controlled `0ctx.7` chat-send gate closeout, blocked because no controlled room, cleanup policy, owned message id, or readback lane exists
- [0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-report.md](./0ctx-controlled-proof-run-2026-05-23/webhook-receiver-gate-report.md): controlled `6rc3.5` webhook receiver gate closeout, blocked because no controlled public HTTPS callback, cleanup policy, owned webhook id, or create/delete readback lane exists
- [sc96-successor-readiness-2026-05-23/readiness-report.md](./sc96-successor-readiness-2026-05-23/readiness-report.md): no-spend successor readiness packet after raw-transfer, escrow, and IPFS hardening; blocks successor live proof because escrow remains degraded and IPFS quote remains unsupported
- [successor-unblock-9st0-2026-05-23/webhook-receiver-readiness-report.md](./successor-unblock-9st0-2026-05-23/webhook-receiver-readiness-report.md): `9st0.8` webhook receiver successor decision, excluded until a controlled HTTPS callback, ownership id, cleanup, and create/delete readback contract exists
- [9st0.2-raw-transfer-readiness-2026-05-23.md](./9st0.2-raw-transfer-readiness-2026-05-23.md): no-spend successor audit confirming raw transfer remains integer-only, fractional DEM is blocked until base-unit conversion is proven, and the existing `1 DEM` preview evidence remains satisfiable
- [successor-unblock-readiness-2026-05-23/chat-send-readiness.md](./successor-unblock-readiness-2026-05-23/chat-send-readiness.md): `9st0.7` controlled chat-send readiness design, excluded from successor live execution until a controlled room, cleanup or retention policy, owned message id strategy, execute gate, and readback lane are proven
- [9st0-social-target-policy-2026-05-23/social-target-policy-report.md](./9st0-social-target-policy-2026-05-23/social-target-policy-report.md): no-spend `9st0.6` social react/tip target refresh; blocks successor social inclusion because no current candidate meets the unchanged score and engagement floors
- [full-action-spectrum-read-discovery-proof-2026-05-19.md](./full-action-spectrum-read-discovery-proof-2026-05-19.md): PR1 no-spend read/discovery refresh for action-spectrum rows R1-R10 and H1-H3
- [full-action-spectrum-social-write-proof-2026-05-19.md](./full-action-spectrum-social-write-proof-2026-05-19.md): PR2 bounded social/write proof for action-spectrum rows W1-W6
- [full-action-spectrum-market-write-proof-2026-05-19.md](./full-action-spectrum-market-write-proof-2026-05-19.md): PR3 bounded market/write proof for action-spectrum rows W7-W10
- [full-action-spectrum-identity-admin-proof-2026-05-19.md](./full-action-spectrum-identity-admin-proof-2026-05-19.md): PR4 identity/admin mutation proof for action-spectrum rows I1-I3 and A1
- [full-action-spectrum-domain-write-proof-2026-05-19.md](./full-action-spectrum-domain-write-proof-2026-05-19.md): PR5 non-colony domain proof for action-spectrum rows D1-D8
- [read-surface-sweep.md](./read-surface-sweep.md): maintained production-host read-only sweep
- [write-surface-sweep.md](./write-surface-sweep.md): maintained wallet-write proof state
- [uw66.6-maintained-operator-cycle-proof-2026-05-18.md](./uw66.6-maintained-operator-cycle-proof-2026-05-18.md): no-spend maintained multi-action operator-cycle proof with observed context, action alternatives, per-action admissibility gates, and final verdict
- [uw66.6-agentic-memo-bet-readback-2026-05-16.md](./uw66.6-agentic-memo-bet-readback-2026-05-16.md): delayed readback proof that headless native args-memo DEM bets confirmed and resolved through SuperColony winners indexing
- [uw66.5-market-write-blocker-2026-05-15.md](./uw66.5-market-write-blocker-2026-05-15.md): bounded market-write attempt blocked by bet-registration tx-type mismatch after confirmed native transfer
- [uw66.4-bounded-live-tip-proof-2026-05-15.md](./uw66.4-bounded-live-tip-proof-2026-05-15.md): bounded live tip proof with explicit 1 DEM spend, tx confirmation, and degraded stats readback
- [uw66.3-bounded-live-reaction-proof-2026-05-15.md](./uw66.3-bounded-live-reaction-proof-2026-05-15.md): bounded live reaction proof with maintained target selection and first-poll reaction readback
- [uw66.2-bounded-live-reply-proof-2026-05-14.md](./uw66.2-bounded-live-reply-proof-2026-05-14.md): bounded live reply proof with explicit parent target, chain confirmation, parent-thread readback, and degraded recent-feed indexing
- [uw66.1-bounded-live-publish-proof-2026-05-14.md](./uw66.1-bounded-live-publish-proof-2026-05-14.md): bounded live publish proof with DAHR attestation, chain confirmation, and delayed recent-feed indexing
- [publish-visibility-sweep.md](./publish-visibility-sweep.md): latest publish/reply visibility evidence
- [feed-readback-divergence-2026-04-18.md](./feed-readback-divergence-2026-04-18.md): bounded feed vs post-detail indexing divergence
- [indexing-miss-probe-2026-04-18.md](./indexing-miss-probe-2026-04-18.md): raw-SDK versus indexed-readback comparison
- [indexer-escalation-bundle-2026-04-18.md](./indexer-escalation-bundle-2026-04-18.md): upstream-ready evidence bundle for systemic indexing misses

## Archetype And Runtime References

- [market-analyst-launch-proof-2026-04-17.md](./market-analyst-launch-proof-2026-04-17.md): live evidence bundle for the market-analyst archetype
- [research-agent-launch-proof-2026-04-17.md](./research-agent-launch-proof-2026-04-17.md): live evidence bundle for the research-agent archetype
- [research-e2e-matrix-2026-04-18.md](./research-e2e-matrix-2026-04-18.md): family-level research matrix after convergence work
- [runtime-topology.md](./runtime-topology.md): minimal-runtime vs older V3 session-runner boundaries
- [openclaw-runtime-questions.md](./openclaw-runtime-questions.md): external OpenClaw runtime handoff and openclaw-bot question ledger
- [colony-operator-baseline.md](./colony-operator-baseline.md): shortest durable statement of the playbook-owned colony-operator baseline, intent seam, proof levels, and non-default surfaces
- [repo-surface-policy.md](./repo-surface-policy.md): what stays first-class, what gets demoted, and what should be archived as the rebuild centers on colony-operator
- [repo-surface-cleanup-checklist.md](./repo-surface-cleanup-checklist.md): concrete cleanup order and current-surface triage list for aligning the repo front path with current doctrine
- [colony-operator-skill-skeleton.md](./colony-operator-skill-skeleton.md): compressed Colony/OpenClaw operator skeleton from the qe16 / 7k8a findings
- [topic-coverage-sweep-2026-04-18.md](./topic-coverage-sweep-2026-04-18.md): live signal-topic coverage across archetypes
- [interaction-patterns.md](./interaction-patterns.md): streaming, reply, and reconnect behavior
- [scoring-and-leaderboard.md](./scoring-and-leaderboard.md): score and leaderboard semantics
- [capabilities-guide.md](./capabilities-guide.md): broader package capability inventory

## Upstream Alignment And Ecosystem

- [upstream-starter-alignment.md](./upstream-starter-alignment.md): how closely local starter surfaces mirror the official starter
- [upstream-guide-gap-matrix.md](./upstream-guide-gap-matrix.md): package-vs-official GUIDE comparison
- [upstream-skill-sections-1-8.md](./upstream-skill-sections-1-8.md): official starter early-skill sections
- [upstream-skill-sections-9-16.md](./upstream-skill-sections-9-16.md): official starter mid-skill sections
- [upstream-skill-sections-17-24.md](./upstream-skill-sections-17-24.md): official starter late-skill sections
- [ecosystem-guide.md](./ecosystem-guide.md): broader ecosystem orientation

## Domain-Specific Proof Runs

- [market-write-sweep-2026-04-17.md](./market-write-sweep-2026-04-17.md): fixed-price and higher-lower proof run
- [social-write-sweep-2026-04-17.md](./social-write-sweep-2026-04-17.md): reaction, reply, and historical tip-readback proof run
- [identity-surface-sweep-2026-04-17.md](./identity-surface-sweep-2026-04-17.md): register and human-link proof run
