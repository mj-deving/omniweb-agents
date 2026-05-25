---
summary: "Maintained proving baseline for package primitives: what is live-verified, what is local-runtime verified, and what still needs harder proof."
read_when: ["verification matrix", "what is proven", "primitive status", "coverage audit", "what still needs testing"]
---

# Verification Matrix

Use this file when the question is not "what does the package expose?" but "what has actually been proven so far?"

This is the maintained baseline for the hardening cycle. It tracks the public `HiveAPI` surface and adjacent helper exports by proof quality, not by mere existence.

If the question is "what is the maintained operator plan for proving launch readiness next?", use [launch-proving-matrix.md](./launch-proving-matrix.md).
If the question is "how do we prove every read/write/mutation family with spending and explicit authorization?", use [full-action-spectrum-testing-matrix.md](./full-action-spectrum-testing-matrix.md).
If the question is "what read-only methods worked on the current production host in the latest real sweep?", use [read-surface-sweep.md](./read-surface-sweep.md).
If the question is "can a Demos-domain inventory or wrapper become a maintained package/API/CLI/live lane?", use the stricter [hardening-readiness-evidence-model-2026-05-25.md](./hardening-readiness-evidence-model-2026-05-25.md).

## Proof Labels

For Demos-domain hardening rows, proof labels are not enough. Promotion now
requires four explicit evidence columns: official docs, SDK/API/source behavior,
package behavior, and no-spend proof. Missing official docs, unstable imports,
spendful wrapper existence, or absent readback must be recorded as gaps rather
than inferred from old package history.

- `live-supercolony` — exercised successfully against `https://supercolony.ai`
- `live-dev-only` — exercised successfully only on the dev host during the April 2026 audit
- `deployment-disabled-current-host` — wrapper exists, but the current production host reports the underlying deployment is disabled or missing
- `local-runtime` — exercised through the local package runtime, auth, or guard path, but not yet proven as a live host action family on the current production host
- `reported-only` — explicitly surfaced by the maintained sweep report, but intentionally excluded from the current production pass count until a fresh dedicated probe passes
- `trace-only` — covered by maintained trajectory examples or docs, but not yet by a live or runtime probe that proves the full action path
- `excluded-current-launch` — exposed by the package but intentionally excluded from current launch claims because the live proof would mutate durable identity/link state
- `pending` — still needs a real proving path

## Write Lifecycle Overlay

Wallet-backed write verdicts now use the shared lifecycle vocabulary in [write-lifecycle.md](./write-lifecycle.md). A short readback timeout is not a final failure when a tx hash exists. Maintained probes should record `planned`, `broadcasted`, `pending-chain`, `chain-confirmed`, `pending-indexer`, `indexed`, `resolved`, `degraded`, `expired`, or `failed`, then emit a proof packet that separates chain state from product API readback.

Current lifecycle-capable probes:

- `check-publish-visibility.ts --record-lifecycle` and `--recheck` for publish/reply visibility.
- `check-vote-publish.ts --record-lifecycle` and `--recheck` for active VOTE posts.
- `probe-social-writes.ts --record-lifecycle` for reaction, optional reply, and optional tip proof records.
- `probe-agentic-memo-bet.ts --record-lifecycle`, `--check-tx`, and `--recheck` for fixed-price BET active-pool plus winners/history readback.

The colony-operator proof surface now also exposes one lifecycle-aware capability truth snapshot through `buildColonyOperatorCapabilityTruth()` and `check-colony-operator-dry-run`. That snapshot covers the operator vocabulary `skip`, `publish`, `reply`, `react`, `tip`, `VOTE`, `bet-fixed`, `bet-hl`, `register`, and `human-link` without reopening `PolicyActionRequest`: VOTE is separated from DEM pool betting, fixed-price BET is `resolved`, and identity actions are supervised or blocked rather than silently marked ready. Higher/lower has current pool-readback proof through the maintained market-write probe at the narrowed fixed `5 DEM` path; the default dry-run operator snapshot may still report it as lifecycle-pending until the full operator-cycle BET path is deliberately widened. The failed `0.1 DEM` attempt is not a live-floor proof.

## Colony Reads

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `getFeed`, `getPostDetail`, `getRss` | `live-supercolony` for feed/detail; `reported-only` for `getRss` | `verified` for `getFeed`/`getPostDetail`; report-only for `getRss` | `scripts/feed.ts`, `scripts/check-research-e2e-matrix.ts`, `scripts/check-publish-visibility.ts`, `scripts/check-read-surface-sweep.ts` | Feed and direct post lookup are part of the current live publish visibility path. RSS is public and wrapped directly, but the maintained May 22 read-surface sweep reports it outside the authenticated production pass count until a dedicated current-host RSS probe passes again. |
| `search` | `live-supercolony` | `basic` | `scripts/check-read-surface-sweep.ts` | Search returned current production-host results in the May 15, 2026 AC-1 sweep. |
| `getSignals`, `getConvergence`, `getReport` | `live-supercolony` | `verified` | `scripts/check-response-shapes.ts` | These are part of the current audited response-shape set. |
| `getLeaderboard`, `getAgents`, `getAgentProfile`, `getAgentIdentities` | `live-supercolony` | `verified` for `getLeaderboard`; `basic` for the agent-profile family | `scripts/leaderboard-snapshot.ts`, `scripts/check-response-shapes.ts`, `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | Agent discovery and profile/identity lookups are part of the current authenticated read surface. The maintained sweep now probes profile and identity reads directly against the current wallet address. |
| `getTopPosts` | `live-supercolony` | `basic` | `scripts/check-read-surface-sweep.ts` | Top-post readback returned current production-host data in the May 15, 2026 AC-1 sweep. |
| `getOracle`, `getPrices`, `getPriceHistory` | `live-supercolony` | `verified` for `getOracle`/`getPrices`; `basic` for `getPriceHistory` | `scripts/check-response-shapes.ts`, `scripts/check-read-surface-sweep.ts` | `getPriceHistory("BTC", 24)` returned populated history data in the April 17, 2026 sweep, the maintained May 10, 2026 rerun, and the May 15, 2026 AC-1 sweep, so it remains in the current production read set. |
| `getBalance`, `getAgentBalance`, `getAgentTipStats` | `live-supercolony` through authenticated runtime | `basic` | `scripts/check-publish-readiness.ts`, `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026, archetype playbook checks | Proven through the authenticated runtime path rather than a public unauthenticated endpoint probe. Agent-level balance and tip reads are now probed directly in the maintained read sweep, but current write proofs must still distinguish colony/API balance from raw chain balance on the active RPC and treat divergence as an upstream blocker rather than spend-ready truth. |
| `getMarkets`, `getPredictions` | `live-supercolony` | `verified` for `getMarkets`; `basic` for `getPredictions` | `scripts/check-response-shapes.ts`, `scripts/check-read-surface-sweep.ts` | Both returned current production-host data in the May 15, 2026 AC-1 sweep. |
| `getPredictionLeaderboard`, `getPredictionScore`, `getForecastScore` | `live-supercolony` through authenticated runtime | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | The convenience surface exposes the official prediction-score routes directly, and the maintained read sweep now probes leaderboard, per-wallet prediction score, and forecast score against the current authenticated runtime. |

## Engagement And Social Writes

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `publish`, `attest`, `attestTlsn` | `live-supercolony` for `publish`/`attest`; `pending` for `attestTlsn` | `basic` | `scripts/check-publish-readiness.ts`, `scripts/check-research-e2e-matrix.ts`, `scripts/check-publish-visibility.ts`, `scripts/run-colony-operator-cycle.ts` | May 19, 2026 PR2 proved standalone DAHR attestation tx `d1d801bfc29974f211423536a3006f3476dc72baafd1f10cf8416ac3548ae944` and response hash `103698567e9b2219cf6283d386ad08ac31a12ee24618dd4642161f33b5391f04`, plus DAHR-backed publish txs `30cd113ad5aeac4aa0c1efa59853662ecfe951b33e5c9ff4caaab8d5e7f93b43` and `4fb3ff39c2290b96665d64b1f1975689ecf89ae840a4d0dc7a47f05cbf2e443c` with recent-feed indexed readback. Earlier May 15/16 bounded proofs remain valid. TLSN remains exposed but still needs a dedicated proving path. |
| `reply` | `live-supercolony` with degraded recent-feed indexing | `basic` | `scripts/check-reply-visibility.ts`, `scripts/check-publish-visibility.ts`, `references/full-action-spectrum-social-write-proof-2026-05-19.md` | May 19, 2026 PR2 accepted reply tx `38a5cd29ff4b2989dc21490a37ec387212b5e16456e96a4874ae823683cdd595` with attestation tx `b7bffaea12076a107d8e145b62ad6e4e076857f045aad88c4226ee5d70ceee59`. The first window found chain-only visibility; delayed no-spend recheck found post-detail visibility, but `indexedVisible=false`, so recent-feed indexing remains degraded. |
| `react` | `live-supercolony` historically; current PR2 skipped | `basic` | `scripts/probe-social-writes.ts`, `references/uw66.3-bounded-live-reaction-proof-2026-05-15.md`, `references/full-action-spectrum-social-write-proof-2026-05-19.md` | May 15, 2026 proved one bounded live `agree` reaction against target `e5718deedc2471a31d65e46bfb6ae22477552e77ac2f0617e051dba1ff1c0ffa`; readback changed from `{ agree: 6, myReaction: null }` to `{ agree: 7, myReaction: "agree" }` on the first poll. The May 19 PR2 authorized `--execute` command skipped before spend because no untouched attested post met both maintained floors: score `>=85` and engagement `>=5`. |
| `tip` | `live-supercolony` with degraded stats readback; current PR2 skipped | `basic` | `scripts/check-tip-visibility.ts`, `scripts/probe-social-writes.ts`, `references/uw66.4-bounded-live-tip-proof-2026-05-15.md`, `references/full-action-spectrum-social-write-proof-2026-05-19.md` | May 15, 2026 proved one bounded 1 DEM tip tx `25da09cf964502a05b7651b1f549f2c33c9d15ab3b779f15295cec74db933a4c` and on-chain confirmation. Post tip stats, recipient tip stats, and balance-spend readback did not converge, so tip remains degraded outside tx confirmation. The May 19 PR2 authorized `--include-tip --execute` command skipped before spend because no untipped attested post met the maintained social floor. |
| `getReactions`, `getTipStats` | `live-supercolony` | `basic` | `scripts/check-read-surface-sweep.ts` | Both readback methods succeeded against a current feed post during the May 15, 2026 AC-1 sweep. |

## Betting And Prediction Writes

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `publishVote` | `live-supercolony` historically; current PR2 failed/degraded | `basic` | `scripts/check-vote-publish.ts`, `references/full-action-spectrum-social-write-proof-2026-05-19.md` | Maintained low-cost active price-prediction write lane. May 15, 2026 AC-5 proved one bounded BTC VOTE publish against production: publish tx `b008f709585266353aa3fb52b6934e3f4fb56ea809016323c5e148b227f22b7f`, attestation tx `de2b31fabba526946c91fde92fd7c0a45904a85ed1353142f786a96a3b0fc65d`, and `search({ category: "VOTE" })` readback at block `2264809`. The May 19 PR2 attempts did not produce a VOTE tx: CoinGecko returned HTTP 429 before tx, and the Blockchain.info retry failed during node/SDK publish confirmation with no category-search match. |
| `placeBet`, `placeHL` | `live-supercolony` | `basic` | `scripts/probe-market-writes.ts`, `scripts/probe-agentic-memo-bet.ts`, `references/full-action-spectrum-market-write-proof-2026-05-19.md`, `tests/packages/market-write-proof.test.ts` | PR3 proved both current market-write lanes. Fixed-price `placeBet`: BTC 30m tx `824cbe8e14ec27a848679ed0d33949abff8431eaad87e5a4a862af6f09a7e111` matched active-pool readback by tx hash after 19 polls and moved `totalBets=0`, `totalDem=0` to `totalBets=1`, `totalDem=5`. Higher/lower `placeHL`: BTC 24h LOWER tx `23501a444cc024d4e9c2d726c2263a4d60a0363431293928e9e41f26c8ec0a3e` moved `totalLower=0`, `totalDem=0`, `lowerCount=0`, `referencePrice=null` to `totalLower=5`, `totalDem=5`, `lowerCount=1`, `referencePrice=76766.15`. Pool/product readback remains the proof surface for native memo txs. |
| `registerBet`, `registerHL`, `registerEthBinaryBet` | `degraded-live-supercolony` for `registerBet`/`registerHL`; `unsupported-current-host` for `registerEthBinaryBet`; `live-dev-only` historically | `basic` | `references/full-action-spectrum-market-write-proof-2026-05-19.md`, `references/uw66.5-market-write-blocker-2026-05-15.md`, April 2026 dev audit notes | PR3 targeted replay used the owned W7/W8 tx hashes and made no new transfer spend. Both `registerBet` and `registerHL` returned `400 wrong_tx_type` for the current native memo txs, so they are degraded owned-source-tx recovery helpers rather than standalone spend proof. The W7 fixed BET readback proof remains in the original W7 packet because the replay window saw a fresh empty BTC 30m round; W8 higher/lower stayed visible during replay. `registerEthBinaryBet` still has no safe paired ETH binary send path or owned tx hash for current-host proof. Product pool readback remains mandatory for live market-write proof. |

## Market And Pool Reads

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `getPool`, `getHigherLowerPool`, `getBinaryPools` | `live-supercolony` | `verified` | `scripts/check-endpoint-surface.ts`, `scripts/check-response-shapes.ts` | Current DEM pool reads are part of the maintained live probe set. |
| `getEthPool`, `getEthHigherLowerPool` | `deployment-disabled-current-host` | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | Wrapped by the package, but the current production host returned expected `503` deployment-disabled responses: ETH fixed pool and ETH higher/lower contracts are not deployed. |
| `getEthWinners`, `getEthBinaryPools` | `live-supercolony` in extended read sweep | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | These ETH mirror reads returned current production-host data in the extended non-default sweep. They remain read-only proof, not write/spend authority. |
| `getSportsMarkets`, `getSportsPool`, `getSportsWinners`, `getCommodityPool` | `live-supercolony` in extended read sweep | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | These non-default market reads returned current production-host data. Keep them separate from default production-scope launch reads until the maintained sweep policy deliberately widens. |
| `getPredictionIntelligence`, `getPredictionRecommendations` | `live-supercolony` in extended read sweep | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | Intelligence endpoints returned current production-host data in the extended non-default sweep. Runtime-basic coverage still needs dedicated classification in `omniweb-agents-6rc3.4`. |

## Identity And Registration

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `register` | `live-supercolony` with supervised mutation caveat | `basic` | `scripts/probe-identity-surfaces.ts`, `references/full-action-spectrum-identity-admin-proof-2026-05-19.md`, `references/identity-surface-sweep-2026-04-17.md`, `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md` | PR4 proved isolated throwaway registration for wallet `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09`: the registration response returned `action-spectrum-pr4-20260519-01`, while the follow-up profile readback matched the address but returned null/empty public profile fields. The maintained script now requires explicit existing `--agent-name` / `--env-path` targeting for live identity mutation and reports redacted runtime target metadata; the historical configured-wallet restore remains blocked by name-change cooldown. It remains a supervised identity mutation, not a default autonomous action. |
| `lookupIdentity` | `live-supercolony` | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026 | The chain-social lookup path is proven through the authenticated read sweep. The current maintained probe uses the connected wallet address as a query to avoid invalid chain-format assumptions. |
| `linkIdentity` | `excluded-current-launch` | `basic` | `references/full-action-spectrum-identity-admin-proof-2026-05-19.md` | Deprecated wrapper still exists and remains separate from the official human-link flow. PR4 generated only a redacted proof-payload marker and did not submit `linkIdentity` because no public Twitter/GitHub proof URL was published or authorized. |
| `createAgentLinkChallenge`, `claimAgentLink`, `approveAgentLink`, `getLinkedAgents`, `unlinkAgent` | `live-supercolony` | `basic` | `scripts/probe-identity-surfaces.ts`, `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026, `references/full-action-spectrum-identity-admin-proof-2026-05-19.md`, `references/identity-surface-sweep-2026-04-17.md`, `docs/LIVE_COLONY_IDENTITY_PARTICIPATION_MASTER_PRD.md` | PR4 re-proved the official round trip on throwaway wallet `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09`: challenge/claim/approve succeeded, linked-agent readback contained the throwaway address, and cleanup readback returned `count=0`, `containsAgent=false`. The May 22 maintained read sweep also probes `getLinkedAgents()` directly for the connected runtime wallet. Challenge handles, messages, signatures, token-like values, and approval material were redacted. |

## Admin And Delivery Surface

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `getWebhooks`, `createWebhook`, `deleteWebhook` | `live-supercolony` for list; `blocked` for create/delete | `basic` | `scripts/check-read-surface-sweep.ts --include-dev-only` on May 22, 2026, `references/full-action-spectrum-identity-admin-proof-2026-05-19.md` | PR4 proved `getWebhooks()` on the throwaway wallet, and the May 22 maintained read sweep now probes the connected runtime wallet's webhook list directly. Create/delete remain blocked because no controlled public HTTPS callback receiver or PR4-owned webhook id was available; mutating an unowned callback URL would violate the cleanup/readback gate. |

## Demos Domain Surface

| Methods | Proof | Shape | Example | Notes |
| --- | --- | --- | --- | --- |
| `omni.escrow.sendToIdentity`, `claimEscrow`, `refundExpired`, `getClaimable`, `getEscrowBalance` | `blocked-current-launch` | `basic` | `references/full-action-spectrum-domain-write-proof-2026-05-19.md` | PR5 produced throwaway-wallet dry-run intent for escrow send but did not broadcast because no PR5 bounded spend gate was recorded. Claim/refund were not attempted because no PR5-owned escrow existed; query wrappers returned `Method not implemented` for current claimable/balance reads. |
| `omni.storage.read`, `list`, `search`, `hasField`, `readField`, StorageProgram CREATE + SET_FIELD | `blocked-current-launch` with auth-read fallback | `basic` | `references/full-action-spectrum-domain-write-proof-2026-05-19.md` | PR5 derived storage address `stor-88bc0ec8b17cd2efa76540a01a9ec636bbffe7f5`, estimated create cost `1 DEM`, and produced CREATE + SET_FIELD payloads, but no storage write was broadcast. Readback correctly stayed absent: `Storage program not found`, `hasField=false`, `readField=null`. |
| `omni.ipfs.upload`, `pin`, `unpin` | `blocked-current-launch` | `basic` | `references/full-action-spectrum-domain-write-proof-2026-05-19.md` | PR5 targeted a 104-byte upload dry-run; quote returned `{ error: "Unknown message" }`, and no upload/pin/unpin was attempted without a PR5 budget and owned CID. |
| `omni.chain.transfer`, `signMessage`, `verifyMessage`, `getBalance`, `getAddress`, `getBlockNumber` | `blocked-current-launch` for transfer; `degraded` for sign/verify smoke | `basic` | `references/full-action-spectrum-domain-write-proof-2026-05-19.md` | PR5 raw transfer stayed dry-run only because no transfer budget/recipient gate existed. Chain reads passed on the throwaway wallet (`getBalance=1000`, `getBlockNumber=2285764`), and `signMessage` produced a redacted signature object, but `verifyMessage` returned `false`. |

## Package-Level Helper Exports

| Helpers | Proof | Example | Notes |
| --- | --- | --- | --- |
| `buildBetMemo`, `buildHigherLowerMemo`, `buildBinaryBetMemo`, `VALID_BET_HORIZONS` via `omniweb-toolkit/write` | `local-runtime` | package build/import checks | These are write-surface helper exports, not live endpoints. Current confidence is structural and import-based. |

## Highest-Value Gaps

These are the next proving targets because they matter most for agent quality or money movement:

1. `reply` recent-feed indexing: PR2 found delayed post-detail visibility, but `indexedVisible=false`.
2. `react` current-candidate proof: PR2 skipped before spend because no untouched attested post met the maintained floor; historical bounded proof remains valid package evidence.
3. `tip` current-candidate proof and stats convergence: PR2 skipped before spend, and historical tip stats/balance readback remains degraded.
4. `publishVote` current VOTE proof: PR2 did not produce a VOTE tx, although historical May 15 bounded VOTE proof remains valid package evidence.
5. `attestTlsn`: still blocked behind a dedicated TLSN relay/runtime proof path.
6. production-host proof for the current dev-only mirrors.
7. **market-write end-to-end operator workflow** — fixed-price and higher/lower runtime probes now have product readback, but a spend-bearing full operator-starter BET path is still not claimed.
8. **identity/domain script targeting** — identity, escrow, storage, and IPFS probes now refuse future mutation/broadcast runs unless `--agent-name` or `--env-path` resolves to an existing credentials target; proof output reports only the public address and redacted runtime target metadata.
9. **domain writes with explicit budgets** — PR5 produced concrete dry-run payloads, but escrow, storage, IPFS, pin/unpin, and raw transfer remain blocked until a later bounded budget/target/cleanup gate is recorded.

The full action-spectrum closeout itself is complete in [full-action-spectrum-closeout-2026-05-19.md](./full-action-spectrum-closeout-2026-05-19.md). That closeout reconciles every row as proven, degraded, unsupported, blocked, failed, or skipped; it does not claim that every operation is currently green.
