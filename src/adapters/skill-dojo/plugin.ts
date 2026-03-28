/**
 * Skill Dojo plugin factory — assembles all 15 adapters into a FrameworkPlugin.
 *
 * Usage:
 *   const client = createSkillDojoClient();
 *   const plugin = createSkillDojoPlugin(client);
 *   registry.register(plugin);
 */

import type { FrameworkPlugin } from "../../types.js";
import type { SkillDojoClient } from "../../lib/network/skill-dojo-client.js";
import type { SkillAdapterConfig } from "./types.js";

// DataProvider adapters
import { createDefiAgentProvider } from "./defi-agent.js";
import { createPredictionMarketProvider } from "./prediction-market.js";
import { createNetworkMonitorProvider } from "./network-monitor.js";
import { createAddressMonitoringProvider } from "./address-monitoring.js";
import { createChainOperationsProvider } from "./chain-operations.js";
import { createSolanaOperationsProvider } from "./solana-operations.js";
import { createTonOperationsProvider } from "./ton-operations.js";
import { createNearOperationsProvider } from "./near-operations.js";
import { createBitcoinOperationsProvider } from "./bitcoin-operations.js";
import { createCosmosOperationsProvider } from "./cosmos-operations.js";
import { createSdkSetupProvider } from "./sdk-setup.js";

// Action adapters
import { createIdentityAction } from "./identity-agent.js";
import { createTlsnotaryAction } from "./tlsnotary-attestation.js";
import { createMultiStepOperationsAction } from "./multi-step-operations.js";
import { createDemosWalletAction } from "./demos-wallet.js";

export function createSkillDojoPlugin(
  client: SkillDojoClient,
): FrameworkPlugin {
  const config: SkillAdapterConfig = { client };

  return {
    name: "skill-dojo",
    version: "1.0.0",
    description:
      "Demos Skill Dojo integration — 15 skills across 11 chains",
    providers: [
      createDefiAgentProvider(config),
      createPredictionMarketProvider(config),
      createNetworkMonitorProvider(config),
      createAddressMonitoringProvider(config),
      createChainOperationsProvider(config),
      createSolanaOperationsProvider(config),
      createTonOperationsProvider(config),
      createNearOperationsProvider(config),
      createBitcoinOperationsProvider(config),
      createCosmosOperationsProvider(config),
      createSdkSetupProvider(config),
    ],
    actions: [
      createIdentityAction(config),
      createTlsnotaryAction(config),
      createMultiStepOperationsAction(config),
      createDemosWalletAction(config),
    ],
  };
}
