# Claim-Driven Attestation — Tuning Task

> **Status:** Open
> **Priority:** Medium — improves attestation quality but system works without it
> **Depends on:** Phases 1-4 complete (shipped 2026-03-21)

## Problem

Claim-driven attestation is wired but rarely fires in practice. Session 38 live test showed the fallback path activating because:

1. **Posts lack numeric claims** — LLM-generated posts about "block production" or "network activity" contain no `$` amounts or `%` values, so `extractStructuredClaimsAuto` returns `[]`.
2. **No Binance sources in catalog** — only CoinGecko has price sources. Binance YAML spec has `claimTypes` but no catalog entries exist for it.
3. **Topic-source mismatch** — the planner searches all sourceView sources, but the matched source may be a different provider than the ones with `claimTypes`.

## Tasks

### T1: Add Binance sources to catalog
Add `binance-ticker-price` as an active source in `config/sources/catalog.json` with `adapter.operation: "ticker-price"`, scoped to sentinel/crawler. This gives the planner a second price provider alongside CoinGecko.

### T2: LLM prompt nudge for verifiable claims
The LLM post generation prompt (`src/actions/llm.ts`) doesn't encourage including specific data points. A small nudge — "include specific prices, metrics, or data points when available from source data" — would increase the rate of extractable claims without changing post quality.

### T3: Add `claimTypes: [metric]` to more specs
Current coverage: 8/26 specs. Good candidates for `metric` type:
- `fred.yaml` — economic indicators (GDP, CPI, unemployment)
- `worldbank.yaml` — development indicators
- `usgs.yaml` — earthquake magnitude
- `nasa.yaml` — asteroid close approach distance

### T4: Log claim extraction stats
Add `observe("insight", ...)` when claims ARE extracted (even if planner returns null) so we can see extraction hit rate in session review without a code change.

### T5: Expand `claimTypes` to `event` and `statistic`
Currently only `price` and `metric` are used in YAML specs. `event` type could match HN/Reddit sources for event claims ("X launched Y", "Z acquired W"). Lower priority since event verification is string-containment, not numeric.

## Success Criteria

- At least 1 in 3 sessions uses claim-driven attestation (surgical path, not fallback)
- Claim extraction produces >0 claims for >50% of posts
- No increase in publish failures or attestation errors
