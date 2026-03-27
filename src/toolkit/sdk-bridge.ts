/**
 * SDK Bridge — session-scoped adapter wrapping Demos SDK instance.
 *
 * Isolates toolkit tools from module-level SDK state. Each session gets
 * its own bridge with its own auth token and API base URL.
 *
 * Does NOT import publish-pipeline.ts (avoids TLSN/Playwright transitive deps).
 * Instead, reimplements DAHR attestation using the same SDK primitives.
 */

import type { Demos } from "@kynesyslabs/demosdk/websdk";

/** Sentinel token indicating auth has not completed — never sent as Bearer */
export const AUTH_PENDING_TOKEN = "__AUTH_PENDING__";

// ── Types ───────────────────────────────────────────

export interface DahrResult {
  responseHash: string;
  txHash: string;
  data: unknown;
  url: string;
}

export interface ApiCallResult {
  ok: boolean;
  status: number;
  data: unknown;
}

export interface SdkBridge {
  /** Create a DAHR attestation for a URL */
  attestDahr(url: string, method?: string): Promise<DahrResult>;

  /** Make an authenticated API call to SuperColony */
  apiCall(path: string, options?: RequestInit): Promise<ApiCallResult>;

  /** Sign and broadcast a transaction */
  signAndBroadcast(txData: unknown): Promise<{ hash: string }>;

  /** Get the underlying Demos instance (for direct SDK access when needed) */
  getDemos(): Demos;
}

// ── Factory ─────────────────────────────────────────

/**
 * Create a session-scoped SDK bridge.
 *
 * @param demos - Connected Demos instance (wallet already loaded)
 * @param apiBaseUrl - SuperColony API base URL
 * @param authToken - Authentication token for API calls
 * @param fetchImpl - Optional fetch implementation (for testing)
 */
export function createSdkBridge(
  demos: Demos,
  apiBaseUrl: string,
  authToken: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): SdkBridge {
  return {
    async attestDahr(url: string, method: string = "GET"): Promise<DahrResult> {
      const dahr = await (demos as any).web2.createDahr();
      const proxyResponse = await dahr.startProxy({ url, method });

      // HTTP status guard (same logic as publish-pipeline.ts:attestDahr)
      const httpStatus = proxyResponse.status ?? proxyResponse.statusCode ?? proxyResponse.httpStatus;
      if (typeof httpStatus === "number" && (httpStatus < 200 || httpStatus >= 300)) {
        throw new Error(`DAHR source returned HTTP ${httpStatus} — refusing to attest. URL: ${url}`);
      }

      // Parse response data
      let data: unknown;
      if (typeof proxyResponse.data === "string") {
        const trimmed = proxyResponse.data.trim();
        if (trimmed.startsWith("<")) {
          throw new Error(`DAHR returned XML/HTML instead of JSON. URL: ${url}`);
        }
        try {
          data = JSON.parse(proxyResponse.data);
        } catch {
          throw new Error(`DAHR returned non-JSON response. URL: ${url}`);
        }
      } else {
        data = proxyResponse.data;
      }

      // Error payload guard
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const obj = data as Record<string, unknown>;
        const errField = obj.error ?? obj.Error ?? obj.message ?? obj.detail;
        if (typeof errField === "string") {
          const errLower = errField.toLowerCase();
          if (
            errLower.includes("unauthorized") ||
            errLower.includes("forbidden") ||
            errLower.includes("rate limit") ||
            errLower.includes("api key") ||
            errLower.includes("access denied")
          ) {
            throw new Error(`DAHR source returned error: "${errField}". URL: ${url}`);
          }
        }
      }

      return {
        responseHash: proxyResponse.responseHash,
        txHash: proxyResponse.txHash,
        data,
        url,
      };
    },

    async apiCall(path: string, options: RequestInit = {}): Promise<ApiCallResult> {
      // Restrict to relative SuperColony API paths — absolute URLs are not allowed
      // to prevent SSRF and token leakage via attacker-controlled URLs
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return { ok: false, status: 0, data: "apiCall only accepts relative paths (e.g., '/api/feed')" };
      }

      const url = `${apiBaseUrl}${path}`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> || {}),
      };

      // Always attach auth token — all paths are relative to SuperColony API
      if (authToken !== AUTH_PENDING_TOKEN) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      try {
        const res = await fetchImpl(url, { ...options, headers });
        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        return { ok: res.ok, status: res.status, data };
      } catch (err) {
        return { ok: false, status: 0, data: (err as Error).message };
      }
    },

    async signAndBroadcast(txData: unknown): Promise<{ hash: string }> {
      const result = await (demos as any).sendTransaction(txData);
      const hash = result.hash ?? result.txHash;
      if (!hash) {
        throw new Error("Transaction broadcast succeeded but returned no hash");
      }
      return { hash };
    },

    getDemos(): Demos {
      return demos;
    },
  };
}
