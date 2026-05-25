---
summary: "PR3 live market/write proof for full action-spectrum rows W7-W10, with pool readback, registration replay truth, and bounded spend accounting."
read_when: ["action spectrum market proof", "W7 W8 W9 W10", "placeBet placeHL registerBet registerHL", "market write proof"]
topic_hint:
  - "action spectrum market proof"
  - "W7 W8 W9 W10"
  - "placeBet placeHL registerBet registerHL"
  - "market write proof"
---

# Full Action Spectrum Market Write Proof - 2026-05-19

Owner bead: `omniweb-agents-action-spectrum.3`

Branch: `codex/action-spectrum-pr3-market`

Mode: explicitly authorized testnet-only market write lane under Beads memory `action-spectrum-live-spend-gates`.

## Target

- wallet: `0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b`
- host: `https://supercolony.ai`
- RPC: `https://node3.demos.sh/`
- state dir: `.action-spectrum-state/pr3`
- proof dir: `packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr3/`
- spend ceiling: `<=70 DEM` for PR3, with first-pass live spend planned at `<=10 DEM`

Proof files are sanitized. They do not include mnemonics, private keys, auth headers, signatures, or local credential paths.

## Commands

Readiness preflight:

```bash
node --import tsx packages/omniweb-toolkit/scripts/check-publish-readiness.ts \
  --state-dir .action-spectrum-state/pr3
```

Dry-run market selection:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts \
  --assets BTC,ETH,SOL \
  --fixed-horizons 30m,4h,24h,10m \
  --state-dir .action-spectrum-state/pr3
```

W7 fixed-price BET:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-agentic-memo-bet.ts \
  --asset BTC \
  --horizon 30m \
  --predicted-price 76095 \
  --amount 5 \
  --env <demos-credentials-file> \
  --rpc-url https://node3.demos.sh/ \
  --colony-url https://supercolony.ai \
  --poll-ms 3000 \
  --timeout-ms 60000 \
  --state-dir .action-spectrum-state/pr3 \
  --record-lifecycle \
  --proof-out packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr3/w7-fixed-bet-lifecycle-proof.json \
  --execute
```

W8 higher/lower BET:

```bash
node --import tsx packages/omniweb-toolkit/scripts/probe-market-writes.ts \
  --assets BTC,ETH,SOL \
  --only hl \
  --hl-amount 5 \
  --hl-timeout-ms 60000 \
  --poll-ms 3000 \
  --state-dir .action-spectrum-state/pr3 \
  --execute
```

W9 registration replay used the two tx hashes created by this PR3 run and made no new transfer or bet spend:

```bash
node --input-type=module --import tsx -e '<targeted registerBet/registerHL replay for PR3-owned tx hashes>'
```

## Verdicts

| Row | Verdict | Evidence |
| --- | --- | --- |
| W7 fixed-price BET | pass | BTC 30m fixed-price tx `824cbe8e14ec27a848679ed0d33949abff8431eaad87e5a4a862af6f09a7e111`, memo `HIVE_BET:BTC:76095:30m`, amount `5 DEM`. Chain validation succeeded. Active-pool readback matched by tx hash after 19 polls and moved the BTC 30m pool from `totalBets=0`, `totalDem=0` to `totalBets=1`, `totalDem=5`. Lifecycle final verdict is `pass`. |
| W8 higher/lower BET | pass | BTC 24h LOWER tx `23501a444cc024d4e9c2d726c2263a4d60a0363431293928e9e41f26c8ec0a3e`, memo `HIVE_HL:BTC:LOWER:24h`, amount `5 DEM`. Pool readback matched after 8 polls and moved `totalLower=0`, `totalDem=0`, `lowerCount=0`, `referencePrice=null` to `totalLower=5`, `totalDem=5`, `lowerCount=1`, `referencePrice=76766.15`. |
| W9 market registration recovery | degraded / unsupported | Targeted no-spend replay against the PR3-owned fixed and higher/lower txs returned `400` with `wrong_tx_type` for both `registerBet` and `registerHL`. The fixed-price replay observation landed after the BTC 30m pool had rolled to a fresh empty round, so W7's active-pool proof remains the fixed BET readback evidence; the higher/lower replay still showed the W8 lower position in the 24h pool. Balance stayed `1749 DEM` before and after the replay. `registerEthBinaryBet` is unsupported because the package does not expose a safe paired ETH binary send path and no owned binary-bet tx exists for replay. |
| W10 TLSN attestation | blocked | `attestTlsn` remains exposed but experimental/runtime-sensitive; PR3 did not run a TLSN broadcast and does not upgrade it. |

## Spend Accounting

- W7 spent `5 DEM` through the fixed-price BET path.
- W8 reported `estimatedSpend=6 DEM` after a `5 DEM` higher/lower position, consistent with current balance/readback behavior and possible fee/rounding.
- W9 made no new transfer or bet spend; balance stayed unchanged across replay.
- Total observed PR3 spend remains inside the `<=70 DEM` child-bead budget.

## Proof Bundle

```text
packages/omniweb-toolkit/references/action-spectrum-live-proof-2026-05-19/pr3/
  readiness-preflight.json
  market-writes-dry-run.json
  w7-fixed-bet-report.json
  w7-fixed-bet-lifecycle-proof.json
  w8-higher-lower-report.json
  w9-registration-replay-report.json
```

## Current Truth

For PR3, DEM pool market writes are proven by product pool readback, not by tx confirmation alone. W7 and W8 provide the product-readback proofs. Manual `registerBet` and `registerHL` replay is currently a degraded owned-source-tx recovery surface for native memo txs, not standalone spend proof. `registerEthBinaryBet` remains unsupported until there is a safe paired send path with an owned tx hash.
