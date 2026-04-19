# Research Family Claim Audit — Literature-Backed

Date: 2026-04-19
Bead: omniweb-agents-9he.5
Scope: analysis/doc only, no product code edits

This memo audits each research topic family against (a) what the evidence packet actually contains, (b) what claims are defensible from that packet per the academic and industry literature, (c) what claims are too strong, causal, or speculative, and (d) what extra metrics or sources would be required to justify the stronger claims.

All source links were gathered via web research. Where evidence is mixed or contested, this is stated explicitly.

---

## Summary of Top Findings

1. **The dossier layer is generally well-calibrated.** The `falseInferenceGuards` in all six families correctly block the most egregious causal overreads. The problem is more subtle: the *allowed* thesis space and family naming sometimes imply analytical capability that the evidence packet does not support.

2. **Highest-risk families: network-activity, stablecoin-supply, etf-flows.** These three have the widest gap between what the topic terms imply (mempool congestion, reserve health, institutional demand) and what the data packet can actually support.

3. **The vix-credit family name is a misnomer.** The packet contains no credit data. The bill-note spread is a term spread, not a credit spread. The family should be understood as "vix-rates" or "vix-term-spread."

4. **spot-momentum has a hidden vulnerability.** The phrase "the tape is confirming/rejecting" the signal is not defensible from price+volume alone without order flow data. Volume data in crypto is severely compromised by wash trading.

5. **funding-structure is the best-calibrated family.** The literature confirms that funding rates are positioning snapshots, not directional predictors — exactly what the dossier says.

---

## Family-by-Family Audit

### 1. funding-structure

**Evidence packet:**
- `markPrice`, `indexPrice`, `lastFundingRate`, `openInterest`, `priceChangePercent7d`
- Sources: Binance Futures Premium Index, Binance OI, CoinGecko

**Defensible primitives (literature-supported):**
- Funding is a positioning/sentiment snapshot, not a directional predictor (Presto Research: R-squared of current funding vs future price is ~0; NBER w32936 is a pricing paper, not a prediction paper)
- Negative funding historically correlates with local bottoms, not bearish continuation (CoinDesk historical analysis: March 2020, Nov 2022, April 2026)
- The relationship between funding, basis, and OI is meaningful when all three align; isolated funding prints are ambiguous
- OI changes combined with price direction carry signal; OI level alone is ambiguous

**Unsupported claims currently at risk:**
- The `allowedThesisSpace` permits "squeeze setup" language (`research-family-dossiers.ts:384`). BIS WP 1087 found a quantitative link between carry and short liquidations, but only conditional on rising OI + rising price. The current packet has OI level, not OI delta, so the squeeze claim is under-specified.
- The `buildResearchAnalysisAngle` for funding (`research-draft.ts:619`) says "what the relationship between funding, premium, and price says about positioning" — this is defensible as description but the word "says" leans toward inference. "Suggests" or "implies" would be more accurate per the literature.

**Recommended doctrine wording:**
> Funding is a snapshot of positioning stress, not a direction signal. Negative funding historically correlates with bottoms, not continuation. The mark-index basis reflects recent momentum, not forward-looking information (He & Manela, arXiv 2212.06888: R-squared > 0.50 for past returns explaining the basis). Squeeze setups require rising OI alongside funding stress; OI level alone is insufficient.

**Missing metrics for stronger claims:**
- OI change over time (delta, not level)
- Long/short ratio or liquidation volume
- Real basis term structure (not just mark-index spot spread)

**Key sources:**
- Presto Research: funding rate vs price prediction — https://www.prestolabs.io/research/can-funding-rate-predict-price-change
- NBER w32936 (Ackerer, Hugonnier, Jermann): perp pricing — https://www.nber.org/papers/w32936
- BIS WP 1087: crypto carry and liquidation cascades — https://www.bis.org/publ/work1087.pdf
- He & Manela: perpetual futures basis — https://arxiv.org/html/2212.06888v5
- Inan 2025: funding rate autocorrelation — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5576424

**Code refs:**
- `research-source-profile.ts:165-179` (expected metrics)
- `research-family-dossiers.ts:66-83` (dossier)
- `research-family-dossiers.ts:359-387` (brief builder)
- `research-draft.ts:173-186` (slip patterns)
- `research-draft.ts:619-620` (analysis angle)

---

### 2. etf-flows

**Evidence packet:**
- `totalHoldingsBtc`, `netFlowBtc`, `positiveIssuerCount`, `negativeIssuerCount`, `largestInflowBtc`, `largestOutflowBtc`
- Sources: btcetfdata.com, Binance 24hr

**Defensible primitives (literature-supported):**
- Net flow direction (positive/negative) as a descriptive fact
- Issuer concentration as a structural observation (IBIT holds 49-60% of all spot BTC ETF AUM — Investing.com, ETF.com)
- Total holdings in BTC units as a structural context metric (dollar AUM conflates price with flow)

**Unsupported claims currently at risk:**
- The `allowedThesisSpace` permits "broad institutional demand" language when flow, breadth, and leadership align (`research-family-dossiers.ts:296`). But only 22.9% of ETF AUM is held by professional investors (CoinShares 13F Q1 2025). ~30% of inflows are non-directional basis-trade arbitrage (10x Research via Glassnode). "Institutional demand" language is fundamentally misleading without stripping out basis-trade flows.
- `positiveIssuerCount` / `negativeIssuerCount` as "breadth" is misleading without AUM weighting. A day where 9/11 issuers show inflows but IBIT shows outflows could be net negative. The ETF dossier focus on "broadening, narrowing, or concentrating" (`research-family-dossiers.ts:112`) is correct in principle but the metric doesn't support it — issuer count without AUM weight is a poor breadth measure.
- Single-day flow interpretation is noise. Multi-day aggregation (5+ sessions) is the minimum credible timeframe (CryptoSlate analysis). The packet provides only the current day's data.
- The `invalidationFocus` says "Invalidate with a flip in net flow" (`research-family-dossiers.ts:297`) — a single-day flip is meaningless per the literature.
- No peer-reviewed study establishes that ETF flows reliably lead BTC price (arXiv:2512.12815 examines correlation regimes, not causality). The relationship appears largely contemporaneous.

**Recommended doctrine wording:**
> ETF flow data describes capital movement through a specific wrapper, not institutional conviction. Most AUM is retail or small-advisory, and a substantial portion of "institutional" flow is non-directional basis-trade arbitrage. Issuer count without AUM weighting is a poor breadth proxy. Single-day flows are noise; only multi-day streaks carry signal. "Institutional demand" language should be replaced with "ETF-wrapper demand" or "aggregate flow direction."

**Missing metrics for stronger claims:**
- Rolling multi-day flow aggregation (not just current day)
- Issuer AUM-weighted flow (not just count)
- Basis-trade flow estimation (CME OI vs ETF creation correlation)
- Creation/redemption activity (AP arbitrage vs end-investor demand)

**Key sources:**
- CoinShares 13F Q1 2025: 22.9% professional — https://coinshares.com/us/insights/research-data/13f-filings-of-bitcoin-etfs-q1-2025-institutional-report/
- BIS WP 1087: crypto carry — https://www.bis.org/publ/work1087.pdf
- 10x Research / Glassnode: basis trade in ETF flows — https://www.theblock.co/post/299701/glassnode-says-institutional-cash-and-carry-trades-are-influencing-us-spot-bitcoin-etf-flows
- SEC 2025-101: in-kind creation/redemption — https://www.sec.gov/newsroom/press-releases/2025-101-sec-permits-kind-creations-redemptions-crypto-etps
- CryptoSlate: single-day noise — https://cryptoslate.com/bitcoin-etf-record-outflows-are-deceptive-as-crypto-products-absorbed-46-7-billion-in-2025/
- arXiv:2512.12815: ETF hedging properties — https://arxiv.org/html/2512.12815v1

**Code refs:**
- `research-source-profile.ts:98-101, 141-163` (sources and expected metrics)
- `research-family-dossiers.ts:104-121` (dossier)
- `research-family-dossiers.ts:264-299` (brief builder)
- `research-draft.ts:203-216` (slip patterns)

---

### 3. spot-momentum

**Evidence packet:**
- `currentPriceUsd`, `startingPriceUsd`, `high7d`, `low7d`, `latestVolumeUsd`, `priceChangePercent7d`, `tradingRangeWidthUsd`
- Sources: CoinGecko Market Chart, Binance 24hr

**Defensible primitives (literature-supported):**
- Momentum is a real, statistically significant factor in crypto (Liu, Tsyvinski & Wu, NBER w25882, *Journal of Finance* 2022)
- 7-day price change is a noisy but directionally valid momentum proxy (Dobrynskaya 2021 finds momentum at 1-4 week horizons, reversal beyond ~1 month)
- Range width as a descriptive volatility proxy

**Unsupported claims currently at risk:**
- Range location ("upper third", "lower third" in `research-family-dossiers.ts:533-549`) has **no rigorous academic support** as a standalone signal. The closest work (Brock, Lakonishok & LeBaron 1992) tests breakouts, not interior range position. Stochastic oscillators mechanically compute this but lack academic profitability evidence in crypto.
- The `allowedThesisSpace` permits "whether the tape is confirming, rejecting, or absorbing the colony signal" (`research-family-dossiers.ts:354`). The phrase "tape confirming" from price+volume alone is **not defensible** without order flow data (Anastasopoulos & Gradojevic 2025: order flow explains ~10% daily / ~20% weekly returns; the portion uncorrelated with lagged returns has independent predictive power). Aggregate volume cannot distinguish accumulation from distribution.
- Volume as a confirming indicator is deeply compromised. Bitwise (2019 SEC filing): 95% of reported volume on unregulated exchanges is fake. Cong et al. (*Management Science* 2023): >70% wash trading on unregulated exchanges. Even regulated-exchange volume is noisy without buy/sell decomposition.
- The dossier baseline says "Spot momentum needs range location and volume context to mean anything" (`research-family-dossiers.ts:89`). This is reasonable as a *requirement* but the volume data available may be unreliable, and range location is not well-grounded.

**Recommended doctrine wording:**
> 7-day price change is a noisy but academically grounded momentum proxy. Range location is a descriptive convenience, not a validated signal — do not treat "upper third" or "lower third" as analytically meaningful on its own. Volume data is unreliable without knowing the source exchange and cannot distinguish accumulation from distribution. "The tape is confirming" language should be softened to "price behavior is consistent with" or "price movement aligns with."

**Missing metrics for stronger claims:**
- Order flow / trade imbalance (VPIN or buy/sell volume decomposition)
- Market depth / order-book imbalance
- Realized volatility (not just range width)
- Cross-exchange volume validation

**Key sources:**
- Liu, Tsyvinski & Wu: common risk factors in crypto — https://www.nber.org/papers/w25882
- Dobrynskaya 2021: crypto momentum and reversal — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3913263
- Cong, Li, Tang & Yang: crypto wash trading — https://pubsonline.informs.org/doi/abs/10.1287/mnsc.2021.02709
- Bitwise SEC filing: 95% fake volume — https://cointelegraph.com/news/bitwise-tells-us-sec-that-95-of-volume-on-unregulated-crypto-exchanges-is-suspect
- Anastasopoulos & Gradojevic 2025: order flow — https://www.sciencedirect.com/science/article/pii/S1386418126000029
- Easley et al. 2024: crypto microstructure — https://stoye.economics.cornell.edu/docs/Easley_ssrn-4814346.pdf

**Code refs:**
- `research-source-profile.ts:222-235` (expected metrics)
- `research-family-dossiers.ts:85-102` (dossier)
- `research-family-dossiers.ts:334-357` (brief builder)
- `research-family-dossiers.ts:533-549` (range location function)
- `research-draft.ts:188-201` (slip patterns)

---

### 4. network-activity

**Evidence packet:**
- `blockCount24h`, `transactionCount24h`, `hashrate24h`, `priceUsd`, `transactionsPerBlock24h`
- Sources: Blockchair Bitcoin Stats, CoinGecko

**Defensible primitives (literature-supported):**
- Block count and transaction count as raw throughput observations (descriptive)
- Transaction density (tx/block) as a throughput intensity proxy
- Price as market context (not as validation of network load)

**Unsupported claims currently at risk:**
- The `NETWORK_TERMS` in `research-source-profile.ts:47-58` include "mempool" and "congestion" — but the packet contains **no actual mempool data**. There is no global mempool; each node maintains its own with different policies. Block data shows what was confirmed, not what was waiting. Inferring mempool congestion from `blockCount24h`/`transactionCount24h` is not defensible (mempool.space FAQ, Bitcoin Core docs).
- Raw transaction counts are severely distorted: Glassnode found 75% of raw on-chain volume is non-economic (change outputs, self-transfers, relay). Hasu's batching analysis: ~12% of transactions account for ~40% of all outputs. Makarov & Schoar (NBER w29396) built entity-linking algorithms specifically because raw counts "vastly overstate real economic use."
- Hashrate as a "health" signal is misleading. Hashrate primarily measures security (cost of 51% attack) and miner competition. Academic work (ScienceDirect, Pagnotta & Buraschi) shows price strongly drives hashrate, not the reverse.
- The `allowedThesisSpace` permits "whether on-chain activity looks like genuine usage, congestion, stress, or speculative churn" (`research-family-dossiers.ts:413`). "Congestion" cannot be determined from the available metrics. "Genuine usage" vs "speculative churn" requires entity-adjusted metrics, which the packet does not include.
- The `NETWORK_BASELINE_SLIP_PATTERNS` correctly block "price absorbs/rejects/validates load" (`research-draft.ts:232-234`), which is good — the literature confirms this has no academic support (EU JRC / Ferretti et al. 2025: the relationship is bidirectional and confounded).

**Recommended doctrine wording:**
> Raw transaction counts and block counts are throughput observations, not adoption metrics. 75% of raw on-chain volume is non-economic per Glassnode entity-adjustment research. Hashrate is a security/miner-economics metric, not a health indicator. "Congestion" language requires actual mempool data (pending tx count, fee rate distribution, mempool size), which the current packet does not contain. Price does not "validate" or "reject" network load — the relationship is bidirectional. This family should stay strictly observational until entity-adjusted metrics and mempool data are available.

**Missing metrics for stronger claims:**
- Mempool size, pending tx count, fee rate distribution
- Active addresses / entity-adjusted activity (Glassnode, Coin Metrics)
- Value transferred (not just tx count)
- Batching-adjusted transactions

**Key sources:**
- Makarov & Schoar: blockchain analysis of Bitcoin — https://www.nber.org/papers/w29396
- Glassnode: 75% non-economic volume — https://insights.glassnode.com/true-bitcoin-volume/
- Glassnode: entity-adjusted metrics — https://docs.glassnode.com/guides-and-tutorials/on-chain-concepts/entity-adjusted-metrics
- Hasu: batching analysis — https://medium.com/@hasufly/an-analysis-of-batching-in-bitcoin-9bdf81a394e0
- Ferretti et al. 2025 (EU JRC): on-chain vs off-chain drivers — https://www.degruyterbrill.com/document/doi/10.1515/econ-2025-0169/html
- Coin Metrics: Bitcoin on-chain indicators primer — https://f.hubspotusercontent00.net/hubfs/5264302/The%20Coin%20Metrics%20Bitcoin%20On-Chain%20Indicators%20Primer.pdf

**Code refs:**
- `research-source-profile.ts:47-58` (NETWORK_TERMS — includes "mempool", "congestion")
- `research-source-profile.ts:182-197` (expected metrics)
- `research-family-dossiers.ts:123-140` (dossier)
- `research-family-dossiers.ts:389-416` (brief builder)
- `research-draft.ts:218-235` (slip patterns — good: blocks price-validates-load)

---

### 5. stablecoin-supply

**Evidence packet:**
- `circulatingUsd`, `circulatingPrevDayUsd`, `circulatingPrevWeekUsd`, `priceUsd`, `supplyChangePct7d`
- Derived: `supplyChangePct1d`, `supplyChangePct30d`, `pegDeviationPct`
- Sources: DeFiLlama Stablecoins, CoinGecko

**Defensible primitives (literature-supported):**
- Supply acceleration/deceleration as a descriptive observation
- Peg deviation as a stress indicator only when material (BIS WP 1164: peg breaks are driven by public information about reserve quality)
- Supply change as one input to liquidity conditions (not a standalone signal)

**Unsupported claims currently at risk:**
- The `allowedThesisSpace` permits "liquidity expansion, crowding, or potential spillover" when anchored in supply change (`research-family-dossiers.ts:440`). BIS WP 1219 (Aldasoro et al. 2024) finds stablecoin supply **follows** macro conditions rather than predicting them. Supply growth is endogenous to the risk-taking environment, not a leading indicator.
- Ante (2021, *Finance Research Letters*) found short-term positive returns around issuance events, but confounders are severe: OTC desk pre-positioning, arbitrage rebalancing, offshore USD demand. The effect varies by stablecoin, and issuance size was not significant.
- The dossier correctly says "Supply growth alone is not automatically bullish or bearish" (`research-family-dossiers.ts:52`), but the brief builder still frames supply change as the primary analytical axis. Without reserve composition data, supply changes are fundamentally ambiguous (IMF DP/2025/009, BIS WP 1164).
- Aggregate supply masks issuer-level rotation: during the May 2022 Terra crash, USDC supply grew by $4.75B while USDT shrank by $9.94B. "Stablecoin supply" as a monolith can be misleading.
- The `STABLECOIN_BASELINE_SLIP_PATTERNS` correctly block "peg at $1 proves health" and "issuance = straightforward fuel for risk assets" (`research-draft.ts:150-171`). These guards are well-calibrated.
- The `linkedThemes` for stablecoin-supply include "dollar-liquidity" (`research-family-dossiers.ts:577`) — this framing is defensible per BIS WP 1270 (stablecoin inflows do affect T-bill yields), but it operates through reserve rebalancing, not through crypto market mechanics.

**Recommended doctrine wording:**
> Stablecoin supply change is an observation about token creation/destruction, not a liquidity forecast. Supply follows macro conditions, not the reverse (BIS WP 1219). Peg stability is a baseline expectation, not evidence of health or demand — only material deviations warrant analysis (BIS WP 1164). "Liquidity expansion" language should be conditional on explicit market context, not inferred from supply change alone. Aggregate supply masks issuer-level rotation and cannot be interpreted without reserve composition data.

**Missing metrics for stronger claims:**
- Mint/redemption flow (creation vs market purchases)
- Reserve composition and attestation timing
- Chain distribution (which chains are absorbing new supply)
- Issuer-level supply breakdown (USDT vs USDC vs others)
- Turnover/velocity

**Key sources:**
- BIS WP 1219: stablecoins and monetary policy — https://www.bis.org/publ/work1219.htm
- BIS WP 1270: stablecoins and safe asset prices — https://www.bis.org/publ/work1270.htm
- BIS WP 1164: public information and stablecoin runs — https://www.bis.org/publ/work1164.pdf
- IMF DP/2025/009: understanding stablecoins — https://www.imf.org/en/publications/departmental-papers/issues/2025/12/02/understanding-stablecoins-570602
- Ante 2021: stablecoin issuances and crypto markets — https://www.sciencedirect.com/science/article/abs/pii/S1544612320316810
- Circle transparency — https://www.circle.com/transparency
- NY Fed Staff Report 1073: stablecoin runs — https://www.newyorkfed.org/medialibrary/media/research/staff_reports/sr1073.pdf

**Code refs:**
- `research-source-profile.ts:69-78, 108-113, 199-220` (terms, source IDs, profile)
- `research-family-dossiers.ts:47-64` (dossier)
- `research-family-dossiers.ts:418-456` (brief builder)
- `research-family-dossiers.ts:576-587` (linked themes — dollar-liquidity)
- `research-draft.ts:150-171` (slip patterns — good: blocks peg-as-thesis and issuance-as-fuel)

---

### 6. vix-credit

**Evidence packet:**
- `vixClose`, `vixPreviousClose`, `vixHigh`, `vixLow`, `vixSessionChangePct`, `vixIntradayRange`
- `treasuryBillsAvgRatePct`, `treasuryNotesAvgRatePct`, `billNoteSpreadBps`
- Sources: CBOE VIX, Treasury Fiscal Data

**Defensible primitives (literature-supported):**
- VIX as a measure of 30-day expected (implied) volatility (CBOE methodology — not "fear")
- VIX session change and intraday range as measures of volatility repricing speed
- Bill-note spread as a term spread / yield curve slope signal (Chicago Fed: yield curve slope does predict recessions via rate expectations and term premia)
- Using VIX + rates together as complementary macro inputs (BIS WP 606, OFR Financial Stress Index)

**Unsupported claims currently at risk:**
- The family is named "vix-credit" but contains **no credit data**. The bill-note spread is a term spread between two U.S. government instruments of identical credit quality, not a credit spread (FINRA definition: credit spread = difference between a bond's yield and a risk-free Treasury of same maturity). The `falseInferenceGuards` correctly block calling it a "credit spread" (`research-draft.ts:245`), but the family *name itself* is a misnomer. It's really a "vix-rates" or "vix-term-spread" family.
- The `allowedThesisSpace` permits "whether volatility is outrunning, matching, or lagging the short-rate stress backdrop" (`research-family-dossiers.ts:329`). This framing is defensible per BIS WP 606, but calling it a "stress backdrop" is stronger than the data supports — the bill-note spread measures rate expectations, not stress per se.
- Single-session VIX moves are noise without sustained confirmation (CFA Institute research, S&P Dow Jones Indices practitioner guide). The dossier guard "Do not treat one VIX session move as a regime shift" (`research-family-dossiers.ts:157`) is correct.
- VIX spikes are contemporaneous with or lag crashes, not predictive (NBER w16976; Pincheira-Brown & Calderon 2023: VIX combined with yield curve improves recession forecasting, but VIX alone is poor). During 2008, realized volatility led VIX by months.
- The dossier's `domainContext` for vix-credit says "Front-end rates and volatility together are a dollar-liquidity backdrop" (`research-family-dossiers.ts:604`). This is a stretch — the packet measures rate expectations, not dollar liquidity. Dollar liquidity requires money supply, bank reserves, or Fed balance sheet data.

**Recommended doctrine wording:**
> VIX measures 30-day expected S&P 500 volatility, not "fear." Single-session moves are noise; only sustained elevation carries signal. The bill-note spread is a term spread measuring rate expectations and term premia, not a credit spread — calling it a "credit spread" is a category error. Using VIX and rates together is valid as complementary macro inputs, but neither proves "stress" or predicts crashes. The family name "vix-credit" should be understood internally as "vix-term-spread" since the packet contains no corporate credit data.

**Missing metrics for stronger claims:**
- Actual corporate credit spreads (e.g., ICE BofA HY OAS)
- MOVE index (bond market implied volatility — leads VIX during rate-driven stress)
- Option skew / VIX term structure
- Realized volatility (not just implied)

**Key sources:**
- CBOE VIX methodology — https://cdn.cboe.com/resources/indices/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf
- CFA Institute: how well does the market predict volatility — https://blogs.cfainstitute.org/investor/2024/07/31/how-well-does-the-market-predict-volatility/
- S&P Global: practitioner's guide to reading VIX — https://www.spglobal.com/spdji/en/education-a-practitioners-guide-to-reading-vix.pdf
- NBER w16976: stock volatility during the financial crisis — https://www.nber.org/system/files/working_papers/w16976/w16976.pdf
- Pincheira-Brown & Calderon 2023: VIX-yield curve cycles — https://www.sciencedirect.com/science/article/abs/pii/S0169207023000389
- Chicago Fed Letter 404: why yield curve predicts recessions — https://www.chicagofed.org/publications/chicago-fed-letter/2018/404
- BIS WP 606: market volatility and term premium — https://www.bis.org/publ/work606.pdf
- OFR Financial Stress Index — https://www.financialresearch.gov/working-papers/files/OFRwp-17-04_The-OFR-Financial-Stress-Index.pdf
- FINRA: bond spreads — https://www.finra.org/investors/insights/spread-word-what-you-need-know-about-bond-spreads

**Code refs:**
- `research-source-profile.ts:80-86, 119-139` (terms and profile)
- `research-family-dossiers.ts:142-159` (dossier)
- `research-family-dossiers.ts:301-332` (brief builder)
- `research-family-dossiers.ts:603-605` (linked themes — "dollar-liquidity backdrop" is a stretch)
- `research-draft.ts:237-250` (slip patterns — good: blocks "credit spread" usage)

---

## Cross-Family Policy Recommendations

### What to keep (the guards are working)

1. All six `falseInferenceGuards` arrays are literature-supported and correctly block the most common causal overreads.
2. The `BASELINE_SLIP_PATTERNS` regex layer catches specific anti-patterns that the literature confirms are indefensible.
3. The dossier `baseline` arrays correctly frame each family's data as context, not thesis.

### What to tighten

| Family | Issue | Specific location | Recommended change |
|--------|-------|-------------------|-------------------|
| etf-flows | "institutional demand" framing | `dossier.focus[1]` (:113), `allowedThesisSpace` (:296) | Replace "institutional demand" with "ETF-wrapper demand" or "aggregate flow direction" |
| etf-flows | Single-day flow interpretation | `invalidationFocus` (:297) | Add "over multiple sessions" qualifier |
| etf-flows | Issuer count as breadth | `dossier.focus[0]` (:112) | Note that count without AUM weight is a poor breadth proxy |
| spot-momentum | "tape is confirming" language | `dossier.focus[1]` (:94), `allowedThesisSpace` (:354) | Soften to "price behavior is consistent with" |
| spot-momentum | Range location as signal | `describeRangeLocation` (:533-549) | Add comment that this is descriptive convenience, not a validated signal |
| network-activity | "mempool" and "congestion" terms | `NETWORK_TERMS` (:47-58) | These topic-routing terms promise metrics the packet can't deliver |
| network-activity | "congestion" in allowedThesisSpace | `allowedThesisSpace` (:413) | Remove "congestion" unless mempool data is added |
| network-activity | Raw tx count as meaningful | Throughout brief builder | Add guard noting 75% of raw volume is non-economic |
| stablecoin-supply | Supply-as-liquidity framing | `allowedThesisSpace` (:440) | Add "supply follows macro conditions, not the reverse" caveat |
| vix-credit | Family name implies credit data | Type definition, throughout | Internal documentation should note this is really "vix-term-spread" |
| vix-credit | "stress backdrop" language | `allowedThesisSpace` (:329) | Replace "stress backdrop" with "rates backdrop" consistently |
| vix-credit | "dollar-liquidity backdrop" | `linkedThemes` (:604) | The packet measures rate expectations, not dollar liquidity |

### The strongest safe pattern for all families

1. Describe the observable
2. Say what it could mean (conditional, not causal)
3. Name the specific condition that would confirm or invalidate
4. Avoid causal language unless the packet contains a second independent metric that actually supports causality
5. Never let topic-routing terms (mempool, congestion, institutional, credit) leak into claim language when the data doesn't include those observables

---

## Methodology

Six parallel literature research agents searched for:
- Published academic papers (NBER, BIS, IMF, SSRN, arXiv)
- Exchange/provider official documentation (CBOE, Binance, CoinGecko, DeFiLlama)
- Regulatory filings (SEC, FINRA, Treasury)
- Serious market-structure research (Glassnode, Coin Metrics, CoinShares, ARK Invest)
- Central bank working papers (Fed, Chicago Fed, NY Fed, BIS, Cleveland Fed)

Evidence quality and contestation are noted per finding. Market folklore was excluded unless backed by a peer-reviewed or institutional source.
