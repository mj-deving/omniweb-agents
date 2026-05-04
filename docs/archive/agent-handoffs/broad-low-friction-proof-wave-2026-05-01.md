# Broad Low-Friction Proof Wave — 2026-05-01

## Purpose

Replace the narrower shortlist framing with a first proof wave that better represents a general-purpose first agent:

- public, no-key, low-friction first
- broad topic spread
- small enough to inspect manually
- publish + attest only

Built from: `docs/archive/agent-handoffs/general-purpose-proof-packet-2026-05-01.json`

## Wave shape

- **Primary set:** 6 candidates
- **Reserves:** 3 candidates
- **Scope:** publish + attest only
- **Excluded for this wave:** reply, prediction, higher-friction primitives

## Eligibility rules

A candidate belongs in this first wave only if it meets all of the following:

1. public / no-key / low-friction source posture
2. JSON-compatible primary evidence
3. complete evidence recorded for the claim, including supporting URLs for cross-source claims
4. score_rubric >= 86 in the durable rerun artifacts
5. no reply-track dependency
6. no prediction-verdict dependency
7. diversity caps respected:
   - max 2 per source family
   - max 2 per topic family

## Primary candidates

1. `s6-p3-usdt-weekly-step-up` — stablecoin-liquidity
   - category: ANALYSIS
   - source family: stablecoins
   - score: 90
   - rationale: USDT is at $188.96B against $185.48B a week earlier, so the weekly gain is already about $3.48B. That is a large enough increase to matter for crypto dollar liquidity even before you zoom out to the monthly trend.

2. `s5-p2-cryptocompare-coinbase-btc-sync` — btc-cross-venue-spot
   - category: ANALYSIS
   - source family: cryptocompare
   - score: 90
   - rationale: CryptoCompare has BTC at $77,651 while Coinbase prints $77,696, leaving only about $44 between two public retail-facing venues. That narrow spread says spot discovery is synchronized enough to undercut a dislocation story.

3. `s3-p2-fees-low-queue-broad` — btc-network-demand
   - category: ANALYSIS
   - source family: mempool
   - score: 87
   - rationale: Bitcoin's fee ladder still prints 3 sat/vB for fastest inclusion while the mempool holds 38.38 million vbytes. That byte load is real, but the flat price of urgency says demand is queued rather than bidding aggressively.

4. `s9-p3-lido-vs-wbeth-yield-scale` — eth-staking-yield
   - category: ANALYSIS
   - source family: yields
   - score: 87
   - rationale: Lido's STETH pool holds about $21.65B at 2.586% APY while Binance-staked ETH has $8.11B at 2.749% APY. That gap says the highest-scale onchain yield is clustering in a narrow set of ETH staking venues instead of dispersing broadly.

5. `s4-p4-vvix-observation-band` — macro-volatility
   - category: OBSERVATION
   - source family: cboe
   - score: 88
   - rationale: This is still a caution read, not a calm one: VVIX has faded to 98.73 after spending part of the session above 101. The useful observation is the regime shift from intraday flare to partial retreat, not a clean volatility washout.

6. `s10-p4-eth-inflation-question` — crypto-vs-macro-question
   - category: QUESTION
   - source family: coinbase
   - score: 90
   - rationale: CPI's index level is up about 1.05% from February to March while ETH still holds $2,326 on Coinbase, which keeps crypto from showing the clean macro recoil that sticky inflation would normally invite. Is this resilience real, or just delayed repricing before the inflation data fully bites?

## Reserve candidates

1. `s10-p2-top-three-tvl-cluster` — defi-concentration
   - category: ANALYSIS
   - source family: defillama
   - score: 86
   - rationale: The visible TVL table is still top-heavy: Binance CEX, OKX, and Lido sum to roughly $203.5B before the list falls away. This draft is about leaderboard clustering across the whole surface, not the venue-versus-protocol split.

2. `s5-p3-deribit-blockchain-tight-basis` — btc-derivatives-basis
   - category: ANALYSIS
   - source family: deribit
   - score: 87
   - rationale: Deribit indexes BTC at $77,712 while Blockchain.info shows $77,696, a gap of roughly $16 between derivatives reference and simple cash ticker. That is too small to read as basis stress, so the cross-venue tape still looks orderly.

3. `s4-p3-tips-bonds-real-nominal-gap` — rates-inflation-spread
   - category: ANALYSIS
   - source family: treasury
   - score: 90
   - rationale: In the same Treasury snapshot, inflation-linked paper yields 0.999% while long bonds print 3.392%. A roughly 239bp nominal-real spread still points to embedded inflation compensation rather than a fully cleaned-out long end.

## Execution rule before any live action

Even though the packet evidence is now durable, **publish-readiness must still be rechecked immediately before live execution** because feed/indexing readiness is mutable.

## Explicit replacement order

If a primary candidate fails immediate preflight, replace it in this order so the wave keeps its intended breadth:

1. if `s10-p4` fails preflight → promote `s10-p2`
2. if a BTC candidate fails preflight → promote `s5-p3`
3. if macro/rates breadth is needed and preflight clears → promote `s4-p3`

This keeps reserve choice deliberate instead of ad hoc.

## Promotion gates

- **reply** only after this wave has durable publish+attest proofs plus maintained replayability
- **react** only after at least one maintained runtime proof path exists
- **tip** only after at least one maintained runtime proof path exists

## Source artifacts

- `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/eval-scorecard.json`
- `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/drafts-input.json`
- `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/comparison-summary.json`
- `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/source-health.json`
- `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/root-biased-live-shortlist.json`
- `docs/research/live-session-testing/2026-04-23-dry-run-40-rerun/root-biased-live-shortlist-preflight.json`
