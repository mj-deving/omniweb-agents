import { afterEach, describe, expect, it, vi } from "vitest";

import { createSSEFeedSource } from "../../src/reactive/event-sources/sse-feed.js";
import { makeSSEPost, makeTextStream } from "./test-helpers.js";

describe("createSSEFeedSource", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reads SSE posts, refreshes auth on auth_expired, and carries Last-Event-ID forward", async () => {
    vi.spyOn(Date, "now").mockReturnValue(7_777);
    const firstPost = makeSSEPost({ txHash: "tx-1", timestamp: 100 });
    const secondPost = makeSSEPost({ txHash: "tx-2", timestamp: 200 });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          makeTextStream(
            ": keepalive\n\n",
            `event: post\nid: 11\ndata: ${JSON.stringify(firstPost)}\n\n`,
            "event: auth_expired\ndata: {}\n\n",
            "event: post\ndata: not-json\n\n",
          ),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          makeTextStream(`event: post\nid: 12\ndata: ${JSON.stringify(secondPost)}\n\n`),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const getToken = vi.fn().mockResolvedValue("token-1");
    const fetchFeedFallback = vi.fn();
    const source = createSSEFeedSource({
      streamUrl: "https://example.com/feed/stream",
      getToken,
      fetchFeedFallback,
      categories: ["news"],
      assets: ["dem"],
    });

    await expect(source.poll()).resolves.toEqual({
      timestamp: 7_777,
      posts: [firstPost],
      source: "sse",
    });
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://example.com/feed/stream?categories=news&assets=dem", {
      headers: {
        Authorization: "Bearer token-1",
        Accept: "text/event-stream",
      },
    });

    await source.poll();
    expect(fetchMock.mock.calls[1]?.[1]).toEqual({
      headers: {
        Authorization: "Bearer token-1",
        Accept: "text/event-stream",
        "Last-Event-ID": "11",
      },
    });
  });

  it("falls back to polling when the SSE fetch fails and still emits new posts only", async () => {
    vi.spyOn(Date, "now").mockReturnValue(8_888);
    const fallbackPost = makeSSEPost({ txHash: "fallback-1", timestamp: 300 });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("stream down")));

    const source = createSSEFeedSource({
      streamUrl: "https://example.com/feed/stream",
      getToken: vi.fn().mockResolvedValue("token-1"),
      fetchFeedFallback: vi.fn().mockResolvedValue([fallbackPost]),
    });

    await expect(source.poll()).resolves.toEqual({
      timestamp: 8_888,
      posts: [fallbackPost],
      source: "poll-fallback",
    });

    expect(source.diff(null, { timestamp: 1, posts: [fallbackPost], source: "poll-fallback" })).toEqual([]);
    expect(
      source.diff(
        { timestamp: 1, posts: [fallbackPost], source: "poll-fallback" },
        {
          timestamp: 2,
          posts: [fallbackPost, makeSSEPost({ txHash: "fallback-2", timestamp: 400 })],
          source: "poll-fallback",
        },
      ),
    ).toEqual([
      {
        id: "sse:feed:400:fallback-2",
        sourceId: "sse:feed",
        type: "feed_post",
        detectedAt: 8_888,
        payload: makeSSEPost({ txHash: "fallback-2", timestamp: 400 }),
        watermark: { txHash: "fallback-2", timestamp: 400 },
      },
    ]);
    expect(
      source.extractWatermark({
        timestamp: 2,
        posts: [fallbackPost, makeSSEPost({ txHash: "fallback-2", timestamp: 400 })],
        source: "poll-fallback",
      }),
    ).toEqual({
      latestTxHash: "fallback-2",
      timestamp: 400,
    });
  });

  it("rejects when both SSE and fallback retrieval fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("stream down")));
    const source = createSSEFeedSource({
      streamUrl: "https://example.com/feed/stream",
      getToken: vi.fn().mockResolvedValue("token-1"),
      fetchFeedFallback: vi.fn().mockRejectedValue(new Error("fallback down")),
    });

    await expect(source.poll()).rejects.toThrow("fallback down");
  });
});
