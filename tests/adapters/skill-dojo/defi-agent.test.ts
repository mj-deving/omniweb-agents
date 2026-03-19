import { describe, it, expect, vi } from "vitest";
import { createDefiAgentProvider } from "../../../src/adapters/skill-dojo/defi-agent.js";
import { createMockClient, mockSuccessResponse, mockErrorResponse } from "./mock-client.js";

describe("createDefiAgentProvider", () => {
  it("returns a DataProvider with correct name and description", () => {
    const client = createMockClient();
    const provider = createDefiAgentProvider({ client });
    expect(provider.name).toBe("skill-dojo:defi-agent");
    expect(provider.description).toContain("DeFi");
  });

  it("maps default params when no options given", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("defi-agent", { price: 3200 }),
    );

    const provider = createDefiAgentProvider({ client });
    await provider.fetch("eth market");

    expect(client.execute).toHaveBeenCalledWith("defi-agent", expect.objectContaining({
      mode: "order-book",
      pair: "ETH/USDT",
      source: "both",
      depth: 5,
    }));
  });

  it("passes custom options through", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("defi-agent", {}),
    );

    const provider = createDefiAgentProvider({ client });
    await provider.fetch("bridge", {
      mode: "bridge-swap",
      fromChain: "ethereum",
      toChain: "polygon",
      fromToken: "USDT",
      toToken: "USDC",
      amount: 100,
    });

    expect(client.execute).toHaveBeenCalledWith("defi-agent", expect.objectContaining({
      mode: "bridge-swap",
      fromChain: "ethereum",
      toChain: "polygon",
      amount: 100,
    }));
  });

  it("returns ok result with proofs from dahrAttestation", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("defi-agent", {
        orderBook: { bids: [], asks: [] },
        dahrAttestation: {
          attested: true,
          api: "Binance order book",
          responseHash: "86307d3d",
          txHash: "acbd52d4",
          explorerUrl: "https://explorer.demos.sh/tx/acbd52",
        },
      }),
    );

    const provider = createDefiAgentProvider({ client });
    const result = await provider.fetch("eth");

    expect(result.ok).toBe(true);
    expect(result.source).toBe("skill-dojo:defi-agent");
    expect((result as any).proofs).toHaveLength(1);
    expect((result as any).proofs[0].attested).toBe(true);
    expect((result as any).skillId).toBe("defi-agent");
    expect((result as any).executionTimeMs).toBe(123);
  });

  it("returns error result on failure", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockErrorResponse("defi-agent", "API unreachable"),
    );

    const provider = createDefiAgentProvider({ client });
    const result = await provider.fetch("eth");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("API unreachable");
    expect(result.source).toBe("skill-dojo:defi-agent");
  });
});
