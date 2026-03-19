import { describe, it, expect, vi } from "vitest";
import { createAddressMonitoringProvider } from "../../../src/adapters/skill-dojo/address-monitoring.js";
import { createMockClient, mockSuccessResponse, mockErrorResponse } from "./mock-client.js";

describe("createAddressMonitoringProvider", () => {
  it("returns a DataProvider with correct name", () => {
    const client = createMockClient();
    const provider = createAddressMonitoringProvider({ client });
    expect(provider.name).toBe("skill-dojo:address-monitoring");
  });

  it("defaults to monitor mode", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("address-monitoring", {}),
    );

    const provider = createAddressMonitoringProvider({ client });
    await provider.fetch("addr");

    expect(client.execute).toHaveBeenCalledWith("address-monitoring", { mode: "monitor" });
  });

  it("passes chain and address params", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSuccessResponse("address-monitoring", {}),
    );

    const provider = createAddressMonitoringProvider({ client });
    await provider.fetch("addr", {
      mode: "compliance",
      chain: "base-sepolia",
      address: "0xabc",
    });

    expect(client.execute).toHaveBeenCalledWith("address-monitoring", {
      mode: "compliance",
      chain: "base-sepolia",
      address: "0xabc",
    });
  });

  it("returns error result on failure", async () => {
    const client = createMockClient();
    (client.execute as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockErrorResponse("address-monitoring", "Invalid address"),
    );

    const provider = createAddressMonitoringProvider({ client });
    const result = await provider.fetch("addr");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Invalid address");
  });
});
