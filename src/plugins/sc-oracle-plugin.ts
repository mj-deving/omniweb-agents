/**
 * SC Oracle Plugin — sentiment, prices, and Polymarket data from SuperColony oracle.
 *
 * Thin DataProvider wrapper around GET /api/oracle.
 */

import type { FrameworkPlugin, DataProvider, ProviderResult } from "../types.js";
import type { SCDataPluginConfig } from "./sc-prices-plugin.js";

export function createSCOraclePlugin(config: SCDataPluginConfig): FrameworkPlugin {
  const { apiBaseUrl, getAuthHeaders } = config;
  const baseUrl = new URL(`${apiBaseUrl}/api/oracle`);

  const oracleProvider: DataProvider = {
    name: "sc-oracle",
    description: "Sentiment, prices, and Polymarket data from SuperColony oracle",

    async fetch(_topic: string, options?: Record<string, unknown>): Promise<ProviderResult> {
      try {
        const headers = await getAuthHeaders();
        const url = new URL(baseUrl);
        if (options?.asset && typeof options.asset === "string") {
          url.searchParams.set("asset", options.asset);
        }

        const response = await globalThis.fetch(url.toString(), { headers });
        if (!response.ok) {
          return {
            ok: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            source: "sc-oracle-plugin",
          };
        }

        const data: unknown = await response.json();
        return { ok: true, data, source: "sc-oracle-plugin" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, source: "sc-oracle-plugin" };
      }
    },
  };

  return {
    name: "sc-oracle",
    version: "1.0.0",
    description: "Sentiment, prices, and Polymarket data from SuperColony oracle",
    hooks: {},
    providers: [oracleProvider],
    evaluators: [],
    actions: [],
  };
}
