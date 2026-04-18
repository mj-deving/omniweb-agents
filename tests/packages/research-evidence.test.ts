import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchResearchEvidenceSummary } from "../../packages/omniweb-toolkit/src/research-evidence.js";
import type { MinimalAttestationCandidate } from "../../packages/omniweb-toolkit/src/minimal-attestation-plan.js";

const originalFetch = globalThis.fetch;

function makeSource(url: string): MinimalAttestationCandidate {
  return {
    sourceId: "binance-btc-premium",
    name: "Binance Futures Premium Index",
    provider: "binance",
    status: "active",
    trustTier: "official",
    responseFormat: "json",
    ratingOverall: 88,
    dahrSafe: true,
    tlsnSafe: false,
    url,
    score: 17,
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchResearchEvidenceSummary", () => {
  it("extracts the key Binance premium index values", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          markPrice: "67250.00",
          indexPrice: "67245.12",
          lastFundingRate: "-0.012",
          interestRate: "0.0001",
          nextFundingTime: 123456789,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const result = await fetchResearchEvidenceSummary({
      source: makeSource("https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.summary.values).toEqual({
      markPrice: "67250.00",
      indexPrice: "67245.12",
      lastFundingRate: "-0.012",
      interestRate: "0.0001",
    });
  });

  it("falls back to generic numeric extraction for other JSON endpoints", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bitcoin: 67250.12,
          ethereum: 3200.55,
          provider: "coingecko",
          solana: "145.03",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const result = await fetchResearchEvidenceSummary({
      source: makeSource("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.summary.values).toEqual({
      bitcoin: "67250.12",
      ethereum: "3200.55",
      solana: "145.03",
    });
  });

  it("fails when no usable numeric values are present", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          provider: "example",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const result = await fetchResearchEvidenceSummary({
      source: makeSource("https://example.com/data.json"),
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("no_usable_values");
  });
});
