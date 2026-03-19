import { describe, it, expect, vi } from "vitest";
import { createChainOperationsProvider } from "../../../src/adapters/skill-dojo/chain-operations.js";
import { createMockClient, mockSuccessResponse } from "./mock-client.js";

describe("createChainOperationsProvider", () => {
  it("returns a DataProvider with correct name", () => {
    const client = createMockClient();
    const provider = createChainOperationsProvider({ client });
    expect(provider.name).toBe("skill-dojo:chain-operations");
  });

  it("defaults to balance mode", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("chain-operations", { balance: "100" }),
    );

    const provider = createChainOperationsProvider({ client });
    await provider.fetch("balance");

    expect(client.execute).toHaveBeenCalledWith("chain-operations", { mode: "balance" });
  });

  it("passes contract params for write-contract mode", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("chain-operations", {}),
    );

    const provider = createChainOperationsProvider({ client });
    await provider.fetch("contract", {
      mode: "write-contract",
      chain: "base-sepolia",
      contractAddress: "0xdef",
      functionSignature: "transfer(address,uint256)",
      functionArgs: ["0xabc", 100],
    });

    expect(client.execute).toHaveBeenCalledWith("chain-operations", expect.objectContaining({
      mode: "write-contract",
      chain: "base-sepolia",
      contractAddress: "0xdef",
      functionSignature: "transfer(address,uint256)",
      functionArgs: ["0xabc", 100],
    }));
  });

  it.each(["demos", "base-sepolia", "ethereum", "polygon", "solana-devnet"] as const)(
    "accepts %s chain",
    async (chain) => {
      const client = createMockClient();
      (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSuccessResponse("chain-operations", {}),
      );

      const provider = createChainOperationsProvider({ client });
      await provider.fetch("balance", { chain });

      expect(client.execute).toHaveBeenCalledWith("chain-operations", expect.objectContaining({ chain }));
    },
  );
});
