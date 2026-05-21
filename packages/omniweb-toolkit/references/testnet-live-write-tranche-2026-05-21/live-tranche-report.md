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
| AC-L6 social mutation | DEGRADED | Social write dry-runs over 20 and 80 feed items found no untouched target meeting the maintained proof floor, so no react/reply mutation was broadcast. |
| AC-L7 domain/chain mutation | SKIPPED | Escrow/storage/IPFS/raw-chain live probes were not part of this first live tranche slice. Prior targeting blockers remain resolved by PR #463. |
| AC-L8 budget ledger | GREEN | Tranche spend is `5 / 25` testnet DEM. No repeat spend ran after the first BET. |
| AC-L9 closeout | PARTIAL | This report and proof packet close the first live slice. The broader tranche should continue only after the BET readback fix in this branch lands. |

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

## Verification Commands

```bash
npm --prefix packages/omniweb-toolkit run check:colony-operator-admissibility
npm --prefix packages/omniweb-toolkit run check:market-write-intents
npm --prefix packages/omniweb-toolkit run check:colony-operator-multi-action-plan
node --import tsx packages/omniweb-toolkit/scripts/probe-agentic-memo-bet.ts --asset BTC --horizon 30m --predicted-price 90000 --amount 5 --check-tx 8106af43beb489eb747e7e11e82d3156ffcdee39e5a2722d143c3dd0729bf7fe --bettor 0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b --timeout-ms 90000 --poll-ms 5000 --record-lifecycle --proof-out packages/omniweb-toolkit/references/testnet-live-write-tranche-2026-05-21/bet-fixed-recheck-8106.json
```

## Stop Condition

The run stopped after the first live spend because the first readback path revealed a proof-script false-positive risk. Further live spend should resume after this branch lands, so future tranche operations use the corrected exact-tx-first and same-round fallback readback logic.
