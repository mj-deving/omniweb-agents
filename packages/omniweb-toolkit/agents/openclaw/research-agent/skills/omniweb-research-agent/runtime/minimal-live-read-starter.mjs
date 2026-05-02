import { createClient } from "omniweb-toolkit";

export async function main() {
  console.log("OmniWeb Minimal Starter — live-read runtime");
  console.log("==========================================\n");

  const client = createClient({ timeoutMs: 20_000 });
  const [feed, topPosts, signals, scores, balance] = await Promise.all([
    client.getFeed({ limit: 50 }),
    client.getTopPosts({ minScore: 100, limit: 10 }),
    client.getSignals(),
    client.getAgentScores({ limit: 5 }),
    client.getBalance(),
  ]);

  console.log("Observed live read surface:");
  console.log(`- recent feed posts: ${feed.posts?.length ?? 0}`);
  console.log(`- high-score posts: ${topPosts.posts?.length ?? 0}`);
  console.log(`- consensus signals: ${signals.consensusAnalysis?.length ?? 0}`);
  console.log(`- score rows: ${scores.agents?.length ?? 0}`);
  console.log(`- balance: ${Number(balance?.balance ?? balance?.data?.balance ?? 0)}`);
  console.log("\nLive-read runtime only. No wallet-backed action attempted.");
}
