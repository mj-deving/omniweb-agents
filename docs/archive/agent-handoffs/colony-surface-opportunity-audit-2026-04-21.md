# Colony Surface Opportunity Audit

**Date:** 2026-04-21
**Bead:** omniweb-agents-nkw
**Scope:** Whole-colony surface audit over 10,000 posts to identify the real opportunity landscape beyond ANALYSIS-only optimization. No product code edits.

---

## 1. Findings First

### We have been optimizing for 41% of the winning surface

Across 10,000 posts (blocks 2087096–2129327), there are 1,144 posts with 5+ reactions. Their category distribution:

| Category | 5+ reaction posts | Share of winners |
|----------|------------------|-----------------|
| ANALYSIS | 477 | **41%** |
| OBSERVATION | 403 | **35%** |
| PREDICTION | 116 | **10%** |
| QUESTION | 52 | **4%** |
| ALERT | 36 | **3%** |
| SIGNAL | 20 | **1%** |
| ACTION | 19 | **1%** |
| FEED | 14 | **1%** |
| VOTE | 7 | **0%** |
| OPINION | 0 | **0%** |

We publish ANALYSIS only. That's 41% of the winning surface. **OBSERVATION is 35% and PREDICTION is 10% — together those three cover 86% of all reaction-earning posts.**

### PREDICTION has the highest reaction density relative to volume

| Category | Volume | 5+ hit rate | Avg reactions |
|----------|--------|-------------|---------------|
| ACTION | 87 | **22%** | 4.2 |
| PREDICTION | 646 | **18%** | 3.8 |
| SIGNAL | 114 | **18%** | 3.8 |
| ANALYSIS | 2,793 | **17%** | 3.9 |
| OBSERVATION | 2,690 | **15%** | 2.9 |
| QUESTION | 350 | **15%** | 2.4 |
| FEED | 2,140 | **1%** | 0.1 |
| OPINION | 880 | **0%** | 0.2 |

PREDICTION posts earn 5+ reactions 18% of the time — the same rate as ANALYSIS — but with a clear formula: 96% of winning predictions have a time-bound claim, 79% have an explicit confidence percentage, and they average 209 chars.

### 86% of winning posts are outside our current topic families

Our research families cover funding-structure, etf-flows, spot-momentum, network-activity, stablecoin-supply, and vix-credit. Only 14% of posts with 5+ reactions match these families. The other 86% cover:

| Topic area | % of uncovered winners |
|-----------|----------------------|
| Geopolitics/news | 17% |
| Security meta (prompt injection) | 11% |
| AI/tech | 9% |
| Oil/energy | 9% |
| Macro/Fed | 6% |
| Regulation | 4% |
| L2/rollups | 4% |
| DeFi protocols | 3% |
| NFT/culture | 2% |
| RWA/yield | 2% |

### OPINION is dead — 75% are prompt injection refusals

880 OPINION posts, zero with 5+ reactions, max reactions on any single OPINION post: 3. 75% are prompt injection responses that got classified as OPINION. This category has zero value for score lift.

### Attestation does NOT increase reaction rate

| | Count | 5+ hit rate |
|--|-------|-------------|
| Attested | 6,729 | **10%** |
| Unattested | 3,271 | **13%** |

Unattested posts earn reactions at a slightly higher rate. Attestation matters for the 40-point score bonus, but it does not help earn reactions. (The 5+ reaction threshold is what gets from 80 to 90.)

---

## 2. Current Colony Surface Map

### Post volume: 10,000 posts from 74 unique authors

The colony has moderate concentration: 74 authors produced 10,000 posts, and the top 2 authors produced 2,931 posts (29%).

| Surface | Size | Our coverage |
|---------|------|-------------|
| ANALYSIS | 2,793 (28%) | ✅ This is our only surface |
| OBSERVATION | 2,690 (27%) | ❌ Not covered |
| FEED | 2,140 (21%) | ❌ Not covered (and mostly 0 reactions — low value) |
| OPINION | 880 (9%) | ❌ Not covered (and 0% hit rate — zero value) |
| PREDICTION | 646 (6%) | ❌ Not covered |
| QUESTION | 350 (4%) | ❌ Not covered |
| ALERT | 244 (2%) | ❌ Not covered |
| SIGNAL | 114 (1%) | ❌ Not covered |
| ACTION | 87 (1%) | ❌ Not covered |

### The productive surface (worth covering)

Removing FEED (1% hit rate) and OPINION (0% hit rate): the productive surface is ANALYSIS + OBSERVATION + PREDICTION + QUESTION + ALERT + SIGNAL + ACTION. We cover 1 of 7.

---

## 3. Category Ecology

### ANALYSIS: our current home (41% of winners)

- 2,793 posts, 477 with 5+ reactions (17% hit rate)
- Avg score 67 (dragged down by unattested posts at 40-50)
- 71% attested — highest attestation rate among major categories
- Our compact-claim doctrine is correctly shaped for this category
- **Assessment: still the single largest winner pool, but we're fishing in a pond where 76% of effort goes**

### OBSERVATION: the biggest missed surface (35% of winners)

- 2,690 posts, 403 with 5+ reactions (15% hit rate)
- Dominated by geopolitical/news observations from RSS-feed agents
- Top performers average 400-600 chars (longer than ANALYSIS winners)
- Many are NOT attested (only 52%) — but the attested ones score higher
- **Assessment: massive opportunity. We don't publish OBSERVATION at all. The category rewards timely reporting of novel facts with brief analytical framing.**

### PREDICTION: high-density opportunity (10% of winners, 18% hit rate)

- 646 posts, 116 with 5+ reactions (18% hit rate — tied for best with ANALYSIS)
- Formula is extremely consistent: "[Asset/event] will [specific outcome] within [48h/24h/this week]. [One supporting data point]. [Confidence: 70%]."
- 96% have time-bound claims, 79% have explicit confidence
- Average 209 chars — the shortest winning formula
- **Assessment: highly formulaic, high reaction density, and we have never published a single PREDICTION. This is the most obvious surface gap.**

### QUESTION: underrated format (4% of winners, 15% hit rate)

- 350 posts, 52 with 5+ reactions
- Top performers frame data as a question: "M2 growth down to 1.25% while VIX at lows — who's mispriced?"
- Forces engagement because agents want to answer
- **Assessment: low-volume but surprisingly effective. Worth testing.**

### SIGNAL / ACTION: small but dense

- SIGNAL: 114 posts, 20 with 5+ reactions (18% hit rate, 14% score-90+)
- ACTION: 87 posts, 19 with 5+ reactions (22% — highest hit rate!)
- Both are high-conviction, specific, actionable posts
- **Assessment: small pools, but if we could reliably produce these, the hit rate is excellent.**

### FEED and OPINION: do not enter

- FEED: 2,140 posts, 14 with 5+ reactions (1%). Score avg 30. Dead zone.
- OPINION: 880 posts, 0 with 5+ reactions. 75% are prompt injection refusals. Fully dead.

---

## 4. Action-Type Ecology

### Root posts dominate — the colony barely uses replies

The 10,000-post feed is almost entirely root posts. Reply chains are sparse. This matches what the API surface shows: `parentTxHash` is rarely populated.

| Action type | Evidence | Our coverage |
|------------|----------|-------------|
| Root publish | Dominant colony activity | ✅ Our only path |
| Reactions (agree/disagree) | Used by agents responding to others | ❌ Not in production yet |
| Replies | Very rare in current feed | ❌ Not tested |
| Tips | Blockchain-level only, no feed presence | ❌ Not in production |
| Bets/predictions | Live, especially higher-lower | ❌ Market writes work but don't produce colony posts |

### Are we over-invested in root publish optimization?

**Yes, but not in the way expected.** We're not over-invested in root publishing per se — root posts are the dominant colony activity. We're over-invested in **one category of root publishing** (ANALYSIS) and under-invested in the three other productive categories (OBSERVATION, PREDICTION, QUESTION).

The bigger surface gap is **category breadth**, not action-type breadth.

---

## 5. Topic Clusters and What We Are Missing

### Topic lift: what topics over-index in winners vs losers

| Topic | Winner % | Loser % | Lift |
|-------|---------|---------|------|
| **BTC/Bitcoin** | **12%** | 6% | **+7%** |
| **ETH/Ethereum** | **8%** | 3% | **+5%** |
| AI/tech | 10% | 6% | +3% |
| VIX/volatility | 7% | 4% | +4% |
| DeFi/TVL | 9% | 5% | +4% |
| Oil/energy | 8% | 5% | +3% |
| Macro/Fed | 7% | 4% | +3% |
| SOL/Solana | 5% | 2% | +2% |
| L2/rollups | 5% | 2% | +3% |
| Geopolitics | 14% | 16% | -2% |
| Security | 9% | 13% | -4% |
| Regulation | 4% | 8% | -3% |
| Gaming | 2% | 4% | -2% |

BTC is the strongest topic-lift signal (+7%), followed by ETH (+5%). Geopolitics has massive volume but actually under-indexes in winners (-2%) — it's where agents post to fill space, not where reactions concentrate. Security over-indexes in losers (-4%) — a dead topic.

### Our family coverage vs colony reality

| Our family | Colony match? |
|-----------|--------------|
| funding-structure | ✅ BTC microstructure is +7% lift topic |
| vix-credit | ✅ VIX/volatility is +4% lift |
| spot-momentum | ✅ BTC/ETH price action works |
| stablecoin-supply | Marginal — stablecoins are +2% lift |
| etf-flows | Marginal — absent from current feed |
| network-activity | Marginal — on-chain data is +1% lift |

**Three of our six families are on-target. Three are marginal.** The bigger issue is that we're missing the 86% of winning posts outside all six families — geopolitics, AI/tech, oil, macro, DeFi protocols, L2, RWA, and culture.

---

## 6. Where Our Current Agent Suite Is Overfit

### Overfit 1: Category (ANALYSIS only → misses 59% of winners)

We publish ANALYSIS exclusively. 59% of winning posts are OBSERVATION, PREDICTION, QUESTION, SIGNAL, or ACTION. We participate in zero of those.

### Overfit 2: Topic families (6 families → cover 14% of winners)

Our 6 research families are narrowly focused on crypto market microstructure and macro indicators. 86% of winning posts fall outside all 6 families.

### Overfit 3: Post shape (compact research claim → misses PREDICTION/OBSERVATION shapes)

The compact claim doctrine (200-320 chars, interpretive claim, ANALYSIS category) is well-tuned for one shape. But PREDICTION posts are a different shape (time-bound + confidence %, avg 209 chars) and OBSERVATION posts are often longer (400-600 chars for news commentary). One shape doesn't fit all three productive categories.

### Overfit 4: Score optimization (80→90 focus → ignores surface breadth)

The last 3 audit iterations focused on getting one ANALYSIS post from 80 to 90. That's a 10-point optimization on one post. Publishing across 3 categories could produce 3x the reaction surface area and a much higher aggregate score trajectory — even if each individual post only hits 80.

### NOT overfit

- **Attestation discipline** is correct. Attested posts score +40.
- **Length < 320** is correct. Hit rate drops sharply above 500.
- **Claim commitment** is correct. Forward claims outperform hedged dismissals.
- **Binance futures as a source** is correct. BTC microstructure is a +7% lift topic.

---

## 7. Best Bigger-Step Next Moves

### Move 1: Add PREDICTION publishing (HIGHEST LEVERAGE)

PREDICTION is the single highest-leverage surface we're not covering:

- 18% reaction hit rate (same as ANALYSIS)
- Extremely formulaic: "[Asset] will [outcome] within [timeframe]. [Data point]. Confidence: [N]%."
- 209 chars average — shorter than our current ANALYSIS
- Time-bound claims naturally invite agreement/disagreement
- We already have the attested sources to support predictions (Binance, CoinGecko, ETF data)
- The market-analyst archetype was designed for predictions but we've never used it for colony publishing

**Concrete next step:** Produce one attested PREDICTION post with a 48h time-bound BTC claim, one supporting data point from an attested source, and "Confidence: 70%." Expected: 18% chance of 5+ reactions → score 90.

### Move 2: Add OBSERVATION publishing for timely facts

OBSERVATION is 35% of winners and we don't publish it at all. The winning OBSERVATION shape is:

- A novel fact from a news/data source
- Brief analytical framing (one sentence of "this matters because...")
- 200-600 chars
- Often attested via RSS feeds

We already have HN Algolia in the engagement starter source pack and RSS feeds in the research source pack. These can produce OBSERVATION posts.

**Concrete next step:** Produce one attested OBSERVATION post from the CoinGecko trending endpoint or HN Algolia when a surprising data point appears. Expected: 15% chance of 5+ reactions.

### Move 3: Test QUESTION as a format

QUESTION posts have a 15% hit rate and a unique social dynamic: they invite answers. The winning shape is: "[Data point A] says X, [data point B] says Y. Who's mispriced?" or "Why is [metric] diverging from [expectation]?"

**Concrete next step:** Produce one attested QUESTION post using the same source data as a research publish but framing it as a question instead of a claim. Compare reaction rate.

### Move 4: Broaden topic families ONLY after category expansion

Don't expand topic families yet. The 6 families cover the right *kind* of topic (BTC micro, VIX, macro). The problem is not topic breadth — it's category breadth. Adding PREDICTION and OBSERVATION to the *existing* source families is higher leverage than adding new topic families to ANALYSIS.

---

## 8. What Codex Should Build or Test Next

### Build 1: PREDICTION publish path (P0)

Add a PREDICTION publish flow alongside the existing ANALYSIS flow:
- Same attested source pipeline (Binance, CoinGecko, etc.)
- Different draft shape: "[Asset] will [outcome] within 48h. [One data point from attested source]. Confidence: 70%."
- Category: `PREDICTION`
- Max 250 chars
- Must have a time-bound claim and explicit confidence
- Quality gate: reject predictions without timeframe or confidence number

This is a new category output, not a change to the existing ANALYSIS path.

### Build 2: OBSERVATION publish path (P1)

Add an OBSERVATION publish flow:
- Triggered when a fresh, novel fact appears in an attested source
- Draft shape: "[Novel fact from source]. [One sentence: why this matters]."
- Category: `OBSERVATION`
- 200-400 chars
- Quality gate: reject posts without a novel fact (no commentary-only posts)

### Build 3: Multi-category cycle in the loop (P1)

Modify the agent loop to evaluate across categories per cycle:
1. Check for PREDICTION opportunities (fresh divergence + time-bound claim possible)
2. Check for OBSERVATION opportunities (novel fact available)
3. Check for ANALYSIS opportunities (existing research path)
4. Publish the highest-scoring opportunity regardless of category

This makes the loop a surface router, not a single-category publisher.

### Test 1: One supervised PREDICTION publish (P0)

Before building the full path, manually produce one PREDICTION post:
- Source: Binance BTC futures or CoinGecko
- Text: "BTC [metric] will [direction] within 48h. [Supporting number]. Confidence: 70%."
- Category: PREDICTION
- Observe reaction count

### Test 2: One supervised QUESTION publish (P2)

Manually produce one QUESTION post:
- Same source data as the last ANALYSIS publish
- Reframe as a question: "BTC funding negative for N periods — is this squeeze setup real or just drift? [data point]"
- Category: QUESTION
- Observe whether the question format earns more reactions than the ANALYSIS format did

---

## If we want to address the whole colony surface

### The strategic picture

We have been running a narrowing optimization loop: ANALYSIS → compact claim → committed claim → better topic → repeat. Each iteration produces diminishing returns because we're optimizing one variable (post shape) on one surface (ANALYSIS category × 6 topic families).

The colony rewards surface **breadth** at least as much as shape **depth**:

| Path | Surface coverage | Reaction potential | Effort |
|------|-----------------|-------------------|--------|
| Current (ANALYSIS only) | 41% of winners | 17% hit rate × 1 category | Already built |
| Add PREDICTION | +10% → 51% | 18% hit rate × 2 categories | Medium |
| Add OBSERVATION | +35% → 86% | 15% hit rate × 3 categories | Medium |
| Add QUESTION | +4% → 90% | 15% hit rate × 4 categories | Low |

**Going from 1 category to 3 categories nearly doubles the winning surface we can participate in.** And each category has its own reaction population — agents that react to PREDICTION posts may not be the same agents that react to ANALYSIS posts.

### The recommended sequence

1. **This week:** Test one supervised PREDICTION publish. This costs one post and one attestation — about 2 DEM. If it earns 5+ reactions, the model is confirmed and Codex should build the full PREDICTION path.

2. **Next week:** Build the PREDICTION publish path in the agent loop alongside the existing ANALYSIS path. Run both in parallel.

3. **Week after:** Add OBSERVATION publishing. This requires a "novel fact detector" in the observe phase — flag when an attested source returns data that wasn't present in the last cycle.

4. **Later:** Consider QUESTION as a format variant. Test it manually before building.

### What NOT to do

- Do NOT expand to 12+ topic families before expanding to 3 categories. Category breadth > topic breadth.
- Do NOT build a "surface router" architecture before proving that PREDICTION earns reactions. Test the hypothesis cheaply first.
- Do NOT try to cover geopolitics or security topics. Geopolitics has negative lift (-2%) and security has strong negative lift (-4%). These topics are high-volume but low-reaction.
- Do NOT abandon ANALYSIS. It's still 41% of winners. The move is additive, not substitutive.
- Do NOT touch the attestation discipline. It doesn't help reactions, but it gives +40 score points. Both matter.

---

## Correction Pass: Strategic Priorities

### 1. Is the bigger gap category breadth or topic-family breadth?

**Both, and they interact. The original audit overstated category breadth and understated topic-family breadth.**

The numbers:

- Within ANALYSIS (our category), only **20% of winners** fall in our 6 topic families. So even if we stay in ANALYSIS only, we're covering 20% of ANALYSIS winners — not all of them.
- Within PREDICTION winners, **41% are crypto-related** and could use our existing sources. The other 59% cover geopolitics, sports, macro events — topics we don't source for.
- Within OBSERVATION winners, **30% are geopolitics**, **25% are security/meta (prompt injection responses)**, and only **9% are crypto**. To win in OBSERVATION we'd need geopolitics or security sources — or we'd be fishing in 9% of the OBSERVATION pond.

The corrected picture:

| Surface | Our current reach | Category fix alone | Topic fix alone | Both |
|---------|------------------|-------------------|-----------------|------|
| ANALYSIS winners (477) | ~99 (20%) | Still 20% (same category) | More families → maybe 40-50% | Same 40-50% |
| PREDICTION winners (116) | 0 | ~48 (41% are crypto) | 0 (wrong category) | ~48 |
| OBSERVATION winners (403) | 0 | ~36 (9% are crypto) | 0 (wrong category) | ~36 |

**Category expansion into PREDICTION gives us access to ~48 winner-shaped posts using existing crypto sources. That's real.**

**Category expansion into OBSERVATION gives us access to only ~36 winner-shaped posts — the crypto slice. The geopolitics/security majority requires sources we don't have and topics we don't cover.**

**Topic-family expansion within ANALYSIS gives us access to more of the 477 ANALYSIS winners we're already in — from 20% to potentially 40-50%.**

**Conclusion: neither category breadth nor topic breadth alone is the right framing. The practical question is: which test adds the most accessible winning surface with the least new infrastructure?**

### 2. Reaction surface vs score surface — separated cleanly

These are two independent scoring mechanics and the audit conflated them.

**Reaction surface** (what earns 5+ reactions):

| Finding | Confidence |
|---------|-----------|
| 1,144 posts get 5+ reactions across all categories | Measured |
| ANALYSIS, OBSERVATION, PREDICTION are the big three | Measured |
| Attestation does NOT increase reaction probability (10% att vs 13% unatt) | Measured |
| Category, topic novelty, and claim commitment drive reactions | Supported by 3k + 10k analysis |

**Score surface** (what gets score ≥90):

| Finding | Confidence |
|---------|-----------|
| **100% of score-90+ posts are attested** | Measured — zero exceptions in 546 posts |
| Score 90 = attestation(40) + base(20) + confidence(5) + long text(15) + reactions(10) | Formula verified |
| 52% of posts with 5+ reactions still miss score 90 because they aren't attested | Measured |
| Attestation is the hard gate for SCORE 90, even though it doesn't help earn reactions | Measured |

**The key implication we missed:** A post needs BOTH attestation (for score) AND reactions (for score 90+). Attestation without reactions = 80. Reactions without attestation = 60 or lower. **Any new category we enter must maintain attestation discipline to reach 90+, not just earn reactions.**

This changes the OBSERVATION calculus significantly. OBSERVATION winners are only 48% attested. The attested OBSERVATION posts that also get 5+ reactions — the actual score-90 OBSERVATION posts — number 197 out of 2,690 (7% rate). That's lower than ANALYSIS (9%) and lower than PREDICTION (6% but from a much smaller base). OBSERVATION is not as attractive as the raw reaction count suggested.

### 3. Re-ranked experiments (tests, not builds)

Corrected ranking, with explicit uncertainty:

**Experiment 1: PREDICTION publish using existing Binance source (strongly supported)**

- Evidence: PREDICTION has 18% reaction rate, 6% score-90 rate, and 41% of winners are crypto-related
- Our sources (Binance, CoinGecko) already support the PREDICTION formula
- Shape is clear: "[Asset] will [direction] within 48h. [Data]. Confidence: 70%."
- Cost: 1 post, ~2 DEM
- What we learn: does our agent earn reactions at the PREDICTION category rate?
- Confidence this is worth testing: **high** — the formula is formulaic and our sources fit

**Experiment 2: Same-topic ANALYSIS publish with committed claim (strongly supported)**

- Evidence: the 3k correction pass showed the #1 ANALYSIS winner uses the exact same topic family and source as ours — the difference was claim commitment
- No new category or topic required — just a different prompt constraint
- Cost: 1 post, ~2 DEM
- What we learn: does claim commitment alone close the gap within our existing surface?
- Confidence this is worth testing: **high** — directly isolates the variable from the 3k audit

**Experiment 3: Broader ANALYSIS topic (moderately supported)**

- Evidence: only 20% of ANALYSIS winners are in our 6 families; expanding families could reach 40-50%
- Pick one new topic from the winning distribution: macro/Fed (26% of top-50 ANALYSIS winners) or DeFi/TVL (9%)
- Attest via Fed RSS or DeFi Llama — both are DAHR-safe
- Cost: 1 post, ~2 DEM
- What we learn: does a different topic family earn more reactions within ANALYSIS?
- Confidence this is worth testing: **moderate** — we don't know if our 20% family coverage is the bottleneck or just a correlation

**Experiment 4: OBSERVATION publish (hypothesis only)**

- Evidence: OBSERVATION is 35% of reaction winners but only 9% are crypto, and the score-90 rate is 7%
- To earn score 90 we'd need attested + reactions — only 197/2690 OBSERVATION posts achieve that
- A crypto-focused attested OBSERVATION might work but the sample of such posts is small
- Cost: 1 post, ~2 DEM
- What we learn: does OBSERVATION give us reaction access we can't get through ANALYSIS or PREDICTION?
- Confidence this is worth testing: **low-moderate** — the accessible surface (crypto OBSERVATION) is small

**NOT recommended yet: ACTION, SIGNAL, QUESTION**

- ACTION (22% hit rate, 87 posts): 28/87 are from one "swarm intelligence" agent and 41/87 are "Monitor [asset]" alerts. The high hit rate comes from two narrow formulas, not a broad opportunity. Sample too small and too concentrated to generalize.
- SIGNAL (18% hit rate, 114 posts): 14 authors produced all 114 posts. This is a specialist format by a few agents. We'd be entering someone else's niche with no evidence our agent can produce this shape.
- QUESTION (15% hit rate): Interesting format but only 3% score-90 rate. Low score ceiling makes it poor for our primary goal.

### 4. What is strongly supported vs hypothetical

**Strongly supported (act on these):**

| Claim | Evidence |
|-------|---------|
| Score 90 requires attestation — zero exceptions | 546/546 score-90+ posts are attested |
| Our ANALYSIS posts stall at 80 due to 0-1 reactions, not attestation | Confirmed across multiple publishes |
| Claim commitment (directional/predictive) outperforms hedged observation | #1 ANALYSIS winner vs our post, same topic and source, 38 vs 1 reactions |
| PREDICTION has a clear, formulaic shape that earns 18% reaction rate | 116 winners, 96% time-bound, 79% confidence-tagged |
| Our 6 topic families cover only 20% of ANALYSIS winners | Keyword-matched across 477 winners |

**Plausible hypothesis (test before acting):**

| Claim | Why uncertain |
|-------|-------------|
| PREDICTION publishing will earn us reactions at the category base rate | We haven't published one yet. Our agent may produce it differently than existing winners. |
| Broader ANALYSIS topics will earn more reactions than our current families | Could be topic quality, could be author reputation, could be timing. Correlation only. |
| OBSERVATION is worth entering | 91% of OBSERVATION winners are geopolitics or security — topics we don't source. The crypto slice is 9%. |
| Category breadth > topic breadth | They're entangled. PREDICTION on crypto is a category AND topic expansion simultaneously. |

**Should NOT be productized yet:**

| Proposal | Why not |
|---------|---------|
| Multi-category loop architecture | Zero PREDICTION or OBSERVATION publishes have been tested. Build after experiments, not before. |
| OBSERVATION pipeline with "novel fact detector" | The crypto-accessible OBSERVATION surface is ~36 posts out of 403 winners. Too thin to justify architecture. |
| Surface router that picks best category per cycle | Premature optimization — we don't know which categories our agent can win in yet. |
| ACTION or SIGNAL publish paths | Sample sizes too small, author-concentrated. Not generalizable. |