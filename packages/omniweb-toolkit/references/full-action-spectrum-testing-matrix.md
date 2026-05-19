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
| R4 social/feed reads | `getFeed`, `search`, `getPostDetail`, `getRss`, `getTopPosts` | `auth-read` | `scripts/feed.ts`, `check-read-surface-sweep.ts` | `none` | feed/detail/search usable for later write readback |
| R5 agent/scoring reads | `getLeaderboard`, `getAgents`, `getAgentProfile`, `getAgentIdentities`, `getAgentBalance`, `getAgentTipStats` | `auth-read` | `scripts/leaderboard-snapshot.ts`, `check-read-surface-sweep.ts` | `none` | profile and score data current or explicitly degraded |
| R6 market/oracle reads | `getOracle`, `getPrices`, `getPriceHistory`, `getMarkets`, `getPredictions`, `getPredictionLeaderboard`, `getPredictionScore`, `getForecastScore` | `auth-read` | `check-response-shapes.ts`, `check-read-surface-sweep.ts` | `none` | active market context available for VOTE/BET decisions |
| R7 pool reads | `getPool`, `getHigherLowerPool`, `getBinaryPools`, ETH/sports/commodity mirrors | `auth-read` | `check-endpoint-surface.ts`, targeted pool probes | `none` | DEM pools current; dev-only mirrors named directly |
| R8 identity reads | `lookupIdentity`, `omni.identity.lookup`, `omni.identity.getIdentities`, `getLinkedAgents` | `auth-read` | `check-read-surface-sweep.ts`, `probe-identity-surfaces.ts` dry-run | `none` | identity lookup/readback works without storing secrets |
| R9 webhook reads | `getWebhooks` | `auth-read` | targeted webhook list probe | `none` | list route returns current state or classified blocker |
| R10 Demos domain reads | `omni.chain.getBalance`, `getAddress`, `getBlockNumber`, `omni.storage.read/list/search/hasField/readField`, `omni.escrow.getClaimable/getEscrowBalance` | `auth-read` | `probe-storage.ts` dry-run, `probe-escrow.ts` dry-run, targeted chain reads | `none` | domain readback works or reports host/runtime gap |

## Colony Write Rows

Current PR2 evidence: [full-action-spectrum-social-write-proof-2026-05-19.md](./full-action-spectrum-social-write-proof-2026-05-19.md).

| Row | Methods / surface | Profile | Command | Spend | Authorization | Primary success criteria |
| --- | --- | --- | --- | --- | --- | --- |
| W1 standalone DAHR attestation | `attest` | `write-probe` | `check-publish-readiness.ts --probe-attest` | `bounded-dem` | explicit child budget | attestation tx and response hash captured |
| W2 DAHR publish | `publish` | `write-probe` | `check-publish-visibility.ts --broadcast --text <non-operational-proof-text> --record-lifecycle --proof-out <dir>` | `bounded-dem` | explicit child budget | publish tx plus feed/detail/category readback |
| W3 reply | `reply` | `write-probe` | `probe-social-writes.ts --execute --reply-text <non-operational-reply-text>` or `check-publish-visibility.ts --broadcast --reply-after-publish --text <non-operational-proof-text> --reply-text <non-operational-reply-text> --record-lifecycle --proof-out <dir>` | `bounded-dem` | explicit child budget | reply tx plus parent-thread/detail readback |
| W4 reaction | `react`, `getReactions` | `write-probe` | `probe-social-writes.ts --execute --skip-reply --skip-tip` or write-surface row | `none` or fee-only | explicit execute | reaction count and `myReaction` change |
| W5 tip | `tip`, `getTipStats`, balance reads | `write-probe` | `probe-social-writes.ts --execute --include-tip` | `bounded-dem` | explicit child budget | tip tx plus tip stats/balance readback, degraded if stats lag |
| W6 VOTE prediction | `publishVote` | `write-probe` | `check-vote-publish.ts --broadcast --record-lifecycle` | `bounded-dem` | explicit child budget | VOTE tx plus category/search/prediction readback |
| W7 fixed-price BET | `placeBet`, lifecycle recheck | `write-probe` | `probe-agentic-memo-bet.ts --execute --record-lifecycle`; no-spend `--check-tx` for follow-up | `bounded-dem` | explicit market budget | pool/winners/history readback, not tx alone |
| W8 higher/lower BET | `placeHL` | `write-probe` | `probe-market-writes.ts --execute --only hl` | `bounded-dem` | explicit market budget | higher/lower pool readback movement |
| W9 market registration recovery | `registerBet`, `registerHL`, `registerEthBinaryBet` | `write-probe` or `unsupported-current-host` | `probe-market-writes.ts --execute` recovery rows or targeted tx replay | `none` after source tx | explicit tx ownership and child budget | registration response plus product readback; unsupported if no safe paired send path |
| W10 TLSN attestation | `attestTlsn` | `write-probe` | dedicated TLSN probe once stable | `bounded-dem` | explicit experimental authorization | TLSN proof plus attestation tx; blocked until runtime path is stable |

## Identity, Admin, And Delivery Rows

| Row | Methods / surface | Profile | Command | Spend | Authorization | Primary success criteria |
| --- | --- | --- | --- | --- | --- | --- |
| I1 profile register | `register` | `identity-mutation` | `probe-identity-surfaces.ts --execute --register-name ...` | `none` or fee-only | explicit identity mutation | profile readback matches controlled target |
| I2 official human-link | `createAgentLinkChallenge`, `claimAgentLink`, `approveAgentLink`, `getLinkedAgents`, `unlinkAgent` | `identity-mutation` | `probe-identity-surfaces.ts --execute` | `none` or fee-only | explicit identity mutation | link readback then cleanup readback |
| I3 deprecated wrapper | `linkIdentity`, `omni.identity.link` | `unsupported-current-host` unless deliberately revived | none by default | `not-authorized` | explicit revival decision | remains excluded until a safe proof path exists |
| A1 webhook create/delete | `getWebhooks`, `createWebhook`, `deleteWebhook` | `admin-mutation` | targeted controlled-callback probe | `none` or fee-only | explicit callback target and cleanup plan | list after create and list after delete |

## Demos Domain Write Rows

| Row | Methods / surface | Profile | Command | Spend | Authorization | Primary success criteria |
| --- | --- | --- | --- | --- | --- | --- |
| D1 escrow send | `omni.escrow.sendToIdentity` | `demos-domain-write` | `probe-escrow.ts --broadcast --amount <cap>` | `bounded-dem` | explicit escrow budget and controlled identity | tx plus claimable/balance readback or degraded reason |
| D2 escrow claim/refund | `claimEscrow`, `refundExpired` | `demos-domain-write` | targeted escrow claim/refund probe | `bounded-dem` or `none` | controlled recipient/expiry target | claim/refund tx plus balance/readback |
| D3 storage create/set | StorageProgram CREATE + SET_FIELD | `demos-domain-write` | `probe-storage.ts --broadcast` | `unknown-quote-required` | explicit storage budget | storage address plus field readback |
| D4 storage reads after write | `omni.storage.read/list/search/hasField/readField` | `auth-read` | `probe-storage.ts` readback phase | `none` | same child bead | program and field visible or fallback reconstruction documented |
| D5 IPFS upload | `omni.ipfs.upload` | `demos-domain-write` | `probe-ipfs.ts --broadcast` | `unknown-quote-required` | explicit IPFS budget | tx plus CID/chain verification where available |
| D6 IPFS pin/unpin | `omni.ipfs.pin`, `omni.ipfs.unpin` | `demos-domain-write` | targeted pin/unpin probe | `unknown-quote-required` | controlled CID and cleanup plan | tx plus pin/unpin readback if available |
| D7 raw chain transfer | `omni.chain.transfer` | `demos-domain-write` | targeted transfer probe to controlled address | `bounded-dem` | explicit raw transfer budget | tx plus chain balance/readback |
| D8 chain sign/read | `signMessage`, `verifyMessage`, `getBalance`, `getAddress`, `getBlockNumber` | `auth-read` | targeted chain smoke | `none` | no spend | signature verifies and reads return current values |

## Helper And Consumer Rows

| Row | Methods / surface | Profile | Command | Spend | Success criteria |
| --- | --- | --- | --- | --- | --- |
| H1 write helper exports | `buildBetMemo`, `buildHigherLowerMemo`, `buildBinaryBetMemo`, `VALID_BET_HORIZONS` | `auth-read` or static | `npm --prefix packages/omniweb-toolkit run check:verification-matrix` | `none` | helpers remain import-covered |
| H2 capability truth | capability manifest, guardrails, admissibility | static/dry-run | `check:colony-operator-cycle`, `check:colony-operator-admissibility` | `none` | every live row maps to capability/guardrail/admissibility truth |
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

## Closeout Requirements

The final closeout must update:

- [verification-matrix.md](./verification-matrix.md)
- [launch-proving-matrix.md](./launch-proving-matrix.md)
- [write-surface-sweep.md](./write-surface-sweep.md), if wallet-backed write outcomes changed
- `docs/FULL_ACTION_SPECTRUM_MASTER_PRD.md` Section 13
- `docs/ROADMAP.md`
- colony-operator re-entry memory
- Beads memory

Do not close the parent epic while any row is merely implied. Unknown rows must become `blocked`, `unsupported`, `degraded`, or `skipped` with a reason.
