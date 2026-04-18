import { describe, expect, it } from "vitest";
import {
  buildMinimalAttestationPlan,
  buildMinimalAttestationPlanFromUrls,
} from "../../packages/omniweb-toolkit/src/minimal-attestation-plan.js";

describe("buildMinimalAttestationPlan", () => {
  it("falls back through asset-aware topic variants when the raw topic does not match catalog tags directly", () => {
    const plan = buildMinimalAttestationPlan({
      topic: "BTC Sentiment vs Funding",
      minSupportingSources: 1,
    });

    expect(plan.ready).toBe(true);
    expect(plan.primary).not.toBeNull();
    expect(plan.primary?.dahrSafe).toBe(true);
    expect(plan.supporting.length).toBeGreaterThanOrEqual(1);
  });

  it("can resolve a strict preferred-source plan without generic topic fallback", () => {
    const plan = buildMinimalAttestationPlan({
      topic: "BTC Sentiment vs Funding",
      preferredSourceIds: ["binance-futures-btc", "binance-futures-oi-btc"],
      allowTopicFallback: false,
      minSupportingSources: 1,
    });

    expect(plan.ready).toBe(true);
    expect(plan.primary?.sourceId).toBe("binance-futures-btc");
    expect(plan.supporting[0]?.sourceId).toBe("binance-futures-oi-btc");
  });

  it("can resolve the public BTC ETF flow source as a preferred attestation target", () => {
    const plan = buildMinimalAttestationPlan({
      topic: "BTC ETF flows",
      preferredSourceIds: ["btcetfdata-current-btc", "binance-24hr-btc"],
      allowTopicFallback: false,
      minSupportingSources: 1,
    });

    expect(plan.ready).toBe(true);
    expect(plan.primary?.sourceId).toBe("btcetfdata-current-btc");
    expect(plan.primary?.url).toContain("btcetfdata.com/v1/current.json");
    expect(plan.supporting[0]?.sourceId).toBe("binance-24hr-btc");
  });

  it("can build a ready plan from attested feed URLs without catalog lookups", () => {
    const plan = buildMinimalAttestationPlanFromUrls({
      topic: "engagement spotlight 0xpost",
      urls: [
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      ],
      minSupportingSources: 0,
    });

    expect(plan.ready).toBe(true);
    expect(plan.primary?.url).toContain("coingecko");
    expect(plan.reason).toBe("ready");
  });
});
