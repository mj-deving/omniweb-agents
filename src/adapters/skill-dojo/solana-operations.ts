/**
 * Skill Dojo adapter: solana-operations
 *
 * Solana devnet balance, transfer, and message signing.
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";
import { createChainOpsProvider } from "./chain-ops-factory.js";

export function createSolanaOperationsProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return createChainOpsProvider(
    "solana-operations",
    "solana",
    "Solana devnet balance, transfer, and message signing",
    config,
  );
}
