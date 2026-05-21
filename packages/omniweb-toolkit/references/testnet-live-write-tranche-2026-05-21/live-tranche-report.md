---
title: Testnet live-write tranche run report
date: 2026-05-21
bead: omniweb-agents-operator-stress.5
branch: codex/testnet-live-tranche-run
start_commit: 39122e7afe1c78583f78c3bf8d460f3a6c33d548
---

# Testnet Live-Write Tranche Run Report

## Scope

This run used `docs/goalmode/testnet-live-write-tranche-2026-05-21.md` as the active packet. The user authorized bounded testnet live operations without per-operation human approval prompts, while script-level live flags, budget caps, no-spend rechecks, one-operation-at-a-time execution, and product readback stayed mandatory.

No mainnet operation, real-money operation, npm release, public registry proof, production hosted activation, or private wallet material was recorded.

## Acceptance Anchor Status

| Anchor | Status | Evidence |
| --- | --- | --- |
| AC-L1 fresh lane | GREEN | Branch started from merged Phase 24 packet commit `39122e7afe1c78583f78c3bf8d460f3a6c33d548`; Beads were pulled and `omniweb-agents-operator-stress.5` was claimed. |
| AC-L2 authorization policy | GREEN | Active packet permits bounded testnet live operations without per-operation human prompts, but keeps `--execute` / broadcast / mutation flags mandatory. |
| AC-L3 no-spend readiness | GREEN | `check:colony-operator-admissibility`, `check:market-write-intents`, and `check:colony-operator-multi-action-plan` passed before live spend. |
| AC-L4 one-operation live execution | GREEN | One fixed-price BET spend was executed: BTC `30m`, predicted price `90000`, amount `5` testnet DEM, tx `8106af43beb489eb747e7e11e82d3156ffcdee39e5a2722d143c3dd0729bf7fe`. |
| AC-L5 identity/profile mutation | SKIPPED | No identity/profile mutation was rerun in this slice. Configured-wallet restore was already proven by PR #464; this tranche avoided unnecessary profile cooldown churn. |
| AC-L6 social mutation | DEGRADED | Social write dry-runs over 20, 80, and 200 feed items found no untouched target meeting the maintained proof floor, so no react/reply/tip mutation was broadcast. |
| AC-L7 domain/chain mutation | STUCK | VOTE publish preflight was green after script hardening, but the live broadcast retry failed at runtime connect with `node3.demos.sh` `502 Bad Gateway` before tx/lifecycle creation. Escrow/storage/IPFS/raw-chain live probes were not attempted in this slice. |
| AC-L8 budget ledger | GREEN | Tranche nominal spend remains `10 / 25` testnet DEM across the fixed-price BET and HL BET. VOTE failed before tx creation; balance readback stayed `1737` before and after the retry. Observed balance delta across the HL operation was `6`, while the requested pool amount was `5`. |
| AC-L9 closeout | PARTIAL | This report and proof packets close the fixed-price and HL live slices, classify social as currently target-thin, and classify VOTE live publish as runtime-STUCK after the retry. Remaining tranche families should continue one operation at a time from fresh `main` after the runtime is healthy. |

## Live Operation Record

The live operation was a fixed-price BET against the BTC `30m` active pool.

| Field | Value |
| --- | --- |
| Operation | fixed-price BET |
| Amount | `5` testnet DEM |
| Asset / horizon | BTC / `30m` |
| Prediction | `90000` |
| Pool | `0x8e39a7b63da4fc41e6680042a379fbeaf1623368ff8205ba2b2c8bd6918e7c42` |
| Tx | `8106af43beb489eb747e7e11e82d3156ffcdee39e5a2722d143c3dd0729bf7fe` |
| Readback | `active-txHash` |
| Proof packet | `bet-fixed-recheck-8106.json` |
| Stdout proof | `bet-fixed-recheck-8106-stdout.json` |

The authoritative readback is the no-spend recheck proof, not the initial execute stdout. The initial execute readback exposed a verifier bug: the fallback winner matcher could classify an older winner with the same bettor/price/horizon as proof for a newer tx. This branch fixes that by requiring winner fallback matches to be in the same or a newer round, while exact tx matches still win immediately.

The same fix also redacts local executable/proof/env paths from persisted lifecycle command strings. The committed proof command is repo-relative and contains no local credential path.

## Higher/Lower Operation Record

After PR #466 landed the fixed-price readback hardening, a second live operation was run through the maintained `probe-market-writes.ts --only hl` path.

| Field | Value |
| --- | --- |
| Operation | higher/lower BET |
| Amount | `5` testnet DEM |
| Observed balance delta | `6` |
| Asset / horizon | BTC / `24h` |
| Direction | `lower` |
| Pool | `0x8e39a7b63da4fc41e6680042a379fbeaf1623368ff8205ba2b2c8bd6918e7c42` |
| Tx | `5ccfd73ad106c26507234a762488b0f337d6fdf16e5e07eea0839b7fd88e30d5` |
| Readback | higher/lower pool moved from `totalLower=0`, `lowerCount=0`, `totalDem=0` to `totalLower=5`, `lowerCount=1`, `totalDem=5` |
| Preview proof | `hl-preview-stdout.json` |
| Execute proof | `hl-execute-proof.json` |

The raw execute stdout was not committed because SDK diagnostics printed private diagnostic material before the JSON report. The maintained market-write probe now suppresses SDK `console.log` diagnostics around live `placeHL` and `placeBet` calls, and the committed HL proof is sanitized to preserve only operation, budget, tx, and readback fields.

## Social Preview Record

The social write path was rerun with a wider target window after the market writes landed.

| Field | Value |
| --- | --- |
| Operation family | react / reply / tip |
| Mode | no-spend preview |
| Feed limit | `200` |
| Maintained floor | score `>=85`, engagement `>=5` |
| Result | `DEGRADED`: no untouched attested post met the floor |
| Proof | `social-preview-200.json` |

No social mutation was broadcast. The strongest current candidate had score `80` and engagement `0`, below the maintained proof floor.

## VOTE Publish Record

The VOTE path was tested after social remained target-thin.

| Field | Value |
| --- | --- |
| Operation family | `omni.colony.publishVote` |
| Mode | live broadcast retry after no-spend preflight |
| Explicit live flag | `--broadcast` |
| Asset | BTC |
| Reference price | `77300.46` from Binance BTCUSDT |
| Predicted price | `77247` from CoinGecko BTC/USD simple price |
| Confidence | `55` |
| Attestation URL | `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd` |
| Preflight proof | `vote-preflight-after-patch.json` |
| Broadcast proof | `vote-publish-execute.json` |
| Result | `STUCK`: runtime connect returned `502 Bad Gateway` before tx/lifecycle creation |
| Balance readback | `1737` before; `1737` after |

The first VOTE attempt failed earlier with a DAHR proxy timeout and no tx hash; the raw temp stdout was removed because SDK diagnostics printed private diagnostic material. This branch hardens `check-vote-publish.ts` so persisted lifecycle commands are path-redacted, `publishVote()` SDK console diagnostics are suppressed, and fatal runtime errors emit concise JSON instead of Axios internals. The final live retry then failed before broadcast at connect time with a sanitized `502` proof and no balance movement.

## Verification Commands

```bash
npm --prefix packages/omniweb-toolkit run check:colony-operator-admissibility
npm --prefix packages/omniweb-toolkit run check:market-write-intents
npm --prefix packages/omniweb-toolkit run check:colony-operator-multi-action-plan
node --import tsx packages/omniweb-toolkit/scripts/probe-agentic-memo-bet.ts --asset BTC --horizon 30m --predicted-price 90000 --amount 5 --check-tx 8106af43beb489eb747e7e11e82d3156ffcdee39e5a2722d143c3dd0729bf7fe --bettor 0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b --timeout-ms 90000 --poll-ms 5000 --record-lifecycle --proof-out packages/omniweb-toolkit/references/testnet-live-write-tranche-2026-05-21/bet-fixed-recheck-8106.json
node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --only hl --assets BTC,ETH,SOL --hl-timeout-ms 60000 --poll-ms 5000
node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts --only hl --assets BTC,ETH,SOL --hl-timeout-ms 60000 --poll-ms 5000 --execute
node --import tsx packages/omniweb-toolkit/scripts/probe-social-writes.ts --feed-limit 200 --reaction-timeout-ms 15000 --tip-timeout-ms 30000 --poll-ms 3000
node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts --verify-limit 20 --out packages/omniweb-toolkit/references/testnet-live-write-tranche-2026-05-21/vote-preflight-after-patch.json
node --import tsx packages/omniweb-toolkit/scripts/check-vote-publish.ts --broadcast --asset BTC --reference-price 77300.46 --predicted-price 77247 --confidence 55 --attest-url 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd' --record-lifecycle --verify-timeout-ms 90000 --verify-poll-ms 5000 --verify-limit 150 --out packages/omniweb-toolkit/references/testnet-live-write-tranche-2026-05-21/vote-publish-execute.json --proof-out packages/omniweb-toolkit/references/testnet-live-write-tranche-2026-05-21/vote-publish-lifecycle-proof.json
```

## Stop Condition

The first slice stopped after the fixed-price BET because the first readback path revealed a proof-script false-positive risk. After PR #466 landed that fix, the next slice ran one HL BET and stopped because the raw execute path exposed SDK diagnostic output that should not be committed. After PR #467 landed that suppression, this slice reran social and VOTE readiness. Social stayed target-thin. VOTE had a green no-spend preflight but the final live retry failed before tx creation with `node3.demos.sh` `502 Bad Gateway`; per the packet stop conditions, no further VOTE retries should run until the runtime is healthy and a fresh no-spend preflight is green.
