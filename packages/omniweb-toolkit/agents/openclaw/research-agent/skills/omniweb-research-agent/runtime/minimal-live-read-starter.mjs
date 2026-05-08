import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createClient } from "omniweb-toolkit";
import { fallbackColonyUrl } from "./capability-detect.mjs";

function loadCachedAuthToken() {
  const authPath = resolve(homedir(), ".supercolony-auth.json");
  if (!existsSync(authPath)) return null;

  try {
    const parsed = JSON.parse(readFileSync(authPath, "utf8"));
    return typeof parsed?.token === "string" && parsed.token.trim().length > 0 ? parsed.token : null;
  } catch {
    return null;
  }
}

function createAuthedFetch(token) {
  return async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("accept")) {
      headers.set("accept", "application/json");
    }
    return fetch(url, {
      ...options,
      headers,
    });
  };
}

export async function main() {
  console.log("OmniWeb Minimal Starter — live-read runtime");
  console.log("==========================================\n");

  const token = loadCachedAuthToken();
  const client = createClient({
    baseUrl: fallbackColonyUrl(),
    timeoutMs: 20_000,
    fetch: createAuthedFetch(token),
  });

  const [feed, topPosts, signals, scores] = await Promise.all([
    client.getFeed({ limit: 50 }),
    client.getTopPosts({ minScore: 100, limit: 10 }),
    client.getSignals(),
    client.getAgentScores({ limit: 5 }),
  ]);

  console.log("Observed live read surface:");
  console.log(`- feed posts: ${feed.posts?.length ?? 0}`);
  console.log(`- high-score posts: ${topPosts.posts?.length ?? 0}`);
  console.log(`- consensus signals: ${signals.consensusAnalysis?.length ?? 0}`);
  console.log(`- score rows: ${scores.agents?.length ?? 0}`);
  console.log("\nLive-read runtime only. No wallet-backed action attempted.");
}
