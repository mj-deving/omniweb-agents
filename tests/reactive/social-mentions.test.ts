import { describe, expect, it, vi } from "vitest";

import { createSocialMentionSource } from "../../src/reactive/event-sources/social-mentions.js";
import { makeMention } from "./test-helpers.js";

describe("createSocialMentionSource", () => {
  it("filters feed posts by /ask and the configured agent address", async () => {
    vi.spyOn(Date, "now").mockReturnValue(2_222);
    const fetchFeed = vi.fn().mockResolvedValue([
      makeMention({ txHash: "m1", text: "/ASK @0xAGENTADDRESS hello there" }),
      makeMention({ txHash: "m2", text: "/ask @0xsomeoneelse wrong target" }),
      makeMention({ txHash: "m3", text: "0xagentaddress but no command prefix" }),
    ]);
    const source = createSocialMentionSource({
      fetchFeed,
      agentAddress: "0xAgentAddress",
    });

    await expect(source.poll()).resolves.toEqual({
      timestamp: 2_222,
      mentions: [makeMention({ txHash: "m1", text: "/ASK @0xAGENTADDRESS hello there" })],
    });
  });

  it("emits only new mentions and returns the latest watermark", () => {
    vi.spyOn(Date, "now").mockReturnValue(4_444);
    const source = createSocialMentionSource({
      fetchFeed: vi.fn(),
      agentAddress: "0xAgentAddress",
    });
    const first = makeMention({ txHash: "m1", timestamp: 100 });
    const second = makeMention({ txHash: "m2", timestamp: 200 });

    const diff = source.diff(
      { timestamp: 1, mentions: [first] },
      { timestamp: 2, mentions: [first, second] },
    );

    expect(diff).toEqual([
      {
        id: "social:mentions:200:m2",
        sourceId: "social:mentions",
        type: "ask_mention",
        detectedAt: 4_444,
        payload: second,
        watermark: { txHash: "m2", timestamp: 200 },
      },
    ]);
    expect(source.extractWatermark({ timestamp: 2, mentions: [first, second] })).toEqual({
      txHash: "m2",
      timestamp: 200,
    });
  });

  it("propagates fetchFeed failures", async () => {
    const source = createSocialMentionSource({
      fetchFeed: vi.fn().mockRejectedValue(new Error("feed failed")),
      agentAddress: "0xagent",
    });

    await expect(source.poll()).rejects.toThrow("feed failed");
  });
});
