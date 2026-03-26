#!/usr/bin/env npx tsx
/**
 * Colony Census — one-time analysis of the full SuperColony feed.
 * Fetches up to 10,000 posts, runs analyzeColony, and prints structured results.
 *
 * Usage: npx tsx scripts/colony-census.ts [--limit 5000] [--env .env]
 */

import { webcrypto } from "node:crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

import { connectWallet, apiCall, info, setLogAgent } from "../src/lib/sdk.js";
import { ensureAuth } from "../src/lib/auth.js";
import { analyzeColony, type ColonySnapshot, type AgentProfile } from "../src/lib/colony-intelligence.js";

setLogAgent("census");

// Parse args
const args = process.argv.slice(2);
const flags: Record<string, string> = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--") && i + 1 < args.length) {
    flags[args[i].slice(2)] = args[i + 1];
    i++;
  }
}
const LIMIT = parseInt(flags.limit ?? "5000", 10);
const ENV = flags.env ?? ".env";

async function main() {
  info(`Colony Census: fetching up to ${LIMIT} posts...`);
  const { demos, address } = await connectWallet(ENV);
  const token = await ensureAuth(demos, address);

  // Fetch feed in pages
  const allPosts: any[] = [];
  let offset = 0;
  const PAGE_SIZE = 200;

  while (allPosts.length < LIMIT) {
    const res = await apiCall(`/api/feed?limit=${PAGE_SIZE}&offset=${offset}`, token);
    if (!res.ok) {
      info(`Feed fetch failed at offset ${offset}: ${res.status}`);
      break;
    }

    const payload = res.data;
    const posts = payload?.posts ?? payload?.data?.posts ?? payload?.data ?? payload ?? [];
    if (!Array.isArray(posts) || posts.length === 0) break;

    allPosts.push(...posts);
    offset += posts.length;
    info(`  Fetched ${allPosts.length} posts so far...`);

    if (posts.length < PAGE_SIZE) break; // last page
  }

  info(`Total posts fetched: ${allPosts.length}`);

  // Run colony analysis
  const snapshot = analyzeColony(allPosts);

  // === CENSUS REPORT ===
  console.log("\n" + "═".repeat(60));
  console.log("  COLONY CENSUS REPORT");
  console.log("═".repeat(60));

  // Basic stats
  console.log(`\n📊 BASIC STATS`);
  console.log(`  Feed size: ${snapshot.feedSize} posts`);
  console.log(`  Active agents: ${snapshot.agents.size}`);
  console.log(`  Relationships (reply edges): ${snapshot.relationships.length}`);

  // Agent rankings
  const agentList = [...snapshot.agents.values()].sort((a, b) => b.postCount - a.postCount);

  console.log(`\n👥 TOP AGENTS BY POST COUNT`);
  for (const a of agentList.slice(0, 15)) {
    const addr = a.address.slice(0, 10) + "...";
    console.log(`  ${addr}  posts=${a.postCount}  avgScore=${a.avgScore}  attestRate=${(a.attestationRate * 100).toFixed(0)}%  topics=[${a.topics.slice(0, 5).join(", ")}]`);
  }

  // Power law analysis (Gini coefficient on post counts)
  const postCounts = agentList.map(a => a.postCount).sort((a, b) => a - b);
  const n = postCounts.length;
  if (n > 1) {
    const totalPosts = postCounts.reduce((s, v) => s + v, 0);
    let giniNumerator = 0;
    for (let i = 0; i < n; i++) {
      giniNumerator += (2 * (i + 1) - n - 1) * postCounts[i];
    }
    const gini = giniNumerator / (n * totalPosts);
    console.log(`\n📈 POWER LAW ANALYSIS`);
    console.log(`  Gini coefficient (post volume): ${gini.toFixed(3)}`);
    console.log(`  Top 5 agents share: ${agentList.slice(0, 5).reduce((s, a) => s + a.postCount, 0)} / ${totalPosts} posts (${((agentList.slice(0, 5).reduce((s, a) => s + a.postCount, 0) / totalPosts) * 100).toFixed(1)}%)`);
    console.log(`  Top 10 agents share: ${agentList.slice(0, 10).reduce((s, a) => s + a.postCount, 0)} / ${totalPosts} posts (${((agentList.slice(0, 10).reduce((s, a) => s + a.postCount, 0) / totalPosts) * 100).toFixed(1)}%)`);
  }

  // Reaction analysis
  console.log(`\n🔥 REACTION ANALYSIS`);
  let totalReactions = 0;
  let postsWithReactions = 0;
  let postsWithZeroReactions = 0;
  const reactionsByAgent = new Map<string, number>();

  for (const post of allPosts) {
    const agree = post.reactions?.agree ?? 0;
    const disagree = post.reactions?.disagree ?? 0;
    const total = agree + disagree;
    totalReactions += total;
    if (total > 0) postsWithReactions++;
    else postsWithZeroReactions++;

    const author = (post.author || "").toLowerCase();
    reactionsByAgent.set(author, (reactionsByAgent.get(author) || 0) + total);
  }

  console.log(`  Total reactions across all posts: ${totalReactions}`);
  console.log(`  Posts with 1+ reactions: ${postsWithReactions} (${((postsWithReactions / allPosts.length) * 100).toFixed(1)}%)`);
  console.log(`  Posts with 0 reactions: ${postsWithZeroReactions} (${((postsWithZeroReactions / allPosts.length) * 100).toFixed(1)}%)`);
  console.log(`  Avg reactions/post: ${(totalReactions / allPosts.length).toFixed(1)}`);

  // Reaction Gini
  const rxCounts = [...reactionsByAgent.values()].sort((a, b) => a - b);
  const rxN = rxCounts.length;
  if (rxN > 1) {
    const rxTotal = rxCounts.reduce((s, v) => s + v, 0);
    let rxGini = 0;
    for (let i = 0; i < rxN; i++) {
      rxGini += (2 * (i + 1) - rxN - 1) * rxCounts[i];
    }
    const giniRx = rxGini / (rxN * rxTotal);
    console.log(`  Gini coefficient (reactions): ${giniRx.toFixed(3)}`);

    // Top 5 by reactions
    const rxSorted = [...reactionsByAgent.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`  Top 5 agents by total reactions:`);
    for (const [addr, rx] of rxSorted.slice(0, 5)) {
      const pct = ((rx / rxTotal) * 100).toFixed(1);
      console.log(`    ${addr.slice(0, 10)}...  reactions=${rx} (${pct}%)`);
    }
    console.log(`  Top 5 share: ${rxSorted.slice(0, 5).reduce((s, e) => s + e[1], 0)} / ${rxTotal} reactions (${((rxSorted.slice(0, 5).reduce((s, e) => s + e[1], 0) / rxTotal) * 100).toFixed(1)}%)`);
  }

  // Topic landscape
  console.log(`\n🗺️ TOPIC LANDSCAPE`);
  const topicCounts = new Map<string, { posts: number; totalRx: number }>();
  for (const post of allPosts) {
    const tags: string[] = Array.isArray(post.payload?.tags) ? post.payload.tags : [];
    const rx = (post.reactions?.agree ?? 0) + (post.reactions?.disagree ?? 0);
    for (const tag of tags) {
      const t = tag.toLowerCase();
      const cur = topicCounts.get(t) || { posts: 0, totalRx: 0 };
      cur.posts++;
      cur.totalRx += rx;
      topicCounts.set(t, cur);
    }
  }
  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1].posts - a[1].posts)
    .slice(0, 20);
  for (const [topic, stats] of topTopics) {
    const avgRx = stats.posts > 0 ? (stats.totalRx / stats.posts).toFixed(1) : "0";
    console.log(`  ${topic}: ${stats.posts} posts, avg ${avgRx} rx`);
  }

  // Relationship density
  console.log(`\n🔗 RELATIONSHIP DENSITY`);
  console.log(`  Reply edges: ${snapshot.relationships.length}`);
  if (snapshot.relationships.length > 0) {
    const topRels = snapshot.relationships.sort((a, b) => b.interactions - a.interactions).slice(0, 10);
    console.log(`  Top reply relationships:`);
    for (const r of topRels) {
      console.log(`    ${r.source.slice(0, 8)}... → ${r.target.slice(0, 8)}...  interactions=${r.interactions}`);
    }
  }

  // Temporal analysis
  console.log(`\n⏰ TEMPORAL ANALYSIS`);
  const timestamps = allPosts
    .map(p => p.timestamp)
    .filter((t): t is number => typeof t === "number" && t > 0)
    .sort((a, b) => a - b);
  if (timestamps.length > 1) {
    const oldest = new Date(timestamps[0]).toISOString();
    const newest = new Date(timestamps[timestamps.length - 1]).toISOString();
    const spanHours = (timestamps[timestamps.length - 1] - timestamps[0]) / 3600000;
    console.log(`  Oldest post: ${oldest}`);
    console.log(`  Newest post: ${newest}`);
    console.log(`  Span: ${spanHours.toFixed(0)} hours (${(spanHours / 24).toFixed(1)} days)`);
    console.log(`  Avg posts/hour: ${(timestamps.length / spanHours).toFixed(1)}`);

    // Reply freshness: time between parent and reply
    const replyAges: number[] = [];
    const txToTimestamp = new Map<string, number>();
    for (const post of allPosts) {
      if (post.txHash && typeof post.timestamp === "number") {
        txToTimestamp.set(post.txHash, post.timestamp);
      }
    }
    for (const post of allPosts) {
      if (post.replyTo && typeof post.timestamp === "number") {
        const parentTs = txToTimestamp.get(post.replyTo);
        if (parentTs) {
          replyAges.push(post.timestamp - parentTs);
        }
      }
    }
    if (replyAges.length > 0) {
      console.log(`\n  Reply freshness (${replyAges.length} replies with known parents):`);
      const buckets = { "<2h": 0, "2-6h": 0, "6-24h": 0, ">24h": 0 };
      const bucketRx: Record<string, number[]> = { "<2h": [], "2-6h": [], "6-24h": [], ">24h": [] };
      for (let i = 0; i < replyAges.length; i++) {
        const ageMs = replyAges[i];
        const ageH = ageMs / 3600000;
        const post = allPosts.find(p => p.replyTo && (p.timestamp - (txToTimestamp.get(p.replyTo) || 0)) === ageMs);
        const rx = post ? ((post.reactions?.agree ?? 0) + (post.reactions?.disagree ?? 0)) : 0;

        if (ageH < 2) { buckets["<2h"]++; bucketRx["<2h"].push(rx); }
        else if (ageH < 6) { buckets["2-6h"]++; bucketRx["2-6h"].push(rx); }
        else if (ageH < 24) { buckets["6-24h"]++; bucketRx["6-24h"].push(rx); }
        else { buckets[">24h"]++; bucketRx[">24h"].push(rx); }
      }
      for (const [bucket, count] of Object.entries(buckets)) {
        const rxArr = bucketRx[bucket];
        const avgRx = rxArr.length > 0 ? (rxArr.reduce((s, v) => s + v, 0) / rxArr.length).toFixed(1) : "n/a";
        console.log(`    ${bucket}: ${count} replies, avg ${avgRx} rx`);
      }
    }
  }

  // Category analysis
  console.log(`\n📂 CATEGORY ANALYSIS`);
  const catStats = new Map<string, { posts: number; totalRx: number }>();
  for (const post of allPosts) {
    const cat = post.payload?.cat || "UNKNOWN";
    const rx = (post.reactions?.agree ?? 0) + (post.reactions?.disagree ?? 0);
    const cur = catStats.get(cat) || { posts: 0, totalRx: 0 };
    cur.posts++;
    cur.totalRx += rx;
    catStats.set(cat, cur);
  }
  for (const [cat, stats] of [...catStats.entries()].sort((a, b) => b[1].posts - a[1].posts)) {
    const avgRx = stats.posts > 0 ? (stats.totalRx / stats.posts).toFixed(1) : "0";
    console.log(`  ${cat}: ${stats.posts} posts, avg ${avgRx} rx`);
  }

  // Our agents
  console.log(`\n🤖 OUR AGENTS`);
  const ourAddr = address.toLowerCase();
  const ourProfile = snapshot.agents.get(ourAddr);
  if (ourProfile) {
    console.log(`  Address: ${ourAddr}`);
    console.log(`  Posts: ${ourProfile.postCount}`);
    console.log(`  Avg score: ${ourProfile.avgScore}`);
    console.log(`  Attestation rate: ${(ourProfile.attestationRate * 100).toFixed(0)}%`);
    console.log(`  Topics: [${ourProfile.topics.slice(0, 10).join(", ")}]`);
    console.log(`  Categories: ${JSON.stringify(ourProfile.categories)}`);
  } else {
    console.log(`  Address ${ourAddr.slice(0, 10)}... not found in feed`);
  }

  // Our relationships
  const ourRels = snapshot.relationships.filter(r => r.source === ourAddr || r.target === ourAddr);
  if (ourRels.length > 0) {
    console.log(`\n  Our relationships (${ourRels.length}):`);
    for (const r of ourRels.sort((a, b) => b.interactions - a.interactions).slice(0, 10)) {
      const dir = r.source === ourAddr ? "→" : "←";
      const other = r.source === ourAddr ? r.target : r.source;
      console.log(`    ${dir} ${other.slice(0, 10)}...  interactions=${r.interactions} types=[${r.types.join(",")}]`);
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log("  CENSUS COMPLETE");
  console.log("═".repeat(60));

  // Also output as JSON for programmatic use
  const jsonOut = {
    feedSize: snapshot.feedSize,
    activeAgents: snapshot.agents.size,
    replyEdges: snapshot.relationships.length,
    totalReactions,
    postsWithReactions,
    postsWithZeroReactions,
    avgReactionsPerPost: +(totalReactions / allPosts.length).toFixed(1),
    topAgents: agentList.slice(0, 15).map(a => ({
      address: a.address,
      postCount: a.postCount,
      avgScore: a.avgScore,
      attestationRate: a.attestationRate,
      topics: a.topics.slice(0, 5),
    })),
    topTopics: topTopics.map(([topic, stats]) => ({
      topic,
      posts: stats.posts,
      avgReactions: +(stats.totalRx / stats.posts).toFixed(1),
    })),
  };

  // Write JSON for future use
  const { writeFileSync } = await import("node:fs");
  const { resolve } = await import("node:path");
  const outPath = resolve("MEMORY/WORK/colony-census.json");
  writeFileSync(outPath, JSON.stringify(jsonOut, null, 2));
  console.log(`\nJSON output written to: ${outPath}`);
}

main().catch(e => {
  console.error("Census failed:", e.message);
  process.exit(1);
});
