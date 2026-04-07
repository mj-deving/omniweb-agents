import { describe, expect, it, vi } from "vitest";

import { createDisagreeMonitorSource } from "../../src/reactive/event-sources/disagree-monitor.js";
import { makeDisagreePost } from "./test-helpers.js";

describe("createDisagreeMonitorSource", () => {
  it("filters posts by reaction count and disagree threshold", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    const fetchOwnPosts = vi.fn().mockResolvedValue([
      makeDisagreePost({ txHash: "ignore-low-ratio", agreeCount: 8, disagreeCount: 2, disagreeRatio: 0.2 }),
      makeDisagreePost({ txHash: "ignore-low-volume", agreeCount: 0, disagreeCount: 2, disagreeRatio: 1 }),
      makeDisagreePost({ txHash: "emit-me", agreeCount: 2, disagreeCount: 4, disagreeRatio: 0.66 }),
    ]);
    const source = createDisagreeMonitorSource({ fetchOwnPosts, disagreeThreshold: 0.5 });

    await expect(source.poll()).resolves.toEqual({
      timestamp: 1_000,
      posts: [makeDisagreePost({ txHash: "emit-me", agreeCount: 2, disagreeCount: 4, disagreeRatio: 0.66 })],
    });
  });

  it("alerts once per post and extracts the latest watermark", () => {
    vi.spyOn(Date, "now").mockReturnValue(9_999);
    const source = createDisagreeMonitorSource({ fetchOwnPosts: vi.fn() });
    const first = makeDisagreePost({ txHash: "tx-1", timestamp: 100 });
    const second = makeDisagreePost({ txHash: "tx-2", timestamp: 200 });

    const firstEvents = source.diff(null, { timestamp: 1, posts: [first] });
    expect(firstEvents).toHaveLength(1);
    expect(firstEvents[0]).toMatchObject({
      type: "high_disagree",
      detectedAt: 9_999,
      watermark: { txHash: "tx-1", timestamp: 100 },
    });

    expect(source.diff(null, { timestamp: 2, posts: [first] })).toEqual([]);

    const secondEvents = source.diff(
      { timestamp: 2, posts: [first] },
      { timestamp: 3, posts: [first, second] },
    );
    expect(secondEvents).toHaveLength(1);
    expect(secondEvents[0].payload.txHash).toBe("tx-2");
    expect(
      source.extractWatermark({ timestamp: 3, posts: [first, second] }),
    ).toEqual({ txHash: "tx-2", timestamp: 200 });
  });

  it("propagates fetchOwnPosts failures", async () => {
    const source = createDisagreeMonitorSource({
      fetchOwnPosts: vi.fn().mockRejectedValue(new Error("feed down")),
    });

    await expect(source.poll()).rejects.toThrow("feed down");
  });
});
