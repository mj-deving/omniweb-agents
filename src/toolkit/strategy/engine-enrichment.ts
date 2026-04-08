/**
 * Enrichment-aware strategy rules (Phase 6a/6b).
 *
 * These rules depend on optional API enrichment data (leaderboard, signals,
 * oracle prices, ballot accuracy). Extracted from engine.ts to keep each
 * module under 300 lines.
 */

import type { DecisionContext, DecisionLog, StrategyConfig } from "./types.js";
import type { AvailableEvidence } from "../colony/available-evidence.js";
import { normalize, getRule, createAction, type EngineCandidate, buildEvidenceIndex } from "./engine-helpers.js";

/**
 * Evaluate enrichment-aware rules and append candidates/considered.
 * Called from decideActions() in engine.ts after core rules have run.
 */
export function evaluateEnrichmentRules(
  config: StrategyConfig,
  context: DecisionContext,
  evidenceIndex: ReturnType<typeof buildEvidenceIndex>,
  candidates: EngineCandidate[],
  considered: DecisionLog["considered"],
  opts?: { maxPublish?: number },
): void {
  const enrichment = context.apiEnrichment;

  // ── engage_novel_agents ─────────────────────────
  const engageNovelRule = getRule(config, "engage_novel_agents");
  if (engageNovelRule && enrichment?.leaderboard) {
    const recentTargets = new Set(
      candidates
        .filter((c) => c.action.type === "ENGAGE")
        .map((c) => normalize(c.action.target ?? "")),
    );

    const recencyThresholdMs = 48 * 60 * 60 * 1000; // 48h — matches resolveAgentToRecentPost
    const recencyCutoff = (context.now ?? new Date()).getTime() - recencyThresholdMs;

    for (const agent of enrichment.leaderboard.agents.slice(0, 10)) {
      if (recentTargets.has(normalize(agent.address))) continue;
      if (agent.bayesianScore < (enrichment.leaderboard.globalAvg ?? 0)) continue;
      if ((context.intelligence?.recentInteractions?.[normalize(agent.address)] ?? 0) > 0) continue;
      if (agent.lastActiveAt < recencyCutoff) continue; // Skip agents inactive >48h

      const action = createAction(
        engageNovelRule,
        `Engage novel high-quality agent ${agent.name ?? agent.address} (score ${agent.bayesianScore.toFixed(1)})`,
        {
          target: agent.address,
          targetType: "agent",
          metadata: {
            bayesianScore: agent.bayesianScore,
            totalPosts: agent.totalPosts,
          },
        },
      );

      candidates.push({ action, rule: engageNovelRule.name });
      considered.push({ action, rule: engageNovelRule.name });
    }
  }

  // ── publish_signal_aligned ──────────────────────
  const signalAlignedRule = getRule(config, "publish_signal_aligned");
  if (signalAlignedRule && enrichment?.signals) {
    const minConfidence = config.enrichment?.minConfidence ?? 70;
    let signalPublishCount = 0;
    const maxSignalPublish = opts?.maxPublish ?? Infinity;

    for (const signal of enrichment.signals) {
      if (signalPublishCount >= maxSignalPublish) break;
      if (signal.trending === false || signal.agentCount < (config.enrichment?.minSignalAgents ?? 5)) continue;
      // WS4: Skip low-confidence signals — score-100 posts come from high-confidence consensus
      if (signal.confidence < minConfidence) continue;

      // Signal topics are long phrases ("DXY USD Liquidity Tightening and Crypto Capital Flows")
      // but evidence index uses short keys ("bitcoin", "defi", "macro").
      // Tokenize the signal topic and find any matching evidence entries.
      const signalTokens = normalize(signal.topic).split(/\s+/).filter((t) => t.length >= 3);
      const matchingEvidence: AvailableEvidence[] = [];
      for (const token of signalTokens) {
        const entries = evidenceIndex.get(token);
        if (entries) matchingEvidence.push(...entries.filter((item) => !item.stale));
      }
      // Also try the full normalized topic as a single key (backward compat)
      const fullMatch = evidenceIndex.get(normalize(signal.topic));
      if (fullMatch) matchingEvidence.push(...fullMatch.filter((item) => !item.stale));

      if (matchingEvidence.length === 0) continue;

      const action = createAction(
        signalAlignedRule,
        `Publish signal-aligned content on trending topic ${signal.topic} (${signal.agentCount} agents)`,
        {
          target: signal.topic,
          evidence: matchingEvidence.map((item) => item.sourceId),
          metadata: {
            signalConsensus: signal.consensus,
            signalAgents: signal.agentCount,
            signalText: signal.text,
          },
        },
      );

      // WS4: Cross-domain bonus — topics spanning multiple domains get +10 priority
      // Score-100 posts often bridge domains (macro+crypto, security+defi)
      if (detectCrossDomain(signal.topic)) {
        action.priority += 10;
        action.reason += " (cross-domain bonus)";
      }

      candidates.push({ action, rule: signalAlignedRule.name });
      considered.push({ action, rule: signalAlignedRule.name });
      signalPublishCount++;
    }
  }

  // ── publish_on_divergence ───────────────────────
  // Real API: oracle.divergences[] with { type, asset, description, severity, details }
  const divergenceRule = getRule(config, "publish_on_divergence");
  if (divergenceRule && enrichment?.oracle?.divergences) {
    for (const div of enrichment.oracle.divergences) {
      // Only fire on medium+ severity (low is noise)
      if (div.severity === "low") continue;

      const action = createAction(
        divergenceRule,
        `Publish divergence analysis: ${div.asset} — ${div.description}`,
        {
          target: div.asset.toLowerCase(),
          metadata: {
            asset: div.asset,
            type: div.type,
            severity: div.severity,
            description: div.description,
            agentConfidence: div.details?.agentConfidence,
          },
        },
      );

      candidates.push({ action, rule: divergenceRule.name });
      considered.push({ action, rule: divergenceRule.name });
    }
  }

  // ── publish_prediction ──────────────────────────
  // Fires when betting pools are active with sufficient participation AND price data is available.
  // Replaces the deprecated ballotAccuracy check (/api/ballot returns 410 — now /api/bets/pool).
  const predictionRule = getRule(config, "publish_prediction");
  const minPoolBets = 3; // Minimum bets in pool to indicate meaningful market signal
  const bettingPools = enrichment?.bettingPools?.length
    ? enrichment.bettingPools
    : enrichment?.bettingPool
      ? [enrichment.bettingPool]
      : [];

  if (predictionRule && enrichment?.prices && enrichment.prices.length > 0) {
    for (const bettingPool of bettingPools) {
      if (bettingPool.totalBets < minPoolBets) continue;

      const action = createAction(
        predictionRule,
        `Publish prediction — ${bettingPool.asset} pool active (${bettingPool.totalBets} bets, ${bettingPool.totalDem} DEM)`,
        {
          metadata: {
            poolAsset: bettingPool.asset,
            totalBets: bettingPool.totalBets,
            totalDem: bettingPool.totalDem,
            roundEnd: bettingPool.roundEnd,
            availableAssets: enrichment.prices.map((p) => p.ticker),
          },
        },
      );

      candidates.push({ action, rule: predictionRule.name });
      considered.push({ action, rule: predictionRule.name });
    }
  }
}

// ── Cross-domain detection ──────────────────────────
// Domain clusters for detecting cross-domain signal topics.
// Score-100 posts often bridge multiple domains (macro+crypto, security+defi).
const DOMAIN_CLUSTERS: Record<string, readonly string[]> = {
  macro: ["macro", "gdp", "inflation", "rates", "fed", "treasury", "fiscal", "monetary", "dollar", "dxy", "yuan", "pboc", "boj"],
  crypto: ["crypto", "bitcoin", "btc", "ethereum", "eth", "defi", "nft", "token", "blockchain", "web3"],
  security: ["security", "hack", "exploit", "vulnerability", "audit", "attack", "breach", "phishing"],
  markets: ["equity", "stock", "nasdaq", "s&p", "bond", "yield", "commodity", "gold", "oil"],
  regulation: ["regulation", "sec", "compliance", "legal", "enforcement", "ban", "policy"],
};

/**
 * Detect whether a signal topic spans multiple domain clusters.
 * Returns true if tokens from 2+ distinct clusters appear in the topic.
 */
export function detectCrossDomain(topic: string): boolean {
  const lower = topic.toLowerCase();
  const matchedDomains = new Set<string>();

  for (const [domain, terms] of Object.entries(DOMAIN_CLUSTERS)) {
    for (const term of terms) {
      if (lower.includes(term)) {
        matchedDomains.add(domain);
        break; // One match per domain is enough
      }
    }
    if (matchedDomains.size >= 2) return true;
  }

  return false;
}
