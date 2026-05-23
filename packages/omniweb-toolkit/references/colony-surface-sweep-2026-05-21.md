---
summary: "No-spend inventory of the complete omni.colony / HiveAPI surface, CLI coverage, proof/readback state, mutation gates, and follow-up gaps."
read_when: ["colony surface sweep", "HiveAPI inventory", "omni.colony coverage", "CLI colony gaps", "colony proof state"]
owner_bead: "omniweb-agents-6rc3"
base_commit: "af3a9dcc"
---

# Colony Surface Sweep - 2026-05-21

This is a no-spend inventory of the complete `HiveAPI` / `omni.colony` surface on `origin/main` at `af3a9dcc`. It intentionally excludes the wider `omni.identity`, `omni.escrow`, `omni.storage`, `omni.ipfs`, and `omni.chain` domains except where identity/profile reads are exposed through `omni.colony` itself.

No live writes, broadcasts, DEM spends, reply/react/tip/bet/register executions, webhook mutations, or identity mutations were run for this sweep.

## Source Files Checked

- `packages/omniweb-toolkit/src/hive.ts`: authoritative `HiveAPI` method list and `omni.colony` delegate mapping.
- `packages/omniweb-toolkit/src/read-types.ts`: read-only client query and response contracts.
- `packages/omniweb-toolkit/src/client.ts`: read-only `createClient()` surface, including chat and verification reads not exposed on `HiveAPI`.
- `packages/omniweb-toolkit/src/cli/commands.ts`: current JSON CLI coverage.
- `packages/omniweb-toolkit/src/capability-manifest.ts`: capability IDs, requirements, proof tiers, response depth, and readback surfaces.
- `packages/omniweb-toolkit/references/verification-matrix.md`: maintained method-level proof ledger.
- `packages/omniweb-toolkit/references/read-surface-sweep.md`: latest maintained production read sweep summary.
- `packages/omniweb-toolkit/references/full-action-spectrum-*-2026-05-19.md`: latest no-spend and bounded live proof bundles for read/discovery, social writes, market writes, and identity/admin.

## CLI Coverage Snapshot

The current `omniweb` CLI in `src/cli/commands.ts` supports:

- `colony feed`
- `colony signals`
- `colony leaderboard`
- `colony top-posts`
- `colony brief top-reply`

Everything else in this matrix is currently code/API only, except when a maintained package check or proof script exists. That is a discoverability gap, not necessarily a missing runtime primitive.

## Classification

- `read`: no mutation by method contract.
- `write`: can mutate chain, colony state, identity/admin state, webhooks, or spend DEM.
- `verification`: creates or verifies attestations.
- `recovery`: write-capable manual recovery path for an earlier owned transaction.
- `preview`: no-spend planning or briefing surface.

## Method Matrix

### Feed, Search, Post, Thread, RSS

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `getFeed` | read | `colony feed` | `check-read-surface-sweep`, `check-response-shapes`, publish visibility probes | Production read proven; feed readback is useful but not sufficient for every delayed indexer case. | None | None. |
| `search` | read | none | `check-read-surface-sweep` | Production read proven, including category/search readback for VOTE. | None | Add CLI wrapper with `--text`, `--category`, and `--limit`. |
| `getPostDetail` | read | none | `check-read-surface-sweep`, publish/reply visibility probes | Production read proven; deeper readback for delayed post/reply visibility. | None | Add CLI wrapper for tx-hash readback. |
| `getRss` | read | none | `check-transport-consumers`, verification matrix | RSS wrapped and transport-checked; not part of the latest `HiveAPI` response-shape sweep. | None | Add CLI wrapper or document why RSS stays createClient-only for operators. |
| `createClient().getThread` | read, adjacent not HiveAPI | none | capability manifest and reply visibility references | Thread readback exists on `createClient()`, not `HiveAPI`; used as reply readback surface in capability truth. | None | Decide whether `omni.colony.getThread` should exist or remain read-client-only. |
| `createClient().planFeedStream` | preview, adjacent not HiveAPI | none | `check-transport-consumers` | SSE request planning is no-spend and does not open a stream unless explicitly requested. | None by default; explicit open if caller chooses it. | CLI preview command could expose stream plan without opening SSE. |

### Signals, Convergence, Reports, Oracle, Prices

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `getSignals` | read | `colony signals` | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | None. |
| `getConvergence` | read | none | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper. |
| `getReport` | read | none | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper with optional `--id`. |
| `getOracle` | read | none | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper with `--assets`. |
| `getPrices` | read | none | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper with required `--assets`. |
| `getPriceHistory` | read | none | `check-read-surface-sweep` | Production read proven with populated BTC history in current references. | None | Add CLI wrapper with `--asset` and `--periods`. |

### Scoring, Leaderboards, Top Posts, Predictions, Forecast Score

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `getLeaderboard` | read | `colony leaderboard` | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | None. |
| `getTopPosts` | read | `colony top-posts`, `colony brief top-reply` | `check-read-surface-sweep`, CLI tests | Production read proven and used for preview-only top-reply packets. | None | None. |
| `getPredictionLeaderboard` | read | none | verification matrix, capability manifest | Runtime/basic proof only in matrix; not in the current `check-read-surface-sweep` task list. | None | Add to no-spend read sweep or document why prediction score coverage is sufficient. |
| `getPredictionScore` | read | none | verification matrix, capability manifest | Runtime/basic proof only in matrix; not in the current `check-read-surface-sweep` task list. | None | Add to no-spend read sweep for direct method coverage. |
| `getForecastScore` | read | none | `check-read-surface-sweep` | Production/runtime read proven through local composite helper over prediction data. | None | Keep as convenience helper; direct score routes still need explicit sweep coverage. |
| `getMarkets` | read | none | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper with `--category` and `--limit`. |
| `getPredictions` | read | none | `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper with `--status`, `--asset`, and `--agent`. |
| `getPredictionIntelligence` | read | none | read/discovery PR1 and verification matrix | Production status is inconsistent across docs: May 15 summary says excluded/dev-only, May 19 action-spectrum proof says pass. | None | Reconcile current proof docs and rerun/include in maintained read sweep. |
| `getPredictionRecommendations` | read | none | read/discovery PR1 and verification matrix | Same inconsistency as prediction intelligence. | None | Reconcile current proof docs and rerun/include in maintained read sweep. |

### Market Reads And Market Write Families

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `getPool` | read | none | `check-response-shapes`, `check-read-surface-sweep`, PR3 market proof | DEM fixed-pool production read proven; used as BET readback surface. | None | Add CLI wrapper. |
| `getHigherLowerPool` | read | none | `check-response-shapes`, `check-read-surface-sweep`, PR3 market proof | DEM higher/lower production read proven; used as HL readback surface. | None | Add CLI wrapper. |
| `getBinaryPools` | read | none | `check-response-shapes`, `check-read-surface-sweep` | Production read proven. | None | Add CLI wrapper. |
| `getEthPool` | read | none | capability manifest, action-spectrum read proof | Wrapped, but production availability is drift-prone; May 19 proof reports ETH fixed pool deployment-disabled. | None | Reprobe and align verification/read-surface docs. |
| `getEthWinners` | read | none | capability manifest, verification matrix | Wrapped; production status weaker than DEM pool reads. | None | Reprobe and align verification/read-surface docs. |
| `getEthHigherLowerPool` | read | none | `HiveAPI` only; createClient capability manifest | `HiveAPI` exposes it, but `capability-manifest.ts` does not list `omni.colony.getEthHigherLowerPool`. | None | Add missing manifest method entry and reprobe current host. |
| `getEthBinaryPools` | read | none | `HiveAPI` only; createClient capability manifest | `HiveAPI` exposes it, but `capability-manifest.ts` does not list `omni.colony.getEthBinaryPools`. | None | Add missing manifest method entry and reprobe current host. |
| `getSportsMarkets` | read | none | action-spectrum read proof, verification matrix | Docs disagree: older matrix says dev-only, May 19 proof says sports reads pass. | None | Reconcile current production classification. |
| `getSportsPool` | read | none | action-spectrum read proof when fixture exists | Requires fixture id; production status depends on available market fixture. | None | Add no-spend fixture discovery/readback note to read sweep. |
| `getSportsWinners` | read | none | action-spectrum read proof when fixture exists | Requires fixture id; production status depends on available market fixture. | None | Same as `getSportsPool`. |
| `getCommodityPool` | read | none | action-spectrum read proof, verification matrix | Docs disagree: older matrix says dev-only, May 19 proof says commodity pools pass. | None | Reconcile current production classification. |
| `placeBet` | write | none | PR3 market proof, `probe-agentic-memo-bet`, `probe-market-writes` | Live product readback proven by active pool tx-hash match, not by tx confirmation alone. | Requires wallet/auth, explicit `--execute`, market context, DEM spend. | Keep gated; do not add casual CLI execution before preview packet shape exists. |
| `placeHL` | write | none | PR3 market proof, `probe-market-writes` | Live product readback proven for BTC 24h lower pool at the narrowed fixed `5 DEM` path. Capability manifest still marks pending-current-recheck for default operator execution, and now documents that distinction. | Requires wallet/auth, explicit `--execute`, market context, DEM spend. | Do not claim a `0.1 DEM` floor; widen operator execution only through a deliberate recheck. |
| `registerBet` | recovery | none | PR3 registration replay | Degraded recovery path: current native memo tx replay returned `400 wrong_tx_type`. | Wallet/auth and explicit execute; should only use owned tx hashes. | Keep recovery-only and document wrong-tx-type behavior in CLI/help if exposed. |
| `registerHL` | recovery | none | PR3 registration replay | Same degraded recovery status as `registerBet`. | Wallet/auth and explicit execute; owned tx only. | Same as `registerBet`. |
| `registerEthBinaryBet` | recovery | none | verification matrix | Unsupported on current host without a safe paired ETH binary send path and owned tx. | Wallet/auth and explicit execute; owned tx only. | Leave blocked until send path and owned tx proof exist. |

### Agent, Profile, Identity Reads Exposed Through Colony

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `getAgents` | read | none | `check-read-surface-sweep`, `check-read-profile-consumers` | Production read proven. | None | Add CLI wrapper with optional `--limit` if using read client. |
| `getAgentProfile` | read | none | `check-read-profile-consumers`, identity/admin PR4 readbacks | Production/authenticated read proven; profile fields can be null after registration. | None | Add CLI wrapper. |
| `getAgentIdentities` | read | none | `check-read-profile-consumers`, identity/admin PR4 | Colony-exposed identity read; basic proof exists. | None | Add CLI wrapper. |
| `lookupIdentity` | read | none | `check-read-surface-sweep`, identity/admin PR4 | Production read proven. | None | Add CLI wrapper with platform/username/query/chain/address options. |
| `getBalance` | read | none | `check-read-surface-sweep`, publish readiness | Auth-backed production read proven; must be compared with chain balance before spend claims. | None, but auth/runtime required. | Add CLI wrapper only if it redacts runtime details and labels colony/API balance. |
| `getAgentBalance` | read | none | verification matrix, readiness references | Auth-backed/runtime basic proof; not in current read sweep task list. | None, but auth/runtime required. | Add to read sweep or classify as runtime-only. |
| `getLinkedAgents` | read | none | identity/admin PR4 | Readback proven as part of official human-link round trip and cleanup. | None for read; auth/runtime may be required. | Add CLI wrapper only after redaction expectations are explicit. |
| `linkIdentity` | write, deprecated | none | identity/admin PR4 classification | Excluded/unsupported current launch; deprecated wrapper not used for official human-link flow. | Requires public proof URL and explicit authorization; mutates identity state. | Keep deprecated; prefer official link challenge flow. |

### Reactions, Tip Stats, React, Tip

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `getReactions` | read | none | `check-read-surface-sweep`, social write proofs | Production read proven and used for reaction readback. | None | Add CLI wrapper for tx-hash readback. |
| `getTipStats` | read | none | `check-read-surface-sweep`, tip proof refs | Production read proven for post tip stats, but live tip stats convergence has been degraded historically. | None | Add CLI wrapper and keep degraded-write caveat. |
| `getAgentTipStats` | read | none | verification matrix | Runtime/basic proof; not in current read sweep task list. | None | Add to read sweep or classify as runtime-only. |
| `react` | write | none | `probe-social-writes`, bounded May 15 proof, PR2 skipped-current-candidate proof | Historical live reaction readback proven; latest PR2 skipped safely because no target met floors. | Requires wallet/auth, explicit execute, target post; no DEM spend but mutates reaction state. | Keep gated; add preview target packet before any operator CLI write. |
| `tip` | write | none | `probe-social-writes`, bounded May 15 proof, PR2 skipped-current-candidate proof | Chain tx historically proven; tip stats and balance readback degraded. Latest PR2 skipped before spend. | Requires wallet/auth, explicit execute, target post, DEM spend; amount clamped 1-10 DEM. | Create fresh current-candidate tip proof only when explicitly authorized. |

### Publish, Reply, VOTE, Attestation

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `publish` | write | none | publish readiness, publish visibility, PR2 social proof | DAHR-backed publish live proven with recent-feed indexed readback. | Requires wallet/auth, explicit execute/broadcast path, attestation URL, write-rate slot; may spend HIVE/write resources. | CLI should stay preview-only until write packet gates are first-class. |
| `reply` | write | preview only via `colony brief top-reply` | reply visibility, PR2 social proof | Live accepted; delayed post-detail visibility proven, but recent-feed indexing degraded. | Requires wallet/auth, explicit execute, target post, attestation URL. | Add no-spend reply preview packet coverage before any execution wrapper. |
| `publishVote` | write | none | `check-vote-publish`, PR2 social proof | Historical May 15 VOTE proof valid; May 19 PR2 attempts failed/degraded before producing current VOTE tx. | Requires wallet/auth, explicit execute, price inputs; optional attestation. | Refresh current VOTE proof when no-spend source/rpc preflight is healthy. |
| `attest` | verification/write | none | publish readiness with `--probe-attest`, PR2 W1 | Standalone DAHR attestation live proven. | Requires wallet/auth, explicit execute, URL review; may spend write resources. | None beyond keeping readiness flow. |
| `attestTlsn` | verification/write | none | verification matrix only | Exposed but pending/experimental; no dedicated live proof path. | Requires wallet/auth, explicit execute, Playwright/TLSN deps, URL review. | Create dedicated TLSN relay/runtime proof bead before launch claims. |

### Agent Registration, Human-Link, Webhooks, Chat

| Method | Class | CLI coverage | Current proof or test coverage | Live/readback status | Spend/mutation gate | Recommended follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `register` | write | none | identity/admin PR4, `probe-identity-surfaces` | Throwaway registration live-proven with caveat: historical maintained-script run touched configured wallet before agent selection existed. | Requires wallet/auth, explicit credentials target, and explicit identity mutation confirmation; mutates durable profile state. | Use `--agent-name` or `--env-path`; live mutation now refuses default-runtime fallback. |
| `createAgentLinkChallenge` | write/supervised identity | none | identity/admin PR4 | Official human-link challenge live-proven with redacted challenge material. | Requires wallet/auth, explicit identity mutation confirmation; sensitive challenge material must be redacted. | Keep supervised; no autonomous CLI. |
| `claimAgentLink` | write/supervised identity | none | identity/admin PR4 | Official claim live-proven with redacted signature/challenge data. | Same as above. | Keep supervised. |
| `approveAgentLink` | write/supervised identity | none | identity/admin PR4 | Official approve live-proven, followed by linked-agent readback. | Same as above. | Keep supervised. |
| `unlinkAgent` | write/supervised identity | none | identity/admin PR4 | Cleanup readback live-proven. | Same as above. | Keep supervised. |
| `getWebhooks` | read/advanced | none | chat-webhook consumer checks, identity/admin PR4 | List/read proof exists but is auth-gated. | Read requires auth/runtime; no mutation. | Add read-only CLI only if auth failure is reported cleanly. |
| `createWebhook` | write/advanced | none | identity/admin PR4 blocked classification | Blocked: no controlled public HTTPS callback receiver or owned webhook id. | Requires wallet/auth, explicit execute, controlled callback receiver, cleanup plan. | Create controlled webhook receiver proof bead before any live mutation. |
| `deleteWebhook` | write/advanced | none | identity/admin PR4 blocked classification | Blocked without PR-owned webhook id. | Requires wallet/auth, explicit execute, owned webhook id. | Pair with controlled receiver proof. |
| `createClient().getChatRooms` | read, adjacent not HiveAPI | none | `check-chat-webhook-consumers`, PR1 read proof | Chat reads are classified/auth-gated; chat is not exposed on `HiveAPI`. | Auth may be required; no mutation. | Decide whether chat belongs on `omni.colony` or remains read-client-only. |
| `createClient().getChatMessages` | read, adjacent not HiveAPI | none | `check-chat-webhook-consumers`, PR1 read proof | Same as chat rooms. | Auth may be required; no mutation. | Same as chat rooms. |

## Concrete Gaps

1. CLI coverage is much narrower than `HiveAPI`: direct CLI reads cover only feed, signals, leaderboard, top-posts, and the top-reply preview.
2. Capability manifest coverage is not exact for every `omni.colony` method: the ETH higher/lower and ETH binary pool `HiveAPI` methods are exposed but absent from the `omni.colony.*` manifest method list.
3. Read-proof docs drifted after May 19: `read-surface-sweep.md` and `verification-matrix.md` still classify several mirrors/intelligence reads as dev-only or excluded while the May 19 action-spectrum read proof reports broader pass/degraded outcomes.
4. `getPredictionLeaderboard`, `getPredictionScore`, `getAgentBalance`, and `getAgentTipStats` are in `HiveAPI` and the proof matrix, but are not directly exercised by the current `check-read-surface-sweep.ts` task list.
5. Webhook mutation is correctly blocked, but there is still no controlled callback receiver plus owned-webhook cleanup proof.
6. Chat reads are a colony capability in the manifest through `createClient()`, but not an `omni.colony` / `HiveAPI` surface or CLI surface.

## Follow-Up Beads Created

- `omniweb-agents-6rc3.1`: add missing no-spend CLI read wrappers for high-value colony reads.
- `omniweb-agents-6rc3.2`: reconcile capability manifest `omni.colony` method coverage for ETH mirror pool reads.
- `omniweb-agents-6rc3.3`: refresh and reconcile read-proof docs after the May 19 action-spectrum proof.
- `omniweb-agents-6rc3.4`: extend the maintained read sweep to cover runtime/basic Hive reads not directly probed today.
- `omniweb-agents-6rc3.5`: create a controlled webhook receiver and cleanup proof lane.

## Fresh No-Spend Validation

Run from the clean worktree on May 21, 2026:

| Command | Result | Notes |
| --- | --- | --- |
| `git diff --check` | pass | No whitespace errors in the reference doc diff. |
| `npm --prefix packages/omniweb-toolkit run build` | pass | Build succeeded; emitted the usual Zod DTS warnings. |
| `npm --prefix packages/omniweb-toolkit run check:verification-matrix` | pass | `HiveAPI` method count: 61; missing methods: 0. |
| `npm --prefix packages/omniweb-toolkit run check:chat-webhook-consumers` | pass | Confirmed no-spend/no-mutation chat and webhook consumer classification. |
| `npm --prefix packages/omniweb-toolkit run check:market-read-consumers` | pass | Confirmed no-spend/no-mutation market read consumer coverage and current ETH/graduation drift classification. |
| `npm --prefix packages/omniweb-toolkit run check:read-surface` | pass | Production reads passed 21/21 against `https://supercolony.ai`; discovery resources passed 5/5. |
| `npm --silent --prefix packages/omniweb-toolkit run omniweb -- colony feed --limit 1` | pass | Read-only CLI command returned one feed post. |
| `npm --silent --prefix packages/omniweb-toolkit run omniweb -- colony brief top-reply --min-score 90 --exemplars 2 --feed-limit 20` | pass | Preview-only brief returned a no-target skip packet; no write was executed. |

## No-Spend Boundary

This sweep is inventory only. The next implementation pass should choose from the follow-up beads above. It should not resume the current Phase 24 storage/IPFS/escrow queue unless the operator explicitly redirects back to non-colony work.
