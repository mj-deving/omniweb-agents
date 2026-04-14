#!/usr/bin/env npx tsx
/**
 * colony-state-reader.ts — Read ALL colony endpoints and synthesize a full state picture.
 *
 * Exercises every read endpoint we have, captures the full colony state,
 * and produces a structured summary for strategy development.
 *
 * Usage:
 *   set -a && . .env && set +a
 *   npx tsx scripts/colony-state-reader.ts
 *   npx tsx scripts/colony-state-reader.ts --json > colony-state.json
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

const BASE_URL = process.env.SUPERCOLONY_API_URL ?? "https://supercolony.ai";
const OUR_ADDR = "0x6a1104179536c23247730e3905cee5f68db432d67ec16c2db8a0d611b3b5554b";
const JSON_MODE = process.argv.includes("--json");

function loadToken(): string | null {
  const p = resolve(homedir(), ".supercolony-auth.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf-8")).token ?? null; } catch { return null; }
}

const TOKEN = loadToken();

async function api<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

function log(...args: unknown[]) {
  if (!JSON_MODE) console.log(...args);
}

async function main() {
  log("═══ Colony State Reader ═══");
  log(`API: ${BASE_URL}`);
  log(`Auth: ${TOKEN ? "yes" : "no"}`);
  log(`Agent: ${OUR_ADDR.slice(0, 12)}...`);
  log("");

  // ── Parallel fetch ALL read endpoints ──
  const [
    health, stats, feed, signals, convergence, report,
    oracle, prices, priceHistory, agents, leaderboard,
    topPosts, predictions, predMarkets,
    pool, higherLower, binaryPools,
    ourProfile, ourIdentities, ourBalance, ourTips,
  ] = await Promise.all([
    api<any>("/api/health"),
    api<any>("/api/stats"),
    api<any>("/api/feed?limit=20"),
    api<any>("/api/signals"),
    api<any>("/api/convergence"),
    api<any>("/api/report"),
    api<any>("/api/oracle"),
    api<any>("/api/prices?assets=BTC,ETH,SOL,DEM"),
    api<any>("/api/prices?asset=BTC&history=24"),
    api<any>("/api/agents"),
    api<any>("/api/scores/agents?limit=20"),
    api<any>("/api/scores/top?limit=10"),
    api<any>("/api/predictions?status=pending"),
    api<any>("/api/predictions/markets?limit=20"),
    api<any>("/api/bets/pool?asset=BTC&horizon=30m"),
    api<any>("/api/bets/higher-lower/pool?asset=BTC&horizon=30m"),
    api<any>("/api/bets/binary/pools?limit=10"),
    api<any>(`/api/agent/${OUR_ADDR}`),
    api<any>(`/api/agent/${OUR_ADDR}/identities`),
    api<any>(`/api/agent/${OUR_ADDR}/balance`),
    api<any>(`/api/agent/${OUR_ADDR}/tips`),
  ]);

  // ── Fetch reactions & tips for top posts ──
  const topPostTxHashes = (feed?.posts ?? []).slice(0, 5).map((p: any) => p.txHash);
  const postDetails = await Promise.all(
    topPostTxHashes.map(async (tx: string) => {
      const [detail, reactions, tipStats, dahr] = await Promise.all([
        api<any>(`/api/post/${tx}`),
        api<any>(`/api/feed/${tx}/react`),
        api<any>(`/api/tip/${tx}`),
        api<any>(`/api/verify/${tx}`),
      ]);
      return { tx, detail, reactions, tipStats, dahr };
    }),
  );

  // ── Identity lookups ──
  const identitySearch = await api<any>("/api/identity?search=demos");

  // ── Synthesize ──
  const state = {
    timestamp: new Date().toISOString(),
    infrastructure: {
      health: health?.status,
      uptime: health ? `${Math.round(health.uptime / 3600)}h` : "?",
      auth: TOKEN ? "authenticated" : "public-only",
    },
    colony: {
      totalPosts: stats?.network?.totalPosts,
      totalAgents: stats?.network?.totalAgents,
      registeredAgents: stats?.network?.registeredAgents,
      postsLast24h: stats?.activity?.postsLast24h,
      activeAgents24h: stats?.activity?.activeAgents24h,
      attestationRate: stats?.quality?.attestationRate,
      signalCount: stats?.consensus?.signalCount,
      embeddingsIndexed: stats?.consensus?.embeddingsIndexed,
      topCategories: (stats?.content?.categories ?? []).slice(0, 5).map((c: any) => `${c.category}: ${c.cnt}`),
    },
    ourAgent: {
      name: ourProfile?.agent?.name ?? "?",
      address: OUR_ADDR,
      balance: ourBalance?.balance ?? "?",
      balanceCached: ourBalance?.cached,
      reputation: ourProfile?.reputation,
      postCount: ourProfile?.agent?.postCount,
      lastActiveAt: ourProfile?.agent?.lastActiveAt ? new Date(ourProfile.agent.lastActiveAt).toISOString() : "?",
      tipsGiven: ourTips?.tipsGiven,
      tipsReceived: ourTips?.tipsReceived,
      identities: ourIdentities?.web2Identities?.length ?? 0,
    },
    signals: {
      count: signals?.consensusAnalysis?.length ?? 0,
      topics: (signals?.consensusAnalysis ?? []).slice(0, 10).map((s: any) => ({
        topic: s.shortTopic ?? s.topic?.slice(0, 60),
        direction: s.direction,
        confidence: s.confidence,
        consensus: s.consensus,
        agentCount: s.agentCount,
        assets: s.assets,
        trending: s.trending,
      })),
      signalAgent: signals?.signalAgent,
    },
    convergence: {
      pulse: convergence?.pulse,
      topMindshare: (convergence?.mindshare?.series ?? []).slice(0, 5).map((s: any) => ({
        topic: s.shortTopic,
        direction: s.direction,
        agentCount: s.agentCount,
        totalPosts: s.totalPosts,
        confidence: s.confidence,
      })),
    },
    report: report ? {
      title: report.title,
      signalCount: report.signalCount,
      postCount: report.postCount,
      agentCount: report.agentCount,
      status: report.status,
      publishedAt: report.publishedAt ? new Date(report.publishedAt).toISOString() : "?",
    } : null,
    oracle: {
      overallSentiment: oracle?.overallSentiment,
      assetCount: oracle?.assets?.length ?? 0,
      topAssets: (oracle?.assets ?? []).slice(0, 5).map((a: any) => ({
        ticker: a.ticker,
        priceUsd: a.price?.usd,
        change24h: a.price?.change24h,
        sentiment: a.sentiment?.direction,
        sentimentScore: a.sentiment?.score,
        postCount: a.postCount,
      })),
      divergenceCount: oracle?.divergences?.length ?? 0,
      divergences: oracle?.divergences ?? [],
    },
    prices: {
      assets: (prices?.prices ?? []).map((p: any) => ({
        ticker: p.ticker,
        priceUsd: p.priceUsd,
        change24h: p.change24h,
        source: p.source,
        attested: !!p.dahrTxHash,
      })),
    },
    leaderboard: {
      top10: (leaderboard?.agents ?? []).slice(0, 10).map((a: any) => ({
        name: a.name,
        bayesianScore: a.bayesianScore,
        totalPosts: a.totalPosts,
        avgScore: a.avgScore,
      })),
      globalAvg: leaderboard?.globalAvg,
      ourRank: (leaderboard?.agents ?? []).findIndex((a: any) => a.address === OUR_ADDR) + 1 || "not in top 20",
    },
    topPosts: (topPosts?.posts ?? []).slice(0, 5).map((p: any) => ({
      author: p.author?.slice(0, 12) + "...",
      category: p.category,
      score: p.score,
      text: p.text?.slice(0, 100),
    })),
    predictions: {
      pendingCount: predictions?.total ?? 0,
      pendingExpired: predictions?.pendingExpired ?? 0,
      samplePending: (predictions?.predictions ?? []).slice(0, 3).map((p: any) => ({
        author: p.author?.slice(0, 12) + "...",
        text: p.text?.slice(0, 80),
        assets: p.assets,
        confidence: p.confidence,
        deadline: p.deadline ? new Date(p.deadline * 1000).toISOString() : "?",
      })),
      markets: (predMarkets?.predictions ?? []).slice(0, 5).map((m: any) => ({
        question: m.question?.slice(0, 80),
        outcomeYes: m.outcomeYes,
        volume: m.volume,
        endDate: m.endDate,
      })),
    },
    betting: {
      btcPool: pool ? {
        totalBets: pool.totalBets,
        totalDem: pool.totalDem,
        roundEnd: pool.roundEnd ? new Date(pool.roundEnd).toISOString() : "?",
      } : null,
      higherLower: higherLower ? {
        currentPrice: higherLower.currentPrice,
        totalHigher: higherLower.totalHigher,
        totalLower: higherLower.totalLower,
      } : null,
      binaryPoolCount: binaryPools?.count ?? 0,
    },
    recentFeed: (feed?.posts ?? []).slice(0, 10).map((p: any) => ({
      author: p.author?.slice(0, 12) + "...",
      category: p.payload?.cat,
      score: p.score,
      replyCount: p.replyCount,
      reactions: p.reactions,
      text: p.payload?.text?.slice(0, 100),
      attested: !!(p.payload?.payload?.dahrTxHash || p.payload?.tags?.includes("attested")),
    })),
    postInspection: postDetails.map((pd) => ({
      tx: pd.tx?.slice(0, 16) + "...",
      hasDetail: !!pd.detail,
      reactions: pd.reactions,
      tipStats: pd.tipStats ? {
        totalTips: pd.tipStats.totalTips,
        totalDem: pd.tipStats.totalDem,
        myTip: pd.tipStats.myTip,
      } : null,
      dahrVerified: pd.dahr?.verified,
    })),
    identitySearch: {
      totalMatches: identitySearch?.totalMatches ?? 0,
    },
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(state, null, 2));
  } else {
    // Human-readable summary
    log("─── Infrastructure ───");
    log(`  Health: ${state.infrastructure.health} (${state.infrastructure.uptime} uptime)`);
    log(`  Auth: ${state.infrastructure.auth}`);

    log("\n─── Colony Overview ───");
    log(`  Posts: ${state.colony.totalPosts} total, ${state.colony.postsLast24h} last 24h`);
    log(`  Agents: ${state.colony.totalAgents} total, ${state.colony.activeAgents24h} active 24h`);
    log(`  Attestation rate: ${state.colony.attestationRate}%`);
    log(`  Signals: ${state.colony.signalCount} active`);
    log(`  Categories: ${state.colony.topCategories.join(", ")}`);

    log("\n─── Our Agent ───");
    log(`  Name: ${state.ourAgent.name}`);
    log(`  Balance: ${state.ourAgent.balance} DEM`);
    log(`  Posts: ${state.ourAgent.postCount}`);
    log(`  Last active: ${state.ourAgent.lastActiveAt}`);
    log(`  Tips given: ${state.ourAgent.tipsGiven?.count ?? 0} (${state.ourAgent.tipsGiven?.totalDem ?? 0} DEM)`);
    log(`  Tips received: ${state.ourAgent.tipsReceived?.count ?? 0} (${state.ourAgent.tipsReceived?.totalDem ?? 0} DEM)`);

    log("\n─── Signals (top 10) ───");
    for (const s of state.signals.topics) {
      log(`  ${s.direction?.padEnd(8)} [${s.confidence}%] ${s.topic} (${s.agentCount} agents, ${s.assets?.join(",") ?? "no assets"})`);
    }

    log("\n─── Oracle ───");
    log(`  Sentiment: ${state.oracle.overallSentiment?.direction} (score: ${state.oracle.overallSentiment?.score})`);
    for (const a of state.oracle.topAssets) {
      log(`  ${a.ticker}: $${a.priceUsd} (${a.change24h > 0 ? "+" : ""}${a.change24h?.toFixed(1)}%) — ${a.sentiment} (${a.sentimentScore}), ${a.postCount} posts`);
    }
    log(`  Divergences: ${state.oracle.divergenceCount}`);

    log("\n─── Leaderboard ───");
    log(`  Global avg: ${state.leaderboard.globalAvg}`);
    log(`  Our rank: ${state.leaderboard.ourRank}`);
    for (const a of state.leaderboard.top10.slice(0, 5)) {
      log(`  ${a.bayesianScore.toFixed(1)} ${a.name} (${a.totalPosts} posts, avg ${a.avgScore.toFixed(1)})`);
    }

    log("\n─── Predictions ───");
    log(`  Pending: ${state.predictions.pendingCount} (${state.predictions.pendingExpired} expired)`);
    log(`  Markets: ${state.predictions.markets.length}`);
    for (const m of state.predictions.markets.slice(0, 3)) {
      log(`  ${(m.outcomeYes * 100).toFixed(0)}% YES — ${m.question}`);
    }

    log("\n─── Betting ───");
    log(`  BTC pool: ${state.betting.btcPool?.totalBets ?? 0} bets, ${state.betting.btcPool?.totalDem ?? 0} DEM`);
    log(`  Higher/Lower: H:${state.betting.higherLower?.totalHigher ?? 0} L:${state.betting.higherLower?.totalLower ?? 0} @ $${state.betting.higherLower?.currentPrice ?? "?"}`);
    log(`  Binary pools: ${state.betting.binaryPoolCount}`);

    log("\n─── Recent Feed (10 posts) ───");
    for (const p of state.recentFeed) {
      const att = p.attested ? "✓" : " ";
      log(`  [${p.score?.toString().padStart(3)}] ${p.category?.padEnd(12)} ${att} ${p.text?.slice(0, 70)}`);
    }

    log("\n─── Post Inspection (5 posts) ───");
    for (const p of state.postInspection) {
      log(`  ${p.tx} reactions:${JSON.stringify(p.reactions)} tips:${p.tipStats?.totalTips ?? 0} dahr:${p.dahrVerified ?? "?"}`);
    }

    log("\n═══ Summary ═══");
    log(`  ${state.colony.totalPosts} posts, ${state.colony.totalAgents} agents, ${state.colony.signalCount} signals`);
    log(`  ${state.oracle.overallSentiment?.direction} sentiment, ${state.oracle.divergenceCount} divergences`);
    log(`  ${state.predictions.pendingCount} pending predictions, ${state.betting.binaryPoolCount} binary markets`);
    log(`  Our agent: ${state.ourAgent.name}, rank ${state.leaderboard.ourRank}, ${state.ourAgent.balance} DEM`);
  }
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
