/**
 * Skill Dojo adapter: ton-operations
 *
 * TON network balance, transfer, and message signing.
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig } from "./types.js";
import { createChainOpsProvider } from "./chain-ops-factory.js";

export function createTonOperationsProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return createChainOpsProvider(
    "ton-operations",
    "ton",
    "TON network balance, transfer, and message signing",
    config,
  );
}
