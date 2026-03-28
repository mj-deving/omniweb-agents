/**
 * Skill Dojo adapter: prediction-market
 *
 * Multi-platform prediction market aggregation with DAHR attestation.
 * Modes: compare-markets, aggregate-oracle, conditional-bet
 */

import type { DataProvider } from "../../types.js";
import type { SkillAdapterConfig, SkillProviderResult } from "./types.js";
import { extractProofs } from "../../lib/network/skill-dojo-proof.js";

export type PredictionMarketMode =
  | "compare-markets"
  | "aggregate-oracle"
  | "conditional-bet";

export type PredictionMarketCategory =
  | "all"
  | "politics"
  | "crypto"
  | "sports"
  | "finance"
  | "science"
  | "entertainment";

export interface PredictionMarketParams {
  mode: PredictionMarketMode;
  category?: PredictionMarketCategory;
  strategy?: string;
  betAmount?: number;
  broadcast?: boolean;
}

export function createPredictionMarketProvider(
  config: SkillAdapterConfig,
): DataProvider {
  return {
    name: "skill-dojo:prediction-market",
    description:
      "Multi-platform prediction market aggregation with DAHR attestation",
    async fetch(
      _topic: string,
      options?: Record<string, unknown>,
    ): Promise<SkillProviderResult> {
      const params: PredictionMarketParams = {
        mode:
          (options?.mode as PredictionMarketMode) || "compare-markets",
        category:
          (options?.category as PredictionMarketCategory) || "all",
        ...(options?.strategy != null && {
          strategy: options.strategy as string,
        }),
        ...(options?.betAmount != null && {
          betAmount: options.betAmount as number,
        }),
        ...(options?.broadcast != null && {
          broadcast: options.broadcast as boolean,
        }),
      };

      const response = await config.client.execute(
        "prediction-market",
        params as unknown as Record<string, unknown>,
      );
      if (!response.ok) {
        return {
          ok: false,
          error: response.error || "Skill execution failed",
          source: "skill-dojo:prediction-market",
        };
      }

      return {
        ok: true,
        data: response.result?.data,
        source: "skill-dojo:prediction-market",
        proofs: extractProofs(response.result?.data),
        executionTimeMs: response.executionTimeMs,
        skillId: "prediction-market",
        metadata: { timestamp: response.result?.timestamp },
      };
    },
  };
}
