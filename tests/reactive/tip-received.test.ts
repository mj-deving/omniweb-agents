import { describe, expect, it, vi } from "vitest";

import { createTipReceivedSource } from "../../src/reactive/event-sources/tip-received.js";
import { makeTip } from "./test-helpers.js";

describe("createTipReceivedSource", () => {
  it("polls and returns the fetched tips", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_111);
    const tips = [makeTip({ txHash: "t1" }), makeTip({ txHash: "t2" })];
    const source = createTipReceivedSource({
      fetchTips: vi.fn().mockResolvedValue(tips),
    });

    await expect(source.poll()).resolves.toEqual({ timestamp: 1_111, tips });
    expect(source.id).toBe("social:tips");
    expect(source.eventTypes).toEqual(["tip_received"]);
  });

  it("emits only new tips and returns the latest watermark", () => {
    vi.spyOn(Date, "now").mockReturnValue(2_222);
    const source = createTipReceivedSource({ fetchTips: vi.fn() });
    const first = makeTip({ txHash: "t1", timestamp: 100 });
    const second = makeTip({ txHash: "t2", timestamp: 200 });

    expect(source.diff(null, { timestamp: 1, tips: [first] })).toEqual([
      {
        id: "social:tips:100:t1",
        sourceId: "social:tips",
        type: "tip_received",
        detectedAt: 2_222,
        payload: first,
        watermark: { txHash: "t1", timestamp: 100 },
      },
    ]);

    const diff = source.diff(
      { timestamp: 1, tips: [first] },
      { timestamp: 2, tips: [first, second] },
    );
    expect(diff).toHaveLength(1);
    expect(diff[0].payload.txHash).toBe("t2");
    expect(source.extractWatermark({ timestamp: 2, tips: [first, second] })).toEqual({
      txHash: "t2",
      timestamp: 200,
    });
  });

  it("propagates tip fetch failures", async () => {
    const source = createTipReceivedSource({
      fetchTips: vi.fn().mockRejectedValue(new Error("tips failed")),
    });

    await expect(source.poll()).rejects.toThrow("tips failed");
  });
});
