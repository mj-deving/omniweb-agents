/**
 * Tests for SDK bridge adapter.
 *
 * Uses mocked Demos SDK to verify bridge behavior without real RPC connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSdkBridge } from "../../src/toolkit/sdk-bridge.js";
import type { SdkBridge } from "../../src/toolkit/sdk-bridge.js";

// Mock Demos instance
function mockDemos() {
  return {
    signMessage: vi.fn(async (msg: string) => ({
      data: "mock-signature",
      type: "falcon",
    })),
    web2: {
      createDahr: vi.fn(async () => ({
        startProxy: vi.fn(async (opts: { url: string; method: string }) => ({
          responseHash: "mock-response-hash",
          txHash: "mock-tx-hash",
          data: JSON.stringify({ price: 42 }),
          status: 200,
        })),
      })),
    },
    sendTransaction: vi.fn(async () => ({
      hash: "mock-send-tx-hash",
    })),
  };
}

describe("SDK Bridge Adapter", () => {
  let bridge: SdkBridge;
  let demos: ReturnType<typeof mockDemos>;

  beforeEach(() => {
    demos = mockDemos();
    bridge = createSdkBridge(demos as any, "https://www.supercolony.ai", "mock-auth-token");
  });

  describe("structure", () => {
    it("wraps Demos instance and auth token", () => {
      expect(bridge).toBeDefined();
      expect(bridge.attestDahr).toBeDefined();
      expect(bridge.apiCall).toBeDefined();
      expect(bridge.signAndBroadcast).toBeDefined();
    });

    it("exposes attestDahr method", () => {
      expect(typeof bridge.attestDahr).toBe("function");
    });

    it("exposes apiCall method", () => {
      expect(typeof bridge.apiCall).toBe("function");
    });

    it("exposes signAndBroadcast method", () => {
      expect(typeof bridge.signAndBroadcast).toBe("function");
    });
  });

  describe("attestDahr", () => {
    it("calls DAHR proxy with URL and returns result", async () => {
      const result = await bridge.attestDahr("https://api.example.com/price");
      expect(result.responseHash).toBe("mock-response-hash");
      expect(result.txHash).toBe("mock-tx-hash");
      expect(demos.web2.createDahr).toHaveBeenCalled();
    });

    it("passes method to DAHR proxy", async () => {
      const result = await bridge.attestDahr("https://api.example.com/data", "POST");
      expect(demos.web2.createDahr).toHaveBeenCalled();
      expect(result.txHash).toBe("mock-tx-hash");
    });

    it("throws on non-2xx HTTP status from proxy", async () => {
      demos.web2.createDahr = vi.fn(async () => ({
        startProxy: vi.fn(async () => ({ status: 403, data: "{}" })),
      }));
      bridge = createSdkBridge(demos as any, "https://www.supercolony.ai", "token");
      await expect(bridge.attestDahr("https://example.com")).rejects.toThrow("HTTP 403");
    });

    it("throws on XML/HTML response", async () => {
      demos.web2.createDahr = vi.fn(async () => ({
        startProxy: vi.fn(async () => ({
          status: 200, data: "<html>Error</html>",
          responseHash: "h", txHash: "t",
        })),
      }));
      bridge = createSdkBridge(demos as any, "https://www.supercolony.ai", "token");
      await expect(bridge.attestDahr("https://example.com")).rejects.toThrow("XML/HTML");
    });

    it("throws on error payload with unauthorized", async () => {
      demos.web2.createDahr = vi.fn(async () => ({
        startProxy: vi.fn(async () => ({
          status: 200, data: JSON.stringify({ error: "Unauthorized access" }),
          responseHash: "h", txHash: "t",
        })),
      }));
      bridge = createSdkBridge(demos as any, "https://www.supercolony.ai", "token");
      await expect(bridge.attestDahr("https://example.com")).rejects.toThrow("Unauthorized");
    });
  });

  describe("apiCall", () => {
    it("calls fetch with auth header for SuperColony paths", async () => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ posts: [] }),
      }));
      const bridgeWithFetch = createSdkBridge(
        demos as any,
        "https://www.supercolony.ai",
        "mock-token",
        fetchMock as any,
      );

      await bridgeWithFetch.apiCall("/api/feed?limit=50");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://www.supercolony.ai/api/feed?limit=50",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
        }),
      );
    });

    it("rejects absolute URLs to prevent SSRF", async () => {
      const result = await bridge.apiCall("https://evil.com/steal");
      expect(result.ok).toBe(false);
      expect(result.data).toContain("relative paths");
    });

    it("does not attach auth token when auth is pending", async () => {
      const { AUTH_PENDING_TOKEN } = await import("../../src/toolkit/sdk-bridge.js");
      const fetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "{}",
      }));
      const pendingBridge = createSdkBridge(
        demos as any,
        "https://www.supercolony.ai",
        AUTH_PENDING_TOKEN,
        fetchMock as any,
      );

      await pendingBridge.apiCall("/api/feed");
      const headers = (fetchMock.mock.calls[0][1] as any).headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it("returns parsed JSON response", async () => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ posts: [{ txHash: "0x1" }] }),
      }));
      const bridgeWithFetch = createSdkBridge(
        demos as any,
        "https://www.supercolony.ai",
        "mock-token",
        fetchMock as any,
      );

      const result = await bridgeWithFetch.apiCall("/api/feed?limit=50");
      expect(result.ok).toBe(true);
      expect(result.data.posts).toHaveLength(1);
    });
  });
});
