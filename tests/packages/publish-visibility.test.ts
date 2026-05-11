import { describe, expect, it, vi } from "vitest";

import { verifyPublishVisibility } from "../../packages/omniweb-toolkit/src/publish-visibility";

describe("verifyPublishVisibility", () => {
  it("keeps polling after post-detail visibility and upgrades to indexed feed visibility on a later poll", async () => {
    let now = 0;
    let categoryCalls = 0;
    const getFeed = vi.fn().mockImplementation(async ({ category }: { limit: number; category?: string }) => {
      if (category === "ANALYSIS") {
        categoryCalls += 1;
        return {
          ok: true,
          data: {
            posts: categoryCalls >= 2
              ? [{ txHash: "tx-late", blockNumber: 92, category: "ANALYSIS", text: "delayed category follow-up" }]
              : [],
            meta: { lastBlock: 301 },
          },
        };
      }

      return {
        ok: true,
        data: {
          posts: [],
          meta: { lastBlock: 300 },
        },
      };
    });
    const getPostDetail = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        post: {
          txHash: "tx-late",
          blockNumber: 92,
          payload: { cat: "ANALYSIS" },
        },
      },
    });

    const result = await verifyPublishVisibility(
      {
        colony: { getFeed, getPostDetail },
      },
      "tx-late",
      "delayed category follow-up",
      {
        timeoutMs: 2_000,
        pollMs: 1_000,
        limit: 25,
        now: () => now,
        sleep: async (ms) => { now += ms; },
      },
    );

    expect(result).toMatchObject({
      visible: true,
      indexedVisible: true,
      postDetailVisible: true,
      chainVisible: false,
      visibilitySurface: "feed_indexed",
      verificationPath: "feed",
      feedScope: "category",
      txHash: "tx-late",
      observedCategory: "ANALYSIS",
      observedBlockNumber: 92,
      elapsedMs: 1_000,
      lastIndexedBlock: 301,
    });
    expect(getPostDetail).toHaveBeenCalledTimes(2);
    expect(getFeed).toHaveBeenCalledTimes(4);
  });

  it("waits through the verification window before declaring post_detail-only visibility", async () => {
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
      postDetailVisible: true,
      chainVisible: true,
      visibilitySurface: "post_detail",
      verificationPath: "post_detail",
      txHash: "tx-1",
      observedBlockNumber: 77,
      elapsedMs: 3_000,
    });
    expect(getHivePosts).toHaveBeenCalledTimes(4);
    expect(getPostDetail).toHaveBeenCalledTimes(4);
  });

  it("uses a category-scoped feed follow-up when generic feed window misses the post", async () => {
    let now = 0;
    const getFeed = vi.fn().mockImplementation(async ({ category }: { limit: number; category?: string }) => {
      if (category === "ANALYSIS") {
        return {
          ok: true,
          data: {
            posts: [
              { txHash: "tx-3", blockNumber: 91, category: "ANALYSIS", text: "stablecoin write proof" },
            ],
            meta: { lastBlock: 300 },
          },
        };
      }

      return {
        ok: true,
        data: {
          posts: [],
          meta: { lastBlock: 300 },
        },
      };
    });
    const getPostDetail = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        post: {
          txHash: "tx-3",
          blockNumber: 91,
          payload: { cat: "ANALYSIS" },
        },
      },
    });

    const result = await verifyPublishVisibility(
      {
        colony: { getFeed, getPostDetail },
      },
      "tx-3",
      "stablecoin write proof",
      {
        timeoutMs: 1_000,
        pollMs: 100,
        limit: 25,
        now: () => now,
        sleep: async (ms) => { now += ms; },
      },
    );

    expect(result).toMatchObject({
      visible: true,
      indexedVisible: true,
      postDetailVisible: true,
      chainVisible: false,
      visibilitySurface: "feed_indexed",
      verificationPath: "feed",
      feedScope: "category",
      txHash: "tx-3",
      observedCategory: "ANALYSIS",
      observedBlockNumber: 91,
    });
    expect(getFeed).toHaveBeenCalledTimes(2);
    expect(getFeed).toHaveBeenNthCalledWith(1, { limit: 25 });
    expect(getFeed).toHaveBeenNthCalledWith(2, { limit: 25, category: "ANALYSIS" });
    expect(getPostDetail).toHaveBeenCalledTimes(1);
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
      postDetailVisible: false,
      chainVisible: true,
      visibilitySurface: "chain",
      verificationPath: "chain",
      txHash: "tx-2",
      observedBlockNumber: 88,
      lastIndexedBlock: 222,
      elapsedMs: 3_000,
      error: "not_found",
    });
  });
});
