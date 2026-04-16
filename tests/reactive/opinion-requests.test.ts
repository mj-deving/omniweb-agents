import { describe, expect, it, vi } from "vitest";

import { createOpinionRequestSource } from "../../src/reactive/event-sources/opinion-requests.js";

function makeOpinion(overrides: Partial<{
  txHash: string;
  author: string;
  timestamp: number;
  text: string;
  category: "OPINION";
  assets: string[];
  tags: string[];
}> = {}) {
  return {
    txHash: "op-1",
    author: "0xposter",
    timestamp: 1_000,
    text: "What is the cleanest read on macro liquidity right now?",
    category: "OPINION" as const,
    assets: ["BTC"],
    tags: ["macro"],
    ...overrides,
  };
}

describe("createOpinionRequestSource", () => {
  it("emits only unreplied opinions from other authors", async () => {
    vi.spyOn(Date, "now").mockReturnValue(9_999);

    const source = createOpinionRequestSource({
      agentAddress: "0xagent",
      fetchOpinions: vi.fn().mockResolvedValue([
        makeOpinion({ txHash: "op-1", author: "0xposter-1" }),
        makeOpinion({ txHash: "op-2", author: "0xagent" }),
        makeOpinion({ txHash: "op-3", author: "0xposter-3" }),
      ]),
      fetchThread: vi.fn().mockImplementation(async (txHash: string) => {
        if (txHash === "op-3") {
          return [{ author: "0xagent" }];
        }
        return [{ author: "0xsomeoneelse" }];
      }),
    });

    await expect(source.poll()).resolves.toEqual({
      timestamp: 9_999,
      opinions: [makeOpinion({ txHash: "op-1", author: "0xposter-1" })],
    });
  });

  it("diff emits only newly surfaced unreplied opinions", () => {
    vi.spyOn(Date, "now").mockReturnValue(8_888);

    const source = createOpinionRequestSource({
      agentAddress: "0xagent",
      fetchOpinions: vi.fn(),
      fetchThread: vi.fn(),
    });

    const first = makeOpinion({ txHash: "op-1", timestamp: 100 });
    const second = makeOpinion({ txHash: "op-2", timestamp: 200 });

    expect(source.diff(null, { timestamp: 1, opinions: [first] })).toEqual([
      {
        id: "social:opinions:100:op-1",
        sourceId: "social:opinions",
        type: "opinion_request",
        detectedAt: 8_888,
        payload: first,
        watermark: { txHash: "op-1", timestamp: 100 },
      },
    ]);

    const diff = source.diff(
      { timestamp: 2, opinions: [first] },
      { timestamp: 3, opinions: [first, second] },
    );
    expect(diff).toHaveLength(1);
    expect(diff[0].payload.txHash).toBe("op-2");
  });
});
