/**
 * Cross-Chain Plugin — chain monitoring and balance queries.
 *
 * Provides DataProviders for querying chain state.
 * Actual cross-chain execution (XM SDK) is deferred — the SDK
 * has untested ESM compatibility issues similar to DemosWork.
 *
 * For now, this plugin provides READ capabilities (balance queries)
 * and logs warnings for WRITE operations (bridge, cross-chain transfer).
 */

import type { FrameworkPlugin, DataProvider } from "../types.js";

export interface CrossChainPluginConfig {
  agentName: string;
  /** RPC URL for Demos chain queries */
  rpcUrl: string;
  /** Agent's Demos address */
  agentAddress: string;
}

/**
 * Create the Cross-Chain Plugin.
 *
 * Provides chain-balances DataProvider. Cross-chain write operations
 * (bridge, XM transfer) are deferred until XM SDK is validated.
 */
export function createCrossChainPlugin(config: CrossChainPluginConfig): FrameworkPlugin {
  const { agentName, rpcUrl, agentAddress } = config;

  const balanceProvider: DataProvider = {
    name: "chain-balances",
    description: "Query DEM balance on Demos chain",
    async fetch(_topic: string): Promise<{ data: unknown; source: string }> {
      // TODO: Query actual balance from RPC when MCP server endpoints are documented
      // For now, returns a placeholder that the runner can override
      return {
        data: { chain: "demos", address: agentAddress, balance: null, rpcUrl },
        source: "cross-chain-plugin:balance-query",
      };
    },
  };

  return {
    name: "cross-chain",
    version: "1.0.0",
    description: `Cross-chain monitoring for ${agentName} (read-only until XM SDK validated)`,

    hooks: {},
    providers: [balanceProvider],
    evaluators: [],
    actions: [],
  };
}
