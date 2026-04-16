import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ATTESTATION_STRESS_SCENARIOS,
  evaluateAttestationWorkflow,
  runAttestationStressSuite,
} from "../../../src/toolkit/attestation/workflow-check.js";
import { loadAgentSourceView } from "../../../src/toolkit/sources/catalog.js";

const catalogPath = fileURLToPath(new URL("../../../config/sources/catalog.json", import.meta.url));
const sourceView = loadAgentSourceView("sentinel", catalogPath, catalogPath, "catalog-only");
const alwaysValidUrl = async () => ({ valid: true as const });

describe("attestation workflow stress checks", () => {
  it("allows a strong single-source observation without forcing supporting sources", async () => {
    const report = await evaluateAttestationWorkflow({
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      category: "OBSERVATION",
      text: "BTC spot is $67123.40 from CoinGecko right now, which gives us one clean factual observation from a catalog-backed JSON source. This is not a broad market thesis or synthesis post, just a direct metric report grounded in one attested value at the time of capture.",
      confidence: 68,
    }, {
      sourceView,
      validateUrlFn: alwaysValidUrl,
    });

    expect(report.readiness).toBe("ready");
    const multiSourceCheck = report.evidenceChain.checks.find((check) => check.name === "analysis-style-post-has-supporting-sources");
    expect(multiSourceCheck?.pass).toBe(true);
    expect(multiSourceCheck?.detail).toContain("does not require multi-source");
  });

  it("flags same-provider analysis chains as needs_attention", async () => {
    const report = await evaluateAttestationWorkflow({
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      supportingUrls: ["https://api.coingecko.com/api/v3/coins/bitcoin"],
      category: "ANALYSIS",
      text: "BTC is firm because CoinGecko price and coin metadata both look strong, but this still needs an outside provider before we should trust the synthesis. The chain has two URLs, yet both collapse back to one provider, so the apparent corroboration is weaker than it first looks.",
      confidence: 66,
    }, {
      sourceView,
      validateUrlFn: alwaysValidUrl,
    });

    expect(report.readiness).toBe("needs_attention");
    expect(report.warnings.some((warning) => warning.name === "supporting-sources-add-provider-diversity")).toBe(true);
  });

  it("blocks uncatalogued RSS feeds even when DNS validation is otherwise clean", async () => {
    const report = await evaluateAttestationWorkflow({
      attestUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
      category: "ANALYSIS",
      text: "Headline summary from an RSS feed with no JSON API backing should be blocked from DAHR attestation. Even if the URL is public and safe to fetch, the evidence plan is adversarial to the expected DAHR workflow because the source format does not fit the supported publish path.",
      confidence: 60,
    }, {
      sourceView,
      validateUrlFn: alwaysValidUrl,
    });

    expect(report.readiness).toBe("blocked");
    expect(report.blockers.some((check) => check.name === "uncatalogued-source-appears-json-shaped")).toBe(true);
  });

  it("runs the built-in stress suite and matches scenario expectations", async () => {
    const suite = await runAttestationStressSuite({
      sourceView,
      validateUrlFn: alwaysValidUrl,
    });

    expect(suite.ok).toBe(true);
    expect(suite.scenarioCount).toBe(ATTESTATION_STRESS_SCENARIOS.length);
    expect(suite.failedCount).toBe(0);
  });
});
