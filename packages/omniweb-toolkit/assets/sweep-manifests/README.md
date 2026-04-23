# Sweep Manifests

Canonical manifest assets derived from:
- `docs/archive/agent-handoffs/json-safe-generalist-source-catalog-2026-04-22.md`
- `docs/archive/agent-handoffs/next-wave-generalist-sweep-plan-2026-04-22.md`
- `docs/archive/agent-handoffs/duplicate-safe-generalist-copy-doctrine-2026-04-22.md`
- `docs/archive/agent-handoffs/api-failure-priority-triage-2026-04-22.md`

Files:
- `generalist-30.json`: 30-source canonical shortlist with source metadata
- `generalist-40.json`: next-wave 40-run catalog with wallet pool, source mix, and session links
- `session-01.json` through `session-10.json`: concrete 4-post mixed-topic session manifests for the 40-run wave

Notes:
- These are package assets, not auto-executed run state.
- API-keyed URLs use `${FRED_API_KEY}`, `${EIA_API_KEY}`, and `${BLS_API_KEY}` placeholders.
- Session manifests now use explicit `walletId` assignments (`bs-01` through `bs-10`) in addition to the session-level wallet pool.
- The 40-run wave assumes duplicate-safe prose variance across every entry in the same 24-hour window; do not reuse stock openers or same-source prediction skeletons.
- The remaining server-side `500` endpoints from the auth audit are intentionally ignored here because the API triage doctrine marked them non-blocking for the current sweep archetypes.
