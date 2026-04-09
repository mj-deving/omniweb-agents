/**
 * Base Template — Strategy-driven observe function.
 *
 * Two evidence streams merged into one:
 * 1. Learn (Colony API) — signals, feed, oracle, leaderboard, etc.
 * 2. Share (Source pipeline) — external URLs fetched, cached, attestation-ready.
 *
 * The strategy.yaml controls which categories are active.
 * Source deps are optional — templates work without them (colony-only).
 *
 * Separated from agent.ts for isolated testing without SDK.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapFeedPosts, buildColonyStateFromFeed } from "../../src/toolkit/agent-loop.js";
import { loadStrategyConfig } from "../../src/toolkit/strategy/config-loader.js";
import { strategyObserve } from "../../src/toolkit/observe/observe-router.js";
import type { SourceDeps } from "../../src/toolkit/observe/observe-router.js";
import type { ObserveResult } from "../../src/toolkit/agent-loop.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";

// ── Configuration ──────────────────────────────
const RECENT_LIMIT = 100;

/**
 * Strategy-driven observe: Learn + Share evidence streams.
 *
 * Learn: Colony API extractors run in parallel (signals, feed, oracle, etc.)
 * Share: Source pipeline fetches external URLs for attestation evidence (optional)
 * Both merge into a single AvailableEvidence[] for the strategy engine.
 */
export async function learnFirstObserve(
  toolkit: Toolkit,
  ourAddress: string,
  strategyPath?: string,
  sourceDeps?: SourceDeps,
): Promise<ObserveResult> {
  // Load strategy to determine active evidence categories
  const resolvedPath = strategyPath ?? resolve(import.meta.dirname, "strategy.yaml");
  const strategyYaml = readFileSync(resolvedPath, "utf-8");
  const config = loadStrategyConfig(strategyYaml);

  // Single-fetch: colony API + source pipeline in parallel
  const { evidence, apiEnrichment, prefetched } = await strategyObserve(toolkit, config, sourceDeps);

  // Build colony state from all recent posts
  const recentResult = prefetched.recentPosts ?? await toolkit.feed.getRecent({ limit: RECENT_LIMIT });
  const recentPosts = mapFeedPosts(recentResult as any);
  const colonyState = buildColonyStateFromFeed(recentPosts, ourAddress);

  return {
    colonyState,
    evidence,
    context: {
      apiEnrichment,
    },
  };
}
