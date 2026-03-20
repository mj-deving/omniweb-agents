import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSCPricesPlugin } from "../src/plugins/sc-prices-plugin.js";
import { createSCOraclePlugin } from "../src/plugins/sc-oracle-plugin.js";
import { createSCPredictionsMarketsPlugin } from "../src/plugins/sc-predictions-markets-plugin.js";
import type { SCDataPluginConfig } from "../src/plugins/sc-prices-plugin.js";
import type { ProviderResult, DataProvider } from "../src/types.js";

const BASE_URL = "https://supercolony.example.com";

function makeConfig(overrides?: Partial<SCDataPluginConfig>): SCDataPluginConfig {
  return {
    apiBaseUrl: overrides?.apiBaseUrl ?? BASE_URL,
    getAuthHeaders: overrides?.getAuthHeaders ?? (async () => ({ Authorization: "Bearer test-token" })),
  };
}

function mockFetchOk(data: unknown): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
  });
}

function mockFetchError(status: number, statusText: string): typeof globalThis.fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: async () => ({}),
  });
}

function mockFetchNetworkError(): typeof globalThis.fetch {
  return vi.fn().mockRejectedValue(new Error("Network failure"));
}

describe("SC Data Plugins", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ---------- sc-prices ----------
  describe("createSCPricesPlugin", () => {
    it("creates a plugin with correct metadata", () => {
      const plugin = createSCPricesPlugin(makeConfig());
      expect(plugin.name).toBe("sc-prices");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.providers).toHaveLength(1);
      expect(plugin.providers[0].name).toBe("sc-prices");
    });

    it("fetches prices successfully", async () => {
      const priceData = { BTC: 67000, ETH: 3400 };
      vi.stubGlobal("fetch", mockFetchOk(priceData));

      const plugin = createSCPricesPlugin(makeConfig());
      const result: ProviderResult = await plugin.providers[0].fetch("crypto");

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(priceData);
      expect(result.source).toBe("sc-prices-plugin");
    });

    it("returns ok:false on HTTP error", async () => {
      vi.stubGlobal("fetch", mockFetchError(500, "Internal Server Error"));

      const plugin = createSCPricesPlugin(makeConfig());
      const result = await plugin.providers[0].fetch("crypto");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("HTTP 500: Internal Server Error");
      expect(result.source).toBe("sc-prices-plugin");
    });

    it("returns ok:false on network error", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError());

      const plugin = createSCPricesPlugin(makeConfig());
      const result = await plugin.providers[0].fetch("crypto");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network failure");
      expect(result.source).toBe("sc-prices-plugin");
    });

    it("passes asset query param from options", async () => {
      const mock = mockFetchOk({ BTC: 67000 });
      vi.stubGlobal("fetch", mock);

      const plugin = createSCPricesPlugin(makeConfig());
      await plugin.providers[0].fetch("crypto", { asset: "BTC" });

      const calledUrl = (mock as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/prices");
      expect(calledUrl).toContain("asset=BTC");
    });

    it("includes auth headers from getAuthHeaders", async () => {
      const mock = mockFetchOk({});
      vi.stubGlobal("fetch", mock);

      const customHeaders = { Authorization: "Bearer custom-abc" };
      const plugin = createSCPricesPlugin(makeConfig({
        getAuthHeaders: async () => customHeaders,
      }));
      await plugin.providers[0].fetch("crypto");

      const calledOptions = (mock as ReturnType<typeof vi.fn>).mock.calls[0][1] as { headers: Record<string, string> };
      expect(calledOptions.headers).toEqual(customHeaders);
    });
  });

  // ---------- sc-oracle ----------
  describe("createSCOraclePlugin", () => {
    it("creates a plugin with correct metadata", () => {
      const plugin = createSCOraclePlugin(makeConfig());
      expect(plugin.name).toBe("sc-oracle");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.providers).toHaveLength(1);
      expect(plugin.providers[0].name).toBe("sc-oracle");
    });

    it("fetches oracle data successfully", async () => {
      const oracleData = { sentiment: 0.72, prices: { BTC: 67000 } };
      vi.stubGlobal("fetch", mockFetchOk(oracleData));

      const plugin = createSCOraclePlugin(makeConfig());
      const result = await plugin.providers[0].fetch("market");

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(oracleData);
      expect(result.source).toBe("sc-oracle-plugin");
    });

    it("returns ok:false on HTTP error", async () => {
      vi.stubGlobal("fetch", mockFetchError(403, "Forbidden"));

      const plugin = createSCOraclePlugin(makeConfig());
      const result = await plugin.providers[0].fetch("market");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("HTTP 403: Forbidden");
      expect(result.source).toBe("sc-oracle-plugin");
    });

    it("returns ok:false on network error", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError());

      const plugin = createSCOraclePlugin(makeConfig());
      const result = await plugin.providers[0].fetch("market");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network failure");
      expect(result.source).toBe("sc-oracle-plugin");
    });

    it("passes asset query param from options", async () => {
      const mock = mockFetchOk({});
      vi.stubGlobal("fetch", mock);

      const plugin = createSCOraclePlugin(makeConfig());
      await plugin.providers[0].fetch("market", { asset: "ETH" });

      const calledUrl = (mock as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/oracle");
      expect(calledUrl).toContain("asset=ETH");
    });

    it("includes auth headers from getAuthHeaders", async () => {
      const mock = mockFetchOk({});
      vi.stubGlobal("fetch", mock);

      const customHeaders = { "X-Auth": "token-xyz" };
      const plugin = createSCOraclePlugin(makeConfig({
        getAuthHeaders: async () => customHeaders,
      }));
      await plugin.providers[0].fetch("market");

      const calledOptions = (mock as ReturnType<typeof vi.fn>).mock.calls[0][1] as { headers: Record<string, string> };
      expect(calledOptions.headers).toEqual(customHeaders);
    });
  });

  // ---------- sc-predictions-markets ----------
  describe("createSCPredictionsMarketsPlugin", () => {
    it("creates a plugin with correct metadata", () => {
      const plugin = createSCPredictionsMarketsPlugin(makeConfig());
      expect(plugin.name).toBe("sc-predictions-markets");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.providers).toHaveLength(1);
      expect(plugin.providers[0].name).toBe("sc-predictions-markets");
    });

    it("fetches prediction markets successfully", async () => {
      const marketsData = { markets: [{ id: 1, odds: 0.65 }] };
      vi.stubGlobal("fetch", mockFetchOk(marketsData));

      const plugin = createSCPredictionsMarketsPlugin(makeConfig());
      const result = await plugin.providers[0].fetch("predictions");

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(marketsData);
      expect(result.source).toBe("sc-predictions-markets-plugin");
    });

    it("returns ok:false on HTTP error", async () => {
      vi.stubGlobal("fetch", mockFetchError(404, "Not Found"));

      const plugin = createSCPredictionsMarketsPlugin(makeConfig());
      const result = await plugin.providers[0].fetch("predictions");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("HTTP 404: Not Found");
      expect(result.source).toBe("sc-predictions-markets-plugin");
    });

    it("returns ok:false on network error", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError());

      const plugin = createSCPredictionsMarketsPlugin(makeConfig());
      const result = await plugin.providers[0].fetch("predictions");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("Network failure");
      expect(result.source).toBe("sc-predictions-markets-plugin");
    });

    it("passes asset query param from options", async () => {
      const mock = mockFetchOk({});
      vi.stubGlobal("fetch", mock);

      const plugin = createSCPredictionsMarketsPlugin(makeConfig());
      await plugin.providers[0].fetch("predictions", { asset: "SOL" });

      const calledUrl = (mock as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(calledUrl).toContain("/api/predictions/markets");
      expect(calledUrl).toContain("asset=SOL");
    });

    it("includes auth headers from getAuthHeaders", async () => {
      const mock = mockFetchOk({});
      vi.stubGlobal("fetch", mock);

      const customHeaders = { Cookie: "session=abc123" };
      const plugin = createSCPredictionsMarketsPlugin(makeConfig({
        getAuthHeaders: async () => customHeaders,
      }));
      await plugin.providers[0].fetch("predictions");

      const calledOptions = (mock as ReturnType<typeof vi.fn>).mock.calls[0][1] as { headers: Record<string, string> };
      expect(calledOptions.headers).toEqual(customHeaders);
    });
  });
});
