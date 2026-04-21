import { afterEach, describe, expect, it, vi } from "vitest";
import { observe } from "../../packages/omniweb-toolkit/assets/research-agent-starter.ts";

const originalFetch = globalThis.fetch;

function makeOmni(): any {
  return {
    colony: {
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [
            {
              txHash: "0xfeed1",
              payload: {
                cat: "FEED",
                text: "ETH dominates the macro conversation again.",
              },
              author: "0xabc",
              timestamp: Date.UTC(2026, 3, 17, 14, 0, 0),
            },
          ],
        },
      }),
      getSignals: async () => ({
        ok: true,
        data: [
          {
            shortTopic: "BTC Funding Rate Contrarian",
            text: "Derivatives positioning looks more bearish than spot action currently justifies.",
            confidence: 76,
            direction: "bearish",
            keyInsight: "Funding is rolling over while the colony still has mixed conviction on whether spot can absorb it.",
            agentCount: 4,
            totalAgents: 4,
            tags: ["BTC", "funding", "sentiment"],
            assets: ["BTC"],
            sourcePostData: [
              {
                txHash: "0xsig1",
                author: "0xagent1",
                text: "Funding is rolling over while open interest stays elevated.",
                cat: "ANALYSIS",
                timestamp: Date.UTC(2026, 3, 17, 13, 0, 0),
                confidence: 82,
                reactions: { agree: 2, disagree: 0, flag: 0 },
                dissents: false,
              },
            ],
            crossReferences: [
              {
                type: "cross_asset",
                description: "BTC positioning stress is also showing up in dollar-liquidity discussions.",
                assets: ["BTC", "DXY"],
              },
            ],
            reactionSummary: {
              totalAgrees: 2,
              totalDisagrees: 0,
              totalFlags: 0,
            },
          },
        ],
      }),
      getLeaderboard: async () => ({
        ok: true,
        data: [{ address: "0x1" }, { address: "0x2" }],
      }),
      getBalance: async () => ({
        ok: true,
        data: { balance: 25 },
      }),
    },
    runtime: {
      llmProvider: {
        name: "test-provider",
        complete: async () =>
          "BTC futures lean bearish without panic: mark is $67,250 against a $67,245 index while funding sits at -0.012, so shorts are paying before spot has actually broken. " +
          "That is positioning stress, not confirmation. If funding normalizes or spot reclaims premium, the bearish read weakens.",
      },
    },
  };
}

describe("simple research-agent starter", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("publishes from a single attested evidence packet and records the simplified audit trail", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          markPrice: "67250.00",
          indexPrice: "67245.12",
          lastFundingRate: "-0.012",
          interestRate: "0.0001",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const result = await observe({
      omni: makeOmni(),
      cycle: {
        id: "cycle-1",
        iteration: 1,
        startedAt: "2026-04-18T08:00:00.000Z",
        stateDir: "/tmp/research-starter-simple-test",
        dryRun: true,
      },
      memory: {
        state: {},
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("publish");
    if (result.kind !== "publish") throw new Error("expected publish");
    expect(result.text).toContain("67,250");
    expect(result.attestUrl).toContain("premiumIndex");
    expect((result.audit?.selectedEvidence as { evidenceSummary?: { values?: Record<string, string> } }).evidenceSummary?.values?.lastFundingRate)
      .toBe("-0.012");
    expect((result.audit?.promptPacket as { leaderboardPatternPrompt?: string }).leaderboardPatternPrompt)
      .toContain("Observed facts:");
  });

  it("skips during the cooldown instead of forcing another research publish", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          markPrice: "67250.00",
          indexPrice: "67245.12",
          lastFundingRate: "-0.012",
          interestRate: "0.0001",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const result = await observe({
      omni: makeOmni(),
      cycle: {
        id: "cycle-2",
        iteration: 2,
        startedAt: "2026-04-18T08:15:00.000Z",
        stateDir: "/tmp/research-starter-simple-test",
        dryRun: true,
      },
      memory: {
        state: {
          lastCoverageTopic: "older-topic",
          lastPublishedAt: "2026-04-18T08:00:00.000Z",
        },
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("skip");
    if (result.kind !== "skip") throw new Error("expected skip");
    expect(result.reason).toBe("published_within_last_30m");
  });

  it("keeps working when the optional leaderboard read fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          markPrice: "67250.00",
          indexPrice: "67245.12",
          lastFundingRate: "-0.012",
          interestRate: "0.0001",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;

    const omni = makeOmni();
    omni.colony.getLeaderboard = async () => {
      throw new Error("leaderboard temporarily unavailable");
    };

    const result = await observe({
      omni,
      cycle: {
        id: "cycle-3",
        iteration: 1,
        startedAt: "2026-04-18T08:00:00.000Z",
        stateDir: "/tmp/research-starter-simple-test",
        dryRun: true,
      },
      memory: {
        state: {},
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("publish");
    if (result.kind !== "publish") throw new Error("expected publish");
    expect(result.facts).toMatchObject({
      topic: "btc funding rate contrarian",
      researchFamily: "funding-structure",
    });
  });
});
