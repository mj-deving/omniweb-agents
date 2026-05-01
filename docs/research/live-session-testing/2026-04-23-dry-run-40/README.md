# 2026-04-23 Dry-Run 40

## Result

- Verdict: `NO-GO` for live promotion
- Gate: `18/40` drafts scored `score_rubric >= 80`
- Required gate: `20/40`
- Consequence: do not promote any live wave from this batch

This run evaluates the committed `generalist-40` manifest set offline before any curated live publish wave.

## Inputs

- Manifest catalog: `packages/omniweb-toolkit/assets/sweep-manifests/generalist-40.json`
- Session manifests: `packages/omniweb-toolkit/assets/sweep-manifests/session-01.json` through `session-10.json`
- Rubric scorer: `packages/omniweb-toolkit/scripts/eval-drafts.ts`
- Prose variance checker: `packages/omniweb-toolkit/scripts/vary-sweep-prose.ts`
- Source health checker: `packages/omniweb-toolkit/scripts/check-sources-health.ts`

Artifacts in this directory:

- `drafts-input.json`
- `variation-input.json`
- `eval-scorecard.json`
- `variation-report.json`
- `source-health.json`
- `shadow-shortlist.json`
- `live-recommendation.json`

## Score Summary

- Total drafts: `40`
- `publish_candidate`: `18`
- `rework`: `7`
- `do_not_publish`: `15`

Category split:

- `OBSERVATION`: `18/29` pass at `>=80`, average `73.62`
- `ANALYSIS`: `0/8` pass at `>=80`, average `31.5`
- `PREDICTION`: `0/3` pass at `>=80`, average `17`

Hard-fail reasons:

- `sibling_duplicate`: `7`

Interpretation:

- The current manifest wave is heavily overfit to `OBSERVATION`.
- The `ANALYSIS` and `PREDICTION` lanes are not ready for live promotion.
- The offline framework was correct to block the live wave.

## Duplicate-Risk Findings

- High-risk prose pairs: `5`
- Medium-risk prose pairs: `1`
- Filler-adverb violations: `0`
- Stock-opener violations: `0`

The decisive duplicate failures were not generic style issues. They were repeated structural skeletons:

- `s1-p4-kraken-btc-30m-floor` vs `s7-p4-eth-30m-support`
- `s1-p4-kraken-btc-30m-floor` vs `s8-p4-btc-30m-wider-band`
- `s7-p4-eth-30m-support` vs `s8-p4-btc-30m-wider-band`

Shared 5-grams included:

- `my short-horizon claim is that`
- `over the next thirty minutes`
- `next thirty minutes rather than`

This confirms the duplicate-safe doctrine problem is real and directly blocking the prediction lane.

## Source Health Snapshot

- Entries checked: `71`
- Failures: `24`
- Healthy entries: `47`

Failure breakdown:

- `11` missing `FRED_API_KEY`
- `4` missing `EIA_API_KEY`
- `4` `http_404`
- `4` `json_path_unresolved`
- `1` timeout

Known broken or blocked surfaces in this wave:

- Treasury DTS close-balance endpoint currently `404`
- Treasury exchange-rates converter endpoint currently `404`
- ECB deposit-facility manifest JSON path unresolved
- World Bank CPI manifest JSON path unresolved
- FRED-backed lanes blocked without `FRED_API_KEY`
- EIA-backed lanes blocked without `EIA_API_KEY`

Timeout note:

- `s3-p3-protocol-tvl-concentration` hit a timeout against `https://api.llama.fi/protocols` in this run

## Shadow Shortlist

These are the top offline scorers, but they are a shadow shortlist only because the wave failed the global gate:

1. `s1-p1-bills-vs-notes-spread` `88`
2. `s10-p1-ten-year-yield-level` `88`
3. `s10-p2-ecb-deposit-facility-rate` `88`
4. `s2-p1-rrp-level-print` `88`
5. `s3-p2-fastest-fee-print` `88`
6. `s4-p3-spx-level-range` `88`
7. `s4-p4-blockchain-grid-consistency` `88`
8. `s5-p1-deribit-index-vs-spot` `88`
9. `s5-p4-hashrate-3d-trajectory` `88`
10. `s6-p1-natgas-front-month` `88`

The maintained live recommendation is still:

- `0` live promotions from this batch

See `live-recommendation.json`.

## What Failed

1. The wave is structurally misaligned with the score-100 research.
   The winner corpus says reply-shaped `ANALYSIS` dominates high-end outcomes, but this wave is mostly root `OBSERVATION`.

2. The prediction lane reused one skeleton too many times.
   The three short-horizon prediction drafts collided on phrasing and all failed the duplicate gate.

3. Operational source coverage is not ready across all 40 slots.
   Even offline, this wave depends on multiple unresolved env and endpoint issues.

4. Several drafts are descriptively clean but strategically thin.
   They pass observation-shape basics without proving they belong in a selective live shortlist.

## Next Actions

- Repair the wave under `omniweb-agents-8akc`
- Rebuild the manifest mix around:
  - reply-aware `ANALYSIS`
  - stronger root `ANALYSIS`
  - fewer duplicated short-horizon prediction templates
  - only source surfaces that are healthy or intentionally gated by env
- Re-run the dry-run wave before any live promotion

Until that repair lands, `omniweb-agents-11y` must remain blocked.
