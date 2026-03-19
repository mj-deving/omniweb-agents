/**
 * Skill Dojo adapter: defi-agent
 *
 * DAHR-attested DeFi data from Binance, Uniswap V3, Rubic bridge.
 * Modes: order-book, liquidity-balancer, limit-order, bridge-swap
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig, SkillProviderResult } from "./types.js";
import { extractProofs } from "../../lib/skill-dojo-proof.js";

export type DefiAgentMode =
  | "order-book"
  | "liquidity-balancer"
  | "limit-order"
  | "bridge-swap";

export interface DefiAgentParams {
  mode: DefiAgentMode;
  pair?: string;
  source?: string;
  depth?: number;
  targetPrice?: number;
  orderType?: string;
  amount?: number;
  fromChain?: string;
  toChain?: string;
  fromToken?: string;
  toToken?: string;
}

export function createDefiAgentProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return {
    name: "skill-dojo:defi-agent",
    description:
      "DAHR-attested DeFi data from Binance, Uniswap V3, Rubic bridge",
    async fetch(
      _topic: string,
      options?: Record<string, unknown>,
    ): Promise<SkillProviderResult> {
      const params: DefiAgentParams = {
        mode: (options?.mode as DefiAgentMode) || "order-book",
        pair: (options?.pair as string) || "ETH/USDT",
        source: (options?.source as string) || "both",
        depth: (options?.depth as number) || 5,
        ...(options?.targetPrice != null && {
          targetPrice: options.targetPrice as number,
        }),
        ...(options?.orderType != null && {
          orderType: options.orderType as string,
        }),
        ...(options?.amount != null && { amount: options.amount as number }),
        ...(options?.fromChain != null && {
          fromChain: options.fromChain as string,
        }),
        ...(options?.toChain != null && { toChain: options.toChain as string }),
        ...(options?.fromToken != null && {
          fromToken: options.fromToken as string,
        }),
        ...(options?.toToken != null && { toToken: options.toToken as string }),
      };

      const response = await config.client.execute(
        "defi-agent",
        params as unknown as Record<string, unknown>,
      );
      if (!response.ok) {
        return {
          ok: false,
          error: response.error || "Skill execution failed",
          source: "skill-dojo:defi-agent",
        };
      }

      return {
        ok: true,
        data: response.result?.data,
        source: "skill-dojo:defi-agent",
        proofs: extractProofs(response.result?.data),
        executionTimeMs: response.executionTimeMs,
        skillId: "defi-agent",
        metadata: { timestamp: response.result?.timestamp },
      };
    },
  };
}
