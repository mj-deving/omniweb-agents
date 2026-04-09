/**
 * Engagement Optimizer — Strategy-driven observe.
 * Learn (colony API) + Share (source pipeline) evidence streams.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapFeedPosts, buildColonyStateFromFeed } from "../../../src/toolkit/agent-loop.js";
import { loadStrategyConfig } from "../../../src/toolkit/strategy/config-loader.js";
import { strategyObserve } from "../../../src/toolkit/observe/observe-router.js";
import type { SourceDeps } from "../../../src/toolkit/observe/observe-router.js";
import type { ObserveResult } from "../../../src/toolkit/agent-loop.js";
import type { Toolkit } from "../../../src/toolkit/primitives/types.js";

const RECENT_LIMIT = 100;

export async function learnFirstObserve(
  toolkit: Toolkit,
  ourAddress: string,
  strategyPath?: string,
  sourceDeps?: SourceDeps,
): Promise<ObserveResult> {
  const resolvedPath = strategyPath ?? resolve(import.meta.dirname, "strategy.yaml");
  const strategyYaml = readFileSync(resolvedPath, "utf-8");
  const config = loadStrategyConfig(strategyYaml);

  const { evidence, apiEnrichment, prefetched } = await strategyObserve(toolkit, config, sourceDeps);

  const recentResult = prefetched.recentPosts ?? await toolkit.feed.getRecent({ limit: RECENT_LIMIT });
  const recentPosts = mapFeedPosts(recentResult as any);
  const colonyState = buildColonyStateFromFeed(recentPosts, ourAddress);

  return { colonyState, evidence, context: { apiEnrichment } };
}
