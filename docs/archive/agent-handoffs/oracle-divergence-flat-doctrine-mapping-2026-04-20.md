# Oracle-Divergence Flat Doctrine Extraction Mapping

**Date:** 2026-04-20
**Bead:** omniweb-agents-bgo.5
**Scope:** Exact extraction map for moving oracle-divergence doctrine from TypeScript to YAML. Design/mapping only — no product code edits.
**Depends on:** omniweb-agents-bgo.3 (PR #174 — research dossier extraction, currently OPEN)
**Prior art:** `flat-domain-knowledge-design-2026-04-19.md`, `oracle-divergence-claim-audit-2026-04-19.md`

---

## 1. Findings First

### The contract has 7 field groups; only 3 are consumed at runtime

| Field Group | Lines in `market-family-contracts.ts` | Consumed at Runtime? | By What Code? |
|---|---|---|---|
| `promptDoctrine.baseline` | 29-33 | **Yes** | `market-draft.ts:138` — spread into prompt packet `edge` |
| `promptDoctrine.focus` | 34-38 | **Yes** | `market-draft.ts:139` — spread into prompt packet `edge` |
| `claimBounds.blocked` | 46-50 | **Yes** | `market-draft.ts:180` — spread into prompt packet `constraints` |
| `claimBounds.defensible` | 42-45 | **No** | Defined but never read by any runtime code |
| `claimBounds.requiresExtra` | 51-63 | **No** | Defined but never read by any runtime code |
| `metricSemantics` | 64-89 | **No** | Defined but never read by any runtime code (only in test fixtures) |
| `quality.slipPatterns` | 91-109 | **Yes** | `market-draft.ts:247` — regex matching on draft text |
| `sourcePlan` | 16-27 | **No** | Defined but never read; prompt builder gets sources from `attestationPlan` |
| `displayName` | 15 | **No** | Defined but never read by any runtime code |
| `family` | 14 | **Yes** | Type discriminator / registry key |

### What this means for extraction

The oracle-divergence contract is **70% passive knowledge** (defensible, requiresExtra, metricSemantics, sourcePlan, displayName) and **30% active runtime** (baseline, focus, blocked, slipPatterns, family). The passive knowledge moves to YAML cleanly. The active fields move too, but the runtime must load them.

### Phase 1 (PR #174) is still OPEN

The research dossier extraction (bgo.3) has not merged yet. The loader infrastructure (`config/doctrine/` directory, YAML parser, `loadDoctrine()` function) does not exist on `main`. This extraction map is written so that:

- If PR #174 merges first → oracle-divergence reuses the existing loader with a schema expansion for `defensible`, `requiresExtra`, and `metrics`
- If PR #174 is still open → oracle-divergence can be implemented independently using the same loader pattern, and the two PRs can be merged in either order

---

## 2. Exact Extraction Map

### Fields that move to YAML

| TS Field Path | YAML Key | Content |
|---|---|---|
| `promptDoctrine.baseline` (3 strings) | `baseline` | 3 prose strings describing what an analyst should already know |
| `promptDoctrine.focus` (3 strings) | `focus` | 3 prose strings describing what to emphasize |
| `claimBounds.defensible` (3 strings) | `defensible` | 3 prose strings describing what claims are supported |
| `claimBounds.blocked` (3 strings) | `blocked` | 3 prose strings describing what claims are forbidden |
| `claimBounds.requiresExtra` (2 objects) | `requiresExtra` | 2 structured objects: claim + requiredMetrics + reason |
| `metricSemantics` (6 entries) | `metrics` | 6 metric entries, each with `means` and `doesNotMean` |
| `displayName` | `displayName` | "Oracle Divergence" |

**Total: ~60 lines of TypeScript → ~55 lines of YAML**

### Fields that stay in TypeScript

| TS Field Path | Why It Stays |
|---|---|
| `family: "oracle-divergence"` | Type discriminator — the registry key. Also present in YAML as the `family` field for validation, but the TS type union stays. |
| `sourcePlan` (primarySourceIds, supportingSourceIds, expectedMetrics) | Source routing — catalog IDs, tightly coupled to adapter system. Per design principle: "no source IDs in doctrine." |
| `quality.slipPatterns` (4 RegExp objects) | Regex in YAML is a maintenance trap. These need type checking, test coverage, and syntax validation that YAML cannot provide. |

---

## 3. Proposed YAML File Contents

```yaml
# config/doctrine/oracle-divergence.yaml
family: oracle-divergence
displayName: Oracle Divergence

baseline:
  - "A sentiment-price divergence is descriptive, not predictive."
  - "The API label 'oracle' is sentiment metadata, not verified external truth."
  - "Divergence severity is an internal grading, not a calibrated probability."

focus:
  - "Name what the agents lean toward and what price is doing instead."
  - "Frame the setup as a measurable dislocation worth watching, not a tradeable edge."
  - "End with the next condition that would narrow, widen, or dissolve the dislocation."

defensible:
  - "Describe the disagreement between agent sentiment and observed price action."
  - "Say why the dislocation is worth monitoring now."
  - "State what would confirm or weaken the dislocation next."

blocked:
  - "Do not claim the agents are right and the market is wrong."
  - "Do not describe the divergence as an edge or recommendation."
  - "Do not treat severity or agent count as calibrated confidence."

requiresExtra:
  - claim: "Independent agreement strength"
    requiredMetrics: [modelDiversityScore]
    reason: "Agent count alone does not show independent consensus."
  - claim: "Tradable predictive edge"
    requiredMetrics: [historicalResolutionRate, severityMethodology]
    reason: "The current packet does not show that divergences resolve predictably."

metrics:
  severity:
    means: "An internal low/medium/high grading of the dislocation."
    doesNotMean: "A calibrated probability or validated signal strength."
  agentDirection:
    means: "The consensus directional lean of the agent cluster."
    doesNotMean: "Ground truth about where the market should trade."
  marketDirection:
    means: "Observed market-direction metadata from the upstream divergence packet."
    doesNotMean: "Proof that price will continue or reverse."
  agentConfidence:
    means: "A self-reported confidence-like score from the sentiment side when present."
    doesNotMean: "Well-calibrated confidence or independent verification."
  priceUsd:
    means: "Observed spot price context for the asset."
    doesNotMean: "Proof that the market side of the divergence is correct."
  change24h:
    means: "Observed 24-hour price move context."
    doesNotMean: "A resolution of the divergence by itself."
```

### Schema delta from research dossiers

The research dossier schema (from the Phase 1 design doc) uses: `family`, `baseline`, `focus`, `blocked`, `requiresExtra`, `metrics`.

Oracle-divergence adds one field: **`defensible`** (string array). This is the only schema expansion needed.

The `displayName` field is already optional in the research schema. No other new fields are introduced.

---

## 4. What Stays in TypeScript

### `market-family-contracts.ts` after extraction

The file shrinks from 121 lines to approximately 45 lines. What remains:

```typescript
// After extraction, market-family-contracts.ts contains:
// 1. The MarketTopicFamily type union
// 2. sourcePlan (source IDs — routing, not doctrine)
// 3. quality.slipPatterns (4 RegExp objects)
// 4. The registry and lookup function
// 5. Doctrine fields loaded from YAML at runtime
```

### Concrete TS residual

```typescript
import { loadFamilyDoctrine } from "./doctrine/loader.js";
import {
  createTopicFamilyRegistry,
  defineTopicFamilyContract,
  getTopicFamilyContract,
  type TopicFamilyContract,
  type TopicFamilyRegistry,
} from "./topic-family-contract.js";

export type MarketTopicFamily = "oracle-divergence";
export type MarketTopicFamilyContract = TopicFamilyContract<MarketTopicFamily>;

// Doctrine loaded from config/doctrine/oracle-divergence.yaml
const oracleDoctrine = loadFamilyDoctrine("oracle-divergence");

export const ORACLE_DIVERGENCE_CONTRACT: MarketTopicFamilyContract = defineTopicFamilyContract({
  family: "oracle-divergence",
  displayName: oracleDoctrine.displayName ?? "Oracle Divergence",
  sourcePlan: {
    primarySourceIds: ["supercolony-oracle-divergence"],
    supportingSourceIds: ["coingecko-simple-price", "binance-ticker-price"],
    expectedMetrics: [
      "severity", "agentDirection", "marketDirection",
      "agentConfidence", "priceUsd", "change24h",
    ],
  },
  promptDoctrine: {
    baseline: oracleDoctrine.baseline,
    focus: oracleDoctrine.focus,
  },
  claimBounds: {
    defensible: oracleDoctrine.defensible ?? [],
    blocked: oracleDoctrine.blocked,
    requiresExtra: oracleDoctrine.requiresExtra ?? [],
  },
  metricSemantics: oracleDoctrine.metrics ?? {},
  quality: {
    slipPatterns: [
      {
        pattern: /\b(?:agents?|oracle|consensus)\b.{0,60}\b(?:right|correct|accurate)\b.{0,40}\b(?:market|price)\b.{0,40}\b(?:wrong|mispriced|incorrect)\b/i,
        detail: "claims agents are right and the market is wrong — not defensible from sentiment data alone",
      },
      {
        pattern: /\bedge\b.{0,40}\b(?:divergence|mismatch|dislocation)\b|\b(?:divergence|mismatch|dislocation)\b.{0,40}\bedge\b/i,
        detail: "describes the divergence as a tradeable edge even though the packet is only descriptive",
      },
      {
        pattern: /\b(?:high|elevated)\s+severity\b.{0,60}\b(?:means|proves|confirms|guarantees)\b/i,
        detail: "treats divergence severity as proof of a specific outcome even though the grading is opaque",
      },
      {
        pattern: /\b(?:\d+|multiple|several)\s+agents?\s+agree\b.{0,60}\b(?:means|proves|confirms|strong signal)\b/i,
        detail: "treats agent count as evidence of independent agreement without model-diversity evidence",
      },
    ],
  },
});

export const MARKET_TOPIC_FAMILY_CONTRACTS: TopicFamilyRegistry<MarketTopicFamily> =
  createTopicFamilyRegistry([ORACLE_DIVERGENCE_CONTRACT]);

export function getMarketTopicFamilyContract(
  family: MarketTopicFamily,
): MarketTopicFamilyContract {
  return getTopicFamilyContract(MARKET_TOPIC_FAMILY_CONTRACTS, family);
}
```

### What does NOT change in other files

- `market-draft.ts` — **zero changes**. It already accesses doctrine through `getMarketTopicFamilyContract("oracle-divergence")`. The contract object shape is identical; only the source of its string fields changes.
- `topic-family-contract.ts` — **zero changes**. The type definitions stay as-is.
- `agent.ts` — **zero changes**. The re-exports (`getMarketTopicFamilyContract`, `ORACLE_DIVERGENCE_CONTRACT`) continue to work.

---

## 5. Test Plan for Codex

### Existing tests that must continue to pass (zero changes expected)

| Test File | What It Tests | Expected Impact |
|---|---|---|
| `tests/packages/market-draft.test.ts` | `buildMarketDraft` — prompt packet shape, quality gate, slip pattern rejection | **None** — the contract shape is unchanged; string sources shift from TS const to YAML load |
| `tests/packages/topic-family-contract.test.ts` | Registry creation, duplicate rejection, lookup | **None** — tests create inline contracts, not loaded from YAML |

### New tests to add

| Test | File | What It Verifies |
|---|---|---|
| YAML loads and validates | `tests/doctrine/oracle-divergence-doctrine.test.ts` | Loads `config/doctrine/oracle-divergence.yaml`, asserts `family`, `baseline`, `focus`, `blocked` are present and non-empty string arrays |
| Round-trip equivalence | Same file | Loads the YAML, constructs the contract, asserts `promptDoctrine.baseline[0]` contains "descriptive, not predictive" (same assertion as the existing `market-draft.test.ts:121`) |
| Schema expansion: `defensible` | Same file | Asserts `defensible` is present and is a string array |
| Schema expansion: `requiresExtra` | Same file | Asserts `requiresExtra[0].claim` is a string, `requiredMetrics` is a string array |
| Schema expansion: `metrics` | Same file | Asserts `metrics.severity.means` and `metrics.severity.doesNotMean` are strings |

### If Phase 1 loader already exists

If PR #174 has merged and a `loadDoctrine()` function exists, add the `defensible` field to its validation (currently only `family`, `baseline`, `focus`, `blocked` are required). The `defensible` field should be **optional** in the schema — research families don't use it, only oracle-divergence does.

### If Phase 1 loader does not exist yet

Write a minimal `loadFamilyDoctrine(family: string)` function (~25 lines) that:
1. Reads `config/doctrine/{family}.yaml`
2. Parses with `yaml` (already a dev dependency)
3. Validates required fields: `family`, `baseline`, `focus`, `blocked`
4. Returns the parsed object typed as `FamilyDoctrine`
5. Throws with a clear error message on missing file or missing fields

This is the same loader PR #174 would create. If both PRs land, deduplicate in a follow-up.

---

## 6. Migration Hazards

### Hazard 1: PR #174 race condition (LOW risk)

PR #174 (research dossiers) creates `config/doctrine/` and the loader. If oracle-divergence lands first, it creates the same directory and a compatible loader. If both land, there may be a merge conflict in the loader file.

**Mitigation:** If Codex implements this before PR #174 merges, use the same loader function signature and directory structure. The merge conflict will be trivial (two versions of the same ~25-line function).

### Hazard 2: `defensible` schema expansion (LOW risk)

The research dossier schema has no `defensible` field. Adding it as optional does not break existing YAML files. The only risk is if the Phase 1 loader has strict validation that rejects unknown fields.

**Mitigation:** The Phase 1 design doc explicitly specifies `requiresExtra` and `metrics` as optional. `defensible` follows the same pattern. The loader should not reject unknown fields — it should validate required fields and pass through optional ones.

### Hazard 3: Exported `ORACLE_DIVERGENCE_CONTRACT` shape change (ZERO risk)

The `ORACLE_DIVERGENCE_CONTRACT` export in `agent.ts:22` is consumed by external code that accesses the contract's typed fields. Since the `TopicFamilyContract` type is unchanged and the field values are identical, this is a transparent change. External consumers see the same object with the same shape.

### Hazard 4: YAML parse failure at startup (LOW risk)

If the YAML file is missing or malformed, the agent crashes at import time instead of running with no doctrine.

**Mitigation:** This is the correct behavior per the flat-file doctrine (Principle 4: "Fail loud on load, not silent on use"). An agent without doctrine produces unguarded posts — crashing is better. The test suite catches this before deploy.

### Hazard 5: `sourcePlan.expectedMetrics` vs `metrics` key confusion (LOW risk)

The contract's `sourcePlan.expectedMetrics` lists metric *names* the source should provide. The YAML `metrics` section describes what those metrics *mean*. These are different concerns with the same vocabulary.

**Mitigation:** Keep them separate. `sourcePlan.expectedMetrics` stays in TS (it's routing). `metrics` in YAML describes semantics (it's knowledge). The names happen to overlap but serve different purposes.

### Hazard 6: `metricSemantics` key `marketDirection` not in `sourcePlan.expectedMetrics` (INFO)

The current contract defines a `metricSemantics` entry for `marketDirection` but `sourcePlan.expectedMetrics` lists it as `"marketDirection"`. These are consistent. However, `change24h` appears in `expectedMetrics` and `metricSemantics`, but `priceUsd` appears in `expectedMetrics` and `metricSemantics` — all consistent. No action needed, but noting for completeness.

---

## 7. Candidate Doctrine: Wording Tightness Review

### Current wording vs recommended tightening

| Field | Current Wording | Tight Enough? | Recommended Change |
|---|---|---|---|
| `baseline[0]` | "A sentiment-price divergence is descriptive, not predictive." | **Yes** | None — this is the key framing sentence |
| `baseline[1]` | "The API label 'oracle' is sentiment metadata, not verified external truth." | **Yes** | None — directly addresses the naming confusion from the claim audit |
| `baseline[2]` | "Divergence severity is an internal grading, not a calibrated probability." | **Yes** | None |
| `focus[0]` | "Name what the agents lean toward and what price is doing instead." | **Yes** | None |
| `focus[1]` | "Frame the setup as a measurable dislocation worth watching, not a tradeable edge." | **Yes** | None |
| `focus[2]` | "End with the next condition that would narrow, widen, or dissolve the dislocation." | **Yes** | None |
| `blocked[0]` | "Do not claim the agents are right and the market is wrong." | **Yes** | None |
| `blocked[1]` | "Do not describe the divergence as an edge or recommendation." | **Yes** | None |
| `blocked[2]` | "Do not treat severity or agent count as calibrated confidence." | **Tighten** | Add: "Do not treat agent count as evidence of independent agreement unless model diversity is documented." (per claim audit finding 2) |
| `defensible[0]` | "Describe the disagreement between agent sentiment and observed price action." | **Yes** | None |
| `defensible[1]` | "Say why the dislocation is worth monitoring now." | **Yes** | None |
| `defensible[2]` | "State what would confirm or weaken the dislocation next." | **Yes** | None |

### Recommended addition to `blocked`

The claim audit (`oracle-divergence-claim-audit-2026-04-19.md`, Area 3) identified that agent count is treated as consensus strength without model diversity evidence. The current `blocked[2]` partially covers this ("Do not treat severity or agent count as calibrated confidence"), but the specific "independent agreement" failure mode deserves its own line.

**Add as `blocked[3]`:**
```
"Do not treat agent count as evidence of independent agreement — similar models produce correlated errors."
```

This is the only wording tightening recommended before extraction. All other doctrine strings are already well-calibrated per the claim audit findings.

### Updated YAML with tightened wording

The proposed YAML in Section 3 should use this `blocked` array:

```yaml
blocked:
  - "Do not claim the agents are right and the market is wrong."
  - "Do not describe the divergence as an edge or recommendation."
  - "Do not treat severity or agent count as calibrated confidence."
  - "Do not treat agent count as evidence of independent agreement — similar models produce correlated errors."
```

---

## Codex Implementation Order

1. **Create `config/doctrine/oracle-divergence.yaml`** with the exact contents from Section 3 (including the tightened `blocked[3]` from Section 7).

2. **Check if `loadFamilyDoctrine()` exists** (from PR #174). If yes, verify it handles the `defensible` field as optional. If no, write a minimal loader at `packages/omniweb-toolkit/src/doctrine/loader.ts` (~25 lines).

3. **Edit `packages/omniweb-toolkit/src/market-family-contracts.ts`**: replace the 60 lines of hardcoded doctrine strings with a call to the loader. Keep `sourcePlan` and `quality.slipPatterns` in TypeScript. Use the TS residual shape from Section 4.

4. **Run `npm test`** — all existing tests in `market-draft.test.ts` and `topic-family-contract.test.ts` must pass unchanged.

5. **Add `tests/doctrine/oracle-divergence-doctrine.test.ts`** with the 5 assertions from Section 5.

6. **Run `npx tsc --noEmit`** — must pass with zero errors.

7. **One PR against `main`**, title: `toolkit: extract oracle-divergence doctrine to yaml`

### Estimated scope

- 1 new YAML file (~55 lines)
- 1 edited TS file (`market-family-contracts.ts`: -60 lines, +15 lines)
- 1 new or extended loader (0-25 lines depending on PR #174 state)
- 1 new test file (~40 lines)
- **Net: ~50 lines added, ~60 lines removed**

---

## File References

| File | What |
|---|---|
| `packages/omniweb-toolkit/src/market-family-contracts.ts` | Current oracle-divergence contract (121 lines) |
| `packages/omniweb-toolkit/src/market-draft.ts` | Prompt builder — consumes baseline/focus/blocked at lines 138-139, 180; slipPatterns at 247 |
| `packages/omniweb-toolkit/src/topic-family-contract.ts` | Type definitions (81 lines, unchanged) |
| `packages/omniweb-toolkit/src/agent.ts` | Re-exports (unchanged) |
| `tests/packages/market-draft.test.ts` | Existing test suite (171 lines, must pass unchanged) |
| `tests/packages/topic-family-contract.test.ts` | Existing test suite (145 lines, must pass unchanged) |
| `docs/archive/agent-handoffs/flat-domain-knowledge-design-2026-04-19.md` | missing on disk as of 2026-04-23; historical reference only, do not infer schema, loader pattern, or migration details from the filename |
| `docs/archive/agent-handoffs/oracle-divergence-claim-audit-2026-04-19.md` | Literature-backed claim audit (wording recommendations) |
