/**
 * Skill Dojo adapter: multi-step-operations (Action — STUB)
 *
 * DemosWork ESM bug blocks local execution. This adapter exists
 * for type completeness but always returns a not-available error.
 *
 * Modes: batch, conditional, cross-chain-balancer
 */

import type { Action } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";

export type MultiStepMode = "batch" | "conditional" | "cross-chain-balancer";

export function createMultiStepOperationsAction(
  _config: SkillAdapterConfig,
): Action {
  return {
    name: "skill-dojo:multi-step-operations",
    description:
      "DemosWork multi-step operations (STUB — blocked by DemosWork ESM bug)",
    async validate() {
      return false;
    },
    async execute() {
      return {
        success: false,
        error:
          "multi-step-operations requires DemosWork which has an ESM bug — not available in Node.js agent runtime",
      };
    },
  };
}
