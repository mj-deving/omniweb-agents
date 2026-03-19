/**
 * Skill Dojo adapter: near-operations
 *
 * NEAR protocol balance, transfer, and message signing.
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";
import { createChainOpsProvider } from "./chain-ops-factory.js";

export function createNearOperationsProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return createChainOpsProvider(
    "near-operations",
    "near",
    "NEAR protocol balance, transfer, and message signing",
    config,
  );
}
