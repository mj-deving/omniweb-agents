# Broad Low-Friction Proof Wave Preflight

Checked at: 2026-05-01T15:06:30.738Z

## s6-p3-usdt-weekly-step-up
- tier: primary
- category/track: ANALYSIS/ANALYSIS
- score: 90
- source family: stablecoins
- topic family: stablecoin-liquidity
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 1
- supporting evidence failures: none

## s5-p2-cryptocompare-coinbase-btc-sync
- tier: primary
- category/track: ANALYSIS/ANALYSIS
- score: 90
- source family: cryptocompare
- topic family: btc-cross-venue-spot
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 2
- supporting evidence failures: none

## s3-p2-fees-low-queue-broad
- tier: primary
- category/track: ANALYSIS/ANALYSIS
- score: 87
- source family: mempool
- topic family: btc-network-demand
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 2
- supporting evidence failures: none

## s9-p3-lido-vs-wbeth-yield-scale
- tier: primary
- category/track: ANALYSIS/ANALYSIS
- score: 87
- source family: yields
- topic family: eth-staking-yield
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 1
- supporting evidence failures: none

## s4-p4-vvix-observation-band
- tier: primary
- category/track: OBSERVATION/OBSERVATION
- score: 88
- source family: cboe
- topic family: macro-volatility
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 1
- supporting evidence failures: none

## s10-p4-eth-inflation-question
- tier: primary
- category/track: QUESTION/QUESTION
- score: 90
- source family: coinbase
- topic family: crypto-vs-macro-question
- publish-readiness ok: no
- publish-readiness issue: draft_invalid
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 2
- supporting evidence failures: none

## s10-p2-top-three-tvl-cluster
- tier: reserve
- category/track: ANALYSIS/ANALYSIS
- score: 86
- source family: defillama
- topic family: defi-concentration
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 1
- supporting evidence failures: none

## s5-p3-deribit-blockchain-tight-basis
- tier: reserve
- category/track: ANALYSIS/ANALYSIS
- score: 87
- source family: deribit
- topic family: btc-derivatives-basis
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 2
- supporting evidence failures: none

## s4-p3-tips-bonds-real-nominal-gap
- tier: reserve
- category/track: ANALYSIS/ANALYSIS
- score: 90
- source family: treasury
- topic family: rates-inflation-spread
- publish-readiness ok: yes
- publish-readiness issue: none
- primary source fetch ok: yes
- primary source status: 200
- evidence urls checked: 1
- supporting evidence failures: none

## Summary

- original six all passing publish-readiness: no
- executable wave size right now: 6
- recommended executable wave:
  1. `s6-p3-usdt-weekly-step-up`
  2. `s5-p2-cryptocompare-coinbase-btc-sync`
  3. `s3-p2-fees-low-queue-broad`
  4. `s9-p3-lido-vs-wbeth-yield-scale`
  5. `s4-p4-vvix-observation-band`
  6. `s10-p2-top-three-tvl-cluster`
- demoted primaries:
  - `s10-p4-eth-inflation-question` — draft_invalid
- promoted reserves:
  - `s10-p2-top-three-tvl-cluster` — promoted because s10-p4 failed preflight
- remaining inflection point: whether to actually broadcast the currently executable wave after this no-spend preflight
