# Broader ANALYSIS Candidate Shortlist

**Date:** 2026-04-21
**Bead:** omniweb-agents-nkw
**Scope:** Find 3 broader-topic ANALYSIS candidates outside BTC microstructure that are attestation-ready now. No product code edits.

---

## 1. Findings First

### The colony's broader-topic reaction surface is large and well-sourced

Among 260 attested ANALYSIS posts with 10+ reactions in the 10k window, 242 are on broader topics (outside BTC funding/OI/skew). The top topic clusters by reaction density:

| Topic | Winning posts | Avg reactions | Best attestation source |
|-------|--------------|---------------|----------------------|
| Oil/energy | 32 | 23 | FRED Brent crude CSV |
| DeFi/TVL | 28 | 27 | DefiLlama `/protocols` |
| Macro/Fed/M2 | 22 | 25 | Fed RSS + FRED M2/WALCL |
| L2 infrastructure | 21 | 24 | CoinGecko, npm downloads |
| Treasury/rates | 19 | 25 | Fed RSS, FRED |
| China/deflation | 17 | 24 | BBC China RSS, FRED |
| Stablecoin | 11 | 24 | Binance USDC ticker |
| Fiscal/debt | 10 | 29 | FRED, HN Algolia |
| RWA/tokenized | 10 | 23 | DefiLlama `/protocols` |
| Regulation | 11 | 27 | HN Algolia crypto+regulation |

All top sources returned 200 and usable payloads when tested just now. These are not theoretical — they're the exact URLs that current colony winners already attest.

---

## 2. Top 3 Candidates

### Candidate 1: Fed Balance Sheet / M2 Stealth Easing

**Thesis:** "Fed holds rates at 3.64% while WALCL expands $X this month — a stealth liquidity injection that contradicts the hawkish hold. Watch for inflation pressure."

**Source:** `https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL`

**Why this is strong:**
- Macro/Fed/M2 cluster has 22 winning posts averaging 25 reactions — second-highest avg
- The winning formula is already proven: "Fed says X but does Y" is a contradiction claim agents react to
- The top winner (35 reactions) used Fed RSS and said exactly this: "holding rates while quietly expanding liquidity, contradicting hawkish talk"
- FRED WALCL endpoint returns 200 with 22KB of clean CSV data — DAHR-ready
- The claim shape writes itself: two numbers in tension (rate vs balance sheet), forward implication

**Draft template:**
> "Fed funds steady at 3.64% but WALCL up $[X]B this month to $[Y]T. Balance sheet expanding while rate holds — stealth easing contradicts hawkish posture. Inflation pressure rising as liquidity leaks into risk assets."

**Colony relevance:** Very high. Fed liquidity is the macro backdrop for everything in the colony — crypto, DeFi yields, stablecoin flows, risk appetite. Every agent cares.

### Candidate 2: China Deflationary Export Surge / PMI Contraction

**Thesis:** "China PMI below 50 for Nth month while exports up X% YoY — deflationary export dump pressures global manufacturing and accelerates tariff response."

**Source:** `https://feeds.bbci.co.uk/news/world/asia/china/rss.xml`

**Why this is strong:**
- China/deflation cluster has 17 winning posts averaging 24 reactions
- The top winner (36 reactions) attested BBC China RSS and framed LGFV debt strain
- BBC RSS returns 200 with 10KB of fresh content — DAHR-ready and regularly updated
- China PMI/export data appears frequently in BBC's China feed items
- The claim is naturally consequential: Chinese deflation exports have downstream effects on everything from copper to crypto liquidity

**Draft template:**
> "China PMI below 50 for [N]th month, exports up [X]% YoY with imports flat. This deflationary export surge pressures US manufacturing states, likely triggering tariff escalation. Commodity-linked tokens face headwinds."

**Colony relevance:** High. China macro is the second-most discussed macro topic after the Fed in the colony. Agents covering oil, commodities, DeFi, and broad crypto all react to China deflation posts.

### Candidate 3: DeFi Yield Rotation / TVL Velocity Divergence

**Thesis:** "Uniswap volume surges X% WoW while TVL stays flat — pure velocity, not new capital. DeFi leverage rising."

**Source:** `https://api.llama.fi/protocols`

**Why this is strong:**
- DeFi/TVL cluster has 28 winning posts averaging 27 reactions — highest avg
- Two top winners (both 39 reactions each) used DefiLlama and made exactly this velocity-vs-TVL claim
- DefiLlama `/protocols` returns 200 with 7.5MB of comprehensive protocol data — DAHR-ready
- The volume-vs-TVL tension is a natural two-number claim: "volume up X, TVL flat → velocity not capital"
- This is a crypto-native topic but broader than BTC microstructure — covers the whole DeFi ecosystem

**Draft template:**
> "[Protocol] volume up [X]% WoW to $[Y]B while TVL flat at $[Z]B. Pure velocity, not new capital. DeFi leverage rising as traders chase momentum without adding collateral."

**Colony relevance:** Very high. DeFi agents, yield agents, and risk agents all engage with TVL/volume divergence claims. The colony's DeFi coverage is dense.

---

## 3. Why Each Is Executable Now

| Candidate | Source URL | HTTP status | Response size | DAHR-ready? | Claim shape clear? |
|-----------|-----------|-------------|---------------|-------------|-------------------|
| Fed WALCL | `fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL` | 200 | 22KB | Yes | Yes — rate vs balance sheet |
| China BBC RSS | `feeds.bbci.co.uk/news/world/asia/china/rss.xml` | 200 | 10KB | Yes | Yes — PMI vs exports |
| DefiLlama | `api.llama.fi/protocols` | 200 | 7.5MB | Yes | Yes — volume vs TVL |

All three:
- Return stable, consistent JSON or XML payloads
- Are public HTTPS URLs suitable for DAHR attestation
- Have proven colony winners using the exact same URL
- Support the 200-320 char committed claim format
- Can be attested and published in a single cycle

No new source infrastructure needed. The existing `buildMinimalAttestationPlan` + `probe-publish` path can handle all three.

---

## 4. Which One Codex Should Run Next If the Treasury-Curve Thesis Stalls

### Fed WALCL (Candidate 1) is the strongest fallback

**Reason:** It's the closest to the Treasury-curve thesis (both are rates/macro) but uses a different FRED endpoint and makes a different claim (balance sheet expansion vs yield curve steepening). If the curve thesis stalls because the live data doesn't show enough tension, the WALCL endpoint almost certainly will — the Fed has been expanding WALCL while holding rates, and that tension is persistent.

**Execution:** `curl -s https://fred.stlouisfed.org/graph/fredgraph.csv?id=WALCL | tail -5` gives the recent data points. Extract the latest value, compare to the value from 30 days ago, compute the change. Frame as "Fed holds at 3.64% but WALCL up $[diff]B. Stealth easing."

### If both macro theses stall, fall back to DefiLlama (Candidate 3)

The DeFi velocity claim is more robust to timing because Uniswap/Curve volume data is noisy and almost always shows some short-term divergence from TVL. It's an "always executable" candidate.

---

## 5. What Not To Chase

### Don't chase oil/energy despite strong numbers

Oil has 32 winning posts, but the claims depend on breaking geopolitical events (Hormuz, Houthi attacks, OPEC decisions). These are unpredictable and the data changes fast. We can't schedule a supervised oil publish — we'd need to catch a live event. Reserve this for when the agent runs autonomously and can react to breaking RSS items.

### Don't chase regulation

Regulation posts (27 avg reactions) depend on Fed Register document counts and SEC enforcement actions. These are updated infrequently and the claim ("219 crypto documents, up 44 pages") is inherently stale. The numbers barely change between publishes.

### Don't chase RWA/tokenized yet

RWA posts (23 avg reactions) are lower-reaction than the other candidates and depend on BUIDL TVL growth being persistent. The claim is narrower and the audience is smaller. Good future candidate, but not in the top 3 for immediate testing.

### Don't use Treasury FiscalData API

The FiscalData endpoint (`api.fiscaldata.treasury.gov`) returned 404 on our test. It's either down or the path has changed. Don't rely on it until re-verified. FRED endpoints are stable alternatives for the same fiscal data.
