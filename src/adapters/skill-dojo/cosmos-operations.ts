/**
 * Skill Dojo adapter: cosmos-operations
 *
 * Cosmos network balance, transfer, and message signing.
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";
import { createChainOpsProvider } from "./chain-ops-factory.js";

export function createCosmosOperationsProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return createChainOpsProvider(
    "cosmos-operations",
    "cosmos",
    "Cosmos network balance, transfer, and message signing",
    config,
  );
}
