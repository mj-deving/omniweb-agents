/**
 * Skill Dojo adapter: address-monitoring
 *
 * On-chain address monitoring and compliance checking.
 * Modes: monitor, compliance
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig, SkillProviderResult } from "./types.js";
import { extractProofs } from "../../lib/network/skill-dojo-proof.js";

export type AddressMonitoringMode = "monitor" | "compliance";
export type AddressMonitoringChain =
  | "auto"
  | "demos"
  | "base-sepolia"
  | "solana-devnet";

export function createAddressMonitoringProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return {
    name: "skill-dojo:address-monitoring",
    description: "On-chain address monitoring and compliance checking",
    async fetch(
      _topic: string,
      options?: Record<string, unknown>,
    ): Promise<SkillProviderResult> {
      const params = {
        mode: (options?.mode as AddressMonitoringMode) || "monitor",
        ...(options?.chain != null && {
          chain: options.chain as AddressMonitoringChain,
        }),
        ...(options?.address != null && {
          address: options.address as string,
        }),
      };

      const response = await config.client.execute(
        "address-monitoring",
        params,
      );
      if (!response.ok) {
        return {
          ok: false,
          error: response.error || "Skill execution failed",
          source: "skill-dojo:address-monitoring",
        };
      }

      return {
        ok: true,
        data: response.result?.data,
        source: "skill-dojo:address-monitoring",
        proofs: extractProofs(response.result?.data),
        executionTimeMs: response.executionTimeMs,
        skillId: "address-monitoring",
        metadata: { timestamp: response.result?.timestamp },
      };
    },
  };
}
