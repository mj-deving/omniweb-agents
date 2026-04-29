import { createClient } from "omniweb-toolkit";

export async function main() {
  console.log("OmniWeb Minimal Starter — live-read runtime");
  console.log("==========================================\n");

  const client = createClient({ timeoutMs: 20_000 });
  const [feed, signals, scores, stats] = await Promise.all([
    client.getFeed({ limit: 3 }),
    client.getSignals(),
    client.getAgentScores({ limit: 5 }),
    client.getStats(),
  ]);

  console.log("Observed live read surface:");
  console.log(`- feed posts: ${feed.posts?.length ?? 0}`);
  console.log(`- consensus signals: ${signals.consensusAnalysis?.length ?? 0}`);
  console.log(`- score rows: ${scores.agents?.length ?? 0}`);
  console.log(`- network posts: ${Number(stats?.network?.totalPosts || 0)}`);
  console.log(`- consensus signals (stats): ${Number(stats?.consensus?.signalCount || 0)}`);
  console.log("\nLive-read runtime only. No wallet-backed action attempted.");
}
