/**
 * Skill Dojo adapter: network-monitor
 *
 * Demos network health, mempool, and event monitoring.
 * Modes: health, mempool, events
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig, SkillProviderResult } from "./types.js";
import { extractProofs } from "../../lib/skill-dojo-proof.js";

export type NetworkMonitorMode = "health" | "mempool" | "events";

export function createNetworkMonitorProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return {
    name: "skill-dojo:network-monitor",
    description: "Demos network health, mempool, and event monitoring",
    async fetch(
      _topic: string,
      options?: Record<string, unknown>,
    ): Promise<SkillProviderResult> {
      const params = {
        mode: (options?.mode as NetworkMonitorMode) || "health",
      };

      const response = await config.client.execute(
        "network-monitor",
        params,
      );
      if (!response.ok) {
        return {
          ok: false,
          error: response.error || "Skill execution failed",
          source: "skill-dojo:network-monitor",
        };
      }

      return {
        ok: true,
        data: response.result?.data,
        source: "skill-dojo:network-monitor",
        proofs: extractProofs(response.result?.data),
        executionTimeMs: response.executionTimeMs,
        skillId: "network-monitor",
        metadata: { timestamp: response.result?.timestamp },
      };
    },
  };
}
