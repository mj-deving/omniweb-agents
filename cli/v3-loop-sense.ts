/**
 * v3-loop-sense.ts — SENSE phase data-gathering logic.
 *
 * Extracted from v3-loop.ts to keep the orchestrator lean.
 * Handles: colony sync, chain ingestion, proof ingestion, source fetch,
 * SSE feed, strategy sense, API enrichment, and calibration.
 */

import { toErrorMessage } from "../src/toolkit/util/errors.js";
import {
  ingestChainPostsIntoColonyDb,
} from "./v3-loop-helpers.js";
import type { AgentConfig } from "../src/lib/agent-config.js";
import type { AgentSourceView } from "../src/lib/sources/catalog.js";
import type { AvailableEvidence } from "../src/toolkit/colony/available-evidence.js";
import type { ApiEnrichmentData, LoopLimitsConfig } from "../src/toolkit/strategy/types.js";
import { strategyObserve, fetchSourceEvidence } from "../src/toolkit/observe/observe-router.js";
import { loadStrategyConfig } from "../src/toolkit/strategy/config-loader.js";
import { readFileSync } from "node:fs";
import type { SuperColonyApiClient } from "../src/toolkit/supercolony/api-client.js";
import type { AutoDataSource } from "../src/toolkit/data-source.js";
import type { Toolkit } from "../src/toolkit/primitives/index.js";
import { sense, computeAutoCalibration, type StrategyBridge } from "./v3-strategy-bridge.js";
import { refreshAgentProfiles } from "../src/toolkit/colony/intelligence.js";
import { deriveIntentsFromTopics, deriveIntentsFromSignalTopics, selectSourcesByIntent } from "../src/lib/pipeline/source-scanner.js";
import { filterHealthySources } from "../src/toolkit/sources/lifecycle.js";

export interface SenseWorkDeps {
  demos: any;
  bridge: StrategyBridge;
  dataSource: AutoDataSource;
  toolkit: Toolkit;
  apiClient: SuperColonyApiClient;
  authToken: string | null;
  authenticatedApiCall: (path: string, options?: RequestInit) => Promise<{ ok: boolean; data?: unknown }>;
  limits: LoopLimitsConfig | undefined;
  agentConfig: AgentConfig;
  getSourceView: () => AgentSourceView;
  observe: (type: string, message: string, meta?: Record<string, unknown>) => void;
  runSubprocess: (script: string, args: string[], label: string) => Promise<unknown>;
  flags: { agent: string; env: string };
}

export interface SenseWorkResult {
  scanResult: unknown;
  senseResult: ReturnType<typeof sense>;
  apiEnrichment: ApiEnrichmentData | undefined;
  calibration: ReturnType<typeof computeAutoCalibration>;
  /** Source evidence from signal-driven fetch via fetchSourceEvidence. */
  sourceEvidence: AvailableEvidence[];
}

/**
 * Executes the SENSE phase data-gathering work.
 * Colony sync → scan-feed → chain ingestion → proofs → sources → SSE → strategy sense → enrichment → calibration.
 */
export async function runSenseWork(deps: SenseWorkDeps): Promise<SenseWorkResult> {
  const { bridge, dataSource, toolkit, limits, observe } = deps;

  // Colony sync from API
  try {
    const { syncColonyFromApi } = await import("../src/toolkit/colony/api-backfill.js");
    const syncStats = await syncColonyFromApi(bridge.db, deps.apiClient, {
      onProgress: (s) => {
        if (s.pages % 50 === 0 && s.pages > 0) {
          observe("insight", `Colony sync: page ${s.pages}, ${s.inserted} new, ${s.duplicates} existing`, { source: "v3-loop:colonySync" });
        }
      },
    });
    if (syncStats.inserted > 0) {
      observe("insight", `Colony sync: ${syncStats.inserted} new posts from API (${syncStats.pages} pages)`, {
        source: "v3-loop:colonySync",
        ...syncStats,
      });
    }
  } catch (err) {
    observe("warning", `Colony sync failed: ${err instanceof Error ? err.message : String(err)}`, { source: "v3-loop:colonySync" });
  }

  // M2: DB growth monitoring — warn if colony DB exceeds 500MB
  try {
    const { statSync } = await import("node:fs");
    const dbPath = (bridge.db as any).name;
    if (typeof dbPath === "string") {
      const dbSizeMB = Math.round(statSync(dbPath).size / (1024 * 1024));
      if (dbSizeMB > 500) {
        observe("warning", `Colony DB size: ${dbSizeMB}MB exceeds 500MB threshold`, {
          source: "v3-loop:dbGrowth", dbSizeMB,
        });
      }
    }
  } catch { /* non-fatal — skip size check if path unavailable */ }

  // Run scan-feed, chain ingestion, proof ingestion, and agent profiles in parallel
  // Colony API sync above already provides reads (ADR-0018); chain fetch is backup
  const [scanSettled, chainSettled, ...parallelResults] = await Promise.allSettled([
    deps.runSubprocess(
      "cli/scan-feed.ts",
      ["--agent", deps.flags.agent, "--json", "--env", deps.flags.env],
      "scan-feed",
    ),
    (async () => {
      const chainPosts = await dataSource.getRecentPosts(limits?.recentPostsFetchLimit ?? 500);
      await ingestChainPostsIntoColonyDb(bridge.db, chainPosts, observe);
    })(),
    (async () => {
      try {
        const { createChainReaderFromSdk } = await import("../src/toolkit/colony/proof-ingestion-rpc-adapter.js");
        const { ingestProofs } = await import("../src/toolkit/colony/proof-ingestion.js");
        const chainReader = createChainReaderFromSdk(deps.demos, { concurrency: limits?.proofIngestionConcurrency ?? 5 });
        const ingestionResult = await ingestProofs(bridge.db, chainReader, { limit: limits?.proofIngestionLimit ?? 20 });
        if (ingestionResult.resolved > 0 || ingestionResult.failed > 0) {
          observe("insight", `Proof ingestion: ${ingestionResult.verified} verified, ${ingestionResult.failed} failed, ${ingestionResult.skipped} skipped`, {
            source: "v3-loop:proofIngestion",
            ...ingestionResult,
          });
        }
      } catch (err: unknown) {
        observe("warning", `Proof ingestion failed (non-fatal): ${toErrorMessage(err)}`, {
          source: "v3-loop:proofIngestion",
        });
      }
    })(),
    (async () => {
      try {
        const profilesRefreshed = refreshAgentProfiles(bridge.db);
        if (profilesRefreshed > 0) {
          observe("insight", `Agent profiles refreshed: ${profilesRefreshed} updated`, {
            source: "v3-loop:intelligence",
            profilesRefreshed,
          });
        }
      } catch (err: unknown) {
        observe("warning", `Agent profile refresh failed: ${toErrorMessage(err)}`, {
          source: "v3-loop:intelligence",
        });
      }
    })(),
  ]);
  // Extract scan result; log rejections from all parallel operations
  const scanResult = scanSettled.status === "fulfilled" ? scanSettled.value : undefined;
  for (const r of [scanSettled, chainSettled, ...parallelResults]) {
    if (r.status === "rejected") {
      observe("warning", `Parallel sense operation rejected: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`, { source: "v3-loop:parallelSense" });
    }
  }

  // API Enrichment via strategy-driven observe — single-fetch architecture.
  // Prefetches all API data once and builds enrichment from the same results.
  // Colony signal topics from enrichment drive source fetch (signal-driven, not config-driven).
  let apiEnrichment: ApiEnrichmentData | undefined;
  try {
    const strategyYaml = readFileSync(deps.agentConfig.paths.strategyYaml, "utf-8");
    const strategyConfig = loadStrategyConfig(strategyYaml);
    const result = await strategyObserve(toolkit, strategyConfig);
    apiEnrichment = result.apiEnrichment;
  } catch (err) {
    observe("warning", `Strategy observe failed (non-fatal): ${toErrorMessage(err)}`, { source: "v3-loop:apiEnrichment" });
  }

  // Fetch sources via fetchSourceEvidence — signal-driven source selection.
  // Intents derived from BOTH agent config topics AND colony signal topics
  // (signal topics come from the strategyObserve enrichment above).
  const sourceView = deps.getSourceView();
  let sourceEvidence: AvailableEvidence[] = [];
  try {
    const configIntents = deps.agentConfig.topics?.primary?.length
      ? deriveIntentsFromTopics(deps.agentConfig.topics)
      : [];

    // Extract signal topics from API enrichment and derive additional intents
    const signalTopics = apiEnrichment?.signals
      ?.filter(s => s.topic)
      .map(s => s.topic) ?? [];
    const knownDomainTags = sourceView?.index?.byDomainTag
      ? new Set(sourceView.index.byDomainTag.keys())
      : undefined;
    const signalIntents = deriveIntentsFromSignalTopics(signalTopics, knownDomainTags);

    if (signalIntents.length > 0) {
      observe("insight", `Signal-driven sources: ${signalIntents.length} signal topics added to source selection`, {
        source: "v3-loop:sourceFetch",
        signalTopics,
      });
    }

    const allIntents = [...configIntents, ...signalIntents];
    const selectedSources = allIntents.flatMap((intent) =>
      selectSourcesByIntent(intent, sourceView).slice(0, limits?.sourcesPerIntent ?? 5),
    );

    // Deduplicate sources (config and signal intents may select overlapping sources)
    const seenSourceIds = new Set<string>();
    const dedupedSources = selectedSources.filter(s => {
      if (seenSourceIds.has(s.id)) return false;
      seenSourceIds.add(s.id);
      return true;
    });

    // Skip unhealthy sources — degraded/stale get auto-demoted by lifecycle after enough failures
    const healthyBeforeUrlDedup = filterHealthySources(dedupedSources);

    // URL-level dedup — multiple signal topics may resolve to the same endpoint
    const seenUrls = new Set<string>();
    const healthySources = healthyBeforeUrlDedup.filter(s => {
      if (seenUrls.has(s.url)) return false;
      seenUrls.add(s.url);
      return true;
    });
    const skippedCount = dedupedSources.length - healthySources.length;
    if (skippedCount > 0) {
      observe("insight", `Source health filter: skipped ${skippedCount} unhealthy source(s)`, {
        source: "v3-loop:sourceHealth",
        skipped: skippedCount,
        total: dedupedSources.length,
        healthy: healthySources.length,
      });
    }

    // Bump concurrency to 10 when signal-driven sources are included
    const effectiveConcurrency = signalIntents.length > 0
      ? Math.max(limits?.sourceFetchConcurrency ?? 3, 10)
      : limits?.sourceFetchConcurrency ?? 3;

    // Use fetchSourceEvidence: fetches sources into DB cache + computes AvailableEvidence
    if (healthySources.length > 0) {
      sourceEvidence = await fetchSourceEvidence({
        db: bridge.db,
        sourceView: { ...sourceView, sources: healthySources },
        observe,
        budgetMs: limits?.sourceFetchBudgetMs ?? 15_000,
        concurrency: effectiveConcurrency,
      });

      if (sourceEvidence.length > 0) {
        observe("insight", `Source evidence: ${sourceEvidence.length} items from ${healthySources.length} sources`, {
          source: "v3-loop:sourceFetch",
          evidenceCount: sourceEvidence.length,
          sourcesSelected: healthySources.length,
        });
      }
    }
  } catch (err) {
    observe("warning", `Source fetch failed (non-fatal): ${toErrorMessage(err)}`, { source: "v3-loop:sourceFetch" });
  }

  // SSE Feed (optional, time-bounded)
  if (deps.authToken) {
    try {
      const { readSSESense } = await import("./sse-sense-adapter.js");
      const sseResult = await readSSESense(
        bridge.db,
        deps.authenticatedApiCall,
        observe,
        { timeoutMs: limits?.sseTimeoutMs ?? 5_000, maxEvents: limits?.sseMaxEvents ?? 100 },
      );
      if (sseResult.postsIngested > 0) {
        observe("insight", `SSE sense: ${sseResult.postsIngested} new posts ingested (${sseResult.source})`, {
          source: "v3-loop:sseSense",
          sseSource: sseResult.source,
          postsReceived: sseResult.postsReceived,
          postsIngested: sseResult.postsIngested,
          elapsedMs: sseResult.elapsedMs,
        });
      }
    } catch (err: unknown) {
      observe("warning", `SSE sense failed (non-fatal): ${toErrorMessage(err)}`, {
        source: "v3-loop:sseSense",
      });
    }
  }

  const senseResult = sense(bridge, sourceView);

  // Calibration
  const calibration = computeAutoCalibration(bridge);

  return { scanResult, senseResult, apiEnrichment, calibration, sourceEvidence };
}

