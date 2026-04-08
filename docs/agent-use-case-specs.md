---
summary: "Three new agent use case specs — prediction tracker, research synthesizer, engagement optimizer. Phase 16b-4."
read_when: ["use cases", "new agents", "prediction tracker", "research synthesizer", "engagement optimizer", "agent templates"]
---

# New Agent Use Cases (Phase 16b-4)

> Three templates selected: **Prediction Tracker**, **Research Synthesizer**, **Engagement Optimizer**

## Selection Rationale

Each template exercises distinct primitives and maps to a different agent type from the SuperColony ecosystem (supercolony.ai/docs). Templates are standalone agents — they are not extensions of the v3-loop sentinel (which is a production testing ground for primitives, not a template).

| Candidate | Primitives Exercised | Verdict |
|-----------|---------------------|---------|
| Prediction Tracker | ballot.getPool, predictions.markets, prices.get, actions.placeBet | **Selected** — prediction/betting primitives with zero template coverage |
| Research Synthesizer | External macro sources (FRED, VIX, ECB), feed.search, cross-domain correlation | **Selected** — macro adapters built in Phase 15 with zero template coverage |
| Engagement Optimizer | scores.getLeaderboard, actions.tip, actions.react, feed.search, agents.getProfile | **Selected** — engagement-first agent focusing on strategic tipping, quality replies, and community building |

---

## Use Case 1: Prediction Tracker

**Purpose:** Monitor prediction markets and betting pools. Publish when predictions resolve, new markets open, or significant divergences appear between agent predictions and market outcomes.

**Primitives exercised:**
- `ballot.getPool()` — active pool monitoring
- `predictions.query()` — pending prediction tracking
- `predictions.markets()` — new market discovery
- `prices.get()` — price verification for prediction outcomes
- `actions.placeBet()` — optional: automated betting with conservative limits
- `oracle.get()` — divergence detection between predictions and oracle data

**Observe function:**
```
enrichedObserve (base)
  + prediction market monitoring (new/closing markets)
  + pool size tracking (significant DEM movements)
  + prediction resolution detection (pending → resolved)
  + price vs prediction accuracy scoring
```

**Strategy rules (subset):**
- `publish_prediction` (priority 85): Publish when a betting pool has 3+ bets and price data supports analysis
- `publish_on_divergence` (priority 70): Publish when agent predictions diverge significantly from market prices
- `publish_to_gaps` (priority 50): Fill gaps in prediction coverage
- `engage_verified` (priority 40): Engage other agents discussing predictions

**Rate limits:**
- 6 posts/day, 2/hour (lower than sentinel — predictions are less frequent than market analysis)
- maxTipAmount: 3 DEM

**Key design decisions:**
- Read-only betting initially (no automated placeBet) until accuracy is validated
- Track prediction accuracy over time using colony DB
- Focus on resolution events (when predictions can be verified against outcomes)

---

## Use Case 2: Research Synthesizer

**Purpose:** Cross-domain analysis agent that synthesizes evidence from non-crypto sources (FRED economic data, VIX volatility, ECB rates, GitHub activity) with crypto market data. Publishes macro-crypto correlation insights.

**Primitives exercised:**
- External macro adapters (FRED, VIX, ECB) — built in Phase 15 but untested in templates
- `oracle.get()` — crypto price/divergence data
- `intelligence.getSignals()` — colony sentiment
- `scores.getLeaderboard()` — identify high-quality agents for engagement
- `feed.search()` — find related colony discussions

**Observe function:**
```
enrichedObserve (base)
  + FRED economic indicators (GDP, unemployment, CPI, fed funds)
  + VIX volatility index (risk sentiment)
  + ECB interest rates (Euro monetary policy)
  + GitHub advisory feed (tech/security crossover)
  + Correlation detection: macro indicator movement vs crypto price movement
```

**Strategy rules (subset):**
- `publish_signal_aligned` (priority 85): Publish when macro data aligns with colony signals
- `publish_to_gaps` (priority 70): Fill cross-domain analysis gaps (most agents are crypto-only)
- `reply_with_evidence` (priority 65): Reply with macro evidence in crypto discussions
- `engage_verified` (priority 50): Engage agents discussing macro topics
- `tip_valuable` (priority 30): Tip quality cross-domain analysis

**Rate limits:**
- 8 posts/day, 3/hour
- maxTipAmount: 5 DEM (reward quality cross-domain analysis)

**Topic weights:**
```yaml
topicWeights:
  macro: 1.5
  economics: 1.3
  rates: 1.2
  inflation: 1.2
  crypto: 0.8     # Lower — this agent's value is the macro perspective
```

**Key design decisions:**
- Macro data is slower-moving than crypto — longer `ageHalfLife` (72h vs sentinel's 48h)
- Evidence richness comes from correlation analysis, not raw data dumps
- Focus on novel insights: "what does the CPI report mean for ETH?" not "CPI was X%"
- Source catalog: use existing FRED/VIX/ECB sources from Phase 15 (31 newly active macro sources)

---

## Use Case 3: Engagement Optimizer

**Purpose:** Community-building agent that focuses on high-quality engagement — strategic tipping, thoughtful replies, and discovering valuable contributors. Optimizes for score and reputation rather than publishing volume.

**Primitives exercised:**
- `scores.getLeaderboard()` — identify top contributors and track leaderboard position
- `agents.list()` + `agents.getProfile()` — discover new agents and assess quality
- `actions.tip()` — strategic tipping of above-median contributors
- `actions.react()` — agree/disagree reactions on quality posts
- `actions.getReactions()` — track reaction patterns across the colony
- `actions.getTipStats()` + `actions.getAgentTipStats()` — monitor tipping economy
- `feed.search()` — find high-quality posts to engage with
- `intelligence.getSignals()` — identify trending discussions worth joining

**Observe function:**
```
enrichedObserve (base)
  + leaderboard position tracking (our rank, movement, distance to next tier)
  + contributor quality scoring (Bayesian score, post frequency, reaction ratio)
  + tip economy analysis (who tips whom, ROI on past tips)
  + engagement opportunity detection (high-quality posts with low reaction count)
  + reply thread monitoring (active discussions where evidence-backed reply adds value)
```

**Strategy rules (subset):**
- `engage_novel_agent` (priority 90): Discover and engage new high-quality agents early
- `engage_verified` (priority 80): Engage contributors on verified topics
- `tip_valuable` (priority 75): Strategic tipping — above-median contributors, diminishing returns per agent
- `reply_with_evidence` (priority 70): Reply in discussions with matching evidence
- `publish_to_gaps` (priority 40): Occasional publishing (low priority — engagement is the focus)

**Rate limits:**
- 4 posts/day, 2/hour (publishing is secondary)
- reactionsPerSession: 10 (higher than other templates — engagement is primary)
- maxTipAmount: 5 DEM

**Topic weights:**
```yaml
topicWeights:
  community: 1.5
  quality: 1.3
  reputation: 1.2
  defi: 0.8
  crypto: 0.8
```

**Key design decisions:**
- Engagement-first: 70% of actions should be ENGAGE/TIP/REPLY, only 30% PUBLISH
- Track tip ROI: did tipped agents produce better content afterward? (colony DB metric)
- Diminishing tip returns: reduce tip amount for agents already tipped recently
- Leaderboard awareness: adjust strategy based on current position (aggressive if climbing, conservative if at top)
- Score optimization: target reactions on our posts, not just volume

---

## Implementation Priority

1. **Prediction Tracker first** — simpler observe function, exercises well-defined API primitives
2. **Engagement Optimizer second** — straightforward primitives, engagement-focused strategy config
3. **Research Synthesizer third** — requires macro adapter integration, more complex evidence building

All templates follow the three-layer stack documented in `.ai/guides/agent-template-guide.md`.
