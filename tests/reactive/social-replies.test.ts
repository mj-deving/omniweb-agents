import { describe, expect, it, vi } from "vitest";

import { createSocialReplySource } from "../../src/reactive/event-sources/social-replies.js";
import { makeReply } from "./test-helpers.js";

describe("createSocialReplySource", () => {
  it("filters replies to the agent's known transaction hashes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(3_333);
    const fetchFeed = vi.fn().mockResolvedValue([
      makeReply({ txHash: "r1", replyTo: "tx-own-1" }),
      makeReply({ txHash: "r2", replyTo: "tx-other" }),
    ]);
    const source = createSocialReplySource({
      fetchFeed,
      ownTxHashes: () => new Set(["tx-own-1"]),
    });

    await expect(source.poll()).resolves.toEqual({
      timestamp: 3_333,
      posts: [makeReply({ txHash: "r1", replyTo: "tx-own-1" })],
    });
  });

  it("emits replies not present in the previous snapshot and returns the latest watermark", () => {
    vi.spyOn(Date, "now").mockReturnValue(6_666);
    const source = createSocialReplySource({
      fetchFeed: vi.fn(),
      ownTxHashes: () => new Set(["tx-own-1"]),
    });
    const first = makeReply({ txHash: "r1", timestamp: 100 });
    const second = makeReply({ txHash: "r2", timestamp: 200 });

    expect(source.diff(null, { timestamp: 1, posts: [first] })).toEqual([
      {
        id: "social:replies:100:r1",
        sourceId: "social:replies",
        type: "reply",
        detectedAt: 6_666,
        payload: first,
        watermark: { txHash: "r1", timestamp: 100 },
      },
    ]);

    const diff = source.diff(
      { timestamp: 2, posts: [first] },
      { timestamp: 3, posts: [first, second] },
    );
    expect(diff).toHaveLength(1);
    expect(diff[0].payload.txHash).toBe("r2");
    expect(source.extractWatermark({ timestamp: 3, posts: [first, second] })).toEqual({
      txHash: "r2",
      timestamp: 200,
    });
  });

  it("propagates feed failures", async () => {
    const source = createSocialReplySource({
      fetchFeed: vi.fn().mockRejectedValue(new Error("feed failed")),
      ownTxHashes: () => new Set(["tx-own-1"]),
    });

    await expect(source.poll()).rejects.toThrow("feed failed");
  });
});
