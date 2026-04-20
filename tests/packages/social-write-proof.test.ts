import { describe, expect, it } from "vitest";

import {
  agentTipReadbackSatisfied,
  hasRecordedTip,
  normalizeAgentTipReadback,
  normalizeBalance,
  normalizeReactionEnvelope,
  normalizeTipReadback,
  parentThreadContainsReply,
  rankSocialWriteCandidates,
  reactionReadbackSatisfied,
  selectSocialWriteCandidate,
  socialWriteCandidateMeetsFloor,
  tipReadbackSatisfied,
  tipSpendObserved,
} from "../../packages/omniweb-toolkit/scripts/_write-proof-shared";

describe("social-write-proof helpers", () => {
  it("prefers leaderboard-quality attested heat over lower-signal posts", () => {
    const candidate = selectSocialWriteCandidate(
      [
        { txHash: "own-1", author: "0xSELF", payload: { text: "skip me" } },
        {
          txHash: "ext-1",
          author: "0xOther",
          payload: {
            text: "low-signal attested post",
            cat: "ANALYSIS",
            sourceAttestations: [{ url: "https://one.example/report.json" }],
          },
          score: 92,
          reactions: { agree: 0, disagree: 0, flag: 0 },
          replyCount: 0,
        },
        {
          txHash: "ext-2",
          author: "0xOther2",
          payload: {
            text: "high-signal attested post",
            cat: "ANALYSIS",
            sourceAttestations: [{ url: "https://two.example/report.json" }],
          },
          score: 88,
          reactions: { agree: 18, disagree: 0, flag: 0 },
          replyCount: 4,
        },
      ],
      "0xself",
    );

    expect(candidate).toEqual({
      txHash: "ext-2",
      author: "0xOther2",
      text: "high-signal attested post",
      category: "ANALYSIS",
      score: 88,
      sourceAttestationUrls: ["https://two.example/report.json"],
      agreeCount: 18,
      disagreeCount: 0,
      flagCount: 0,
      replyCount: 4,
      reactionTotal: 18,
      engagementTotal: 22,
      selectionScore: 113,
    });
  });

  it("accepts snake_case tx_hash feed payloads when attested", () => {
    const candidate = selectSocialWriteCandidate(
      [
        {
          tx_hash: "ext-2",
          author: "0xOther",
          payload: {
            text: "snake case hash",
            sourceAttestations: [{ url: "https://example.com/report.json" }],
          },
        },
      ],
      "0xself",
    );

    expect(candidate?.txHash).toBe("ext-2");
  });

  it("skips unattested external posts entirely", () => {
    const candidate = selectSocialWriteCandidate(
      [
        { txHash: "ext-1", author: "0xOther", payload: { text: "plain post" } },
      ],
      "0xself",
    );

    expect(candidate).toBeNull();
  });

  it("down-ranks controversy-only heat when no superior evidence is available", () => {
    const ranked = rankSocialWriteCandidates(
      [
        {
          txHash: "controversial",
          author: "0xHot",
          payload: {
            text: "hot but heavily disputed",
            sourceAttestations: [{ url: "https://hot.example/report.json" }],
          },
          score: 100,
          reactions: { agree: 1, disagree: 26, flag: 0 },
          replyCount: 12,
        },
        {
          txHash: "supported",
          author: "0xCalm",
          payload: {
            text: "strongly supported attested post",
            sourceAttestations: [{ url: "https://calm.example/report.json" }],
          },
          score: 85,
          reactions: { agree: 23, disagree: 0, flag: 0 },
          replyCount: 6,
        },
      ],
      "0xself",
    );

    expect(ranked.map((candidate) => candidate.txHash)).toEqual(["supported", "controversial"]);
  });

  it("treats cold-room attested posts below the floor as skip candidates", () => {
    const ranked = rankSocialWriteCandidates(
      [
        {
          txHash: "cold-1",
          author: "0xOther",
          payload: {
            text: "attested but weak",
            sourceAttestations: [{ url: "https://example.com/cold-1.json" }],
          },
          score: 80,
          reactions: { agree: 0, disagree: 0, flag: 0 },
          replyCount: 0,
        },
        {
          txHash: "cold-2",
          author: "0xOther2",
          payload: {
            text: "slightly warmer but still weak",
            sourceAttestations: [{ url: "https://example.com/cold-2.json" }],
          },
          score: 80,
          reactions: { agree: 2, disagree: 0, flag: 0 },
          replyCount: 0,
        },
      ],
      "0xself",
    );

    expect(ranked.map((candidate) => socialWriteCandidateMeetsFloor(candidate))).toEqual([false, false]);
  });

  it("accepts reaction readback via myReaction or count delta", () => {
    expect(
      reactionReadbackSatisfied(
        normalizeReactionEnvelope({ agree: 1, disagree: 0, flag: 0 }),
        normalizeReactionEnvelope({ agree: 1, disagree: 0, flag: 0, myReaction: "agree" }),
        "agree",
      ),
    ).toBe(true);

    expect(
      reactionReadbackSatisfied(
        normalizeReactionEnvelope({ agree: 1, disagree: 0, flag: 0 }),
        normalizeReactionEnvelope({ agree: 2, disagree: 0, flag: 0 }),
        "agree",
      ),
    ).toBe(true);
  });

  it("accepts tip readback via myTip or aggregate deltas", () => {
    expect(
      tipReadbackSatisfied(
        normalizeTipReadback({ totalTips: 1, totalDem: 2 }),
        normalizeTipReadback({ totalTips: 1, totalDem: 2, myTip: 1 }),
        1,
      ),
    ).toBe(true);

    expect(
      tipReadbackSatisfied(
        normalizeTipReadback({ totalTips: 1, totalDem: 2 }),
        normalizeTipReadback({ totalTips: 2, totalDem: 3 }),
        1,
      ),
    ).toBe(true);
  });

  it("accepts recipient agent tip-stat deltas when post tip stats lag", () => {
    expect(
      agentTipReadbackSatisfied(
        normalizeAgentTipReadback({
          tipsReceived: { count: 3, totalDem: 5 },
          tipsGiven: { count: 1, totalDem: 1 },
        }),
        normalizeAgentTipReadback({
          tipsReceived: { count: 4, totalDem: 6 },
          tipsGiven: { count: 1, totalDem: 1 },
        }),
        1,
      ),
    ).toBe(true);

    expect(
      agentTipReadbackSatisfied(
        normalizeAgentTipReadback({
          tipsReceived: { count: 3, totalDem: 5 },
          tipsGiven: { count: 1, totalDem: 1 },
        }),
        normalizeAgentTipReadback({
          tipsReceived: { count: 3, totalDem: 5 },
          tipsGiven: { count: 1, totalDem: 1 },
        }),
        1,
      ),
    ).toBe(false);
  });

  it("requires a recipient baseline before accepting tip-stat convergence", () => {
    expect(
      agentTipReadbackSatisfied(
        null,
        normalizeAgentTipReadback({
          tipsReceived: { count: 4, totalDem: 6 },
          tipsGiven: { count: 1, totalDem: 1 },
        }),
        1,
      ),
    ).toBe(false);
  });

  it("tracks balance deltas separately from tip-specific readback", () => {
    expect(
      tipSpendObserved(
        normalizeBalance("10"),
        normalizeBalance("8.8"),
        1,
      ),
    ).toBe(true);

    expect(
      tipReadbackSatisfied(
        normalizeTipReadback({ totalTips: 1, totalDem: 2 }),
        normalizeTipReadback({ totalTips: 1, totalDem: 2 }),
        1,
      ),
    ).toBe(false);
  });

  it("does not treat zero-valued myTip as a successful tip readback", () => {
    expect(hasRecordedTip(0)).toBe(false);
    expect(hasRecordedTip("0")).toBe(false);
    expect(hasRecordedTip(1)).toBe(true);
  });

  it("requires a new myTip delta when a post was already tipped", () => {
    expect(
      tipReadbackSatisfied(
        normalizeTipReadback({ totalTips: 1, totalDem: 2, myTip: 2 }),
        normalizeTipReadback({ totalTips: 1, totalDem: 2, myTip: 2 }),
        1,
      ),
    ).toBe(false);
  });

  it("detects a reply in parent thread detail", () => {
    expect(parentThreadContainsReply({ replies: [{ txHash: "reply-1" }, { txHash: "reply-2" }] }, "reply-2")).toBe(true);
    expect(parentThreadContainsReply({ replies: [{ txHash: "reply-1" }] }, "reply-2")).toBe(false);
  });
});
