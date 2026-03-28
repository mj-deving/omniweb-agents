// Client + proof utilities
export {
  createSkillDojoClient,
  type SkillDojoClient,
  type SkillDojoClientConfig,
  type SkillDojoResponse,
} from "../../lib/network/skill-dojo-client.js";
export { extractProofs, type NormalizedProof } from "../../lib/network/skill-dojo-proof.js";

// Types
export * from "./types.js";

// Plugin factory
export { createSkillDojoPlugin } from "./plugin.js";

// DataProvider adapters
export { createDefiAgentProvider } from "./defi-agent.js";
export { createPredictionMarketProvider } from "./prediction-market.js";
export { createNetworkMonitorProvider } from "./network-monitor.js";
export { createAddressMonitoringProvider } from "./address-monitoring.js";
export { createChainOperationsProvider } from "./chain-operations.js";
export { createSolanaOperationsProvider } from "./solana-operations.js";
export { createTonOperationsProvider } from "./ton-operations.js";
export { createNearOperationsProvider } from "./near-operations.js";
export { createBitcoinOperationsProvider } from "./bitcoin-operations.js";
export { createCosmosOperationsProvider } from "./cosmos-operations.js";
export { createSdkSetupProvider } from "./sdk-setup.js";

// Chain ops factory (for custom chain adapters)
export { createChainOpsProvider } from "./chain-ops-factory.js";

// Action adapters
export { createIdentityAction } from "./identity-agent.js";
export { createTlsnotaryAction } from "./tlsnotary-attestation.js";
export { createMultiStepOperationsAction } from "./multi-step-operations.js";
export { createDemosWalletAction } from "./demos-wallet.js";
