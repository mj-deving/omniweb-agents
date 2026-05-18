import { describe, expect, it, vi } from "vitest";
import {
  READ_PROFILE_SURFACE,
  classifyReadProfileShape,
  createClient,
  summarizeReadProfileCoverage,
} from "../../packages/omniweb-toolkit/src/index.js";

describe("read profile consumers", () => {
  it("keeps the full read/profile/scoring/verification matrix no-spend", () => {
    const summary = summarizeReadProfileCoverage();

    expect(summary.ok).toBe(true);
    expect(summary.coveredFamilies).toEqual(expect.arrayContaining([
      "feed",
      "signals",
      "report",
      "stats",
      "agents",
      "identity",
      "scoring",
      "verification",
      "engagement",
    ]));
    expect(summary.unsupportedFamilies).toEqual(["levels"]);
    expect(READ_PROFILE_SURFACE.every((entry) => entry.noSpend && entry.noMutation)).toBe(true);
  });

  it("classifies representative live response shapes without flattening them", () => {
    expect(classifyReadProfileShape("agents", { agents: [{ level: 1, address: "0xabc" }] })).toMatchObject({
      verdict: "pass",
      missingKeys: [],
    });
    expect(classifyReadProfileShape("thread", { root: {}, replies: [] })).toMatchObject({
      verdict: "partial",
      missingKeys: ["focusedPost", "posts"],
    });
  });

  it("routes read-only client methods to the maintained endpoint families", async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ ok: true, posts: [], agents: [], reports: [], verified: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = createClient({
      baseUrl: "https://example.test",
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.getPostDetail("tx/1");
    await client.getThread("tx/1");
    await client.getConvergence();
    await client.getReport({ id: "daily" });
    await client.getHealth();
    await client.getAgents({ limit: 2 });
    await client.getAgentProfile("0xabc");
    await client.getAgentIdentities("0xabc");
    await client.lookupIdentity({ platform: "x", username: "alice" });
    await client.lookupIdentity({ query: "alice" });
    await client.getPredictions({ status: "open", asset: "BTC", agent: "0xabc" });
    await client.getPredictionIntelligence({ limit: 3, stats: true });
    await client.getPredictionRecommendations("0xabc");
    await client.getPredictionLeaderboard({ limit: 4 });
    await client.getPredictionScore("0xabc");
    await client.verifyDahr("tx/1");
    await client.verifyTlsn("tx/1");
    await client.getReactions("tx/1");
    await client.getTipStats("tx/1");
    await client.getAgentTipStats("0xabc");

    expect(calls).toEqual([
      "https://example.test/api/post/tx%2F1",
      "https://example.test/api/feed/thread/tx%2F1",
      "https://example.test/api/convergence",
      "https://example.test/api/report?id=daily",
      "https://example.test/api/health",
      "https://example.test/api/agents?limit=2",
      "https://example.test/api/agent/0xabc",
      "https://example.test/api/agent/0xabc/identities",
      "https://example.test/api/identity?platform=x&username=alice",
      "https://example.test/api/identity?search=alice",
      "https://example.test/api/predictions?status=open&asset=BTC&agent=0xabc",
      "https://example.test/api/predictions/intelligence?limit=3&stats=true",
      "https://example.test/api/predictions/recommend?userAddress=0xabc",
      "https://example.test/api/predictions/leaderboard?limit=4",
      "https://example.test/api/predictions/score/0xabc",
      "https://example.test/api/verify/tx%2F1",
      "https://example.test/api/verify-tlsn/tx%2F1",
      "https://example.test/api/feed/tx%2F1/react",
      "https://example.test/api/tip/tx%2F1",
      "https://example.test/api/agent/0xabc/tips",
    ]);
    expect(fetch).toHaveBeenCalledTimes(20);
  });
});
