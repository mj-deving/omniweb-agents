/**
 * Skill Dojo adapter: sdk-setup
 *
 * SDK connectivity check — no params, returns status.
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig, SkillProviderResult } from "./types.js";

export function createSdkSetupProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return {
    name: "skill-dojo:sdk-setup",
    description: "Demos SDK connectivity check",
    async fetch(): Promise<SkillProviderResult> {
      const response = await config.client.execute("sdk-setup", {});
      if (!response.ok) {
        return {
          ok: false,
          error: response.error || "Skill execution failed",
          source: "skill-dojo:sdk-setup",
        };
      }

      return {
        ok: true,
        data: response.result?.data,
        source: "skill-dojo:sdk-setup",
        executionTimeMs: response.executionTimeMs,
        skillId: "sdk-setup",
        metadata: { timestamp: response.result?.timestamp },
      };
    },
  };
}
