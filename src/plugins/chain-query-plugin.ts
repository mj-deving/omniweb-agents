/**
 * Chain Query Plugin — Cross-chain balance and transaction queries.
 *
 * Attempts real RPC queries for cross-chain identity and balance data.
 * Falls back gracefully if XM SDK operations are unavailable.
 */

import type { FrameworkPlugin, DataProvider, ProviderResult } from "../types.js";

export interface ChainQueryPluginConfig {
  rpcUrl: string;
  agentAddress: string;
}

export function createChainQueryPlugin(config: ChainQueryPluginConfig): FrameworkPlugin {
  const { rpcUrl, agentAddress } = config;

  const queryProvider: DataProvider = {
    name: "chain-query",
    description: "Cross-chain balance and transaction queries via Demos RPC",

    async fetch(_topic: string, options?: Record<string, unknown>): Promise<ProviderResult> {
      const address = (typeof options?.address === "string") ? options.address : agentAddress;

      try {
        // Try querying address info (works for Demos-native addresses)
        const body = JSON.stringify({
          jsonrpc: "2.0",
          method: "getAddressInfo",
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
            error: `Chain query RPC unavailable: HTTP ${response.status}`,
            source: "chain-query-plugin",
          };
        }

        const json = await response.json() as { result?: Record<string, unknown>; error?: { message?: string } };

        if (json.error) {
          return {
            ok: false,
            error: `Chain query error: ${json.error.message ?? "unknown"}`,
            source: "chain-query-plugin",
          };
        }

        return {
          ok: true,
          data: { address, ...json.result },
          source: "chain-query-plugin",
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: `Chain query unavailable: ${message}`,
          source: "chain-query-plugin",
        };
      }
    },
  };

  return {
    name: "chain-query",
    version: "1.1.0",
    description: "Cross-chain balance and transaction queries via Demos RPC",
    hooks: {},
    providers: [queryProvider],
    evaluators: [],
    actions: [],
  };
}
