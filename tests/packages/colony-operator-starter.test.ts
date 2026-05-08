import { describe, expect, it } from "vitest";
import { observe } from "../../packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts";

function makeOmni(): any {
  return {
    colony: {
      getSignals: async () => ({
        ok: true,
        data: [
          {
            shortTopic: "BTC funding split",
            confidence: 78,
            direction: "bearish",
            assets: ["BTC"],
          },
          {
            shortTopic: "ETH ETF drift",
            confidence: 61,
            direction: "mixed",
            assets: ["ETH"],
          },
        ],
      }),
      getConvergence: async () => ({
        ok: true,
        data: {
          mindshare: {
            series: [
              {
                shortTopic: "BTC funding split",
                direction: "bearish",
                agentCount: 4,
                totalAgents: 5,
                totalPosts: 6,
                agrees: 3,
                disagrees: 1,
                counts: [],
                sourceTxHashes: ["0xpost1"],
                assets: ["BTC"],
                confidence: 74,
              },
            ],
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [
            {
              txHash: "0xpost1",
              payload: {
                cat: "ANALYSIS",
                text: "BTC funding split is still unresolved.",
                sourceAttestations: [],
              },
              author: "0xauthor1",
              timestamp: Date.UTC(2026, 4, 3, 16, 55, 0),
              replyCount: 1,
              score: 81,
              reactions: { agree: 2, disagree: 1, flag: 0 },
            },
          ],
        },
      }),
      getLeaderboard: async () => ({
        ok: true,
        data: {
          agents: [
            { address: "0xauthor1" },
            { address: "0xauthor2" },
          ],
        },
      }),
      getBalance: async () => ({
        ok: true,
        data: { balance: 42 },
      }),
    },
  };
}

describe("colony-operator starter", () => {
  it("chooses react when a fresh attested thread already has clean agreement", async () => {
    const omni = makeOmni();
    omni.colony.getFeed = async () => ({
      ok: true,
      data: {
        posts: [
          {
            txHash: "0xreact-target",
            payload: {
              cat: "ANALYSIS",
              text: "BTC funding split already has a clean attested thread.",
              sourceAttestations: [
                {
                  url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
                },
              ],
            },
            author: "0xauthor1",
            timestamp: Date.UTC(2026, 4, 3, 16, 58, 0),
            replyCount: 0,
            score: 84,
            reactions: { agree: 3, disagree: 0, flag: 0 },
          },
        ],
      },
    });
    omni.colony.getConvergence = async () => ({
      ok: true,
      data: {
        mindshare: {
          series: [
            {
              shortTopic: "BTC funding split",
              direction: "bearish",
              agentCount: 4,
              totalAgents: 5,
              totalPosts: 6,
              agrees: 3,
              disagrees: 0,
              counts: [],
              sourceTxHashes: ["0xreact-target"],
              assets: ["BTC"],
              confidence: 74,
            },
          ],
        },
      },
    });

    const result = await observe({
      omni,
      cycle: {
        id: "cycle-react",
        iteration: 1,
        startedAt: "2026-05-03T17:02:00.000Z",
        stateDir: "/tmp/colony-operator-starter-test",
        dryRun: true,
      },
      memory: {
        state: {},
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("action");
    if (result.kind !== "action") throw new Error("expected action");
    expect(result.action).toMatchObject({
      type: "react",
      targetTxHash: "0xreact-target",
      reaction: "agree",
    });
    expect(result.facts).toMatchObject({
      topic: "btc funding split",
      selectedAction: "react",
    });
  });

  it("publishes from a multi-surface colony read instead of a single recycled signal check", async () => {
    const result = await observe({
      omni: makeOmni(),
      cycle: {
        id: "cycle-publish",
        iteration: 1,
        startedAt: "2026-05-03T17:00:00.000Z",
        stateDir: "/tmp/colony-operator-starter-test",
        dryRun: true,
      },
      memory: {
        state: {},
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("action");
    if (result.kind !== "action") throw new Error("expected action");
    expect(result.action.type).toBe("publish");
    expect(result.action.attestUrl).toContain("/api/convergence");
    expect(result.action.text).toContain("live across colony surfaces");
    expect(result.facts).toMatchObject({
      topic: "btc funding split",
      selectedAction: "publish",
      signalCount: 2,
      convergenceAgents: 4,
    });
    expect((result.audit?.promptPacket as { observedFacts?: string[] }).observedFacts?.[1]).toContain("Signal sample size: 2");
  });

  it("chooses reply when the live thread is contested and already has attested evidence", async () => {
    const omni = makeOmni();
    omni.colony.getFeed = async () => ({
      ok: true,
      data: {
        posts: [
          {
            txHash: "0xreply-target",
            payload: {
              cat: "ANALYSIS",
              text: "BTC funding split needs a cleaner read.",
              sourceAttestations: [
                {
                  url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
                },
              ],
            },
            author: "0xauthor1",
            timestamp: Date.UTC(2026, 4, 3, 16, 58, 0),
            replyCount: 3,
            score: 84,
            reactions: { agree: 1, disagree: 3, flag: 0 },
          },
        ],
      },
    });
    omni.colony.getConvergence = async () => ({
      ok: true,
      data: {
        mindshare: {
          series: [
            {
              shortTopic: "BTC funding split",
              direction: "bearish",
              agentCount: 4,
              totalAgents: 5,
              totalPosts: 6,
              agrees: 3,
              disagrees: 2,
              counts: [],
              sourceTxHashes: ["0xreply-target"],
              assets: ["BTC"],
              confidence: 74,
            },
          ],
        },
      },
    });

    const result = await observe({
      omni,
      cycle: {
        id: "cycle-reply",
        iteration: 1,
        startedAt: "2026-05-03T17:05:00.000Z",
        stateDir: "/tmp/colony-operator-starter-test",
        dryRun: true,
      },
      memory: {
        state: {},
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("action");
    if (result.kind !== "action") throw new Error("expected action");
    expect(result.action).toMatchObject({
      type: "reply",
      parentTxHash: "0xreply-target",
    });
    expect(result.action.attestUrl).toContain("coingecko");
    expect(result.action.text).toContain("sourced clarification");
  });

  it("treats the cooldown as a generic recent-action gate, not a publish-only gate", async () => {
    const result = await observe({
      omni: makeOmni(),
      cycle: {
        id: "cycle-cooldown",
        iteration: 2,
        startedAt: "2026-05-03T17:20:00.000Z",
        stateDir: "/tmp/colony-operator-starter-test",
        dryRun: true,
      },
      memory: {
        state: {
          lastTopic: "btc funding split",
          lastActionKind: "react",
          lastActionAt: "2026-05-03T17:02:00.000Z",
          lastHandledTxHash: "0xreact-target",
        },
        lastCycle: null,
      },
    });

    expect(result.kind).toBe("skip");
    if (result.kind !== "skip") throw new Error("expected skip");
    expect(result.reason).toBe("acted_within_last_30m");
    expect(result.facts).toMatchObject({
      topic: "btc funding split",
      lastActionKind: "react",
    });
  });
});
