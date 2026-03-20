/**
 * SC Predictions Markets Plugin — Polymarket prediction market odds from SuperColony.
 *
 * Thin DataProvider wrapper around GET /api/predictions/markets.
 */

import type { FrameworkPlugin, DataProvider, ProviderResult } from "../types.js";
import type { SCDataPluginConfig } from "./sc-prices-plugin.js";

export function createSCPredictionsMarketsPlugin(config: SCDataPluginConfig): FrameworkPlugin {
  const { apiBaseUrl, getAuthHeaders } = config;
  const baseUrl = new URL(`${apiBaseUrl}/api/predictions/markets`);

  const marketsProvider: DataProvider = {
    name: "sc-predictions-markets",
    description: "Polymarket prediction market odds from SuperColony",

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
            source: "sc-predictions-markets-plugin",
          };
        }

        const data: unknown = await response.json();
        return { ok: true, data, source: "sc-predictions-markets-plugin" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, source: "sc-predictions-markets-plugin" };
      }
    },
  };

  return {
    name: "sc-predictions-markets",
    version: "1.0.0",
    description: "Polymarket prediction market odds from SuperColony",
    hooks: {},
    providers: [marketsProvider],
    evaluators: [],
    actions: [],
  };
}
