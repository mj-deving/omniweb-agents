/**
 * API Enrichment — fetches supplemental data from SuperColony API.
 *
 * Extracted from cli/v3-loop-sense.ts to make enrichment available to both
 * the v3-loop (sentinel sessions) and the agent-loop (templates).
 * All imports are toolkit-safe (ADR-0002 compliant).
 */

import type { ApiEnrichmentData, LoopLimitsConfig } from "./strategy/types.js";
import type { Toolkit } from "./primitives/types.js";
import {
  LeaderboardResultSchema,
  OracleResultSchema,
  PriceDataSchema,
  SignalDataSchema,
  BettingPoolSchema,
  AgentListSchema,
} from "./supercolony/api-schemas.js";

export type ObserveFn = (type: string, msg: string, meta?: Record<string, unknown>) => void;

/**
 * Fetch enrichment data from 6 SuperColony API feeds in parallel.
 * Returns partial data when individual feeds fail (non-fatal).
 * Returns undefined only if the entire batch throws.
 */
export async function fetchApiEnrichment(
  toolkit: Toolkit,
  limits: LoopLimitsConfig | undefined,
  observe: ObserveFn,
): Promise<ApiEnrichmentData | undefined> {
  try {
    const [agentsResult, leaderboardResult, oracleResult, pricesResult, signalsResult, bettingPoolResult] = await Promise.all([
      toolkit.agents.list(),
      toolkit.scores.getLeaderboard({ limit: limits?.leaderboardLimit ?? 20 }),
      toolkit.oracle.get(),
      toolkit.prices.get(["BTC", "ETH", "DEM"]),
      toolkit.intelligence.getSignals(),
      toolkit.ballot.getPool({ asset: "BTC" }),
    ]);

    const apiEnrichment: ApiEnrichmentData = {};

    const validate = <T>(
      name: string,
      raw: { ok: true; data: unknown } | { ok: false; [k: string]: unknown } | null,
      schema: { safeParse: (d: unknown) => { success: boolean; data?: T; error?: { message: string } } },
    ): T | undefined => {
      if (!raw || !raw.ok) return undefined;
      const r = schema.safeParse(raw.data);
      if (r.success) return r.data as T;
      observe("warning", `API schema validation failed: ${name}`, { source: "apiEnrichment", error: r.error?.message });
      return undefined;
    };

    const agentList = validate("agents", agentsResult, AgentListSchema);
    if (agentList) apiEnrichment.agentCount = agentList.agents.length;

    apiEnrichment.leaderboard = validate("leaderboard", leaderboardResult, LeaderboardResultSchema);
    apiEnrichment.oracle = validate("oracle", oracleResult, OracleResultSchema);
    apiEnrichment.prices = validate("prices", pricesResult, PriceDataSchema.array());
    apiEnrichment.bettingPool = validate("bettingPool", bettingPoolResult, BettingPoolSchema);
    apiEnrichment.signals = validate("signals", signalsResult, SignalDataSchema.array());

    const enrichmentKeys = Object.keys(apiEnrichment);
    if (enrichmentKeys.length > 0) {
      observe("insight", `API enrichment: ${enrichmentKeys.length} feeds (${enrichmentKeys.join(", ")})`, {
        source: "apiEnrichment",
        feeds: enrichmentKeys,
      });
    }

    return apiEnrichment;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    observe("warning", `API enrichment batch failed (non-fatal): ${msg}`, { source: "apiEnrichment" });
    return undefined;
  }
}
