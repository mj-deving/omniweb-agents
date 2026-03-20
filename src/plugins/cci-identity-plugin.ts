/**
 * CCI Identity Plugin — Cross-Context Identity management.
 *
 * Attempts real identity queries via Demos RPC.
 * Falls back gracefully if SDK module or RPC is unavailable.
 */

import type { FrameworkPlugin, DataProvider, ProviderResult } from "../types.js";

export interface CCIIdentityPluginConfig {
  rpcUrl: string;
  agentAddress?: string;
}

export function createCCIIdentityPlugin(config: CCIIdentityPluginConfig): FrameworkPlugin {
  const { rpcUrl, agentAddress } = config;

  const identityProvider: DataProvider = {
    name: "cci-identity",
    description: "Cross-Context Identity — linked identities and reputation",

    async fetch(_topic: string, options?: Record<string, unknown>): Promise<ProviderResult> {
      const address = (typeof options?.address === "string") ? options.address : agentAddress;
      if (!address) {
        return { ok: false, error: "No address provided for identity query", source: "cci-identity-plugin" };
      }

      try {
        // Query identities via JSON-RPC (getIdentities is a GCR routine)
        const body = JSON.stringify({
          jsonrpc: "2.0",
          method: "getIdentities",
          params: [address],
          id: 1,
        });
        const response = await globalThis.fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
          return {
            ok: false,
            error: `CCI RPC unavailable: HTTP ${response.status}`,
            source: "cci-identity-plugin",
          };
        }

        const json = await response.json() as {
          result?: { xm?: Record<string, unknown>; web2?: Record<string, unknown> };
          error?: { message?: string };
        };

        if (json.error) {
          return {
            ok: false,
            error: `CCI RPC error: ${json.error.message ?? "unknown"}`,
            source: "cci-identity-plugin",
          };
        }

        return {
          ok: true,
          data: {
            address,
            identities: json.result ?? {},
            hasXm: !!json.result?.xm && Object.keys(json.result.xm).length > 0,
            hasWeb2: !!json.result?.web2 && Object.keys(json.result.web2).length > 0,
          },
          source: "cci-identity-plugin",
        };
      } catch (err) {
        // Silent fail — CCI not available, but don't block agent operation
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: `CCI identity unavailable: ${message}`,
          source: "cci-identity-plugin",
        };
      }
    },
  };

  return {
    name: "cci-identity",
    version: "1.1.0",
    description: "Cross-Context Identity — linked identities and reputation",
    hooks: {},
    providers: [identityProvider],
    evaluators: [],
    actions: [],
  };
}
