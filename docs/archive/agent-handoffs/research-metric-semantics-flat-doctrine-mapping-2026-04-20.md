# Research Metric Semantics — Flat Doctrine Extraction Mapping

**Date:** 2026-04-20
**Bead:** omniweb-agents-bgo (parent epic — recommend creating child bead `omniweb-agents-bgo.6`)
**Scope:** Design mapping for Phase 3 of the flat-domain-knowledge rollout — add metric semantics to the 6 existing research family YAML files.
**Depends on:** Phase 1 merged (PR #174, bgo.3), Phase 2 merged (bgo.5)
**Prior art:** `flat-domain-knowledge-design-2026-04-19.md`, `research-family-claim-audit-2026-04-19.md`, `oracle-divergence-flat-doctrine-mapping-2026-04-20.md`

---

## 1. Findings First

### Research families have no metric semantics today — oracle-divergence is the only precedent

| System | Has `metrics:` in YAML? | Has `metricSemantics` at runtime? |
|---|---|---|
| oracle-divergence | **Yes** — 6 metrics in YAML, loaded into `TopicFamilyContract.metricSemantics` | **Yes** — defined via `loadOracleDivergenceDoctrine()` in `market-family-doctrine.ts` |
| 6 research families | **No** — YAML files have only `family`, `displayName`, `baseline`, `focus`, `blocked` | **No** — `ResearchFamilyDossier` type has no `metricSemantics` field |

### Metric semantics are not consumed by any runtime code path today

Even for oracle-divergence, `metricSemantics` is loaded into the contract object but **never read by any runtime code**. No prompt builder, quality gate, or evidence evaluator references `contract.metricSemantics`. The only consumer is the test fixture in `topic-family-contract.test.ts:53`.

This means Phase 3 is **purely additive doctrine** — adding `metrics:` sections to YAML files for future prompt injection, without any runtime wiring needed today.

### Each family has a well-defined set of metrics from two sources

Metrics come from two places that are already aligned:

1. **`expectedMetrics` in `research-source-profile.ts`** — the metric names the source profile promises
2. **`findMetric()` calls in `research-family-dossiers.ts`** — the metric names the brief builder actually reads

These two lists are consistent per family (verified below). The metric semantics describe what these fields *mean* — stable knowledge that doesn't change when the brief builder logic changes.

### The brief builders already encode implicit metric semantics in prose

Each brief builder contains interpretive prose like:
- `"Funding is ${fundingDirection}"` — implies `fundingRateBps` means "current positioning cost"
- `"the mark/index spread is ${spreadDirection}"` — implies `markIndexSpreadUsd` means "perpetual premium/discount"
- `"Open interest sits around ${openInterest}"` — implies `openInterest` is a positioning size gauge

These are **implicit semantics** baked into builder logic. Moving them to explicit YAML `metrics:` sections makes them editable without touching TypeScript, and available for future prompt injection.

### How many metric semantics per family?

| Family | expectedMetrics count | findMetric() calls | Proposed YAML metrics |
|---|---|---|---|
| funding-structure | 5 | 4 (fundingRateBps, markPrice, markIndexSpreadUsd, openInterest) | 4 |
| etf-flows | 6 | 9 (includes ticker/direction) | 6 (core numeric) |
| spot-momentum | 5 | 7 (includes derived rangeWidth, rangeLocation) | 5 (core observed) |
| network-activity | 5 | 5 | 5 |
| stablecoin-supply | 5 | 5 (plus 3 derived supply deltas) | 5 (core observed) |
| vix-credit | 8 | 7 | 7 |
| **Total** | | | **32** |

At ~3 lines per metric (key + means + doesNotMean), this adds ~96 lines of YAML across 6 files — about 16 lines per file.

---

## 2. Per-Family Extraction Map

### funding-structure

**Source:** `research-source-profile.ts:178`, `research-family-dossiers.ts` brief builder

| Metric Key | Source | Used in Brief Builder? | Stable Doctrine? |
|---|---|---|---|
| `fundingRateBps` | Binance Premium Index | Yes — `describeFundingDirection()` | **Yes** — "positioning cost snapshot" is stable knowledge |
| `markPrice` | Binance Premium Index | Yes — injected into `allowedThesisSpace` | **Yes** — "fair-value price from perpetual-to-spot basis" |
| `markIndexSpreadUsd` | Derived | Yes — `describeSpreadDirection()` | **Yes** — "perpetual premium or discount to spot" |
| `openInterest` | Binance OI | Yes — injected into `anomalySummary` | **Yes** — "total open derivative contracts" |
| `lastFundingRate` | expectedMetrics only | No — `fundingRateBps` is used instead | **Skip** — alias; `fundingRateBps` covers this |

**Verdict:** 4 metrics move to YAML. `lastFundingRate` is an expectedMetrics alias that the brief builder doesn't use directly.

### etf-flows

**Source:** `research-source-profile.ts:155-161`, `research-family-dossiers.ts` brief builder

| Metric Key | Source | Used in Brief Builder? | Stable Doctrine? |
|---|---|---|---|
| `netFlowBtc` | btcetfdata | Yes | **Yes** — "aggregate net capital flow in BTC units" |
| `totalHoldingsBtc` | btcetfdata | Yes | **Yes** — "cumulative BTC held across all issuers" |
| `positiveIssuerCount` | btcetfdata | Yes | **Yes** — "number of issuers with net inflows" |
| `negativeIssuerCount` | btcetfdata | Yes | **Yes** — "number of issuers with net outflows" |
| `largestInflowBtc` | btcetfdata | Yes | **Yes** — "BTC inflow amount from the top contributor" |
| `largestOutflowBtc` | btcetfdata | Yes | **Yes** — "BTC outflow amount from the largest drag" |
| `largestInflowTicker` | btcetfdata | Yes — used to name the leader | **Skip** — label, not a numeric metric |
| `largestOutflowTicker` | btcetfdata | Yes — used to name the drag | **Skip** — label, not a numeric metric |
| `netFlowDirection` | btcetfdata | Yes — used for directionality | **Skip** — categorical label |

**Verdict:** 6 core numeric metrics move to YAML. Ticker names and direction labels are categorical, not metric semantics.

### spot-momentum

**Source:** `research-source-profile.ts:234`, `research-family-dossiers.ts` brief builder

| Metric Key | Source | Used in Brief Builder? | Stable Doctrine? |
|---|---|---|---|
| `currentPriceUsd` | CoinGecko | Yes | **Yes** — "observed spot price at fetch time" |
| `priceChangePercent7d` | CoinGecko | Yes | **Yes** — "7-day percentage price change" |
| `high7d` | CoinGecko | Yes — used for range calculation | **Yes** — "highest observed price in the 7-day window" |
| `low7d` | CoinGecko | Yes — used for range calculation | **Yes** — "lowest observed price in the 7-day window" |
| `latestVolumeUsd` | CoinGecko | Yes | **Yes** — "most recent reported trading volume in USD" |
| `startingPriceUsd` | Derived | Yes — reference in `allowedThesisSpace` | **Skip** — derived from chart data, not a distinct metric concept |
| `tradingRangeWidthUsd` | Derived | Yes — injected into `anomalySummary` | **Skip** — trivially derived (high - low) |

**Verdict:** 5 core metrics move to YAML. Derived values (`startingPriceUsd`, `tradingRangeWidthUsd`, range location) are computation, not knowledge.

### network-activity

**Source:** `research-source-profile.ts:195`, `research-family-dossiers.ts` brief builder

| Metric Key | Source | Used in Brief Builder? | Stable Doctrine? |
|---|---|---|---|
| `blockCount24h` | Blockchair | Yes | **Yes** — "blocks confirmed in the 24-hour window" |
| `transactionCount24h` | Blockchair | Yes | **Yes** — "transactions confirmed in the 24-hour window" |
| `transactionsPerBlock24h` | Blockchair | Yes | **Yes** — "average transaction density per block" |
| `hashrate24h` | Blockchair | Yes | **Yes** — "estimated network hashrate over 24 hours" |
| `priceUsd` | CoinGecko | Yes — spot context | **Yes** — "observed spot price as market context" |

**Verdict:** All 5 metrics move to YAML. This family's metrics are the most straightforward — all are raw observations.

### stablecoin-supply

**Source:** `research-source-profile.ts:212-216`, `research-family-dossiers.ts` brief builder

| Metric Key | Source | Used in Brief Builder? | Stable Doctrine? |
|---|---|---|---|
| `priceUsd` | CoinGecko | Yes — peg price | **Yes** — "observed stablecoin price for peg monitoring" |
| `circulatingUsd` | DeFiLlama | Yes — via derived deltas | **Yes** — "total circulating supply in USD terms" |
| `circulatingPrevDayUsd` | DeFiLlama | Yes — via derived delta | **Skip** — intermediate value for computation |
| `circulatingPrevWeekUsd` | DeFiLlama | Yes — via derived delta | **Skip** — intermediate value for computation |
| `supplyChangePct7d` | DeFiLlama | Yes — primary trend signal | **Yes** — "week-over-week supply change percentage" |
| `pegDeviationPct` | Derived | Yes — stress indicator | **Yes** — "deviation from the 1.00 USD target peg" |
| `supplyChangePct1d` | Derived | Yes — in `describeSupplyTrend()` | **Yes** — "day-over-day supply change percentage" |

**Verdict:** 5 core metrics move to YAML. The raw `circulatingPrevDayUsd` and `circulatingPrevWeekUsd` are intermediate computation inputs, not distinct concepts worth documenting.

### vix-credit

**Source:** `research-source-profile.ts:128-136`, `research-family-dossiers.ts` brief builder

| Metric Key | Source | Used in Brief Builder? | Stable Doctrine? |
|---|---|---|---|
| `vixClose` | CBOE | Yes | **Yes** — "end-of-session VIX level" |
| `vixPreviousClose` | CBOE | Yes — used for delta | **Yes** — "prior session VIX close for comparison" |
| `vixSessionChangePct` | CBOE/derived | Yes | **Yes** — "session-over-session VIX change percentage" |
| `vixIntradayRange` | CBOE | Yes | **Yes** — "intraday high-low range of VIX" |
| `treasuryBillsAvgRatePct` | Treasury | Yes | **Yes** — "average short-term Treasury bill rate" |
| `treasuryNotesAvgRatePct` | Treasury | Yes | **Yes** — "average medium-term Treasury note rate" |
| `billNoteSpreadBps` | Derived | Yes — primary spread signal | **Yes** — "bill-vs-note rate spread in basis points" |
| `vixHigh` | CBOE/expectedMetrics | No — `vixIntradayRange` is used | **Skip** — covered by `vixIntradayRange` |
| `vixLow` | CBOE/expectedMetrics | No — `vixIntradayRange` is used | **Skip** — covered by `vixIntradayRange` |

**Verdict:** 7 metrics move to YAML. `vixHigh`/`vixLow` are components of the range, not distinct concepts.

---

## 3. Proposed YAML Shape

### Minimal addition: `metrics:` key appended to existing YAML files

No new files. No new schema fields beyond `metrics:`. The exact same `metrics:` key format already used by `oracle-divergence.yaml`.

### Example: funding-structure.yaml (with metrics added)

```yaml
family: funding-structure
displayName: Funding Structure
baseline:
  - Funding and premium are positioning signals, not standalone direction calls.
  - Negative funding is not automatically bearish and not automatically contrarian bullish.
  - Funding without price and open-interest context is incomplete.
focus:
  - Focus on how funding, premium, and open interest line up with price behavior.
  - Explain whether the derivatives structure is confirming the move, fading it, or setting up a squeeze.
  - Treat a single funding print as evidence inside a positioning story, not as the whole thesis.
blocked:
  - Do not claim that negative funding by itself proves downside.
  - Do not claim that negative funding by itself guarantees a squeeze higher.
  - Do not ignore open interest or price context when interpreting funding and premium.

# Phase 3: what each metric means and does not mean
metrics:
  fundingRateBps:
    means: "The annualized cost of holding the dominant perpetual side, expressed in basis points."
    doesNotMean: "A prediction of future price direction."
  markPrice:
    means: "The fair-value price computed from the perpetual-to-spot basis."
    doesNotMean: "The spot price itself."
  markIndexSpreadUsd:
    means: "The dollar difference between the perpetual mark price and the spot index."
    doesNotMean: "Directional conviction — the spread reflects recent momentum, not forward expectations."
  openInterest:
    means: "Total open derivative contracts for this asset."
    doesNotMean: "Directional conviction — high OI can reflect either long or short dominance."
```

### Full proposed metrics for all 6 families

#### etf-flows

```yaml
metrics:
  netFlowBtc:
    means: "Aggregate net capital flow across all spot BTC ETF issuers, denominated in BTC."
    doesNotMean: "Institutional conviction — a substantial portion of flow is basis-trade arbitrage."
  totalHoldingsBtc:
    means: "Cumulative BTC held across all spot ETF issuers."
    doesNotMean: "Fresh demand — holdings reflect historical accumulation, not current-day buying."
  positiveIssuerCount:
    means: "Number of ETF issuers showing net inflows on the observed day."
    doesNotMean: "Demand breadth — issuer count without AUM weighting is a poor breadth proxy."
  negativeIssuerCount:
    means: "Number of ETF issuers showing net outflows on the observed day."
    doesNotMean: "Broad selling — one large issuer can dominate the aggregate."
  largestInflowBtc:
    means: "BTC inflow amount from the single largest contributing issuer."
    doesNotMean: "Representative institutional demand — it may be one fund carrying the tape."
  largestOutflowBtc:
    means: "BTC outflow amount from the single largest drag."
    doesNotMean: "Broad institutional exit — a single redemption event can dominate the number."
```

#### spot-momentum

```yaml
metrics:
  currentPriceUsd:
    means: "Observed spot price at the time of the evidence fetch."
    doesNotMean: "A directional signal by itself."
  priceChangePercent7d:
    means: "Percentage price change over the trailing 7-day window."
    doesNotMean: "A trend — 7-day momentum is noisy and subject to reversal beyond ~1 month."
  high7d:
    means: "Highest observed price in the trailing 7-day window."
    doesNotMean: "Resistance — range boundaries are descriptive, not validated technical levels."
  low7d:
    means: "Lowest observed price in the trailing 7-day window."
    doesNotMean: "Support — range boundaries are descriptive, not validated technical levels."
  latestVolumeUsd:
    means: "Most recent reported trading volume in USD."
    doesNotMean: "Reliable participation — reported volume includes wash trading and cannot distinguish accumulation from distribution."
```

#### network-activity

```yaml
metrics:
  blockCount24h:
    means: "Number of blocks confirmed in the observed 24-hour window."
    doesNotMean: "Network health or demand — block production follows protocol rules, not market conditions."
  transactionCount24h:
    means: "Number of transactions confirmed in the observed 24-hour window."
    doesNotMean: "Economic activity — roughly 75% of raw on-chain volume is non-economic per entity-adjustment research."
  transactionsPerBlock24h:
    means: "Average transaction density per block over the 24-hour window."
    doesNotMean: "Congestion — actual congestion requires mempool data, which this packet does not contain."
  hashrate24h:
    means: "Estimated network hashrate averaged over the 24-hour window."
    doesNotMean: "Price strength or network health — hashrate primarily reflects miner economics and security cost."
  priceUsd:
    means: "Observed spot price provided as market context alongside network data."
    doesNotMean: "Validation or rejection of the network activity level."
```

#### stablecoin-supply

```yaml
metrics:
  priceUsd:
    means: "Observed stablecoin price for peg deviation monitoring."
    doesNotMean: "A signal — price near 1.00 is the expected baseline, not alpha."
  circulatingUsd:
    means: "Total circulating supply of the stablecoin in USD terms."
    doesNotMean: "Market health — supply reflects token creation mechanics, not reserve quality."
  supplyChangePct7d:
    means: "Week-over-week percentage change in circulating supply."
    doesNotMean: "A liquidity forecast — supply follows macro conditions, not the reverse."
  supplyChangePct1d:
    means: "Day-over-day percentage change in circulating supply."
    doesNotMean: "A trend — single-day supply changes are often noise from minting or redemption batches."
  pegDeviationPct:
    means: "Percentage deviation from the 1.00 USD target peg."
    doesNotMean: "Reserve health — only material or persistent deviation warrants analysis."
```

#### vix-credit

```yaml
metrics:
  vixClose:
    means: "End-of-session VIX closing level — 30-day expected implied volatility."
    doesNotMean: "Fear level — VIX measures expected volatility, not sentiment directly."
  vixPreviousClose:
    means: "Prior session VIX close, provided for session-over-session comparison."
    doesNotMean: "A trend anchor — one prior close is a reference point, not a pattern."
  vixSessionChangePct:
    means: "Percentage change in VIX from the prior session close."
    doesNotMean: "A regime shift — one session move requires the rates backdrop for interpretation."
  vixIntradayRange:
    means: "High-to-low VIX range within the observed session."
    doesNotMean: "Panic — a wide range can reflect fast repricing in either direction."
  treasuryBillsAvgRatePct:
    means: "Average yield on short-term Treasury bills."
    doesNotMean: "The risk-free rate — it reflects front-end monetary policy expectations."
  treasuryNotesAvgRatePct:
    means: "Average yield on medium-term Treasury notes."
    doesNotMean: "A credit spread — this is a government rate, not a corporate credit measure."
  billNoteSpreadBps:
    means: "Spread between average bill and note rates in basis points — a yield curve slope proxy."
    doesNotMean: "A credit spread — the family name 'vix-credit' is a misnomer; this is a term spread."
```

---

## 4. What Stays in TypeScript

### Nothing needs to change in TypeScript for Phase 3

This is the critical finding: **Phase 3 requires zero TypeScript changes.**

- The `ResearchFamilyDossier` type has no `metricSemantics` field, and **no code reads metric semantics for research families**
- The `metrics:` key is already part of the YAML file format — the existing loader in `research-family-doctrine.ts` simply ignores unknown keys (YAML parse returns an object; the `toResearchFamilyDossier()` function reads only `family`, `baseline`, `focus`, `blocked`)
- The brief builders in `research-family-dossiers.ts` use `findMetric()` to get *values* at runtime, not *semantics* — they know what each metric *is* through their own interpretive logic

### What stays in TypeScript (no change)

| Component | File | Why It Stays |
|---|---|---|
| Brief builders | `research-family-dossiers.ts` | Interpret live evidence values — computation, not knowledge |
| `findMetric()` / `parseMetric()` | `research-family-dossiers.ts` | Runtime evidence extraction |
| `describeRangeLocation()` | `research-family-dossiers.ts` | Derived computation (upper/middle/lower third) |
| `describeFundingDirection()` | `research-family-dossiers.ts` | Categorical classification logic |
| `describeSupplyTrend()` | `research-family-dossiers.ts` | Supply delta aggregation |
| `buildLinkedResearchContext()` | `research-family-dossiers.ts` | Colony context theme matching |
| Slip patterns (all 6 families) | `research-draft.ts` | Regex — stays in TypeScript per doctrine |
| Source ID mappings | `research-source-profile.ts` | Routing logic — stays in TypeScript per doctrine |
| `expectedMetrics` lists | `research-source-profile.ts` | Source profile routing — not doctrine |
| Evidence parsers | `research-evidence.ts` | Response parsing logic |

### Future wiring (not for Phase 3)

If a future phase wants to inject metric semantics into the research prompt packet (e.g., so the LLM knows `fundingRateBps` means "positioning cost, not direction prediction"), the loader would need to:

1. Expand `ResearchFamilyDossier` to include an optional `metrics` field
2. Read the `metrics:` key from YAML (already present after Phase 3)
3. Inject semantics into the prompt packet's `constraints` or a new `metricContext` field

This is explicitly **out of scope for Phase 3**. Phase 3 only adds the YAML content. The wiring is a separate task.

---

## 5. Loader Recommendation

### Extend the existing research-family-doctrine loader? No.

The existing loader (`research-family-doctrine.ts`) reads `family`, `baseline`, `focus`, `blocked` and maps `blocked` → `falseInferenceGuards`. It does not need to change because:

1. YAML parsing (`yaml.parse()`) already returns the full object including `metrics:` — it just isn't read
2. The `toResearchFamilyDossier()` function destructures only the fields it needs; extra keys are silently ignored
3. No runtime code consumes metric semantics for research families

**The correct action is: add `metrics:` to the YAML files and do nothing to the loader.**

If a future phase wants to expose metric semantics at runtime, the cleanest path is:

```typescript
// Future: optional expansion of ResearchFamilyDossier
interface ResearchFamilyDossier {
  family: ResearchTopicFamily;
  baseline: string[];
  focus: string[];
  falseInferenceGuards: string[];
  metrics?: Record<string, { means: string; doesNotMean: string }>;  // Phase 3+ optional
}
```

But this is not needed today. The YAML content is the deliverable; the loader expansion is a follow-up.

### Separate semantics loader? Definitely not.

A separate loader would:
- Duplicate directory resolution logic
- Add a second cache
- Create a sync problem between doctrine files and semantics files

The whole point of one-file-per-family is that all knowledge about a family lives in one place. Splitting metrics into a separate file or loader defeats this.

---

## 6. Test Plan for Codex

### Existing tests: zero changes needed

| Test File | Impact |
|---|---|
| `tests/packages/research-draft.test.ts` | **None** — no code reads metrics from YAML |
| `tests/packages/topic-family-contract.test.ts` | **None** — tests oracle-divergence, not research families |
| `tests/doctrine/research-family-doctrine.test.ts` | **None** — tests `family`/`baseline`/`focus`/`blocked` only |

### New test to add

One test file: `tests/doctrine/research-metric-semantics.test.ts`

```
For each of the 6 research family YAML files:
  1. Parse the YAML file
  2. Assert `metrics` key exists and is an object
  3. Assert each metric entry has `means` (non-empty string) and `doesNotMean` (non-empty string)
  4. Assert the metric keys match the family's expectedMetrics from research-source-profile.ts
     (where applicable — some expectedMetrics are aliases or intermediate values)
```

This test validates the YAML content without requiring any loader changes. It directly parses the files.

### Optional: cross-reference test

A more ambitious test could verify that every metric key in the YAML appears in at least one of:
- `expectedMetrics` in the corresponding `deriveResearchSourceProfile()` branch
- `findMetric()` calls in the corresponding brief builder

This ensures the YAML isn't documenting phantom metrics. But it's optional — the current family structure is stable enough that a manual review suffices.

---

## 7. Migration Hazards

### Hazard 1: YAML parse tolerance (ZERO risk)

The existing `research-family-doctrine.ts` loader uses `yaml.parse()` which returns the full parsed object. The `toResearchFamilyDossier()` function reads only `family`, `baseline`, `focus`, `blocked`. Adding a `metrics:` key to the YAML is invisible to the loader — it's already silently ignored.

**Mitigation:** None needed. This is the safest possible migration: adding optional content to files that are already parsed.

### Hazard 2: YAML indentation errors (LOW risk)

Adding 15-20 lines of nested YAML (`metrics:` section) to each file introduces the usual YAML indentation risk.

**Mitigation:** The new test (`research-metric-semantics.test.ts`) catches malformed YAML at test time.

### Hazard 3: Metric key drift over time (LOW risk)

If `research-source-profile.ts` adds new expected metrics or the evidence parsers change their output keys, the YAML `metrics:` section could become stale.

**Mitigation:** Accept this. The same risk exists for `baseline`/`focus`/`blocked` — doctrine naturally drifts from implementation over time. The cross-reference test (optional) would catch new metrics that lack semantics, but this is a "nice to have," not a blocking requirement.

### Hazard 4: Metrics-as-prose vs metrics-as-contract confusion (MEDIUM risk — design only)

The biggest risk is scope creep: someone reads the `metrics:` section and starts treating it as a runtime contract ("if the YAML says `fundingRateBps` has `means`, the prompt must include this text"). The `metrics:` section is **passive knowledge** — it describes what the metric is for human and future-LLM consumption, not a runtime guarantee.

**Mitigation:** Add a comment header to each `metrics:` section: `# What each metric means — passive doctrine, not runtime contract`.

### Hazard 5: `doesNotMean` wording could itself become overclaiming (LOW risk)

Some of the claim-audit recommendations are strong statements about what the literature says. Embedding "75% of raw on-chain volume is non-economic" in `doesNotMean` for `transactionCount24h` is factual per Glassnode, but if the source methodology changes, the YAML becomes stale.

**Mitigation:** Keep `doesNotMean` wording as calibrated limitations, not as hard statistical claims. Prefer "roughly 75%" over "75%", or better yet, focus on the *type* of limitation rather than the *magnitude*.

---

## 8. Candidate Doctrine

### Research Metric Semantics Doctrine

**Principle 1: Metric semantics are passive knowledge.**
The `metrics:` section in each family YAML describes what a metric is and what it is not. No runtime code is required to read it. It exists for future prompt injection and for human/agent reference.

**Principle 2: Only document metrics the brief builder actually uses.**
If a metric key appears in `findMetric()` calls in the family's brief builder, it gets a `metrics:` entry. If it only appears in `expectedMetrics` but is never read by the brief builder, skip it — it's a routing detail, not a concept worth documenting.

**Principle 3: `doesNotMean` is calibration, not a statistical claim.**
Each `doesNotMean` entry should describe the *type* of mistake a reader might make (e.g., "treats this as a prediction" or "conflates positioning size with directional conviction"), not embed specific statistical facts that could become stale.

**Principle 4: No runtime wiring in Phase 3.**
The loader does not need to read `metrics:`. The prompt builder does not need to inject semantics. Phase 3 is content-only. Runtime wiring is a separate bead if needed.

---

## 9. Codex Implementation Order

### This should be a new child bead: `omniweb-agents-bgo.6`

**Reason:** It's a scoped, independent task with a clear deliverable (YAML additions + 1 test file). It follows the one-bead-one-branch-one-PR pattern.

### Steps

1. **Create branch** `codex/research-metric-semantics` from `main`.

2. **Edit 6 YAML files** in `packages/omniweb-toolkit/config/doctrine/`:
   - `funding-structure.yaml` — add `metrics:` section (4 entries)
   - `etf-flows.yaml` — add `metrics:` section (6 entries)
   - `spot-momentum.yaml` — add `metrics:` section (5 entries)
   - `network-activity.yaml` — add `metrics:` section (5 entries)
   - `stablecoin-supply.yaml` — add `metrics:` section (5 entries)
   - `vix-credit.yaml` — add `metrics:` section (7 entries)
   - Use the exact YAML from Section 3 of this document
   - Add a `# What each metric means — passive doctrine, not runtime contract` comment before each `metrics:` block

3. **Add test file** `tests/doctrine/research-metric-semantics.test.ts`:
   - Parse each of the 6 YAML files
   - Assert `metrics` key exists and is a non-empty object
   - Assert each entry has non-empty `means` and `doesNotMean` strings

4. **Run `npm test`** — all existing tests must pass unchanged.

5. **Run `npx tsc --noEmit`** — must pass (no TS changes, so trivially true).

6. **One PR against `main`**, title: `doctrine: add metric semantics to research family yaml`

### Estimated scope

- 6 edited YAML files (~16 lines added each = ~96 lines total)
- 1 new test file (~50 lines)
- 0 TypeScript source changes
- **Net: ~146 lines added, 0 removed**

### Family risk ranking (easiest → hardest)

| Rank | Family | Risk | Why |
|---|---|---|---|
| 1 | network-activity | **Easiest** | 5 simple, unambiguous metrics — raw observations |
| 2 | funding-structure | **Easy** | 4 well-understood derivatives metrics |
| 3 | vix-credit | **Easy** | 7 metrics but all are standard macro observables |
| 4 | spot-momentum | **Medium** | Volume `doesNotMean` wording needs care (wash trading caveat) |
| 5 | stablecoin-supply | **Medium** | Derived metrics (supply deltas) blur the doctrine/computation line |
| 6 | etf-flows | **Hardest** | `doesNotMean` wording for issuer count/flow is nuanced (basis trade, AUM weighting) |

Codex should implement in the order listed. If any family's wording proves contentious during review, the others can land independently.

---

## File References

| File | What |
|---|---|
| `packages/omniweb-toolkit/config/doctrine/*.yaml` | 7 existing doctrine files (6 research + 1 oracle-divergence) |
| `packages/omniweb-toolkit/src/research-family-doctrine.ts` | Loader — reads baseline/focus/blocked from YAML, ignores unknown keys |
| `packages/omniweb-toolkit/src/research-family-dossiers.ts` | Brief builders — the runtime consumers of metric values |
| `packages/omniweb-toolkit/src/research-source-profile.ts` | Source profiles — `expectedMetrics` lists per family |
| `packages/omniweb-toolkit/src/research-evidence.ts` | Evidence fetchers and parsers — produces the metric values |
| `packages/omniweb-toolkit/src/research-draft.ts` | Prompt builder + quality gates — slip patterns stay here |
| `packages/omniweb-toolkit/src/market-family-doctrine.ts` | Oracle-divergence loader — precedent for `metrics:` parsing |
| `docs/archive/agent-handoffs/research-family-claim-audit-2026-04-19.md` | Literature-backed audit — `doesNotMean` wording draws from this |
| `docs/archive/agent-handoffs/flat-domain-knowledge-design-2026-04-19.md` | Phase 1 design doc — schema decisions |
| `docs/archive/agent-handoffs/oracle-divergence-flat-doctrine-mapping-2026-04-20.md` | Phase 2 mapping — `metrics:` precedent |
