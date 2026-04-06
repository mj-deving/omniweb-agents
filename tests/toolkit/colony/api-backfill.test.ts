import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SuperColonyApiClient } from "../../../src/toolkit/supercolony/api-client.js";

const insertPostMock = vi.fn();
const postExistsResults = new Map<string, boolean>();

vi.mock("../../../src/toolkit/colony/posts.js", () => ({
  insertPost: (...args: unknown[]) => insertPostMock(...args),
}));

// We need to test postExists behavior — mock the db.prepare chain
function createMockDb() {
  return {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn(),
      get: vi.fn().mockImplementation((txHash: string) =>
        postExistsResults.get(txHash) ? { 1: 1 } : undefined,
      ),
    }),
  } as any;
}

function mockClient(pages: Array<{ posts: any[]; hasMore: boolean }>): SuperColonyApiClient {
  const getFeed = vi.fn();
  for (const page of pages) {
    getFeed.mockResolvedValueOnce({ ok: true, data: page });
  }
  return { getFeed } as unknown as SuperColonyApiClient;
}

function makePost(txHash: string) {
  return {
    txHash,
    author: "0xa1",
    timestamp: 1700000000000,
    payload: { cat: "ANALYSIS", text: `Post ${txHash}`, tags: [] },
    blockNumber: 100,
    reactions: { agree: 5, disagree: 0 },
  };
}

import { syncColonyFromApi, backfillFromApi } from "../../../src/toolkit/colony/api-backfill.js";

beforeEach(() => {
  vi.clearAllMocks();
  postExistsResults.clear();
});

describe("syncColonyFromApi", () => {
  it("fetches and inserts new posts", async () => {
    const client = mockClient([
      { posts: [makePost("0x1"), makePost("0x2")], hasMore: true },
      { posts: [makePost("0x3")], hasMore: false },
    ]);
    const db = createMockDb();

    const stats = await syncColonyFromApi(db, client);

    expect(stats.fetched).toBe(3);
    expect(stats.inserted).toBe(3);
    expect(stats.duplicates).toBe(0);
    expect(stats.pages).toBe(2);
  });

  it("stops when an entire page is duplicates (gap bridged)", async () => {
    // Page 1: 2 new posts. Page 2: all duplicates.
    postExistsResults.set("0x3", true);
    postExistsResults.set("0x4", true);

    const client = mockClient([
      { posts: [makePost("0x1"), makePost("0x2")], hasMore: true },
      { posts: [makePost("0x3"), makePost("0x4")], hasMore: true },
      { posts: [makePost("0x5")], hasMore: false }, // should never be reached
    ]);
    const db = createMockDb();

    const stats = await syncColonyFromApi(db, client);

    expect(stats.pages).toBe(2);
    expect(stats.inserted).toBe(2);
    expect(stats.duplicates).toBe(2);
    expect(client.getFeed).toHaveBeenCalledTimes(2); // 3rd page never fetched
  });

  it("returns immediately when first page is all duplicates (no gap)", async () => {
    postExistsResults.set("0x1", true);
    postExistsResults.set("0x2", true);

    const client = mockClient([
      { posts: [makePost("0x1"), makePost("0x2")], hasMore: true },
    ]);
    const db = createMockDb();

    const stats = await syncColonyFromApi(db, client);

    expect(stats.pages).toBe(1);
    expect(stats.inserted).toBe(0);
    expect(stats.duplicates).toBe(2);
    expect(client.getFeed).toHaveBeenCalledTimes(1);
  });

  it("handles empty DB (fetches all pages until hasMore=false)", async () => {
    const client = mockClient([
      { posts: [makePost("0x1"), makePost("0x2")], hasMore: true },
      { posts: [makePost("0x3")], hasMore: false },
    ]);
    const db = createMockDb();

    const stats = await syncColonyFromApi(db, client);

    expect(stats.fetched).toBe(3);
    expect(stats.inserted).toBe(3);
    expect(stats.pages).toBe(2);
  });

  it("stops when API returns null", async () => {
    const client = { getFeed: vi.fn().mockResolvedValue(null) } as unknown as SuperColonyApiClient;
    const db = createMockDb();

    const stats = await syncColonyFromApi(db, client);

    expect(stats.fetched).toBe(0);
    expect(stats.pages).toBe(0);
  });

  it("calls onProgress callback", async () => {
    const client = mockClient([
      { posts: [makePost("0x1")], hasMore: false },
    ]);
    const db = createMockDb();
    const onProgress = vi.fn();

    await syncColonyFromApi(db, client, { onProgress });

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ fetched: 1, pages: 1 }));
  });

  it("respects maxPages safety valve", async () => {
    // Create a client that always returns new posts with hasMore=true
    const getFeed = vi.fn().mockResolvedValue({
      ok: true,
      data: { posts: [makePost("0x" + Math.random().toString(16).slice(2))], hasMore: true },
    });
    const client = { getFeed } as unknown as SuperColonyApiClient;
    const db = createMockDb();

    const stats = await syncColonyFromApi(db, client, { maxPages: 3 });

    expect(stats.pages).toBe(3);
    expect(getFeed).toHaveBeenCalledTimes(3);
  });
});

describe("backfillFromApi (legacy)", () => {
  it("respects explicit limit", async () => {
    const client = mockClient([
      { posts: [makePost("0x1"), makePost("0x2")], hasMore: true },
    ]);
    const db = createMockDb();

    const stats = await backfillFromApi(db, client, { limit: 2, batchSize: 2 });

    expect(stats.fetched).toBe(2);
  });
});
