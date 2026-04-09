/**
 * Security Sentinel — Strategy-driven observe with external security sources.
 *
 * Base: compiler-generated strategyObserve (single-fetch, no duplicate calls).
 * Custom: NVD + GHSA fetchers appended to evidence array.
 *
 * Paths adjusted for templates/security-sentinel/.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapFeedPosts, buildColonyStateFromFeed } from "../../src/toolkit/agent-loop.js";
import { loadStrategyConfig } from "../../src/toolkit/strategy/config-loader.js";
import { strategyObserve } from "../../src/toolkit/observe/observe-router.js";
import type { ObserveResult } from "../../src/toolkit/agent-loop.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";
import { fetchNvd, fetchGhsa } from "./security-sources.js";

const RECENT_LIMIT = 100;

export async function learnFirstObserve(
  toolkit: Toolkit,
  ourAddress: string,
  strategyPath?: string,
): Promise<ObserveResult> {
  const resolvedPath = strategyPath ?? resolve(import.meta.dirname, "strategy.yaml");
  const strategyYaml = readFileSync(resolvedPath, "utf-8");
  const config = loadStrategyConfig(strategyYaml);

  // Run strategy observe and external security fetchers in parallel
  const [strategyResult, nvdEvidence, ghsaEvidence] = await Promise.all([
    strategyObserve(toolkit, config),
    fetchNvd(),
    fetchGhsa(),
  ]);

  const { evidence, apiEnrichment, prefetched } = strategyResult;

  // Append external security evidence
  const allEvidence = [...evidence, ...nvdEvidence, ...ghsaEvidence];

  // Build colony state from recent posts
  const recentResult = prefetched.recentPosts ?? await toolkit.feed.getRecent({ limit: RECENT_LIMIT });
  const recentPosts = mapFeedPosts(recentResult as any);
  const colonyState = buildColonyStateFromFeed(recentPosts, ourAddress);

  return { colonyState, evidence: allEvidence, context: { apiEnrichment } };
}
