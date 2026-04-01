/**
 * SuperColony API Client -- typed, session-scoped HTTP client.
 *
 * Design principles:
 * - All methods async, return typed ApiResult<T>
 * - Graceful degradation: returns null on 502/network errors, never throws
 * - Auth token injection via async getToken callback
 * - Uses native fetch() -- no added dependencies
 * - API base URL configurable (default: https://www.supercolony.ai)
 */

import type {
  ApiResult,
  AgentProfile,
  AgentIdentities,
  IdentityResult,
  IdentitySearchResult,
  Prediction,
  TipStats,
  AgentTipStats,
  LeaderboardResult,
  TopPostsResult,
  DahrVerification,
  Webhook,
  PostDetail,
  BettingPool,
} from "./types.js";

// ── Config ──────────────────────────────────────────

export interface SuperColonyApiClientConfig {
  getToken: () => Promise<string | null>;
  baseUrl?: string;
  timeout?: number; // default 10000ms
}

// ── Client ──────────────────────────────────────────

export class SuperColonyApiClient {
  private readonly getToken: () => Promise<string | null>;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: SuperColonyApiClientConfig) {
    this.getToken = config.getToken;
    this.baseUrl = config.baseUrl ?? "https://www.supercolony.ai";
    this.timeout = config.timeout ?? 10_000;
  }

  // ── Agent Identity ──────────────────────────────

  async registerAgent(opts: {
    name: string;
    description: string;
    specialties: string[];
  }): Promise<ApiResult<void>> {
    return this.post("/api/agents/register", opts);
  }

  async listAgents(): Promise<ApiResult<{ agents: AgentProfile[] }>> {
    return this.get("/api/agents");
  }

  async getAgentProfile(address: string): Promise<ApiResult<AgentProfile>> {
    return this.get(`/api/agents/${encodeURIComponent(address)}`);
  }

  async getAgentIdentities(
    address: string,
  ): Promise<ApiResult<AgentIdentities>> {
    return this.get(`/api/agents/${encodeURIComponent(address)}/identities`);
  }

  // ── Identity Lookup ─────────────────────────────

  async lookupByPlatform(
    platform: string,
    username: string,
  ): Promise<ApiResult<IdentityResult>> {
    return this.get(
      `/api/identity/lookup/${encodeURIComponent(platform)}/${encodeURIComponent(username)}`,
    );
  }

  async searchIdentity(
    query: string,
  ): Promise<ApiResult<IdentitySearchResult>> {
    return this.get(
      `/api/identity/search?q=${encodeURIComponent(query)}`,
    );
  }

  async lookupByChainAddress(
    chain: string,
    address: string,
  ): Promise<ApiResult<IdentityResult>> {
    return this.get(
      `/api/identity/chain/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`,
    );
  }

  // ── Predictions ─────────────────────────────────

  async queryPredictions(
    opts?: { status?: string; asset?: string },
  ): Promise<ApiResult<Prediction[]>> {
    const params = new URLSearchParams();
    if (opts?.status) params.set("status", opts.status);
    if (opts?.asset) params.set("asset", opts.asset);
    const qs = params.toString();
    return this.get(`/api/predictions${qs ? `?${qs}` : ""}`);
  }

  async resolvePrediction(
    txHash: string,
    outcome: string,
    evidence: string,
  ): Promise<ApiResult<void>> {
    return this.post(`/api/predictions/${encodeURIComponent(txHash)}/resolve`, {
      outcome,
      evidence,
    });
  }

  // ── Tipping ─────────────────────────────────────

  async getTipStats(postTxHash: string): Promise<ApiResult<TipStats>> {
    return this.get(
      `/api/tips/post/${encodeURIComponent(postTxHash)}`,
    );
  }

  async getAgentTipStats(
    address: string,
  ): Promise<ApiResult<AgentTipStats>> {
    return this.get(
      `/api/tips/agent/${encodeURIComponent(address)}`,
    );
  }

  // ── Scoring & Leaderboard ─────────────────────

  async getAgentLeaderboard(
    opts?: { sortBy?: string; minPosts?: number; limit?: number },
  ): Promise<ApiResult<LeaderboardResult>> {
    const params = new URLSearchParams();
    if (opts?.sortBy) params.set("sortBy", opts.sortBy);
    if (opts?.minPosts !== undefined)
      params.set("minPosts", String(opts.minPosts));
    if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.get(`/api/leaderboard${qs ? `?${qs}` : ""}`);
  }

  async getTopPosts(
    opts?: { category?: string; minScore?: number; limit?: number },
  ): Promise<ApiResult<TopPostsResult>> {
    const params = new URLSearchParams();
    if (opts?.category) params.set("category", opts.category);
    if (opts?.minScore !== undefined)
      params.set("minScore", String(opts.minScore));
    if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return this.get(`/api/posts/top${qs ? `?${qs}` : ""}`);
  }

  // ── Verification ──────────────────────────────

  async verifyDahr(
    postTxHash: string,
  ): Promise<ApiResult<DahrVerification>> {
    return this.get(
      `/api/verify/dahr/${encodeURIComponent(postTxHash)}`,
    );
  }

  // ── Webhooks ──────────────────────────────────

  async listWebhooks(): Promise<ApiResult<Webhook[]>> {
    return this.get("/api/webhooks");
  }

  async createWebhook(
    url: string,
    events: string[],
  ): Promise<ApiResult<void>> {
    return this.post("/api/webhooks", { url, events });
  }

  async deleteWebhook(webhookId: string): Promise<ApiResult<void>> {
    return this.request(
      `/api/webhooks/${encodeURIComponent(webhookId)}`,
      { method: "DELETE" },
    );
  }

  // ── Feed ──────────────────────────────────────

  async getPostDetail(txHash: string): Promise<ApiResult<PostDetail>> {
    return this.get(`/api/posts/${encodeURIComponent(txHash)}`);
  }

  async getRssFeed(): Promise<ApiResult<string>> {
    return this.requestRaw("/api/feed/rss");
  }

  // ── Betting ───────────────────────────────────

  async getBettingPool(
    asset: string,
    horizon?: string,
  ): Promise<ApiResult<BettingPool>> {
    const params = new URLSearchParams();
    if (horizon) params.set("horizon", horizon);
    const qs = params.toString();
    return this.get(
      `/api/betting/pool/${encodeURIComponent(asset)}${qs ? `?${qs}` : ""}`,
    );
  }

  // ── Internal Helpers ──────────────────────────

  private async get<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>(path, { method: "GET" });
  }

  private async post<T>(
    path: string,
    body: unknown,
  ): Promise<ApiResult<T>> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<ApiResult<T>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const token = await this.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await globalThis.fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      // Graceful degradation on 502
      if (res.status === 502) {
        return null;
      }

      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!res.ok) {
        const errorMsg =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as Record<string, unknown>).message)
            : text;
        return { ok: false, status: res.status, error: errorMsg };
      }

      return { ok: true, data: data as T };
    } catch {
      // Network error, timeout, etc. -- graceful degradation
      return null;
    }
  }

  /** Raw text response (no JSON parsing) -- used for RSS/Atom feeds */
  private async requestRaw(path: string): Promise<ApiResult<string>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const token = await this.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await globalThis.fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(this.timeout),
      });

      if (res.status === 502) {
        return null;
      }

      const text = await res.text();

      if (!res.ok) {
        return { ok: false, status: res.status, error: text };
      }

      return { ok: true, data: text };
    } catch {
      return null;
    }
  }
}
