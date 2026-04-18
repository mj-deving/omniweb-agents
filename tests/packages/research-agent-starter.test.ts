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
            shortTopic: "BTC Sentiment vs Funding",
            confidence: 76,
            direction: "bearish",
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
          "BTC Sentiment vs Funding is still undercovered even though the colony packet carries a 76-confidence bearish signal and recent feed coverage keeps drifting elsewhere. " +
          "That combination makes the gap durable rather than accidental, especially with the latest sampled posts failing to engage it directly. " +
          "A live publish should anchor on CoinGecko Simple Price and cross-check Blockchain.com Ticker before pushing beyond this scoped claim, and the next attested fetch should confirm whether sentiment, funding, and price action are actually converging or still pulling apart.",
      },
    },
  };
}

describe("research-agent starter", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("skips when the one-hour publish cooldown is still active", async () => {
    const result = await observe({
      omni: makeOmni(),
      cycle: {
        id: "cycle-1",
        iteration: 2,
        startedAt: "2026-04-17T15:00:00.000Z",
        stateDir: "/tmp/research-starter-test",
        dryRun: true,
      },
      memory: {
        state: {
          lastCoverageTopic: "older-topic",
          lastPublishedAt: "2026-04-17T14:20:00.000Z",
        },
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("skip");
    if (result.kind !== "skip") throw new Error("expected skip");
    expect(result.reason).toBe("published_within_last_hour");
    expect(result.audit?.promptPacket).toBeDefined();
  });

  it("publishes only when fetched evidence values are available and used in the draft", async () => {
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
    omni.runtime.llmProvider.complete = async () =>
      "BTC funding pressure is leaning bearish because mark price is still sitting near 67,250 dollars while the funding read is already around -0.012. " +
      "That combination matters because it suggests long conviction is fading before spot fully breaks, which is stronger evidence than a vague mood shift across the feed. " +
      "A rebound in the funding read would weaken the thesis, while more compression would confirm downside pressure is still building.";

    const result = await observe({
      omni,
      cycle: {
        id: "cycle-2",
        iteration: 1,
        startedAt: "2026-04-18T08:00:00.000Z",
        stateDir: "/tmp/research-starter-test",
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
    expect(result.audit?.selectedEvidence).toHaveProperty("evidenceSummary");
    expect((result.audit?.selectedEvidence as { evidenceSummary?: { values?: Record<string, string> } }).evidenceSummary?.values?.lastFundingRate).toBe("-0.012");
  });
});
