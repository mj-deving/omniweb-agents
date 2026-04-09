/**
 * Universal Learn-first observe function.
 * Used by all templates — the strategy.yaml controls behavior.
 *
 * Two evidence streams:
 * 1. Learn (Colony API) — extractors for signals, feed, oracle, etc.
 * 2. Share (Source pipeline) — external URLs for attestation evidence.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapFeedPosts, buildColonyStateFromFeed } from "../agent-loop.js";
import { loadStrategyConfig } from "../strategy/config-loader.js";
import { strategyObserve } from "./observe-router.js";
import type { SourceDeps } from "./observe-router.js";
import type { ObserveResult } from "../agent-loop.js";
import type { Toolkit } from "../primitives/types.js";

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
  const resolvedPath = strategyPath ?? resolve(process.cwd(), "strategy.yaml");
  const strategyYaml = readFileSync(resolvedPath, "utf-8");
  const config = loadStrategyConfig(strategyYaml);

  const { evidence, apiEnrichment, prefetched } = await strategyObserve(toolkit, config, sourceDeps);

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
