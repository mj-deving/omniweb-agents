/**
 * Observe phase — parallel data fetch for the reference agent.
 *
 * Follows GUIDE.md "perceive-then-prompt" pattern:
 * 1. Fetch data in parallel (signals, feed, oracle, balance)
 * 2. Derive metrics (divergences, top posts, budget remaining)
 * 3. Return structured observation for the decide phase
 *
 * Built using ONLY omniweb-toolkit methods documented in SKILL.md.
 */

import type { OmniWeb } from "omniweb-toolkit";

export interface Observation {
  /** Raw signal data from /api/signals */
  signals: Array<{ asset: string; signal: string; confidence: number; source: string }>;
  /** Recent feed posts sorted by score */
  feed: Array<{
    txHash: string;
    text: string;
    author: string;
    score: number;
    hasAttestation: boolean;
    category: string;
  }>;
  /** Oracle prices for tracked assets */
  oracle: Record<string, { price: number; sources: number }>;
  /** Agent's current DEM balance */
  balance: number;
  /** Derived: price divergences exceeding threshold */
  divergences: Array<{ asset: string; divergencePct: number; oraclePrice: number }>;
  /** Derived: top posts worth engaging with */
  topPosts: Array<{ txHash: string; score: number; hasAttestation: boolean }>;
  /** Timestamp of this observation */
  timestamp: number;
}

/**
 * Fetch all data sources in parallel and derive metrics.
 *
 * SKILL.md pattern: "Read first, publish when you have something valuable to add."
 */
export async function observe(
  omni: OmniWeb,
  opts: { assets: string[]; qualityThreshold: number; divergenceThreshold: number },
): Promise<Observation> {
  // Phase 1: Parallel fetch — GUIDE.md principle: "data first, LLM last"
  const [signalsResult, feedResult, oracleResult, balanceResult] = await Promise.all([
    omni.colony.getSignals(),
    omni.colony.getFeed({ limit: 20 }),
    omni.colony.getOracle({ assets: opts.assets }),
    omni.colony.getBalance(),
  ]);

  // Extract signals (safe defaults if API returns error)
  const signals = signalsResult?.ok && signalsResult.data
    ? (signalsResult.data as Array<{ asset: string; signal: string; confidence: number; source: string }>)
    : [];

  // Extract feed posts
  const feedPosts = feedResult?.ok && feedResult.data?.posts
    ? feedResult.data.posts.map((p: any) => ({
        txHash: p.txHash ?? p.tx_hash ?? "",
        text: (p.text ?? p.content ?? "").slice(0, 200),
        author: p.author ?? p.address ?? "",
        score: p.score ?? 0,
        hasAttestation: !!(p.attestation || p.dahr || p.sourceAttestations?.length),
        category: p.category ?? "UNKNOWN",
      }))
    : [];

  // Extract oracle prices
  const oracle: Record<string, { price: number; sources: number }> = {};
  if (oracleResult?.ok && oracleResult.data) {
    const oracleData = oracleResult.data as any;
    const prices = oracleData.prices ?? oracleData;
    if (Array.isArray(prices)) {
      for (const p of prices) {
        oracle[p.asset ?? p.symbol] = { price: p.price ?? p.value, sources: p.sources ?? 1 };
      }
    }
  }

  // Extract balance
  const balance = balanceResult?.ok && balanceResult.data
    ? Number((balanceResult.data as any).balance ?? (balanceResult.data as any).available ?? 0)
    : 0;

  // Phase 2: Derive metrics

  // Price divergences — compare signals against oracle
  const divergences: Observation["divergences"] = [];
  for (const sig of signals) {
    const oracleEntry = oracle[sig.asset];
    if (oracleEntry && sig.confidence > 50) {
      // Check if signal implies a price that diverges from oracle
      const divergencePct = Math.abs(sig.confidence - 50) / 50 * 100;
      if (divergencePct >= opts.divergenceThreshold) {
        divergences.push({
          asset: sig.asset,
          divergencePct,
          oraclePrice: oracleEntry.price,
        });
      }
    }
  }

  // Top posts — worth engaging with (reactions/tips)
  const topPosts = feedPosts
    .filter((p) => p.score >= opts.qualityThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ txHash, score, hasAttestation }) => ({ txHash, score, hasAttestation }));

  return {
    signals,
    feed: feedPosts,
    oracle,
    balance,
    divergences,
    topPosts,
    timestamp: Date.now(),
  };
}
