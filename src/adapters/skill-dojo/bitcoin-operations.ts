/**
 * Skill Dojo adapter: bitcoin-operations
 *
 * Bitcoin balance, transfer, and message signing.
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";
import { createChainOpsProvider } from "./chain-ops-factory.js";

export function createBitcoinOperationsProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return createChainOpsProvider(
    "bitcoin-operations",
    "bitcoin",
    "Bitcoin balance, transfer, and message signing",
    config,
  );
}
