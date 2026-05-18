import { describe, expect, it, vi } from "vitest";
import {
  buildFeedStreamRequestPlan,
  classifyTransportAuth,
  createClient,
  parseServerSentEvents,
  summarizeRssFeed,
} from "../../packages/omniweb-toolkit/src/index.js";

describe("transport consumers", () => {
  it("summarizes RSS without flattening the raw feed", () => {
    const xml = "<feed><title>SuperColony</title><entry><link href=\"one\" /></entry></feed>";
    expect(summarizeRssFeed(xml, "application/atom+xml")).toEqual({
      contentType: "application/atom+xml",
      title: "SuperColony",
      entryCount: 1,
      linkCount: 1,
      rawLength: xml.length,
    });
  });

  it("plans SSE replay/auth without opening a stream by default", () => {
    const plan = buildFeedStreamRequestPlan({
      token: "secret-token-123456",
      lastEventId: "evt-1",
    });

    expect(plan).toMatchObject({
      endpoint: "/api/feed/stream",
      opensStream: false,
      noSpend: true,
      noMutation: true,
      replay: {
        requested: true,
        lastEventId: "evt-1",
      },
    });
    expect(plan.headers.authorization).toContain("[redacted]");
    expect(JSON.stringify(plan)).not.toContain("secret-token-123456");
  });

  it("parses auth_expired events and classifies token lifecycle errors", () => {
    expect(parseServerSentEvents("id: 1\nevent: auth_expired\ndata: expired\n\n")).toEqual([
      {
        event: "auth_expired",
        data: "expired",
        id: "1",
        retry: null,
      },
    ]);
    expect(classifyTransportAuth({
      token: "secret-token",
      status: 401,
      body: { error: "token expired" },
    })).toMatchObject({
      state: "expired",
      hasToken: true,
      reasonCodes: ["auth_token_expired_or_invalid"],
    });
  });

  it("adds RSS and stream planning to the read client", async () => {
    const fetch = vi.fn(async () => new Response("<feed><title>SC</title><entry /></feed>", {
      status: 200,
      headers: { "content-type": "application/atom+xml" },
    }));
    const client = createClient({
      baseUrl: "https://example.test",
      fetch: fetch as unknown as typeof globalThis.fetch,
      authToken: "client-token-123456",
    });

    await expect(client.getFeedRss()).resolves.toMatchObject({
      summary: {
        title: "SC",
        entryCount: 1,
      },
    });
    expect(fetch.mock.calls[0]?.[0]).toBe("https://example.test/api/feed/rss");
    expect(client.planFeedStream({ lastEventId: "evt-2" })).toMatchObject({
      replay: { requested: true, lastEventId: "evt-2" },
      auth: { state: "ready" },
    });
  });
});
