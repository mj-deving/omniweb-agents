import { describe, it, expect, vi } from "vitest";
import { createPredictionMarketProvider } from "../../../src/adapters/skill-dojo/prediction-market.js";
import { createMockClient, mockSuccessResponse, mockErrorResponse } from "./mock-client.js";

describe("createPredictionMarketProvider", () => {
  it("returns a DataProvider with correct name", () => {
    const client = createMockClient();
    const provider = createPredictionMarketProvider({ client });
    expect(provider.name).toBe("skill-dojo:prediction-market");
  });

  it("maps default params", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("prediction-market", {}),
    );

    const provider = createPredictionMarketProvider({ client });
    await provider.fetch("markets");

    expect(client.execute).toHaveBeenCalledWith("prediction-market", expect.objectContaining({
      mode: "compare-markets",
      category: "all",
    }));
  });

  it("passes custom category and strategy", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("prediction-market", {}),
    );

    const provider = createPredictionMarketProvider({ client });
    await provider.fetch("crypto markets", { mode: "aggregate-oracle", category: "crypto", strategy: "momentum" });

    expect(client.execute).toHaveBeenCalledWith("prediction-market", expect.objectContaining({
      mode: "aggregate-oracle",
      category: "crypto",
      strategy: "momentum",
    }));
  });

  it("extracts multi-proof from demosAttestation.proofs", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("prediction-market", {
        demosAttestation: {
          proofs: {
            polymarket: {
              responseHash: "5d87e7",
              source: "gamma-api.polymarket.com",
              marketsAttested: 16,
              explorerUrl: "https://explorer.demos.sh/tx/poly",
            },
            kalshi: {
              responseHash: "736a18",
              marketsAttested: 0,
              explorerUrl: "https://explorer.demos.sh/tx/kalshi",
            },
          },
        },
      }),
    );

    const provider = createPredictionMarketProvider({ client });
    const result = await provider.fetch("markets");

    expect(result.ok).toBe(true);
    expect((result as any).proofs).toHaveLength(2);
    expect((result as any).proofs[0].source).toBe("gamma-api.polymarket.com");
    expect((result as any).proofs[1].source).toBe("kalshi");
  });

  it("returns error result on failure", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockErrorResponse("prediction-market", "Timeout"),
    );

    const provider = createPredictionMarketProvider({ client });
    const result = await provider.fetch("markets");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Timeout");
  });
});
