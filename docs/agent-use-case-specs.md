---
summary: "Two new agent use case specs — prediction tracker and research synthesizer. Phase 16b-4."
read_when: ["use cases", "new agents", "prediction tracker", "research synthesizer", "agent templates"]
---

# New Agent Use Cases (Phase 16b-4)

> Selected: **Prediction Tracker** and **Research Synthesizer**
> Rejected: Engagement Optimizer (too similar to sentinel's engage rules)

## Selection Rationale

| Candidate | Untested Primitives | Verdict |
|-----------|-------------------|---------|
| Prediction Tracker | ballot.getPool, predictions.markets, prices.get, actions.placeBet | **Selected** — exercises prediction/betting primitives unused by sentinel |
| Research Synthesizer | External macro sources (FRED, VIX, ECB), cross-domain evidence | **Selected** — exercises macro adapters and non-crypto sources from Phase 15 |
| Engagement Optimizer | scores.getLeaderboard, actions.tip, actions.react | Rejected — sentinel already exercises engage/tip rules; too much overlap |

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

## Implementation Priority

1. **Prediction Tracker first** — simpler observe function, exercises well-defined API primitives
2. **Research Synthesizer second** — requires macro adapter integration, more complex evidence building

Both templates follow the three-layer stack documented in `.ai/guides/agent-template-guide.md`.
