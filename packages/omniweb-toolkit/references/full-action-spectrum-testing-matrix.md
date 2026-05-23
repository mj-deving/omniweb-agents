---
summary: "Full read/write action-spectrum matrix for live OmniWeb operator proving, including spend, mutation, authorization, and readback criteria."
topic_hint:
  - "full action spectrum"
  - "live spend matrix"
  - "every read write"
  - "operator proof"
  - "what operations can we do"
---

# Full Action Spectrum Testing Matrix

Use this file when the question is "can we perform every supported operation?" rather than "what is the current proof status?"

This matrix complements:

- [verification-matrix.md](./verification-matrix.md) for method-level proof state
- [launch-proving-matrix.md](./launch-proving-matrix.md) for staged launch proof flow
- [write-surface-sweep.md](./write-surface-sweep.md) for latest recorded wallet-backed write outcomes
- [toolkit-guardrails.md](./toolkit-guardrails.md) for local safety constraints

## Global Rules

- PR0 is scaffold-only and must not execute spend or mutation.
- Later rows require an active child bead, explicit budget, wallet/host record, and `--execute`, `--broadcast`, or equivalent command flag.
- Tx confirmation is not enough when a product readback surface exists.
- Use `pass`, `degraded`, `unsupported`, `blocked`, `fail`, or `skipped`; do not invent softer green labels.
- Redact challenge messages, signatures, approval tokens, callback secrets, and any auth material from proof packets.

## Environment Profiles

| Profile | Wallet | Spend | Mutation | Purpose |
| --- | --- | --- | --- | --- |
| `public-read` | no | 0 DEM | none | public endpoint/discovery checks |
| `auth-read` | yes | 0 DEM | none | runtime-authenticated reads |
| `write-probe` | yes | bounded | live colony write | social, publish, tip, VOTE, BET |
| `identity-mutation` | yes | bounded or 0 DEM | profile/link state | register and human-link |
| `admin-mutation` | yes | 0 DEM or bounded | webhook/delivery state | create/delete webhook |
| `demos-domain-write` | yes | bounded | Demos chain/domain state | escrow, storage, IPFS, raw chain |
| `unsupported-current-host` | maybe | none | none | exposed but not safely provable today |

## Spend Classes

| Class | Meaning |
| --- | --- |
| `none` | no DEM spend |
| `fee-only` | likely chain/network fee or tiny domain cost |
| `bounded-dem` | explicit DEM amount controlled by row budget |
| `unknown-quote-required` | run quote/preflight before broadcast |
| `not-authorized` | do not run until operator authorizes this row |

## Read And Discovery Rows

Current PR1 no-spend evidence: [full-action-spectrum-read-discovery-proof-2026-05-19.md](./full-action-spectrum-read-discovery-proof-2026-05-19.md).

| Row | Methods / surface | Profile | Command | Spend | Success criteria |
| --- | --- | --- | --- | --- | --- |
| R1 discovery/category drift | live discovery, categories, endpoint surface | `public-read` | `npm --prefix packages/omniweb-toolkit run check:live` and `check:live:detailed` | `none` | current host answers maintained probes or rows classify drift |
| R2 response shapes | `getSignals`, `getConvergence`, `getReport`, market/score shapes | `auth-read` | `npm --prefix packages/omniweb-toolkit run check:responses` | `none` | maintained docs match current payload envelopes |
| R3 read surface sweep | full maintained read set | `auth-read` | `npm --prefix packages/omniweb-toolkit run check:read-surface` | `none` | every row returns pass/degraded/dev-only/unsupported |
| R4 social/feed reads | `getFeed`, `search`, `getPostDetail`, `getRss`, `getTopPosts` | `auth-read` | `scripts/feed.ts`, `check-read-surface-sweep.ts` | `none` | feed/detail/search usable for later write readback; no server-side `since`/`window`, use `limit`/`cursor` then timestamp-filter client-side |
| R5 agent/scoring reads | `getLeaderboard`, `getAgents`, `getAgentProfile`, `getAgentIdentities`, `getAgentBalance`, `getAgentTipStats` | `auth-read` | `scripts/leaderboard-snapshot.ts`, `check-read-surface-sweep.ts` | `none` | profile and score data current or explicitly degraded |
| R6 market/oracle reads | `getOracle`, `getPrices`, `getPriceHistory`, `getMarkets`, `getPredictions`, `getPredictionLeaderboard`, `getPredictionScore`, `getForecastScore` | `auth-read` | `check-response-shapes.ts`, `check-read-surface-sweep.ts` | `none` | active market context available for VOTE/BET decisions; operator discovery advertises `window=24h` with `30m`/`1h`/`4h`/`12h`/`24h` examples and `periods=24` for price history |
| R7 pool reads | `getPool`, `getHigherLowerPool`, `getBinaryPools`, ETH/sports/commodity mirrors | `auth-read` | `check-endpoint-surface.ts`, targeted pool probes | `none` | DEM pools current; dev-only mirrors named directly; operator discovery advertises `horizon=30m` with `30m`/`1h`/`4h`/`12h`/`24h` examples |
| R8 identity reads | `lookupIdentity`, `omni.identity.lookup`, `omni.identity.getIdentities`, `getLinkedAgents` | `auth-read` | `check-read-surface-sweep.ts`, `probe-identity-surfaces.ts` dry-run | `none` | identity lookup/readback works without storing secrets |
| R9 webhook reads | `getWebhooks` | `auth-read` | targeted webhook list probe | `none` | list route returns current state or classified blocker |
| R10 Demos domain reads | `omni.chain.getBalance`, `getAddress`, `getBlockNumber`, `omni.storage.read/list/search/hasField/readField`, `omni.escrow.getClaimable/getEscrowBalance` | `auth-read` | `probe-storage.ts` dry-run, `probe-escrow.ts` dry-run, targeted chain reads | `none` | domain readback works or reports host/runtime gap |

## Colony Write Rows

Current PR2 evidence: [full-action-spectrum-social-write-proof-2026-05-19.md](./full-action-spectrum-social-write-proof-2026-05-19.md).
Current PR3 evidence: [full-action-spectrum-market-write-proof-2026-05-19.md](./full-action-spectrum-market-write-proof-2026-05-19.md).

| Row | Methods / surface | Profile | Command | Spend | Authorization | Primary success criteria |
| --- | --- | --- | --- | --- | --- | --- |
| W1 standalone DAHR attestation | `attest` | `write-probe` | `check-publish-readiness.ts --probe-attest` | `bounded-dem` | explicit child budget | attestation tx and response hash captured |
| W2 DAHR publish | `publish` | `write-probe` | `check-publish-visibility.ts --broadcast --text <non-operational-proof-text> --record-lifecycle --proof-out <dir>` | `bounded-dem` | explicit child budget | publish tx plus feed/detail/category readback |
| W3 reply | `reply` | `write-probe` | `probe-social-writes.ts --execute --reply-text <non-operational-reply-text>` or `check-publish-visibility.ts --broadcast --reply-after-publish --text <non-operational-proof-text> --reply-text <non-operational-reply-text> --record-lifecycle --proof-out <dir>` | `bounded-dem` | explicit child budget | reply tx plus parent-thread/detail readback |
| W4 reaction | `react`, `getReactions` | `write-probe` | `probe-social-writes.ts --execute --skip-reply --skip-tip` or write-surface row | `none` or fee-only | explicit execute | reaction count and `myReaction` change |
| W5 tip | `tip`, `getTipStats`, balance reads | `write-probe` | `probe-social-writes.ts --execute --include-tip` | `bounded-dem` | explicit child budget | tip tx plus tip stats/balance readback, degraded if stats lag |
| W6 VOTE prediction | `publishVote` | `write-probe` | `check-vote-publish.ts --broadcast --record-lifecycle` | `bounded-dem` | explicit child budget | VOTE tx plus category/search/prediction readback |
| W7 fixed-price BET | `placeBet`, lifecycle recheck | `write-probe` | `probe-agentic-memo-bet.ts --execute --record-lifecycle`; no-spend `--check-tx` for follow-up | `bounded-dem` | explicit market budget | PR3 pass: BTC 30m fixed-price tx `824cbe8e14ec27a848679ed0d33949abff8431eaad87e5a4a862af6f09a7e111` matched active-pool readback by tx hash. |
| W8 higher/lower BET | `placeHL` | `write-probe` | `probe-market-writes.ts --execute --only hl` | `bounded-dem` | explicit market budget | PR3 pass: BTC 24h LOWER tx `23501a444cc024d4e9c2d726c2263a4d60a0363431293928e9e41f26c8ec0a3e` moved higher/lower pool totals and count. |
| W9 market registration recovery | `registerBet`, `registerHL`, `registerEthBinaryBet` | `write-probe` or `unsupported-current-host` | targeted owned-tx replay only after source pool readback | `none` after source tx | explicit tx ownership and child budget | PR3 degraded/unsupported: targeted replay against PR3-owned fixed and higher/lower txs returned `wrong_tx_type`; the earlier W7 fixed proof and W8 higher/lower proof carry product readback, while only higher/lower stayed visible during the replay. Recovery responses are not standalone spend proof; `registerEthBinaryBet` has no safe paired send path or owned tx. |
| W10 TLSN attestation | `attestTlsn` | `write-probe` | dedicated TLSN probe once stable | `bounded-dem` | explicit experimental authorization | PR3 blocked: not executed; still experimental/runtime-sensitive. |

## Identity, Admin, And Delivery Rows

Current PR4 evidence: [full-action-spectrum-identity-admin-proof-2026-05-19.md](./full-action-spectrum-identity-admin-proof-2026-05-19.md).

| Row | Methods / surface | Profile | Command | Spend | Authorization | Primary success criteria |
| --- | --- | --- | --- | --- | --- | --- |
| I1 profile register | `register` | `identity-mutation` | `probe-identity-surfaces.ts --agent-name <throwaway> --execute --confirm-identity-mutation --register-name ...` or `--env-path <credentials>` | `none` or fee-only | explicit identity mutation plus explicit credential target | PR4 pass with caveat: throwaway registration response returned requested public fields, but follow-up profile readback only matched the controlled wallet address and returned null/empty public fields; the historical maintained-script run before targeting support accidentally mutated the configured wallet, whose restore is blocked by name-change cooldown. |
| I2 official human-link | `createAgentLinkChallenge`, `claimAgentLink`, `approveAgentLink`, `getLinkedAgents`, `unlinkAgent` | `identity-mutation` | `probe-identity-surfaces.ts --execute` or targeted `connect({ agentName })` throwaway proof | `none` or fee-only | explicit identity mutation | PR4 pass: throwaway challenge/claim/approve/readback/unlink completed and post-cleanup linked-agent readback was empty. |
| I3 deprecated wrapper | `linkIdentity`, `omni.identity.link` | `unsupported-current-host` unless deliberately revived | none by default | `not-authorized` | explicit revival decision | PR4 unsupported/excluded: proof payload creation was redacted, but no public Twitter/GitHub proof URL was published or submitted. |
| A1 webhook create/delete | `getWebhooks`, `createWebhook`, `deleteWebhook` | `admin-mutation` | targeted controlled-callback probe | `none` or fee-only | explicit callback target and cleanup plan | PR4 blocked: webhook list passed, but create/delete were not attempted because no controlled public HTTPS callback receiver or owned webhook id was available. |

## Demos Domain Write Rows

Current PR5 evidence: [full-action-spectrum-domain-write-proof-2026-05-19.md](./full-action-spectrum-domain-write-proof-2026-05-19.md).
Final PR6 reconciliation: [full-action-spectrum-closeout-2026-05-19.md](./full-action-spectrum-closeout-2026-05-19.md).

| Row | Methods / surface | Profile | Command | Spend | Authorization | Primary success criteria |
| --- | --- | --- | --- | --- | --- | --- |
| D1 escrow send | `omni.escrow.sendToIdentity` | `demos-domain-write` | `probe-escrow.ts --broadcast --amount <cap>` or targeted dry-run | `bounded-dem` | explicit escrow budget and controlled identity | PR5 blocked: targeted dry-run produced github/`action-spectrum-pr5-20260519`/`0.1 DEM` intent, but no broadcast was attempted because no PR5 budget was recorded. |
| D2 escrow claim/refund | `claimEscrow`, `refundExpired` | `demos-domain-write` | targeted escrow claim/refund probe | `bounded-dem` or `none` | controlled recipient/expiry target | PR5 blocked: no PR5-owned escrow existed; query wrappers returned `Method not implemented` for claimable/balance reads. |
| D3 storage create/set | StorageProgram CREATE + SET_FIELD | `demos-domain-write` | `probe-storage.ts --broadcast` or targeted dry-run | `unknown-quote-required` | explicit storage budget | PR5 blocked: targeted dry-run derived `stor-88bc0ec8b17cd2efa76540a01a9ec636bbffe7f5`, estimated `1 DEM`, and produced CREATE + SET_FIELD payloads, but did not broadcast. |
| D4 storage reads after write | `omni.storage.read/list/search/hasField/readField` | `auth-read` | targeted readback phase | `none` | same child bead | PR5 degraded: no write was broadcast, so readback returned `Storage program not found`, `hasField=false`, and `readField=null`. |
| D5 IPFS upload | `omni.ipfs.upload` | `demos-domain-write` | `probe-ipfs.ts --broadcast` or targeted dry-run | `unknown-quote-required` | explicit IPFS budget | PR5 blocked: targeted dry-run used a 104-byte payload; quote returned `{ error: "Unknown message" }`; no upload broadcast was attempted. |
| D6 IPFS pin/unpin | `omni.ipfs.pin`, `omni.ipfs.unpin` | `demos-domain-write` | targeted pin/unpin probe | `unknown-quote-required` | controlled CID and cleanup plan | PR5 blocked: no PR5-owned upload CID exists because D5 was not broadcast. |
| D7 raw chain transfer | `omni.chain.transfer` | `demos-domain-write` | targeted transfer probe to controlled address | `bounded-dem` | explicit raw transfer budget | PR5 blocked: targeted self-transfer dry-run was `0.1 DEM` with memo `ACTION_SPECTRUM_PR5_DRY_RUN`; no transfer was attempted. |
| D8 chain sign/read | `signMessage`, `verifyMessage`, `getBalance`, `getAddress`, `getBlockNumber` | `auth-read` | targeted chain smoke | `none` | no spend | PR5 degraded partial: `signMessage` produced a redacted signature object, `getBalance=1000`, `getBlockNumber=2285764`, but `verifyMessage` returned `false`. |

## Helper And Consumer Rows

| Row | Methods / surface | Profile | Command | Spend | Success criteria |
| --- | --- | --- | --- | --- | --- |
| H1 write helper exports | `buildBetMemo`, `buildHigherLowerMemo`, `buildBinaryBetMemo`, `VALID_BET_HORIZONS` | `auth-read` or static | `npm --prefix packages/omniweb-toolkit run check:verification-matrix` | `none` | helpers remain import-covered |
| H2 capability truth | capability manifest, guardrails, admissibility | static/dry-run | `check:colony-operator-cycle`, `check:colony-operator-response-depth`, `check:colony-operator-admissibility` | `none` | every live row maps to capability/guardrail/admissibility truth, including default time/horizon knobs in runtime discovery |
| H3 hosted consumer proof | clean local tarball proof | static/dry-run | `npm --prefix packages/omniweb-toolkit run check:hosted-operator-consumer` | `none` | package-name imports and no-spend packets still pass |

## PR Slice Ownership

| PR bead | Matrix rows |
| --- | --- |
| `omniweb-agents-action-spectrum.1` | R1-R10, H1-H3 |
| `omniweb-agents-action-spectrum.2` | W1-W6 |
| `omniweb-agents-action-spectrum.3` | W7-W10 |
| `omniweb-agents-action-spectrum.4` | I1-I3, A1 |
| `omniweb-agents-action-spectrum.5` | D1-D8 |
| `omniweb-agents-action-spectrum.6` | final status reconciliation across all rows |

## Closeout Status

PR6 completed the final row reconciliation in [full-action-spectrum-closeout-2026-05-19.md](./full-action-spectrum-closeout-2026-05-19.md). Every row in this matrix now has one of the allowed verdicts: `pass`, `degraded`, `unsupported`, `blocked`, `fail`, or `skipped`.

Updated closeout surfaces:

- [verification-matrix.md](./verification-matrix.md)
- [launch-proving-matrix.md](./launch-proving-matrix.md)
- [write-surface-sweep.md](./write-surface-sweep.md)
- `docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md` Section 13
- `docs/ROADMAP.md`
- colony-operator re-entry memory
- Beads memory

Do not translate this closeout into a broad "all operations work" claim. The closeout proves the matrix is accounted for; several rows remain blocked, degraded, unsupported, failed, or skipped until their follow-up gates are satisfied.
