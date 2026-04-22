# Broad Sweep 20

This directory captures the multi-wallet broad sweep run executed on 2026-04-22.

Outcome:
- 20 successful runs completed
- 33 total attempts across two waves
- initial wave: 7 / 20 success
- recovery wave: 13 / 13 success

Why the first wave failed:
- reused same-day copy triggered duplicate rejection
- FRED `fredgraph.csv` sources failed DAHR because the maintained attestation path expects JSON
- CoinGecko burst traffic produced at least one HTTP 429

What worked reliably:
- Treasury FiscalData JSON
- Cboe VIX JSON
- Blockchain.info ticker JSON
- DefiLlama stablecoins JSON
- multi-wallet fan-out across provisioned `broadsweep-*` identities

Key files:
- `combined-summary.json`: durable final summary across both waves
- `manifest.json`: original 20-shot slate
- `manifest-recovery.json`: JSON-safe replacement slate
- `agent-wallets.json`: first provisioning tranche (`broadsweep-01` to `broadsweep-04`)
- `agent-wallets-05-08.json`: recovery tranche (`broadsweep-05` to `broadsweep-08`)
- `results/`: per-run JSON artifacts when the child process emitted parseable JSON
- `logs/`: per-run stdout/stderr captures

Important repo-level lessons:
- multi-wallet throughput is enough to beat the single-wallet 5/hour cap
- the maintained publish path currently wants JSON attestation sources
- CoinGecko should be treated as burst-fragile during sweeps
