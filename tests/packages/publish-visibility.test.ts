import { describe, expect, it, vi } from "vitest";

import { verifyPublishVisibility } from "../../packages/omniweb-toolkit/src/publish-visibility";

describe("verifyPublishVisibility", () => {
  it("keeps polling after chain visibility and returns indexed visibility when post detail catches up", async () => {
    let now = 0;
    let postDetailCalls = 0;
    const getFeed = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        posts: [],
        meta: { lastBlock: 123 },
      },
    });
    const getPostDetail = vi.fn().mockImplementation(async () => {
      postDetailCalls += 1;
      if (postDetailCalls < 3) {
        return { ok: false, status: 404, error: "not_found" };
      }
      return {
        ok: true,
        data: {
          post: {
            txHash: "tx-1",
            blockNumber: 77,
            payload: { cat: "OBSERVATION" },
          },
        },
      };
    });
    const getHivePosts = vi.fn().mockResolvedValue([
      { txHash: "tx-1", blockNumber: 77, category: "OBSERVATION", text: "hello world" },
    ]);

    const result = await verifyPublishVisibility(
      {
        colony: { getFeed, getPostDetail },
        runtime: { sdkBridge: { getHivePosts } },
      },
      "tx-1",
      "hello world",
      {
        timeoutMs: 10_000,
        pollMs: 1_000,
        limit: 20,
        now: () => now,
        sleep: async (ms) => { now += ms; },
      },
    );

    expect(result).toMatchObject({
      visible: true,
      indexedVisible: true,
      verificationPath: "post_detail",
      txHash: "tx-1",
      observedBlockNumber: 77,
      elapsedMs: 2_000,
    });
    expect(getHivePosts).toHaveBeenCalledTimes(2);
    expect(getPostDetail).toHaveBeenCalledTimes(3);
  });

  it("returns a chain-only result after the deadline if indexing never catches up", async () => {
    let now = 0;
    const result = await verifyPublishVisibility(
      {
        colony: {
          getFeed: vi.fn().mockResolvedValue({
            ok: true,
            data: { posts: [], meta: { lastBlock: 222 } },
          }),
          getPostDetail: vi.fn().mockResolvedValue({ ok: false, status: 404, error: "not_found" }),
        },
        runtime: {
          sdkBridge: {
            getHivePosts: vi.fn().mockResolvedValue([
              { txHash: "tx-2", blockNumber: 88, category: "ANALYSIS", text: "indexed later" },
            ]),
          },
        },
      },
      "tx-2",
      "indexed later",
      {
        timeoutMs: 3_000,
        pollMs: 1_000,
        limit: 20,
        now: () => now,
        sleep: async (ms) => { now += ms; },
      },
    );

    expect(result).toMatchObject({
      visible: true,
      indexedVisible: false,
      verificationPath: "chain",
      txHash: "tx-2",
      observedBlockNumber: 88,
      lastIndexedBlock: 222,
      elapsedMs: 3_000,
      error: "not_found",
    });
  });

  it("uses author-scoped feed as an indexed fallback when generic feed misses the post", async () => {
    let now = 0;
    const genericFeed = vi.fn().mockResolvedValue({
      ok: true,
      data: { posts: [], meta: { lastBlock: 300 } },
    });
    const authorFeed = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        posts: [
          {
            txHash: "tx-3",
            blockNumber: 111,
            category: "ANALYSIS",
            text: "author scoped hit",
          },
        ],
        meta: { lastBlock: 300 },
      },
    });

    const result = await verifyPublishVisibility(
      {
        address: "0xabc",
        colony: {
          getFeed: vi.fn().mockImplementation(async (opts: { limit: number; author?: string }) => (
            opts.author ? authorFeed(opts) : genericFeed(opts)
          )),
          getPostDetail: vi.fn().mockResolvedValue({ ok: false, status: 404, error: "not_found" }),
        },
        runtime: {
          sdkBridge: {
            getHivePosts: vi.fn().mockResolvedValue([]),
          },
        },
      },
      "tx-3",
      "author scoped hit",
      {
        timeoutMs: 3_000,
        pollMs: 1_000,
        limit: 20,
        now: () => now,
        sleep: async (ms) => { now += ms; },
      },
    );

    expect(result).toMatchObject({
      visible: true,
      indexedVisible: true,
      verificationPath: "author_feed",
      txHash: "tx-3",
      observedBlockNumber: 111,
      lastIndexedBlock: 300,
    });
    expect(genericFeed).toHaveBeenCalledTimes(1);
    expect(authorFeed).toHaveBeenCalledTimes(1);
  });
});
