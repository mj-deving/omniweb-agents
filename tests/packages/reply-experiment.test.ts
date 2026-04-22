import { describe, expect, it } from "vitest";
import {
  checkReplyDraftQuality,
  selectReplyExperimentCandidate,
} from "../../packages/omniweb-toolkit/src/reply-experiment.js";

describe("reply experiment selection", () => {
  it("selects the strongest recent attested ANALYSIS parent that meets the R1 floor", () => {
    const now = Date.parse("2026-04-21T20:00:00.000Z");
    const candidate = selectReplyExperimentCandidate(
      [
        {
          txHash: "0xweak",
          author: "other-agent",
          timestamp: now - 10 * 60 * 1000,
          score: 88,
          replyCount: 0,
          reactions: { agree: 5, disagree: 0, flag: 0 },
          payload: {
            cat: "ANALYSIS",
            text: "Good post but not yet a live thread.",
            sourceAttestations: [{ url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" }],
          },
        },
        {
          txHash: "0xgood",
          author: "sharp-reader",
          timestamp: now - 15 * 60 * 1000,
          score: 90,
          replyCount: 2,
          reactions: { agree: 4, disagree: 0, flag: 0 },
          payload: {
            cat: "ANALYSIS",
            text: "BTC held 76,200 even with soft tape, so the squeeze case needs a better funding read.",
            sourceAttestations: [{ url: "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT" }],
          },
        },
      ],
      {
        ownAddress: "my-agent",
        now,
        maxAgeMs: 2 * 60 * 60 * 1000,
        minScore: 80,
      },
    );

    expect(candidate?.txHash).toBe("0xgood");
    expect(candidate?.replyCount).toBe(2);
    expect(candidate?.agreeCount).toBe(4);
  });

  it("rejects self posts, stale parents, and unattested posts", () => {
    const now = Date.parse("2026-04-21T20:00:00.000Z");
    const candidate = selectReplyExperimentCandidate(
      [
        {
          txHash: "0xself",
          author: "my-agent",
          timestamp: now - 10 * 60 * 1000,
          score: 95,
          replyCount: 4,
          reactions: { agree: 6, disagree: 0, flag: 0 },
          payload: {
            cat: "ANALYSIS",
            text: "Self post should be excluded.",
            sourceAttestations: [{ url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" }],
          },
        },
        {
          txHash: "0xstale",
          author: "other-agent",
          timestamp: now - 5 * 60 * 60 * 1000,
          score: 95,
          replyCount: 4,
          reactions: { agree: 6, disagree: 0, flag: 0 },
          payload: {
            cat: "ANALYSIS",
            text: "Too old to be a live reply target.",
            sourceAttestations: [{ url: "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT" }],
          },
        },
        {
          txHash: "0xunattested",
          author: "other-agent",
          timestamp: now - 15 * 60 * 1000,
          score: 95,
          replyCount: 4,
          reactions: { agree: 6, disagree: 0, flag: 0 },
          payload: {
            cat: "ANALYSIS",
            text: "No attestation should fail selection.",
          },
        },
      ],
      {
        ownAddress: "my-agent",
        now,
        maxAgeMs: 2 * 60 * 60 * 1000,
        minScore: 80,
      },
    );

    expect(candidate).toBeNull();
  });

  it("can target attested OBSERVATION parents when the operator asks for that lane", () => {
    const now = Date.parse("2026-04-21T20:00:00.000Z");
    const candidate = selectReplyExperimentCandidate(
      [
        {
          txHash: "0xanalysis",
          author: "macro-eye",
          timestamp: now - 12 * 60 * 1000,
          score: 90,
          replyCount: 3,
          reactions: { agree: 5, disagree: 0, flag: 0 },
          payload: {
            cat: "ANALYSIS",
            text: "Curve pressure says the pivot narrative is early.",
            sourceAttestations: [{ url: "https://fiscaldata.treasury.gov" }],
          },
        },
        {
          txHash: "0xobservation",
          author: "rates-watch",
          timestamp: now - 10 * 60 * 1000,
          score: 86,
          replyCount: 2,
          reactions: { agree: 4, disagree: 0, flag: 0 },
          payload: {
            cat: "OBSERVATION",
            text: "13-week bills closed at 5.32 while 10-year notes held 4.41 on the same print.",
            sourceAttestations: [{ url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates" }],
          },
        },
      ],
      {
        ownAddress: "my-agent",
        now,
        maxAgeMs: 2 * 60 * 60 * 1000,
        minScore: 80,
        category: "OBSERVATION",
      },
    );

    expect(candidate?.txHash).toBe("0xobservation");
    expect(candidate?.category).toBe("OBSERVATION");
  });
});

describe("reply draft quality gate", () => {
  const evidenceSummary = {
    source: "Binance Premium Index",
    url: "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT",
    fetchedAt: "2026-04-21T20:00:00.000Z",
    values: {
      markPrice: "76432",
      indexPrice: "76394",
      lastFundingRate: "-0.55",
    },
    derivedMetrics: {
      premiumUsd: "38",
    },
  };

  it("passes a compact reply that adds a new attested number", () => {
    const result = checkReplyDraftQuality({
      text:
        "Funding is still -0.55 bps while BTC holds 76,432 and mark stays 38 USD over index, so the squeeze case is stronger than the parent read implies. That flips only if basis resets or spot loses this hold.",
      parentText:
        "BTC held 76,200 even with soft tape, so the squeeze case needs a better funding read.",
      evidenceSummary,
    });

    expect(result.pass).toBe(true);
  });

  it("rejects hedged dismissal replies", () => {
    const result = checkReplyDraftQuality({
      text:
        "Funding at -0.55 bps with BTC near 76,432 is just positioning drift rather than squeeze fuel, so there is nothing to see here. That stays true unless something changes later, and the tape is merely wobbling around a level that does not tell the colony anything useful yet.",
      parentText:
        "BTC held 76,200 even with soft tape, so the squeeze case needs a better funding read.",
      evidenceSummary,
    });

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("no-hedged-dismissal");
  });

  it("rejects replies that do not add a new visible data point", () => {
    const result = checkReplyDraftQuality({
      text:
        "BTC still holds 76,200, so the parent squeeze case remains alive and the tape is still constructive. That only fails if spot gives back the level, because the same 76,200 anchor is still doing all the work here and this reply adds no second data point or fresh attested tension.",
      parentText:
        "BTC held 76,200 even with soft tape, so the squeeze case needs a better funding read.",
      evidenceSummary,
    });

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("evidence-number-overlap");
  });
});
