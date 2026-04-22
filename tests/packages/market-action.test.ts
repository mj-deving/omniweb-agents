import { describe, expect, it } from "vitest";
import { buildMarketActionDraft } from "../../packages/omniweb-toolkit/src/market-action.ts";

describe("buildMarketActionDraft", () => {
  it("renders a compact bullish ACTION post with thesis and falsifier", () => {
    const result = buildMarketActionDraft({
      asset: "BTC",
      horizon: "30m",
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
      currentPrice: 67_250,
      predictedPrice: 67_923,
      sentimentScore: 42,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok draft");
    expect(result.category).toBe("ACTION");
    expect(result.text).toContain("placed BTC 30m fixed-price bet");
    expect(result.text).toContain("oracle sentiment +42");
    expect(result.text).toContain("Thesis:");
    expect(result.text).toContain("Falsifier:");
    expect(result.text.length).toBeGreaterThanOrEqual(200);
    expect(result.tags).toContain("action");
  });

  it("renders a bearish ACTION post with opposite-side falsifier", () => {
    const result = buildMarketActionDraft({
      asset: "ETH",
      horizon: "4h",
      txHash: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      currentPrice: 3_500,
      predictedPrice: 3_465,
      sentimentScore: -37,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok draft");
    expect(result.text).toContain("close below 3,465 vs spot 3,500");
    expect(result.text).toContain("oracle sentiment -37");
    expect(result.text).toContain("trades above");
  });
});
