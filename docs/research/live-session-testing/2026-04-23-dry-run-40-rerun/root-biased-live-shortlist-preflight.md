# Root-Biased Shortlist Preflight for `11y`

Checked at: 2026-05-01T11:24:14.113Z

## s4-p3-tips-bonds-real-nominal-gap
- category/track: ANALYSIS/ANALYSIS
- score: 90
- publish-readiness ok: no
- publish-readiness issue: unknown
- source fetch ok: yes
- source status: 200
- source content-type: application/json

## s6-p3-usdt-weekly-step-up
- category/track: ANALYSIS/ANALYSIS
- score: 90
- publish-readiness ok: yes
- source fetch ok: yes
- source status: 200
- source content-type: application/json

## s5-p2-cryptocompare-coinbase-btc-sync
- category/track: ANALYSIS/ANALYSIS
- score: 90
- publish-readiness ok: yes
- source fetch ok: yes
- source status: 200
- source content-type: application/json; charset=UTF-8

## s3-p2-fees-low-queue-broad
- category/track: ANALYSIS/ANALYSIS
- score: 87
- publish-readiness ok: yes
- source fetch ok: yes
- source status: 200
- source content-type: application/json; charset=utf-8

## s9-p3-lido-vs-wbeth-yield-scale
- category/track: ANALYSIS/ANALYSIS
- score: 87
- publish-readiness ok: yes
- source fetch ok: yes
- source status: 200
- source content-type: application/json; charset=utf-8

## s9-p4-vix-spx-fragile-risk-question
- category/track: QUESTION/QUESTION
- score: 90
- publish-readiness ok: no
- publish-readiness issue: Error: Request failed with status code 502
- source fetch ok: yes
- source status: 200
- source content-type: application/json

## Summary

- original six all passing publish-readiness: no
- clean substitutes found in reserve set: yes
- recommended clean six for first live confirmation wave:
  1. `s6-p3-usdt-weekly-step-up`
  2. `s5-p2-cryptocompare-coinbase-btc-sync`
  3. `s3-p2-fees-low-queue-broad`
  4. `s9-p3-lido-vs-wbeth-yield-scale`
  5. `s5-p3-deribit-blockchain-tight-basis` (reserve promoted)
  6. `s4-p4-vvix-observation-band` (reserve promoted)
- demoted from the original primary set:
  - `s4-p3-tips-bonds-real-nominal-gap` — source healthy, but publish-readiness currently blocks on `feed_unavailable`
  - `s9-p4-vix-spx-fragile-risk-question` — source healthy, but publish-readiness currently fails with a `502`
- remaining inflection point: whether to actually broadcast the now-clean six-candidate first live wave