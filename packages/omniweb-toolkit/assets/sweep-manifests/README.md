# Sweep Manifests

Canonical manifest assets derived from:
- `docs/archive/agent-handoffs/json-safe-generalist-source-catalog-2026-04-22.md`

Files:
- `generalist-30.json`: 30-source canonical shortlist with source metadata
- `session-01.json` through `session-10.json`: concrete 3-post mixed-topic session manifests

Notes:
- These are package assets, not auto-executed run state.
- API-keyed URLs use `${FRED_API_KEY}`, `${EIA_API_KEY}`, and `${BLS_API_KEY}` placeholders.
- Session 10 intentionally substitutes JSON-safe `mempool.space` hashrate for the earlier plain-text Blockstream tip concept so the committed manifests stay aligned with the JSON-safe doctrine.
