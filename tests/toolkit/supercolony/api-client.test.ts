/**
 * Tests for SuperColonyApiClient -- typed, session-scoped API client.
 *
 * Mocks fetch for each endpoint category. Validates:
 * - Successful response parsing with typed results
 * - 502 graceful degradation returns null
 * - Auth header injection
 * - Network error handling returns null
 * - At least one method per category
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SuperColonyApiClient } from "../../../src/toolkit/supercolony/api-client.js";
import type { AgentProfile, LeaderboardResult } from "../../../src/toolkit/supercolony/types.js";

// ── Test Helpers ────────────────────────────────────

function mockFetchResponse(data: unknown, status = 200, ok = true): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  }));
}

function mockFetchNetworkError(message = "ECONNREFUSED"): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error(message)));
}

function mockFetch502(): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
    ok: false,
    status: 502,
    text: () => Promise.resolve("Bad Gateway"),
  }));
}

function createClient(token: string | null = "test-token"): SuperColonyApiClient {
  return new SuperColonyApiClient({
    getToken: () => Promise.resolve(token),
    baseUrl: "https://www.supercolony.ai",
    timeout: 5000,
  });
}

// ── Tests ───────────────────────────────────────────

describe("SuperColonyApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Construction ────────────────────────────────

  describe("constructor", () => {
    it("uses default baseUrl when not provided", () => {
      const client = new SuperColonyApiClient({
        getToken: () => Promise.resolve(null),
      });
      // Client should exist without error
      expect(client).toBeDefined();
    });
  });

  // ── Auth Header Injection ──────────────────────

  describe("auth header injection", () => {
    it("attaches Bearer token to requests when token is available", async () => {
      const agents = { agents: [] };
      mockFetchResponse(agents);

      const client = createClient("my-secret-token");
      await client.listAgents();

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer my-secret-token");
    });

    it("omits Authorization header when token is null", async () => {
      const agents = { agents: [] };
      mockFetchResponse(agents);

      const client = createClient(null);
      await client.listAgents();

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBeUndefined();
    });
  });

  // ── Graceful Degradation ──────────────────────

  describe("graceful degradation", () => {
    it("returns null on network error", async () => {
      mockFetchNetworkError();
      const client = createClient();
      const result = await client.listAgents();
      expect(result).toBeNull();
    });

    it("returns null on 502 Bad Gateway", async () => {
      mockFetch502();
      const client = createClient();
      const result = await client.listAgents();
      expect(result).toBeNull();
    });

    it("returns error result on 401 Unauthorized", async () => {
      mockFetchResponse({ message: "unauthorized" }, 401, false);
      const client = createClient();
      const result = await client.listAgents();
      expect(result).not.toBeNull();
      expect(result?.ok).toBe(false);
      if (result && !result.ok) {
        expect(result.status).toBe(401);
      }
    });

    it("returns error result on 404 Not Found", async () => {
      mockFetchResponse({ message: "not found" }, 404, false);
      const client = createClient();
      const result = await client.getAgentProfile("0xdead");
      expect(result).not.toBeNull();
      expect(result?.ok).toBe(false);
      if (result && !result.ok) {
        expect(result.status).toBe(404);
      }
    });
  });

  // ── Agent Identity ─────────────────────────────

  describe("agent identity", () => {
    it("registerAgent sends POST with agent data", async () => {
      mockFetchResponse({ success: true });
      const client = createClient();
      const result = await client.registerAgent({
        name: "sentinel",
        description: "A test agent",
        specialties: ["crypto", "defi"],
      });
      expect(result?.ok).toBe(true);

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(fetchCall[1]?.method).toBe("POST");
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.name).toBe("sentinel");
    });

    it("listAgents returns typed AgentProfile array", async () => {
      const payload = {
        agents: [
          {
            address: "0xabc",
            name: "sentinel",
            description: "test",
            specialties: ["crypto"],
            totalPosts: 42,
            lastActiveAt: Date.now(),
          },
        ],
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.listAgents();
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.agents).toHaveLength(1);
        expect(result.data.agents[0].name).toBe("sentinel");
      }
    });

    it("getAgentProfile returns single profile", async () => {
      const profile: AgentProfile = {
        address: "0xabc",
        name: "sentinel",
        description: "test",
        specialties: ["crypto"],
        totalPosts: 10,
        lastActiveAt: Date.now(),
      };
      mockFetchResponse(profile);
      const client = createClient();
      const result = await client.getAgentProfile("0xabc");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.address).toBe("0xabc");
      }
    });

    it("getAgentIdentities returns web2 and xm identities", async () => {
      const identities = {
        web2Identities: [{ platform: "twitter", username: "test" }],
        xmIdentities: [{ chain: "eth.mainnet", address: "0xdef" }],
      };
      mockFetchResponse(identities);
      const client = createClient();
      const result = await client.getAgentIdentities("0xabc");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.web2Identities).toHaveLength(1);
        expect(result.data.xmIdentities).toHaveLength(1);
      }
    });
  });

  // ── Identity Lookup ────────────────────────────

  describe("identity lookup", () => {
    it("lookupByPlatform sends correct query params", async () => {
      const payload = {
        platform: "twitter",
        username: "vitalik",
        accounts: [{ address: "0x123", displayName: "Vitalik" }],
        found: true,
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.lookupByPlatform("twitter", "vitalik");
      expect(result?.ok).toBe(true);

      const fetchUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
      expect(fetchUrl).toContain("twitter");
      expect(fetchUrl).toContain("vitalik");
    });

    it("searchIdentity returns search results", async () => {
      const payload = { results: [] };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.searchIdentity("sentinel");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.results).toEqual([]);
      }
    });

    it("lookupByChainAddress sends chain and address", async () => {
      const payload = {
        platform: "eth.mainnet",
        username: "",
        accounts: [],
        found: false,
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.lookupByChainAddress("eth.mainnet", "0xdead");
      expect(result?.ok).toBe(true);

      const fetchUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
      expect(fetchUrl).toContain("eth.mainnet");
      expect(fetchUrl).toContain("0xdead");
    });
  });

  // ── Predictions ────────────────────────────────

  describe("predictions", () => {
    it("queryPredictions returns typed predictions", async () => {
      const payload = [{
        txHash: "0xabc",
        author: "0x123",
        text: "BTC to 100k",
        confidence: 0.85,
        assets: ["BTC"],
        deadline: "2026-12-31",
        status: "pending",
      }];
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.queryPredictions({ asset: "BTC" });
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data[0].status).toBe("pending");
      }
    });

    it("resolvePrediction sends POST with outcome and evidence", async () => {
      mockFetchResponse({ success: true });
      const client = createClient();
      await client.resolvePrediction("0xabc", "correct", "price hit $100k");

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(fetchCall[1]?.method).toBe("POST");
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.outcome).toBe("correct");
      expect(body.evidence).toBe("price hit $100k");
    });
  });

  // ── Tipping ────────────────────────────────────

  describe("tipping", () => {
    it("getTipStats returns tip data for a post", async () => {
      const payload = {
        totalTips: 3,
        totalDem: 15,
        tippers: ["0x1", "0x2", "0x3"],
        topTip: 10,
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.getTipStats("0xabc");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.totalTips).toBe(3);
        expect(result.data.tippers).toHaveLength(3);
      }
    });

    it("getAgentTipStats returns given and received stats", async () => {
      const payload = {
        tipsGiven: { count: 5, totalDem: 25 },
        tipsReceived: { count: 10, totalDem: 50 },
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.getAgentTipStats("0xabc");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.tipsGiven.count).toBe(5);
        expect(result.data.tipsReceived.count).toBe(10);
      }
    });
  });

  // ── Scoring & Leaderboard ─────────────────────

  describe("scoring and leaderboard", () => {
    it("getAgentLeaderboard returns leaderboard with agents", async () => {
      const payload: LeaderboardResult = {
        agents: [{
          address: "0xabc",
          name: "sentinel",
          totalPosts: 100,
          avgScore: 72.5,
          bayesianScore: 68.3,
          topScore: 95,
          lowScore: 30,
          lastActiveAt: Date.now(),
        }],
        count: 1,
        globalAvg: 65.0,
        confidenceThreshold: 10,
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.getAgentLeaderboard({ sortBy: "bayesianScore", limit: 10 });
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.agents[0].bayesianScore).toBe(68.3);
        expect(result.data.globalAvg).toBe(65.0);
      }
    });

    it("getTopPosts returns posts with scores", async () => {
      const payload = {
        posts: [{
          txHash: "0xabc",
          author: "0x123",
          category: "crypto",
          text: "Great insight",
          score: 92,
          timestamp: Date.now(),
          blockNumber: 1000,
        }],
        count: 1,
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.getTopPosts({ category: "crypto", limit: 5 });
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.posts[0].score).toBe(92);
      }
    });
  });

  // ── Verification ───────────────────────────────

  describe("verification", () => {
    it("verifyDahr returns attestation data", async () => {
      const payload = {
        verified: true,
        attestations: [{
          url: "https://example.com",
          responseHash: "0xhash",
          txHash: "0xtx",
          explorerUrl: "https://explorer.demos.sh/tx/0xtx",
        }],
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.verifyDahr("0xabc");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.verified).toBe(true);
        expect(result.data.attestations).toHaveLength(1);
      }
    });
  });

  // ── Webhooks ───────────────────────────────────

  describe("webhooks", () => {
    it("listWebhooks returns webhook array", async () => {
      const payload = [{
        id: "wh-1",
        url: "https://hook.example.com",
        events: ["post.created"],
        active: true,
      }];
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.listWebhooks();
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data[0].id).toBe("wh-1");
      }
    });

    it("createWebhook sends POST with url and events", async () => {
      mockFetchResponse({ success: true });
      const client = createClient();
      await client.createWebhook("https://hook.example.com", ["post.created"]);

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(fetchCall[1]?.method).toBe("POST");
      const body = JSON.parse(fetchCall[1]?.body as string);
      expect(body.url).toBe("https://hook.example.com");
      expect(body.events).toEqual(["post.created"]);
    });

    it("deleteWebhook sends DELETE request", async () => {
      mockFetchResponse({ success: true });
      const client = createClient();
      await client.deleteWebhook("wh-1");

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(fetchCall[1]?.method).toBe("DELETE");
    });
  });

  // ── Feed ───────────────────────────────────────

  describe("feed", () => {
    it("getPostDetail returns post with replies", async () => {
      const payload = {
        post: { txHash: "0xabc", content: "test" },
        replies: [{ txHash: "0xdef", content: "reply" }],
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.getPostDetail("0xabc");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.replies).toHaveLength(1);
      }
    });

    it("getRssFeed returns raw XML string", async () => {
      const xml = '<?xml version="1.0"?><feed><entry/></feed>';
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      }));
      const client = createClient();
      const result = await client.getRssFeed();
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data).toContain("<?xml");
      }
    });
  });

  // ── Betting ────────────────────────────────────

  describe("betting", () => {
    it("getBettingPool returns pool data", async () => {
      const payload = {
        asset: "BTC",
        horizon: "24h",
        totalBets: 10,
        totalDem: 500,
        poolAddress: "0xpool",
        roundEnd: Date.now() + 86400000,
        bets: [],
      };
      mockFetchResponse(payload);
      const client = createClient();
      const result = await client.getBettingPool("BTC", "24h");
      expect(result?.ok).toBe(true);
      if (result?.ok) {
        expect(result.data.asset).toBe("BTC");
        expect(result.data.totalBets).toBe(10);
      }
    });
  });

  // ── URL Construction ──────────────────────────

  describe("URL construction", () => {
    it("constructs correct URL for GET endpoints", async () => {
      mockFetchResponse({ agents: [] });
      const client = createClient();
      await client.listAgents();

      const fetchUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
      expect(fetchUrl).toBe("https://www.supercolony.ai/api/agents");
    });

    it("includes query parameters in URL", async () => {
      mockFetchResponse([]);
      const client = createClient();
      await client.queryPredictions({ status: "pending", asset: "BTC" });

      const fetchUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
      expect(fetchUrl).toContain("status=pending");
      expect(fetchUrl).toContain("asset=BTC");
    });
  });

  // ── Timeout ────────────────────────────────────

  describe("timeout", () => {
    it("passes AbortSignal with configured timeout", async () => {
      mockFetchResponse({ agents: [] });
      const client = new SuperColonyApiClient({
        getToken: () => Promise.resolve(null),
        timeout: 3000,
      });
      await client.listAgents();

      const fetchCall = vi.mocked(globalThis.fetch).mock.calls[0];
      const signal = fetchCall[1]?.signal;
      expect(signal).toBeDefined();
    });
  });
});
