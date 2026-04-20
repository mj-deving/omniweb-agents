# Codex Task: Add Metric Semantics to Research Family Doctrine YAML

**Bead:** `omniweb-agents-bgo.6`
**Branch:** `codex/research-metric-semantics` (from `main`)
**PR title:** `doctrine: add metric semantics to research family yaml`
**Mapping doc:** `docs/archive/agent-handoffs/research-metric-semantics-flat-doctrine-mapping-2026-04-20.md`

---

## Why This Matters — Do Not Skip

The `doesNotMean` entries are the most important part of this task. Each one encodes a **calibration limit** derived from a literature-backed claim audit (`docs/archive/agent-handoffs/research-family-claim-audit-2026-04-19.md`). These limits exist because:

- **etf-flows**: Only 22.9% of ETF AUM is held by professional investors. ~30% of "institutional" inflow is non-directional basis-trade arbitrage. "Institutional demand" language is misleading. Issuer count without AUM weighting is a poor breadth proxy. The `doesNotMean` entries encode these facts.
- **spot-momentum**: Reported crypto volume includes wash trading (>70% on unregulated exchanges per Cong et al., *Management Science* 2023). "The tape is confirming" from price+volume alone is not defensible without order flow data. Range location is descriptive convenience, not a validated signal.
- **network-activity**: ~75% of raw on-chain volume is non-economic (Glassnode entity-adjustment). Hashrate reflects miner economics, not price strength. "Congestion" requires mempool data the packet doesn't have.
- **stablecoin-supply**: Supply follows macro conditions, not the reverse (BIS WP 1219). Peg at $1.00 is baseline, not alpha.
- **vix-credit**: The family name is a misnomer — there's no credit data, only a bill/note term spread. VIX measures expected volatility, not "fear."
- **funding-structure**: Best-calibrated family. Funding is a positioning snapshot, not a directional predictor.

**If you rephrase the wording, you risk softening these calibrations.** Use the exact YAML from the mapping doc.

## What

Add a `metrics:` section to each of the 6 research family YAML files in `packages/omniweb-toolkit/config/doctrine/`. Each metric entry has `means` (what it is) and `doesNotMean` (what it is not). Add one test file to validate the YAML structure.

**Zero TypeScript source changes.** The existing loader (`research-family-doctrine.ts`) ignores unknown YAML keys — adding `metrics:` is purely additive content.

### Key architectural context

- `metricSemantics` is **not consumed by any runtime code** for research families today — no prompt builder, quality gate, or brief builder reads it
- The `toResearchFamilyDossier()` loader reads only `family`, `baseline`, `focus`, `blocked` — extra YAML keys are silently ignored
- This is prospective doctrine: it exists so a future phase can inject "what this metric means" into prompts
- The `metrics:` format is already proven by `oracle-divergence.yaml` (Phase 2, PR #176)

## Read First

1. `docs/archive/agent-handoffs/research-metric-semantics-flat-doctrine-mapping-2026-04-20.md` — **this is the authoritative source.** Section 3 has the exact YAML contents for all 6 families. Use them verbatim.
2. `packages/omniweb-toolkit/config/doctrine/oracle-divergence.yaml` — existing precedent for `metrics:` format.
3. `tests/packages/research-family-doctrine.test.ts` — existing test structure.
4. `tests/packages/market-family-doctrine.test.ts` — precedent for doctrine testing.

## Steps

### 1. Branch from main

```bash
git fetch origin
git switch main
git pull --ff-only
git switch -c codex/research-metric-semantics
```

### 2. Edit 6 YAML files

Append the `metrics:` section to each file in `packages/omniweb-toolkit/config/doctrine/`. Use the exact YAML from Section 3 of the mapping doc. Add a blank line before the metrics block and a comment header:

```yaml
# What each metric means — passive doctrine, not runtime contract
metrics:
  ...
```

Files to edit:
- `funding-structure.yaml` — 4 metric entries
- `etf-flows.yaml` — 6 metric entries
- `spot-momentum.yaml` — 5 metric entries
- `network-activity.yaml` — 5 metric entries
- `stablecoin-supply.yaml` — 5 metric entries
- `vix-credit.yaml` — 7 metric entries

### 3. Add test file

Create `tests/packages/research-metric-semantics.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const DOCTRINE_DIR = fileURLToPath(
  new URL("../../packages/omniweb-toolkit/config/doctrine", import.meta.url),
);

const RESEARCH_FAMILIES = [
  "funding-structure",
  "etf-flows",
  "spot-momentum",
  "network-activity",
  "stablecoin-supply",
  "vix-credit",
];

describe("research metric semantics", () => {
  for (const family of RESEARCH_FAMILIES) {
    describe(family, () => {
      const raw = readFileSync(`${DOCTRINE_DIR}/${family}.yaml`, "utf8");
      const parsed = parseYaml(raw) as Record<string, unknown>;

      it("has a metrics section", () => {
        expect(parsed.metrics).toBeDefined();
        expect(typeof parsed.metrics).toBe("object");
        expect(Object.keys(parsed.metrics as object).length).toBeGreaterThan(0);
      });

      it("every metric has means and doesNotMean strings", () => {
        const metrics = parsed.metrics as Record<string, Record<string, unknown>>;
        for (const [key, entry] of Object.entries(metrics)) {
          expect(typeof entry.means, `${family}.metrics.${key}.means`).toBe("string");
          expect((entry.means as string).length, `${family}.metrics.${key}.means non-empty`).toBeGreaterThan(0);
          expect(typeof entry.doesNotMean, `${family}.metrics.${key}.doesNotMean`).toBe("string");
          expect((entry.doesNotMean as string).length, `${family}.metrics.${key}.doesNotMean non-empty`).toBeGreaterThan(0);
        }
      });
    });
  }
});
```

### 4. Validate

```bash
npm test -- tests/packages/research-metric-semantics.test.ts
npm test -- tests/packages/research-family-doctrine.test.ts
npm test -- tests/packages/market-family-doctrine.test.ts
npx tsc --noEmit
```

All must pass. The existing doctrine tests must be unaffected.

### 5. Commit and PR

```bash
git add packages/omniweb-toolkit/config/doctrine/*.yaml tests/packages/research-metric-semantics.test.ts
git commit -m "doctrine: add metric semantics to research family yaml

Phase 3 of flat-domain-knowledge rollout. Adds means/doesNotMean entries
for 32 metrics across 6 research families. Zero TypeScript source changes —
the existing loader ignores unknown YAML keys.

Bead: omniweb-agents-bgo.6"
git push -u origin codex/research-metric-semantics
gh pr create --title "doctrine: add metric semantics to research family yaml" --body "Phase 3 of flat-domain-knowledge rollout (bead: omniweb-agents-bgo.6).

Adds \`metrics:\` sections to all 6 research family doctrine YAML files — 32 metric entries total, each with \`means\` and \`doesNotMean\`.

**Zero TypeScript source changes.** The existing YAML loader ignores unknown keys. This is purely additive content.

Mapping doc: \`docs/archive/agent-handoffs/research-metric-semantics-flat-doctrine-mapping-2026-04-20.md\`"
```

## Constraints

- **Do not modify any `.ts` source files** in `packages/omniweb-toolkit/src/`. Only YAML files and the new test file.
- **Use the exact YAML from the mapping doc.** The `means` and `doesNotMean` wording was calibrated against a literature-backed claim audit.
- **Do not add new YAML fields** beyond `metrics:`. The schema is frozen per doctrine.
- **Do not modify existing YAML fields** (`family`, `displayName`, `baseline`, `focus`, `blocked`).

## Expected diff summary

- 6 YAML files edited (~16 lines each = ~96 lines added)
- 1 new test file (~50 lines)
- 0 TypeScript source files changed
