---
type: master-prd
status: active
created: 2026-05-19
source_contract: docs/FULL_ACTION_SPECTRUM_GOAL_BRIEF.md
owner_bead: omniweb-agents-action-spectrum
summary: "GoalMode execution surface for the full OmniWeb read/write action-spectrum proof."
---

# Full Action Spectrum Proof - Master PRD

## Section 0. Frontmatter

- Author: Codex
- Created: 2026-05-19
- Status: ACTIVE
- Source contract: `docs/FULL_ACTION_SPECTRUM_GOAL_BRIEF.md`
- Stable anchors: AC-1 through AC-9
- Owner bead: `omniweb-agents-action-spectrum`
- First implementation bead: `omniweb-agents-action-spectrum.0`
- Target stack: Node.js 22+, npm workspaces, TypeScript, `tsx`, Vitest, live SuperColony/Demos runtime
- Release gate: no npm publish, no public registry install proof, no release claim
- Spend gate: PR0 is no-spend; later live operations require explicit child-bead authorization and budget
- Mutation gate: identity, human-link, webhook, escrow, storage, IPFS, and raw chain operations require controlled targets and readback/cleanup criteria

## Section 1. Problem

The repo has strong partial proof: bounded live social writes, VOTE, fixed-price BET, higher/lower pool readback, supervised identity participation, action admissibility, consumer-spectrum mapping, and hosted no-spend operator proof.

That still does not answer the operator-level question: can a fresh operator see and exercise the full action spectrum without discovering hidden gaps only after a real launch?

The missing artifact is a single execution matrix that names every read and write family, the command that proves it, the exact spend or mutation risk, the required authorization flag, the primary readback surface, and the honest degraded status when the platform or local package cannot prove it today.

## Section 2. Vision

The live action-spectrum lane should leave the repo with one current answer for every operation:

- what exists
- what can be read now
- what can be executed now
- what spends DEM
- what mutates identity, links, storage, webhooks, escrow, IPFS, or raw chain state
- what proof command owns it
- what readback surface counts as success
- what remains degraded, unsupported, blocked, or intentionally excluded

The outcome should be operationally useful, not just documentary. A later external operator should be able to pick up the matrix, run one row, and know what evidence is required before claiming that row is green.

## Section 3. Out Of Scope

- npm release.
- Public registry proof.
- Public launch claim.
- Unbounded spend.
- Unsupervised identity mutation.
- Production hosted activation.
- Rewriting the action seam, guardrail layer, or admissibility API unless execution proves a precise bug.
- Treating old consumer-spectrum Beads ID `omniweb-agents-spectrum` as the new lane.

## Section 4. Architecture

### Section 4.1 PR0 Scaffold

PR0 adds:

- this PRD
- `docs/FULL_ACTION_SPECTRUM_GOAL_BRIEF.md`
- `docs/FULL_ACTION_SPECTRUM_GOAL_LAUNCH.md`
- `packages/omniweb-toolkit/references/full-action-spectrum-testing-matrix.md`
- roadmap and colony-operator re-entry mirror updates
- Beads graph under `omniweb-agents-action-spectrum`

PR0 does not execute live spend or mutation.

### Section 4.2 Matrix Ownership

The package reference matrix is the row-level source of truth:

`packages/omniweb-toolkit/references/full-action-spectrum-testing-matrix.md`

That matrix complements:

- `verification-matrix.md` for current method-level proof state
- `launch-proving-matrix.md` for staged launch proving flow
- `write-surface-sweep.md` for the latest recorded wallet-backed write sweep
- `toolkit-guardrails.md` for local safety behavior

### Section 4.3 Execution Profile

Every row must declare one of these environment profiles:

- `public-read`: no wallet, no spend
- `auth-read`: wallet/auth required, no spend
- `write-probe`: wallet/auth required, bounded DEM spend or live write
- `identity-mutation`: supervised profile/link mutation
- `admin-mutation`: webhook or delivery mutation
- `demos-domain-write`: escrow, storage, IPFS, or raw chain write
- `unsupported-current-host`: exposed locally but not safely provable on the current host

### Section 4.4 Verdict Vocabulary

Every execution result must use one verdict:

- `pass`: executed and read back through the primary success surface
- `degraded`: side effect or partial readback exists, but the primary success surface is lagging or inconsistent
- `unsupported`: package/platform does not currently expose a safe path
- `blocked`: missing auth, budget, host support, controlled target, or explicit authorization
- `fail`: attempted under authorization and did not meet side-effect or readback criteria
- `skipped`: intentionally not run in the current child bead

### Section 4.5 Spend Accounting

Each spend-capable row must record:

- approved budget ceiling
- expected minimum spend
- expected maximum spend
- actual spend
- tx hashes
- balance/readback behavior
- whether readback lag changes the verdict

No child PR may silently exceed its budget. If a row needs more spend than planned, stop and record a blocker.

### Section 4.6 Readback Criteria

Use family-specific primary proof surfaces:

- publish/reply: tx plus feed, post-detail, category feed, or parent-thread readback
- react: reaction count and `myReaction` readback
- tip: tx plus tip stats and recipient/balance readback, with degraded status if stats lag
- VOTE: category/search or prediction readback
- fixed-price BET: pool, winners, or history readback
- higher/lower BET: higher/lower pool readback
- registration recovery: successful registration response plus pool/winners/product readback when applicable
- identity/human-link: profile/link readback plus cleanup readback where cleanup is in scope
- webhook: list/readback after create and list/readback after delete
- escrow: escrow transaction plus claimable/balance readback or explicit unclaimable/degraded status
- storage: storage address plus field/program readback
- IPFS: upload tx plus CID/chain verification where available
- raw chain: tx plus chain balance or transaction readback

## Section 5. Acceptance Anchors

AC-1. Full matrix exists.

Evidence target: `packages/omniweb-toolkit/references/full-action-spectrum-testing-matrix.md` covers all current read, write, mutation, and helper families.

AC-2. Matrix rows are executable or honestly blocked.

Evidence target: every row has command, environment, spend/mutation class, authorization flag, success criteria, and degraded vocabulary.

AC-3. Reads are current and no-spend.

Evidence target: PR1 refreshes read/discovery rows through current host probes and updates method-level proof state.

AC-4. Social/publish/tip/VOTE writes are explicitly authorized.

Evidence target: PR2 proof packets preserve preflight, explicit flags, tx evidence, spend accounting, and product readback.

AC-5. Market writes are separated correctly.

Evidence target: PR3 separates VOTE, fixed-price BET, higher/lower BET, manual registration recovery, ETH/binary unsupported paths, and pool/winners/history readback.

AC-6. Identity/admin mutation is supervised.

Evidence target: PR4 uses controlled targets, redacts sensitive challenge material, verifies cleanup where applicable, and does not imply autonomous identity mutation.

AC-7. Non-colony Demos domains are first-class.

Evidence target: PR5 includes escrow, storage, IPFS, and raw chain operations with bounded spend and readback criteria.

AC-8. Roadmap and re-entry truth are synced.

Evidence target: `docs/ROADMAP.md`, `packages/omniweb-toolkit/agents/openclaw/colony-operator/MEMORY.md`, `.../CURRENT_DOCTRINE.md`, and `.../NEXT_BAND_CHEAT_SHEET.md` name this as the next lane after hosted no-spend proof.

AC-9. Closeout is honest.

Evidence target: Section 13, Beads closeout, package references, and Beads memory record proven/degraded/blocked truth without release or registry claims.

## Section 6. Beads

- `omniweb-agents-action-spectrum`: parent epic.
- `omniweb-agents-action-spectrum.0`: PR0 - full action-spectrum matrix scaffold.
- `omniweb-agents-action-spectrum.1`: PR1 - read and discovery spectrum refresh.
- `omniweb-agents-action-spectrum.2`: PR2 - social publish and tip live spend sweep.
- `omniweb-agents-action-spectrum.3`: PR3 - market and prediction live spend sweep.
- `omniweb-agents-action-spectrum.4`: PR4 - identity admin and delivery mutation sweep.
- `omniweb-agents-action-spectrum.5`: PR5 - non-colony domain spend and mutation sweep.
- `omniweb-agents-action-spectrum.6`: PR6 - action-spectrum closeout and release gating.

Dependency order:

`action-spectrum.0 -> action-spectrum.1 -> action-spectrum.2/action-spectrum.3 -> action-spectrum.4 -> action-spectrum.5 -> action-spectrum.6`

## Section 7. Validation Ladder

PR0:

- `git diff --check`
- `bd dep cycles --json`
- `bd show omniweb-agents-action-spectrum --json`
- `bd show omniweb-agents-action-spectrum.0 --json`

PR1:

- `npm --prefix packages/omniweb-toolkit run check:live`
- `npm --prefix packages/omniweb-toolkit run check:live:detailed`
- `npm --prefix packages/omniweb-toolkit run check:read-surface`
- `npm --prefix packages/omniweb-toolkit run check:verification-matrix`

PR2 through PR5:

- `npm --prefix packages/omniweb-toolkit run check:frontdoor`
- targeted `probe-*` command for the active row family
- `git diff --check`
- row proof packet review against the matrix

PR6:

- `npm --prefix packages/omniweb-toolkit run check:frontdoor`
- `npm --prefix packages/omniweb-toolkit run check:release-proof`
- `git diff --check`
- `bd ready --json`
- `bd dolt push`

## Section 8. Launch Preconditions

Before executing PR1 or later live probes:

1. PR0 is merged on `main`.
2. The Beads graph exists under `omniweb-agents-action-spectrum`.
3. The operator provides an explicit budget ceiling for the active child bead.
4. Wallet address, host, package commit, and auth state are recorded in the proof packet.
5. The active command uses `--execute`, `--broadcast`, or the row's explicit equivalent.
6. Identity/admin rows have controlled mutation targets and cleanup/readback criteria.

## Section 9. Stop And Degraded Rules

Stop and record a blocker when:

- a command would exceed the approved spend cap
- the row needs credentials or a host prerequisite not present
- the only available target would mutate a long-lived identity without approval
- a webhook row lacks a controlled callback URL
- a recovery helper would register someone else's tx or an untrusted tx
- product readback fails after the defined lifecycle window and no no-spend recheck is possible

Use `degraded` instead of retrying forever when:

- tx confirmation exists but product indexing lags
- tip stats or balance readback diverges from tx evidence
- a dev-only endpoint remains unavailable on production
- a readback endpoint returns classified drift rather than an unknown failure

## Section 10. Proof Packet Minimum Shape

Each proof packet must include:

- `runId`
- `generatedAt`
- `beadId`
- `branch`
- `commit`
- `packageVersion`
- `host`
- `walletAddress`
- `authState`
- `budgetCeilingDem`
- `actualSpendDem`
- `rows`
- `validationCommands`
- `releaseVerdict`
- `registryVerdict`

Each row entry must include:

- `rowId`
- `family`
- `methods`
- `environment`
- `command`
- `explicitFlag`
- `spendClass`
- `mutationClass`
- `expectedSpendDem`
- `txHashes`
- `primaryReadback`
- `secondaryReadback`
- `lifecycle`
- `verdict`
- `reason`

## Section 11. Definition Of Done

The epic is done when:

- AC-1 through AC-9 are satisfied or explicitly degraded
- every matrix row is proven, degraded, unsupported, blocked, failed, or intentionally skipped with evidence
- spend accounting reconciles against the approved budgets
- mutation cleanup/readback is recorded where cleanup is required
- roadmap and re-entry mirror match closeout truth
- Beads parent and child tasks are closed or intentionally left blocked with evidence
- Beads are pushed
- no npm release or public registry proof is claimed

## Section 12. Non-Goals For Future Agents

Do not use this PRD to:

- publish to npm
- prove public registry install
- broaden live spend beyond the active child bead budget
- bypass `--execute` or `--broadcast`
- mutate identity without explicit supervised authorization
- convert tx-only evidence into product-success evidence
- reopen broad seam or capability architecture work without execution evidence

## Section 13. Execution Log

### 2026-05-19 - PR0 scaffold

- Created parent epic `omniweb-agents-action-spectrum` and child beads `omniweb-agents-action-spectrum.0` through `.6`.
- Superseded an accidental new graph under `omniweb-agents-spectrum` because that ID is already the historical completed consumer-spectrum lane in repo docs.
- Claimed `omniweb-agents-action-spectrum.0` for the matrix scaffold.
- Added the GoalMode packet and package matrix reference.
- No live spend, broadcast, identity mutation, webhook mutation, storage/IPFS/escrow write, npm release, or public registry proof performed.

### 2026-05-19 - PR1 read and discovery refresh

- Claimed `omniweb-agents-action-spectrum.1` and ran the no-spend read/discovery refresh from commit `41c6cdc1`.
- Added `packages/omniweb-toolkit/references/full-action-spectrum-read-discovery-proof-2026-05-19.md`.
- `check:live`, `check:live:detailed`, and `check:read-surface -- --include-dev-only` passed on the current production host.
- Read-surface summary: 29 pass verdicts and 2 expected dev-only verdicts; ETH fixed and ETH higher/lower pools remain deployment-disabled on production.
- Consumer/read probes passed for transport, read-profile, chat/webhook planning, and market reads.
- Drift/degraded truth preserved: advertised-but-404 discovery resources, `/api/agent/[address]/level`, auth-gated chat/webhook reads, ETH deployment-disabled pools, graduation server error, and escrow claimable/balance SDK stubs.
- Dry-run domain probes passed for identity supervision, storage CREATE/SET_FIELD payload preview, escrow send preview, chain balance/block reads, and storage list.
- No live spend, broadcast, identity mutation, webhook mutation, storage/IPFS/escrow write, npm release, or public registry proof performed.

### 2026-05-19 - PR2 social write sweep

- Claimed `omniweb-agents-action-spectrum.2` after Beads memory `action-spectrum-live-spend-gates` recorded standing testnet authorization and gate `omniweb-agents-usy9` was resolved.
- Runtime target: wallet `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`, host `https://supercolony.ai`, RPC `https://node3.demos.sh/`, state dir `.action-spectrum-state/pr2`, proof dir `packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr2/`.
- Added `packages/omniweb-toolkit/references/full-action-spectrum-social-write-proof-2026-05-19.md`.
- W1 standalone DAHR attestation passed: tx `d1d801bfc29974f211423536a3006f3476dc72baafd1f10cf8416ac3548ae944`, response hash `103698567e9b2219cf6283d386ad08ac31a12ee24618dd4642161f33b5391f04`.
- W2 publish passed twice with recent-feed indexed readback: txs `30cd113ad5aeac4aa0c1efa59853662ecfe951b33e5c9ff4caaab8d5e7f93b43` and `4fb3ff39c2290b96665d64b1f1975689ecf89ae840a4d0dc7a47f05cbf2e443c`.
- W3 reply was accepted but remains degraded: tx `38a5cd29ff4b2989dc21490a37ec387212b5e16456e96a4874ae823683cdd595` reached post-detail readback on a delayed no-spend recheck, but `indexedVisible=false`.
- W4 reaction and W5 tip ran the authorized `probe-social-writes.ts --execute --include-tip` path but skipped before spend because no untouched/untipped attested post met the maintained score and engagement floor.
- W6 VOTE failed/degraded with proof: CoinGecko returned HTTP 429 before tx; Blockchain.info retry hit node/SDK publish-confirmation failure and no category-search match. No successful VOTE tx is claimed in PR2.
- Final no-spend accounting still showed `1741 DEM`, no balance divergence, and `hourlyRemaining=2`, `dailyRemaining=11`. No identity/admin mutation, storage/IPFS/escrow write, npm release, public registry proof, or mainnet spend performed.

### 2026-05-19 - PR3 market write sweep

- Claimed `omniweb-agents-action-spectrum.3` after PR2 merged and used Beads memory `action-spectrum-live-spend-gates` for the explicit testnet-only PR3 market budget.
- Runtime target: wallet `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`, host `https://supercolony.ai`, RPC `https://node3.demos.sh/`, state dir `.action-spectrum-state/pr3`, proof dir `packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr3/`.
- Added `packages/omniweb-toolkit/references/full-action-spectrum-market-write-proof-2026-05-19.md`.
- W7 fixed-price BET passed: BTC 30m tx `824cbe8e14ec27a848679ed0d33949abff8431eaad87e5a4a862af6f09a7e111`, memo `HIVE_BET:BTC:76095:30m`, amount `5 DEM`, active-pool readback matched by tx hash and moved the pool from `totalBets=0`, `totalDem=0` to `totalBets=1`, `totalDem=5`.
- W8 higher/lower BET passed: BTC 24h LOWER tx `23501a444cc024d4e9c2d726c2263a4d60a0363431293928e9e41f26c8ec0a3e`, memo `HIVE_HL:BTC:LOWER:24h`, amount `5 DEM`, pool readback moved `totalLower=0`, `totalDem=0`, `lowerCount=0` to `totalLower=5`, `totalDem=5`, `lowerCount=1`.
- W9 registration replay is degraded/unsupported: targeted no-spend replay against the PR3-owned W7/W8 txs returned `wrong_tx_type` for `registerBet` and `registerHL`; W7's fixed product readback remains in its original proof because the replay window saw a fresh empty BTC 30m round, W8 higher/lower stayed visible during replay, and `registerEthBinaryBet` has no safe paired send path.
- W10 TLSN attestation remains blocked and was not broadcast. No identity/admin mutation, storage/IPFS/escrow write, npm release, public registry proof, or mainnet spend performed.

### 2026-05-19 - PR4 identity admin and delivery mutation sweep

- Claimed `omniweb-agents-action-spectrum.4` and recorded Beads memory `action-spectrum-identity-admin-gates` from the user's explicit request to run the full wallet/mnemonic, registration, and related identity/admin round.
- Provisioned throwaway wallet `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09` as `action-spectrum-pr4-20260519-01`; local mnemonic stayed only in the ignored local Demos credentials file, faucet funding and auth both passed, and readiness showed 1000 testnet DEM with no balance divergence.
- Added `packages/omniweb-toolkit/references/full-action-spectrum-identity-admin-proof-2026-05-19.md`.
- I1/I2 pass on the throwaway wallet with readback nuance: `register()` returned the requested public profile fields, follow-up profile readback matched the throwaway address but returned null/empty public fields, official challenge/claim/approve/readback succeeded, and unlink cleanup readback returned `count=0`, `containsAgent=false`.
- Maintained-script caveat: `probe-identity-surfaces.ts` correctly refused `--execute` without `--confirm-identity-mutation`, but it lacks `--agent-name` / `--env-path`; the confirmed run therefore used the configured wallet and registered it as `action-spectrum-pr4-20260519-01`. A restore attempt to `mj-codex-proof-agent` hit SuperColony name-change cooldown `429`, so that cleanup remains degraded until the cooldown expires.
- I3 deprecated `linkIdentity` is excluded: a redacted proof-payload marker was generated, but no public Twitter/GitHub proof URL was published or submitted.
- A1 webhook list passed, but create/delete are blocked because no controlled public HTTPS callback receiver or PR4-owned webhook id was available. No storage/IPFS/escrow write, npm release, public registry proof, production-host activation, or mainnet spend performed.

### 2026-05-19 - PR5 non-colony domain spend and mutation sweep

- Claimed `omniweb-agents-action-spectrum.5` and used the throwaway wallet `0x0b7468ded5583cb02c964d2bb93146b24824fe89db09f4ddefe3054383061f09` from PR4 for no-spend domain proving.
- Added `packages/omniweb-toolkit/references/full-action-spectrum-domain-write-proof-2026-05-19.md`.
- PR5 did not broadcast escrow, storage, IPFS, pin/unpin, or raw transfer writes because Beads memory `action-spectrum-live-spend-gates` explicitly covers PR2/PR3 only and says PR5 domain mutation needs a later bounded execution record. No such PR5 budget/target/cleanup gate was recorded.
- D1/D3/D5/D7 dry-runs produced concrete throwaway-wallet intents: escrow github target `action-spectrum-pr5-20260519` for `0.1 DEM`, storage address `stor-88bc0ec8b17cd2efa76540a01a9ec636bbffe7f5` with estimated create cost `1 DEM`, IPFS 104-byte upload quote returning `{ error: "Unknown message" }`, and raw self-transfer dry-run `0.1 DEM` with memo `ACTION_SPECTRUM_PR5_DRY_RUN`.
- D2/D4/D6 are blocked/degraded because no PR5-owned escrow, storage program, or CID exists. Escrow query wrappers returned `Method not implemented`; storage readback returned `Storage program not found`, `hasField=false`, and `readField=null`.
- D8 chain sign/read is degraded partial: `getBalance=1000`, `getBlockNumber=2285764`, and `signMessage` produced a redacted signature object, but `verifyMessage` returned `false`.
- Maintained domain probes currently lack `--agent-name` / `--env-path`, so PR5 records their configured-wallet dry-runs as a script-targeting gap and uses a targeted `connect({ agentName })` report for throwaway-wallet proof.
