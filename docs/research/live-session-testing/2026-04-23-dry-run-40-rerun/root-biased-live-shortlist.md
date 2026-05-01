# Root-Biased Live Shortlist for `11y`

## Decision

- recommended publish count: **6**
- hard max for this first wave: **6**
- source: repaired rerun `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/eval-scorecard.json`

## Why this exists

The original `6zz` live recommendation was a hard **NO-GO**. The repaired rerun is the real basis now, but the reply lane is still constrained by the maintained finding that reply-parent evidence-readiness is `0/10` for the current reply path. So the first live shortlist is intentionally root-biased.

## Primary set

1. **s4-p3-tips-bonds-real-nominal-gap** — score 90, ANALYSIS/ANALYSIS
   - In the same Treasury snapshot, inflation-linked paper yields 0.999% while long bonds print 3.392%. A roughly 239bp nominal-real spread still points to embedded inflation compensation rather than a fully cleaned-out long end.
   - attestation: https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page%5Bsize%5D=10
2. **s6-p3-usdt-weekly-step-up** — score 90, ANALYSIS/ANALYSIS
   - USDT is at $188.96B against $185.48B a week earlier, so the weekly gain is already about $3.48B. That is a large enough increase to matter for crypto dollar liquidity even before you zoom out to the monthly trend.
   - attestation: https://stablecoins.llama.fi/stablecoins?includePrices=true
3. **s5-p2-cryptocompare-coinbase-btc-sync** — score 90, ANALYSIS/ANALYSIS
   - CryptoCompare has BTC at $77,651 while Coinbase prints $77,696, leaving only about $44 between two public retail-facing venues. That narrow spread says spot discovery is synchronized enough to undercut a dislocation story.
   - attestation: https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD
4. **s3-p2-fees-low-queue-broad** — score 87, ANALYSIS/ANALYSIS
   - Bitcoin's fee ladder still prints 3 sat/vB for fastest inclusion while the mempool holds 38.38 million vbytes. That byte load is real, but the flat price of urgency says demand is queued rather than bidding aggressively.
   - attestation: https://mempool.space/api/v1/fees/recommended
5. **s9-p3-lido-vs-wbeth-yield-scale** — score 87, ANALYSIS/ANALYSIS
   - Lido's STETH pool holds about $21.65B at 2.586% APY while Binance-staked ETH has $8.11B at 2.749% APY. That gap says the highest-scale onchain yield is clustering in a narrow set of ETH staking venues instead of dispersing broadly.
   - attestation: https://yields.llama.fi/pools
6. **s9-p4-vix-spx-fragile-risk-question** — score 90, QUESTION/QUESTION
   - VIX is up 1.06% to 19.12 while SPX is also up 1.04% to 7,137.9, so price strength and hedging demand are rising together. Is that coexistence a temporary squeeze, or the cleaner sign that risk appetite is still fragile?
   - attestation: https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json

## Reserve set

1. **s5-p3-deribit-blockchain-tight-basis** — score 87, ANALYSIS/ANALYSIS
   - Deribit indexes BTC at $77,712 while Blockchain.info shows $77,696, a gap of roughly $16 between derivatives reference and simple cash ticker. That is too small to read as basis stress, so the cross-venue tape still looks orderly.
2. **s4-p4-vvix-observation-band** — score 88, OBSERVATION/OBSERVATION
   - This is still a caution read, not a calm one: VVIX has faded to 98.73 after spending part of the session above 101. The useful observation is the regime shift from intraday flare to partial retreat, not a clean volatility washout.
3. **s10-p2-top-three-tvl-cluster** — score 86, ANALYSIS/ANALYSIS
   - The visible TVL table is still top-heavy: Binance CEX, OKX, and Lido sum to roughly $203.5B before the list falls away. This draft is about leaderboard clustering across the whole surface, not the venue-versus-protocol split.
4. **s10-p4-eth-inflation-question** — score 90, QUESTION/QUESTION
   - CPI's index level is up about 1.05% from February to March while ETH still holds $2,326 on Coinbase. Is crypto shrugging off sticky inflation, or just waiting for the macro data to bite?

## Exclusion rules used

- reply-track drafts excluded from the first live shortlist because maintained reply evidence-readiness is still `0/10`
- prediction drafts excluded from the primary set because they add pending-verdict / self-verification burden to the first confirmation wave
- roughly one primary pick per source family to avoid same-surface clustering

## Inflection point after this file

Once this shortlist is accepted as the operating basis, the next real inflection point is **public action**: whether to actually broadcast this first curated wave now, and if so whether to keep it at 6 or trim it further.
