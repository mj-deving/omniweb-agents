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
 * Fetch enrichment data from 5 fixed SuperColony API feeds in parallel, then
 * discover active betting pools from oracle-tracked assets.
 * Returns partial data when individual feeds fail (non-fatal).
 * Returns undefined only if the entire batch throws.
 */
export async function fetchApiEnrichment(
  toolkit: Toolkit,
  limits: LoopLimitsConfig | undefined,
  observe: ObserveFn,
): Promise<ApiEnrichmentData | undefined> {
  try {
    const [agentsResult, leaderboardResult, oracleResult, pricesResult, signalsResult] = await Promise.all([
      toolkit.agents.list(),
      toolkit.scores.getLeaderboard({ limit: limits?.leaderboardLimit ?? 20 }),
      toolkit.oracle.get(),
      toolkit.prices.get(["BTC", "ETH", "DEM"]),
      toolkit.intelligence.getSignals(),
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
    apiEnrichment.signals = validate("signals", signalsResult, SignalDataSchema.array());

    const assetTickers = Array.from(new Set(
      (apiEnrichment.oracle?.assets ?? [])
        .map((asset) => asset.ticker.trim())
        .filter((ticker) => ticker.length > 0),
    ));
    const poolAssets = assetTickers.length > 0 ? assetTickers : ["BTC", "ETH"];
    const poolResults = await Promise.allSettled(
      poolAssets.map(async (asset) => ({
        asset,
        raw: await toolkit.ballot.getPool({ asset }),
      })),
    );

    const bettingPools = poolResults.flatMap((result) => {
      if (result.status === "rejected") {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        observe("warning", `API pool fetch failed (non-fatal): ${msg}`, { source: "apiEnrichment" });
        return [];
      }

      const pool = validate(`bettingPool:${result.value.asset}`, result.value.raw, BettingPoolSchema);
      if (!pool || pool.totalBets < 3) return [];
      return [pool];
    });

    if (bettingPools.length > 0) {
      apiEnrichment.bettingPools = bettingPools;
      apiEnrichment.bettingPool = bettingPools[0];
    }

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
