import { describe, it, expect, vi } from "vitest";
import { createNetworkMonitorProvider } from "../../../src/adapters/skill-dojo/network-monitor.js";
import { createMockClient, mockSuccessResponse, mockErrorResponse } from "./mock-client.js";

describe("createNetworkMonitorProvider", () => {
  it("returns a DataProvider with correct name", () => {
    const client = createMockClient();
    const provider = createNetworkMonitorProvider({ client });
    expect(provider.name).toBe("skill-dojo:network-monitor");
  });

  it("defaults to health mode", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("network-monitor", { status: "healthy" }),
    );

    const provider = createNetworkMonitorProvider({ client });
    await provider.fetch("network");

    expect(client.execute).toHaveBeenCalledWith("network-monitor", { mode: "health" });
  });

  it.each(["health", "mempool", "events"] as const)("supports %s mode", async (mode) => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("network-monitor", { mode }),
    );

    const provider = createNetworkMonitorProvider({ client });
    await provider.fetch("network", { mode });

    expect(client.execute).toHaveBeenCalledWith("network-monitor", { mode });
  });

  it("returns error result on failure", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockErrorResponse("network-monitor", "Node down"),
    );

    const provider = createNetworkMonitorProvider({ client });
    const result = await provider.fetch("network");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Node down");
  });
});
