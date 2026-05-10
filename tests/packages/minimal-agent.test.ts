import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compilePolicyDecision,
  executeResolvedIntent,
  getDefaultMinimalStateDir,
  normalizeDecisionToPolicyActionRequest,
  normalizeDecisionToResolvedIntent,
  planPolicyExecution,
  resolveActionRequest,
  runMinimalAgentCycle,
  runMinimalAgentLoop,
  runPolicyWithTrace,
  type PolicyDefinition,
} from "../../packages/omniweb-toolkit/src/minimal-agent.js";
import { executeMinimalAction } from "../../packages/omniweb-toolkit/src/minimal-agent-executor.ts";
import { describeRuntimeCapabilities } from "../../packages/omniweb-toolkit/src/readiness.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(resolve(tmpdir(), "minimal-agent-"));
  tempDirs.push(dir);
  return dir;
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf-8"));
}

function makeNow(...values: number[]): () => number {
  const queue = [...values];
  const last = values[values.length - 1] ?? Date.now();
  return () => queue.shift() ?? last;
}

function makeOmni(overrides?: Partial<any>): any {
  return {
    colony: {
      publish: vi.fn().mockResolvedValue({
        ok: true,
        data: { txHash: "0xpublish" },
        provenance: { path: "local", latencyMs: 15 },
      }),
      reply: vi.fn().mockResolvedValue({
        ok: true,
        data: { txHash: "0xreply" },
        provenance: { path: "local", latencyMs: 15 },
      }),
      react: vi.fn().mockResolvedValue({
        ok: true,
      }),
      tip: vi.fn().mockResolvedValue({
        ok: true,
        data: { txHash: "0xtip", validated: true },
      }),
      placeBet: vi.fn().mockResolvedValue({
        ok: true,
        data: { txHash: "0xbet", memo: "HIVE_BET:BTC:50000:24h", amount: 5, registered: true },
      }),
      placeHL: vi.fn().mockResolvedValue({
        ok: true,
        data: { txHash: "0xhl", memo: "HIVE_HL:BTC:HIGHER:24h", amount: 5, registered: true },
      }),
      getReactions: vi.fn().mockResolvedValue({
        ok: true,
        data: { agree: 0, disagree: 0, flag: 0 },
      }),
      getTipStats: vi.fn().mockResolvedValue({
        ok: true,
        data: { totalTips: 0, totalDem: 0, myTip: 0 },
      }),
      getAgentTipStats: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          tipsGiven: { count: 0, totalDem: 0 },
          tipsReceived: { count: 0, totalDem: 0 },
        },
      }),
      getBalance: vi.fn().mockResolvedValue({
        ok: true,
        data: { balance: 100 },
      }),
      getPool: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          asset: "BTC",
          horizon: "24h",
          totalBets: 1,
          totalDem: 5,
          poolAddress: "0xpool",
          roundEnd: 1,
          bets: [{ txHash: "0xexisting", bettor: "0xother", predictedPrice: 50000, amount: 5, roundEnd: 1, horizon: "24h" }],
        },
      }),
      getHigherLowerPool: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          asset: "BTC",
          horizon: "24h",
          totalHigher: 5,
          totalLower: 0,
          totalDem: 5,
          higherCount: 1,
          lowerCount: 0,
          roundEnd: 1,
          referencePrice: 50000,
          poolAddress: "0xhl-pool",
          currentPrice: 49900,
        },
      }),
      getFeed: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          posts: [],
          meta: { lastBlock: 123 },
        },
      }),
      getPostDetail: vi.fn().mockResolvedValue({
        ok: false,
        error: "not_found",
      }),
      ...overrides?.colony,
    },
    runtime: {
      sdkBridge: {},
      ...overrides?.runtime,
    },
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map(async (dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("minimal agent runtime", () => {
  it("adapts legacy decisions into PolicyActionRequest without changing resolution truth", async () => {
    const dir = await createTempDir();
    const blockedCapabilities = describeRuntimeCapabilities({ cwd: dir, homeDir: dir, env: {} });
    const writeReadyCapabilities = {
      ...blockedCapabilities,
      actionFamilies: {
        ...blockedCapabilities.actionFamilies,
        publish: {
          ...blockedCapabilities.actionFamilies.publish,
          executable: true,
          readiness: "ready",
        },
        reply: {
          ...blockedCapabilities.actionFamilies.reply,
          executable: true,
          readiness: "ready",
        },
        react: {
          ...blockedCapabilities.actionFamilies.react,
          executable: true,
          readiness: "ready",
        },
      },
    };

    const publishRequest = normalizeDecisionToPolicyActionRequest({
      kind: "publish",
      category: "OBSERVATION",
      text: "hello",
      attestUrl: "https://example.com/a.json",
      tags: ["bridge"],
      confidence: 77,
      audit: {
        inputs: { topic: "coverage-gap" },
        notes: ["route:publish"],
      },
    });
    const publish = resolveActionRequest(publishRequest, { runtimeCapabilities: writeReadyCapabilities });
    const react = normalizeDecisionToResolvedIntent({
      kind: "action",
      action: { type: "react", targetTxHash: "0xabc", reaction: "agree" },
      readiness: { requiresWallet: true, requiresTargetPost: true },
    }, { runtimeCapabilities: writeReadyCapabilities });
    const blockedPublish = normalizeDecisionToResolvedIntent({
      kind: "publish",
      category: "OBSERVATION",
      text: "blocked",
      attestUrl: "https://example.com/a.json",
    }, { runtimeCapabilities: blockedCapabilities });
    const blockedTip = normalizeDecisionToResolvedIntent({
      kind: "action",
      action: { type: "tip", targetTxHash: "0xabc", amount: 5 },
    }, { runtimeCapabilities: blockedCapabilities });
    const executableTip = normalizeDecisionToResolvedIntent({
      kind: "action",
      action: { type: "tip", targetTxHash: "0xready-tip", amount: 5 },
    }, {
      runtimeCapabilities: {
        ...writeReadyCapabilities,
        actionFamilies: {
          ...writeReadyCapabilities.actionFamilies,
          tip: {
            ...writeReadyCapabilities.actionFamilies.tip,
            executable: true,
            readiness: "ready",
          },
        },
      },
    });

    expect(publishRequest).toEqual({
      actionType: "publish",
      draft: {
        category: "OBSERVATION",
        text: "hello",
        tags: ["bridge"],
        confidence: 77,
      },
      evidenceRequest: {
        primary: "https://example.com/a.json",
        strength: "inherit",
      },
      audit: {
        matchedConditions: ["route:publish"],
        observedInputs: ["topic"],
      },
    });
    expect(publish).toMatchObject({
      status: "executable",
      actionType: "publish",
      executionPathFamily: "direct_attested_write",
      normalizedDraft: {
        text: "hello",
        attestUrl: "https://example.com/a.json",
      },
      evidencePlan: {
        primary: "https://example.com/a.json",
      },
    });
    expect(react).toMatchObject({
      status: "executable",
      actionType: "react",
      executionPathFamily: "reaction",
    });
    expect(blockedPublish).toMatchObject({
      status: "blocked",
      actionType: "publish",
      reasonCodes: ["runtime_capability_blocked"],
      evidencePlan: {
        primary: "https://example.com/a.json",
      },
    });
    expect(blockedTip).toMatchObject({
      status: "blocked",
      actionType: "tip",
      executionPathFamily: "tip_transfer",
      reasonCodes: ["runtime_capability_blocked"],
    });
    expect(executableTip).toMatchObject({
      status: "executable",
      actionType: "tip",
      executionPathFamily: "tip_transfer",
      normalizedDraft: {
        amount: 5,
      },
    });
  });

  it("resolves market-write fields through the shared seam into executable market intents", async () => {
    const dir = await createTempDir();
    const blockedCapabilities = describeRuntimeCapabilities({ cwd: dir, homeDir: dir, env: {} });
    const marketSeamCapabilities = {
      ...blockedCapabilities,
      actionFamilies: {
        ...blockedCapabilities.actionFamilies,
        bet: {
          ...blockedCapabilities.actionFamilies.bet,
          executable: true,
          readiness: "ready" as const,
          proofLevel: "real_runtime_action_family" as const,
          notes: ["test override for market-write execution"],
        },
      },
    };

    const higherLowerDecision = {
      kind: "action" as const,
      action: {
        type: "bet" as const,
        asset: "BTC",
        marketKind: "higher_lower" as const,
        direction: "lower" as const,
        horizon: "24h",
        amount: 5,
      },
      readiness: { requiresWallet: true, requiresMarketContext: true },
    };
    const fixedPriceDecision = {
      kind: "action" as const,
      action: {
        type: "bet" as const,
        asset: "ETH",
        marketKind: "fixed_price" as const,
        predictedPrice: 3_465,
        horizon: "4h",
        amount: 5,
      },
      readiness: { requiresWallet: true, requiresMarketContext: true },
    };

    const higherLowerRequest = normalizeDecisionToPolicyActionRequest(higherLowerDecision);
    const fixedPriceRequest = normalizeDecisionToPolicyActionRequest(fixedPriceDecision);
    const higherLowerResolution = normalizeDecisionToResolvedIntent(higherLowerDecision, {
      runtimeCapabilities: marketSeamCapabilities,
    });
    const fixedPriceResolution = normalizeDecisionToResolvedIntent(fixedPriceDecision, {
      runtimeCapabilities: marketSeamCapabilities,
    });

    expect(higherLowerRequest).toEqual({
      actionType: "bet",
      target: {
        asset: "BTC",
      },
      draft: {
        amount: 5,
        marketKind: "higher_lower",
        horizon: "24h",
        direction: "lower",
      },
    });
    expect(fixedPriceRequest).toEqual({
      actionType: "bet",
      target: {
        asset: "ETH",
      },
      draft: {
        amount: 5,
        marketKind: "fixed_price",
        horizon: "4h",
        predictedPrice: 3_465,
      },
    });
    expect(higherLowerResolution).toMatchObject({
      status: "executable",
      actionType: "bet",
      executionPathFamily: "market_write",
      normalizedTarget: {
        asset: "BTC",
      },
      normalizedDraft: {
        amount: 5,
        marketKind: "higher_lower",
        horizon: "24h",
        direction: "lower",
      },
    });
    expect(fixedPriceResolution).toMatchObject({
      status: "executable",
      actionType: "bet",
      executionPathFamily: "market_write",
      normalizedTarget: {
        asset: "ETH",
      },
      normalizedDraft: {
        amount: 5,
        marketKind: "fixed_price",
        horizon: "4h",
        predictedPrice: 3_465,
      },
    });
  });

  it("blocks malformed action requests before execution-time failures", async () => {
    const dir = await createTempDir();
    const blockedCapabilities = describeRuntimeCapabilities({ cwd: dir, homeDir: dir, env: {} });
    const writeReadyCapabilities = {
      ...blockedCapabilities,
      actionFamilies: {
        ...blockedCapabilities.actionFamilies,
        publish: {
          ...blockedCapabilities.actionFamilies.publish,
          executable: true,
          readiness: "ready",
        },
        reply: {
          ...blockedCapabilities.actionFamilies.reply,
          executable: true,
          readiness: "ready",
        },
        react: {
          ...blockedCapabilities.actionFamilies.react,
          executable: true,
          readiness: "ready",
        },
      },
    };

    const malformedReply = resolveActionRequest({
      actionType: "reply",
      draft: { text: "hello" },
      evidenceRequest: { primary: "https://example.com/reply.json", strength: "inherit" },
    }, { runtimeCapabilities: writeReadyCapabilities });
    const malformedPublish = resolveActionRequest({
      actionType: "publish",
      draft: { text: "hello" },
    }, { runtimeCapabilities: writeReadyCapabilities });
    const malformedReact = resolveActionRequest({
      actionType: "react",
      draft: { reaction: "agree" },
    }, { runtimeCapabilities: writeReadyCapabilities });
    const malformedBetMissingFields = resolveActionRequest({
      actionType: "bet",
      target: { asset: "BTC" },
      draft: { marketKind: "fixed_price", horizon: "24h", amount: 5 },
    }, { runtimeCapabilities: writeReadyCapabilities });
    const malformedBetAmount = resolveActionRequest({
      actionType: "bet",
      target: { asset: "BTC" },
      draft: { marketKind: "higher_lower", horizon: "24h", direction: "higher", amount: 4 },
    }, { runtimeCapabilities: writeReadyCapabilities });

    expect(malformedReply).toMatchObject({
      status: "blocked",
      actionType: "reply",
      reasonCodes: ["request_missing_fields"],
      missingRequirements: ["parent_tx_hash"],
      executionPathFamily: "direct_attested_write",
    });
    expect(malformedPublish).toMatchObject({
      status: "blocked",
      actionType: "publish",
      reasonCodes: ["request_missing_fields"],
      missingRequirements: ["evidence_url"],
      executionPathFamily: "direct_attested_write",
    });
    expect(malformedReact).toMatchObject({
      status: "blocked",
      actionType: "react",
      reasonCodes: ["request_missing_fields"],
      missingRequirements: ["post_tx_hash"],
      executionPathFamily: "reaction",
    });
    expect(malformedBetMissingFields).toMatchObject({
      status: "blocked",
      actionType: "bet",
      reasonCodes: ["request_missing_fields"],
      missingRequirements: ["predicted_price"],
      executionPathFamily: "market_write",
    });
    expect(malformedBetAmount).toMatchObject({
      status: "blocked",
      actionType: "bet",
      reasonCodes: ["market_amount_fixed_to_5_dem"],
      missingRequirements: ["amount=5_dem"],
      executionPathFamily: "market_write",
    });
  });

  it("derives attestation readiness from evidence strength", async () => {
    const dir = await createTempDir();
    const blockedCapabilities = describeRuntimeCapabilities({ cwd: dir, homeDir: dir, env: {} });
    const writeReadyCapabilities = {
      ...blockedCapabilities,
      actionFamilies: {
        ...blockedCapabilities.actionFamilies,
        publish: {
          ...blockedCapabilities.actionFamilies.publish,
          executable: true,
          readiness: "ready",
        },
      },
    };

    const resolution = resolveActionRequest({
      actionType: "publish",
      draft: { text: "hello" },
      evidenceRequest: { strength: "none" },
    }, { runtimeCapabilities: writeReadyCapabilities });

    expect(resolution).toMatchObject({
      status: "blocked",
      actionType: "publish",
      reasonCodes: ["evidence_strength_incompatible"],
      missingRequirements: ["attestation"],
      evidencePlan: { mechanism: "none" },
      readiness: { requiresAttestation: false },
      executionPathFamily: "direct_attested_write",
    });
  });

  it("compiles and plans policy execution outside the loop core", async () => {
    const dir = await createTempDir();
    const blockedCapabilities = describeRuntimeCapabilities({ cwd: dir, homeDir: dir, env: {} });
    const writeReadyCapabilities = {
      ...blockedCapabilities,
      actionFamilies: {
        ...blockedCapabilities.actionFamilies,
        publish: {
          ...blockedCapabilities.actionFamilies.publish,
          executable: true,
          readiness: "ready",
        },
      },
    };

    const compiled = compilePolicyDecision({
      kind: "publish",
      category: "OBSERVATION",
      text: "Policy shell compile check",
      attestUrl: "https://example.com/policy-shell.json",
      tags: ["policy-shell"],
    }, { runtimeCapabilities: writeReadyCapabilities });
    const executePlan = planPolicyExecution({
      kind: "publish",
      category: "OBSERVATION",
      text: "Execute through policy shell",
      attestUrl: "https://example.com/policy-shell.json",
    }, { runtimeCapabilities: writeReadyCapabilities });
    const dryRunPlan = planPolicyExecution({
      kind: "publish",
      category: "OBSERVATION",
      text: "Dry run through policy shell",
      attestUrl: "https://example.com/policy-shell.json",
    }, { runtimeCapabilities: writeReadyCapabilities, dryRun: true });
    const blockedPlan = planPolicyExecution({
      kind: "publish",
      category: "OBSERVATION",
      text: "Blocked through policy shell",
      attestUrl: "https://example.com/policy-shell.json",
    }, { runtimeCapabilities: blockedCapabilities });

    expect(compiled.request).toMatchObject({
      actionType: "publish",
      draft: {
        text: "Policy shell compile check",
      },
    });
    expect(compiled.actionDecision?.action).toMatchObject({
      type: "publish",
      text: "Policy shell compile check",
    });
    expect(compiled.resolution).toMatchObject({
      status: "executable",
      actionType: "publish",
    });
    expect(executePlan.disposition).toEqual({ kind: "execute" });
    expect(dryRunPlan.disposition).toEqual({ kind: "dry_run", status: "dry_run" });
    expect(blockedPlan.disposition).toEqual({ kind: "skip", status: "skipped" });
    expect(blockedPlan.resolution).toMatchObject({
      status: "blocked",
      actionType: "publish",
    });
  });

  it("runs policy observe/derive/conditions/routes above the action seam", async () => {
    const policy: PolicyDefinition<
      { lastRoute?: string },
      { value: number },
      { doubled: number },
      "large_enough",
      "publish_value"
    > = {
      policyId: "test.policy.v1",
      observe: async () => ({ value: 4 }),
      derive: ({ observed }) => ({ doubled: observed.value * 2 }),
      conditions: {
        large_enough: ({ derived }) => derived.doubled >= 8,
      },
      routes: [
        {
          id: "publish_value",
          when: ({ conditionResults }) => conditionResults.large_enough,
          buildDecision: ({ derived, ctx }) => ({
            kind: "action",
            action: {
              type: "publish",
              category: "OBSERVATION",
              text: `Derived value ${derived.doubled}`,
              attestUrl: "https://example.com/policy-test.json",
            },
            nextState: {
              ...ctx.memory.state,
              lastRoute: "publish_value",
            },
          }),
        },
      ],
    };

    const trace = await runPolicyWithTrace(policy, {
      omni: makeOmni(),
      cycle: {
        id: "policy-cycle",
        iteration: 1,
        startedAt: new Date(1_700_000_000_000).toISOString(),
        stateDir: "/tmp/policy-state",
        sessionId: "policy-session",
        sessionDir: "/tmp/policy-session",
        dryRun: true,
      },
      memory: {
        state: { lastRoute: "skip" },
        lastCycle: null,
      },
      ledger: {
        sessionId: "policy-session",
        sessionDir: "/tmp/policy-session",
        recentResults: [],
      },
    });

    expect(trace.routeId).toBe("publish_value");
    expect(trace.matchedConditions).toEqual(["large_enough"]);
    expect(trace.decision.audit).toMatchObject({
      policyId: "test.policy.v1",
      routeId: "publish_value",
      matchedConditions: ["large_enough"],
    });
    expect(trace.decision.kind).toBe("action");
  });

  it("executes publish, reply, react, tip, and bet through one resolved-intent envelope", async () => {
    const verification = {
      timeoutMs: 45_000,
      pollMs: 5_000,
      limit: 50,
    };
    const publishOmni = makeOmni({
      colony: {
        publish: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xpublish-envelope" },
          provenance: {
            path: "local",
            latencyMs: 20,
            attestation: {
              txHash: "0xpublish-attest-envelope",
              responseHash: "0xpublish-response-envelope",
            },
          },
        }),
        getFeed: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            posts: [
              {
                txHash: "0xpublish-envelope",
                payload: {
                  cat: "OBSERVATION",
                  text: "Unified envelope publish",
                },
                score: 77,
                blockNumber: 999,
              },
            ],
            meta: { lastBlock: 999 },
          },
        }),
      },
    });
    const replyOmni = makeOmni({
      colony: {
        reply: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xreply-envelope" },
          provenance: {
            path: "local",
            latencyMs: 20,
            attestation: {
              txHash: "0xreply-attest-envelope",
              responseHash: "0xreply-response-envelope",
            },
          },
        }),
        getFeed: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            posts: [
              {
                txHash: "0xreply-envelope",
                payload: {
                  cat: "OBSERVATION",
                  text: "Unified envelope reply",
                },
                score: 75,
                blockNumber: 1001,
              },
            ],
            meta: { lastBlock: 1001 },
          },
        }),
      },
    });
    const reactOmni = makeOmni({
      colony: {
        react: vi.fn().mockResolvedValue({ ok: true }),
        getReactions: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { agree: 3, disagree: 0, flag: 0 } })
          .mockResolvedValueOnce({ ok: true, data: { agree: 4, disagree: 0, flag: 0 } }),
      },
    });

    const publishEnvelope = await executeResolvedIntent({
      omni: publishOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "publish",
        category: "OBSERVATION",
        text: "Unified envelope publish",
        attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            publish: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.publish,
              executable: true,
              readiness: "ready",
            },
          },
        },
      })!,
      verification,
    });
    const replyEnvelope = await executeResolvedIntent({
      omni: replyOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "reply",
        parentTxHash: "0xreply-parent-envelope",
        category: "OBSERVATION",
        text: "Unified envelope reply",
        attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            reply: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.reply,
              executable: true,
              readiness: "ready",
            },
          },
        },
      })!,
      verification,
    });
    const reactEnvelope = await executeResolvedIntent({
      omni: reactOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "action",
        action: { type: "react", targetTxHash: "0xreact-envelope", reaction: "agree" },
        readiness: { requiresWallet: true, requiresTargetPost: true },
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            react: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.react,
              executable: true,
              readiness: "ready",
            },
          },
        },
      })!,
      verification,
    });
    const tipOmni = makeOmni({
      colony: {
        tip: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xtip-envelope", validated: true },
        }),
        getPostDetail: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            post: {
              txHash: "0xtip-target-envelope",
              author: "0xrecipient-envelope",
              timestamp: 1,
              payload: {},
            },
            replies: [],
          },
        }),
        getTipStats: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { totalTips: 1, totalDem: 2, myTip: 0 } })
          .mockResolvedValueOnce({ ok: true, data: { totalTips: 2, totalDem: 7, myTip: 5 } }),
        getAgentTipStats: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              tipsGiven: { count: 0, totalDem: 0 },
              tipsReceived: { count: 1, totalDem: 2 },
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              tipsGiven: { count: 0, totalDem: 0 },
              tipsReceived: { count: 2, totalDem: 7 },
            },
          }),
        getBalance: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { balance: 42 } })
          .mockResolvedValueOnce({ ok: true, data: { balance: 37 } }),
      },
    });
    const tipEnvelope = await executeResolvedIntent({
      omni: tipOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "action",
        action: { type: "tip", targetTxHash: "0xtip-target-envelope", amount: 5 },
        readiness: { requiresWallet: true, requiresTargetPost: true },
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            tip: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.tip,
              executable: true,
              readiness: "ready",
            },
          },
        },
      })!,
      verification: {
        ...verification,
        timeoutMs: 1,
        pollMs: 1,
      },
    });
    const fixedBetOmni = makeOmni({
      colony: {
        placeBet: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xbet-envelope", memo: "HIVE_BET:ETH:3465:4h", amount: 5, registered: true },
        }),
        getPool: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "ETH",
              horizon: "4h",
              totalBets: 1,
              totalDem: 5,
              poolAddress: "0xpool-fixed",
              roundEnd: 1,
              bets: [{ txHash: "0xexisting-fixed", bettor: "0xother", predictedPrice: 3400, amount: 5, roundEnd: 1, horizon: "4h" }],
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "ETH",
              horizon: "4h",
              totalBets: 2,
              totalDem: 10,
              poolAddress: "0xpool-fixed",
              roundEnd: 1,
              bets: [
                { txHash: "0xexisting-fixed", bettor: "0xother", predictedPrice: 3400, amount: 5, roundEnd: 1, horizon: "4h" },
                { txHash: "0xbet-envelope", bettor: "0xme", predictedPrice: 3465, amount: 5, roundEnd: 1, horizon: "4h" },
              ],
            },
          }),
      },
    });
    const higherLowerOmni = makeOmni({
      colony: {
        placeHL: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xhl-envelope", memo: "HIVE_HL:BTC:LOWER:24h", amount: 5, registered: true },
        }),
        getHigherLowerPool: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "BTC",
              horizon: "24h",
              totalHigher: 10,
              totalLower: 5,
              totalDem: 15,
              higherCount: 2,
              lowerCount: 1,
              roundEnd: 1,
              referencePrice: 50000,
              poolAddress: "0xpool-hl",
              currentPrice: 49850,
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "BTC",
              horizon: "24h",
              totalHigher: 10,
              totalLower: 10,
              totalDem: 20,
              higherCount: 2,
              lowerCount: 2,
              roundEnd: 1,
              referencePrice: 50000,
              poolAddress: "0xpool-hl",
              currentPrice: 49850,
            },
          }),
      },
    });
    const fixedBetEnvelope = await executeResolvedIntent({
      omni: fixedBetOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "action",
        action: { type: "bet", asset: "ETH", marketKind: "fixed_price", predictedPrice: 3465, horizon: "4h", amount: 5 },
        readiness: { requiresWallet: true, requiresMarketContext: true },
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            bet: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.bet,
              executable: true,
              readiness: "ready",
              proofLevel: "real_runtime_action_family",
            },
          },
        },
      })!,
      verification: {
        ...verification,
        timeoutMs: 1,
        pollMs: 1,
      },
    });
    const higherLowerEnvelope = await executeResolvedIntent({
      omni: higherLowerOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "action",
        action: { type: "bet", asset: "BTC", marketKind: "higher_lower", direction: "lower", horizon: "24h", amount: 5 },
        readiness: { requiresWallet: true, requiresMarketContext: true },
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            bet: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.bet,
              executable: true,
              readiness: "ready",
              proofLevel: "real_runtime_action_family",
            },
          },
        },
      })!,
      verification: {
        ...verification,
        timeoutMs: 1,
        pollMs: 1,
      },
    });

    expect(publishEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "publish",
      txHash: "0xpublish-envelope",
      attestationTxHash: "0xpublish-attest-envelope",
      verificationPath: "feed",
      indexedVisible: true,
    });
    expect(replyEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "reply",
      txHash: "0xreply-envelope",
      attestationTxHash: "0xreply-attest-envelope",
      verificationPath: "feed",
      indexedVisible: true,
    });
    expect(reactEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "react",
      verificationPath: "reaction_counts",
      indexedVisible: true,
    });
    expect(tipEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "tip",
      txHash: "0xtip-envelope",
      demSpendEstimate: 5,
      verificationPath: "tip_stats",
      indexedVisible: true,
    });
    expect(fixedBetEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "bet",
      txHash: "0xbet-envelope",
      demSpendEstimate: 5,
      verificationPath: "betting_pool",
      indexedVisible: true,
    });
    expect(higherLowerEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "bet",
      txHash: "0xhl-envelope",
      demSpendEstimate: 5,
      verificationPath: "higher_lower_pool",
      indexedVisible: true,
    });
  });

  it("executeMinimalAction honors caller-provided actionDecision when resolution is absent", async () => {
    const omni = makeOmni();
    omni.colony.react = vi.fn().mockResolvedValue({ ok: true });
    omni.colony.getReactions = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { agree: 0, disagree: 0, flag: 0 } })
      .mockResolvedValueOnce({ ok: true, data: { agree: 1, disagree: 0, flag: 0, myReaction: "agree" } });

    const execution = await executeMinimalAction({
      omni,
      decision: {
        kind: "publish",
        category: "OBSERVATION",
        text: "Stale publish decision",
        attestUrl: "https://app.supercolony.ai/api/signals",
      },
      actionDecision: {
        kind: "action",
        action: { type: "react", targetTxHash: "0xreact-from-action", reaction: "agree" },
        readiness: { requiresWallet: true, requiresTargetPost: true },
      },
      verification: { timeoutMs: 1, pollMs: 1, limit: 10 },
    });

    expect(omni.colony.react).toHaveBeenCalledWith("0xreact-from-action", "agree");
    expect(omni.colony.publish).not.toHaveBeenCalled();
    expect(execution).toMatchObject({
      status: "reacted",
      demSpendEstimate: 0,
    });
    expect(execution.verification?.verificationPath).toBe("reaction_counts");
  });

  it("writes skip cycle artifacts and persists next state", async () => {
    const stateDir = await createTempDir();
    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "skip",
        reason: "no_new_signal",
        facts: { signalCount: 0 },
        nextState: { lastReason: "no_new_signal" },
      }),
      {
        omni: makeOmni(),
        stateDir,
        cycleId: "cycle-skip",
        now: makeNow(1_700_000_000_000, 1_700_000_000_250),
      },
    );

    expect(record.outcome.execution.status).toBe("skipped");
    expect(record.memoryAfter.state).toEqual({ lastReason: "no_new_signal" });

    const latest = await readJson(resolve(stateDir, "runs", "latest.json"));
    const state = await readJson(resolve(stateDir, "state", "current.json"));
    const summary = await readFile(resolve(stateDir, "runs", "2023-11-14", "cycle-skip.md"), "utf-8");

    expect(latest.outcome.execution.status).toBe("skipped");
    expect(state.agentState).toEqual({ lastReason: "no_new_signal" });
    expect(state.lastCycle.status).toBe("skipped");
    expect(summary).toContain("SkipReason: no_new_signal");
  });

  it("surfaces env_missing stop reasons for capability-blocked publish skips", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni();

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "publish",
        category: "ANALYSIS",
        text: "Blocked publish should expose env_missing.",
        attestUrl: "https://example.com/capability-blocked.json",
      }),
      {
        connectFn: async () => omni,
        stateDir,
        cwd: stateDir,
        readinessOptions: {
          cwd: stateDir,
          homeDir: stateDir,
          env: {},
          packageResolver: (specifier: string) => specifier,
        },
        cycleId: "cycle-capability-blocked",
        now: makeNow(1_700_000_000_300, 1_700_000_000_450),
      },
    );

    expect(omni.colony.publish).not.toHaveBeenCalled();
    expect(record.outcome.execution.status).toBe("skipped");
    expect(record.outcome.resolution?.status).toBe("blocked");
    expect(record.outcome.resolution?.capability?.readiness).toBe("missing_credentials");

    const result = await readJson(resolve(stateDir, "sessions", record.sessionId, "result.json"));
    expect(result.stop_reasons).toContain("env_missing");
    expect(result.stop_reasons).toContain("runtime_capability_blocked");
  });

  it("publishes, verifies visibility, and records tx metadata", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni({
      colony: {
        publish: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xabc" },
          provenance: {
            path: "local",
            latencyMs: 20,
            attestation: {
              txHash: "0xattest",
              responseHash: "0xresponse",
            },
          },
        }),
        getFeed: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            posts: [
              {
                txHash: "0xabc",
                payload: {
                  cat: "ANALYSIS",
                  text: "Coverage gap is narrowing.",
                },
                score: 80,
                blockNumber: 321,
              },
            ],
            meta: { lastBlock: 321 },
          },
        }),
      },
    });

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "publish",
        category: "ANALYSIS",
        text: "Coverage gap is narrowing.",
        attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
        tags: ["coverage"],
        confidence: 88,
        attestationPlan: {
          topic: "coverage-gap",
          agent: "sentinel",
          catalogPath: "/tmp/catalog.json",
          ready: true,
          reason: "ready",
          primary: {
            sourceId: "coingecko-price",
            name: "CoinGecko Simple Price",
            provider: "coingecko",
            status: "active",
            trustTier: "official",
            responseFormat: "json",
            ratingOverall: 88,
            dahrSafe: true,
            tlsnSafe: false,
            url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
            score: 17,
          },
          supporting: [],
          fallbacks: [],
          warnings: [],
        },
        audit: {
          inputs: {
            signals: [{ topic: "coverage-gap", confidence: 88 }],
          },
          selectedEvidence: {
            matchedSignal: { topic: "coverage-gap" },
          },
          promptPacket: {
            objective: "Write a post about the selected coverage gap.",
          },
        },
        nextState: { lastTopic: "coverage-gap" },
      }),
      {
        omni,
        stateDir,
        cwd: stateDir,
        cycleId: "cycle-publish",
        now: makeNow(1_700_000_001_000, 1_700_000_001_500),
      },
    );

    expect(omni.colony.publish).toHaveBeenCalledWith({
      text: "Coverage gap is narrowing.",
      category: "ANALYSIS",
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      tags: ["coverage"],
      confidence: 88,
    });
    expect(record.outcome.execution.status).toBe("published");
    expect(record.outcome.execution.txHash).toBe("0xabc");
    expect(record.outcome.execution.attestationTxHash).toBe("0xattest");
    expect(record.outcome.execution.attestationResponseHash).toBe("0xresponse");
    expect(record.outcome.execution.verification?.indexedVisible).toBe(true);
    expect(record.outcome.execution.verification?.verificationPath).toBe("feed");
    expect(record.outcome.execution.verification?.observedScore).toBe(80);
    expect(record.memoryAfter.state).toEqual({ lastTopic: "coverage-gap" });

    const latest = await readJson(resolve(stateDir, "runs", "latest.json"));
    const summary = await readFile(resolve(stateDir, "runs", "2023-11-14", "cycle-publish.md"), "utf-8");
    expect(latest.decision.audit.inputs.signals[0].topic).toBe("coverage-gap");
    expect(latest.outcome.execution.attestationTxHash).toBe("0xattest");
    expect(summary).toContain("AuditSections: inputs, selectedEvidence, promptPacket");
    expect(summary).toContain("AttestationPlan: ready (ready)");
    expect(summary).toContain("AttestationTxHash: 0xattest");
    expect(summary).toContain("AttestationResponseHash: 0xresponse");
    expect(summary).toContain("ObservedScore: 80");
  });

  it("supports dry-run publishes without spending or calling publish()", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni();

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "publish",
        category: "OBSERVATION",
        text: "Dry-run only.",
        attestUrl: "https://example.com/dry-run",
      }),
      {
        omni,
        stateDir,
        dryRun: true,
        cycleId: "cycle-dry-run",
        now: makeNow(1_700_000_002_000, 1_700_000_002_300),
      },
    );

    expect(omni.colony.publish).not.toHaveBeenCalled();
    expect(record.outcome.execution.status).toBe("dry_run");
    expect(record.outcome.execution.demSpendEstimate).toBe(0);
  });

  it("executeResolvedIntent honors dryRun before attestation validation", async () => {
    const omni = makeOmni();
    const runtime = describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} });
    const resolution = normalizeDecisionToResolvedIntent({
      kind: "publish",
      category: "OBSERVATION",
      text: "Dry-run direct envelope.",
      attestUrl: "https://example.com/dry-run-direct",
    }, {
      runtimeCapabilities: {
        ...runtime,
        actionFamilies: {
          ...runtime.actionFamilies,
          publish: {
            ...runtime.actionFamilies.publish,
            executable: true,
            readiness: "ready",
          },
        },
      },
    })!;

    const envelope = await executeResolvedIntent({
      omni,
      resolution,
      dryRun: true,
      verification: { timeoutMs: 1, pollMs: 1, limit: 1 },
    });

    expect(omni.colony.publish).not.toHaveBeenCalled();
    expect(envelope.execution).toMatchObject({
      status: "dry_run",
      actionType: "publish",
      demSpendEstimate: 0,
    });
  });

  it("supports reply decisions and records replied status", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni({
      colony: {
        reply: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xreply-live" },
          provenance: {
            path: "local",
            latencyMs: 20,
            attestation: {
              txHash: "0xreply-attest",
              responseHash: "0xreply-response",
            },
          },
        }),
        getFeed: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            posts: [
              {
                txHash: "0xreply-live",
                payload: {
                  cat: "ANALYSIS",
                  text: "Reply adds a second data point to the live thread.",
                },
                score: 80,
                blockNumber: 654,
              },
            ],
            meta: { lastBlock: 654 },
          },
        }),
      },
    });

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "reply",
        parentTxHash: "0xparent",
        category: "ANALYSIS",
        text: "Reply adds a second data point to the live thread.",
        attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      }),
      {
        omni,
        stateDir,
        cwd: stateDir,
        cycleId: "cycle-reply",
        now: makeNow(1_700_000_002_000, 1_700_000_002_400),
      },
    );

    expect(omni.colony.reply).toHaveBeenCalledWith({
      parentTxHash: "0xparent",
      text: "Reply adds a second data point to the live thread.",
      attestUrl: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      category: "ANALYSIS",
    });
    expect(record.outcome.execution.status).toBe("replied");
    expect(record.outcome.execution.txHash).toBe("0xreply-live");
    expect(record.outcome.execution.attestationTxHash).toBe("0xreply-attest");
    expect(record.outcome.execution.verification?.indexedVisible).toBe(true);
  });

  it("supports react decisions and records reacted status", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni({
      colony: {
        react: vi.fn().mockResolvedValue({ ok: true }),
        getReactions: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { agree: 1, disagree: 0, flag: 0 } })
          .mockResolvedValueOnce({ ok: true, data: { agree: 2, disagree: 0, flag: 0 } }),
      },
    });

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "react",
        targetTxHash: "0xtarget",
        reaction: "agree",
        facts: {
          topic: "coverage-gap",
          selectedAction: "react",
        },
      }),
      {
        omni,
        stateDir,
        cwd: stateDir,
        cycleId: "cycle-react",
        now: makeNow(1_700_000_002_100, 1_700_000_002_300),
      },
    );

    expect(omni.colony.react).toHaveBeenCalledWith("0xtarget", "agree");
    expect(record.outcome.execution.status).toBe("reacted");
    expect(record.outcome.execution.demSpendEstimate).toBe(0);
    expect(record.outcome.execution.verification?.verificationPath).toBe("reaction_counts");
    expect(record.outcome.execution.verification?.error).toBeUndefined();

    const summary = await readFile(resolve(stateDir, "runs", "2023-11-14", "cycle-react.md"), "utf-8");
    expect(summary).toContain("Reaction: agree");
    expect(summary).toContain("TargetTxHash: 0xtarget");
  });

  it("supports tip action decisions and records tipped status", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni({
      colony: {
        tip: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xtip-cycle", validated: true },
        }),
        getPostDetail: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            post: {
              txHash: "0xtip-target",
              author: "0xrecipient",
              timestamp: 1,
              payload: {},
            },
            replies: [],
          },
        }),
        getTipStats: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { totalTips: 0, totalDem: 0, myTip: 0 } })
          .mockResolvedValueOnce({ ok: true, data: { totalTips: 1, totalDem: 3, myTip: 3 } }),
        getAgentTipStats: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              tipsGiven: { count: 0, totalDem: 0 },
              tipsReceived: { count: 0, totalDem: 0 },
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              tipsGiven: { count: 0, totalDem: 0 },
              tipsReceived: { count: 1, totalDem: 3 },
            },
          }),
        getBalance: vi.fn()
          .mockResolvedValueOnce({ ok: true, data: { balance: 20 } })
          .mockResolvedValueOnce({ ok: true, data: { balance: 17 } }),
      },
    });

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "action",
        action: { type: "tip", targetTxHash: "0xtip-target", amount: 3 },
        readiness: { requiresWallet: true, requiresTargetPost: true },
      }),
      {
        omni,
        stateDir,
        cwd: stateDir,
        cycleId: "cycle-tip",
        verification: { timeoutMs: 1, pollMs: 1, limit: 10 },
        now: makeNow(1_700_000_002_350, 1_700_000_002_500),
      },
    );

    expect(omni.colony.tip).toHaveBeenCalledWith("0xtip-target", 3);
    expect(record.outcome.execution.status).toBe("tipped");
    expect(record.outcome.execution.txHash).toBe("0xtip-cycle");
    expect(record.outcome.execution.demSpendEstimate).toBe(3);
    expect(record.outcome.execution.verification?.verificationPath).toBe("tip_stats");
    expect(record.outcome.execution.verification?.indexedVisible).toBe(true);

    const summary = await readFile(resolve(stateDir, "runs", "2023-11-14", "cycle-tip.md"), "utf-8");
    expect(summary).toContain("ActionType: tip");
    expect(summary).toContain("TargetTxHash: 0xtip-target");
    expect(summary).toContain("Amount: 3");
  });

  it("supports bet action decisions and records market_written status", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni({
      colony: {
        placeBet: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xbet-cycle", memo: "HIVE_BET:ETH:3465:4h", amount: 5, registered: true },
        }),
        getPool: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "ETH",
              horizon: "4h",
              totalBets: 1,
              totalDem: 5,
              poolAddress: "0xpool-cycle",
              roundEnd: 1,
              bets: [{ txHash: "0xexisting-cycle", bettor: "0xother", predictedPrice: 3400, amount: 5, roundEnd: 1, horizon: "4h" }],
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "ETH",
              horizon: "4h",
              totalBets: 2,
              totalDem: 10,
              poolAddress: "0xpool-cycle",
              roundEnd: 1,
              bets: [
                { txHash: "0xexisting-cycle", bettor: "0xother", predictedPrice: 3400, amount: 5, roundEnd: 1, horizon: "4h" },
                { txHash: "0xbet-cycle", bettor: "0xme", predictedPrice: 3465, amount: 5, roundEnd: 1, horizon: "4h" },
              ],
            },
          }),
      },
    });

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "action",
        action: { type: "bet", asset: "ETH", marketKind: "fixed_price", predictedPrice: 3465, horizon: "4h", amount: 5 },
        readiness: { requiresWallet: true, requiresMarketContext: true },
      }),
      {
        omni,
        stateDir,
        cwd: stateDir,
        cycleId: "cycle-bet",
        verification: { timeoutMs: 1, pollMs: 1, limit: 10 },
        now: makeNow(1_700_000_002_650, 1_700_000_002_850),
      },
    );

    expect(omni.colony.placeBet).toHaveBeenCalledWith("ETH", 3465, { horizon: "4h" });
    expect(record.outcome.execution.status).toBe("market_written");
    expect(record.outcome.execution.txHash).toBe("0xbet-cycle");
    expect(record.outcome.execution.demSpendEstimate).toBe(5);
    expect(record.outcome.execution.verification?.verificationPath).toBe("betting_pool");
    expect(record.outcome.execution.verification?.indexedVisible).toBe(true);

    const summary = await readFile(resolve(stateDir, "runs", "2023-11-14", "cycle-bet.md"), "utf-8");
    expect(summary).toContain("ActionType: bet");
    expect(summary).toContain("Amount: 5");
    expect(summary).toContain("TxHash: 0xbet-cycle");
  });

  it("does not mark unconfirmed market-write readback as indexer lag", async () => {
    const fixedStateDir = await createTempDir();
    const fixedOmni = makeOmni({
      colony: {
        placeBet: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xbet-unconfirmed", memo: "HIVE_BET:ETH:3465:4h", amount: 5, registered: true },
        }),
        getPool: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "ETH",
              horizon: "4h",
              totalBets: 1,
              totalDem: 5,
              poolAddress: "0xpool-unconfirmed",
              roundEnd: 1,
              bets: [{ txHash: "0xexisting-fixed", bettor: "0xother", predictedPrice: 3400, amount: 5, roundEnd: 1, horizon: "4h" }],
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "ETH",
              horizon: "4h",
              totalBets: 1,
              totalDem: 5,
              poolAddress: "0xpool-unconfirmed",
              roundEnd: 1,
              bets: [{ txHash: "0xexisting-fixed", bettor: "0xother", predictedPrice: 3400, amount: 5, roundEnd: 1, horizon: "4h" }],
            },
          }),
      },
    });

    const fixedRecord = await runMinimalAgentCycle(
      async () => ({
        kind: "action",
        action: { type: "bet", asset: "ETH", marketKind: "fixed_price", predictedPrice: 3465, horizon: "4h", amount: 5 },
        readiness: { requiresWallet: true, requiresMarketContext: true },
      }),
      {
        omni: fixedOmni,
        stateDir: fixedStateDir,
        cwd: fixedStateDir,
        cycleId: "cycle-bet-unconfirmed",
        verification: { timeoutMs: 0, pollMs: 1, limit: 10 },
        now: makeNow(1_700_000_003_000, 1_700_000_003_000),
      },
    );

    expect(fixedRecord.outcome.execution.status).toBe("failed");
    expect(fixedRecord.outcome.execution.verification?.verificationPath).toBe("betting_pool");
    expect(fixedRecord.outcome.execution.verification?.visible).toBe(true);
    expect(fixedRecord.outcome.execution.verification?.indexedVisible).toBe(false);
    const fixedResult = await readJson(resolve(fixedStateDir, "sessions", fixedRecord.sessionId, "result.json"));
    expect(fixedResult.stop_reasons).not.toContain("indexer_lag");

    const higherLowerStateDir = await createTempDir();
    const higherLowerOmni = makeOmni({
      colony: {
        placeHL: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xhl-unconfirmed", memo: "HIVE_HL:BTC:LOWER:24h", amount: 5, registered: true },
        }),
        getHigherLowerPool: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "BTC",
              horizon: "24h",
              totalHigher: 10,
              totalLower: 5,
              totalDem: 15,
              higherCount: 2,
              lowerCount: 1,
              roundEnd: 1,
              referencePrice: 50000,
              poolAddress: "0xpool-hl-unconfirmed",
              currentPrice: 49850,
            },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "BTC",
              horizon: "24h",
              totalHigher: 10,
              totalLower: 5,
              totalDem: 15,
              higherCount: 2,
              lowerCount: 1,
              roundEnd: 1,
              referencePrice: 50000,
              poolAddress: "0xpool-hl-unconfirmed",
              currentPrice: 49850,
            },
          }),
      },
    });

    const higherLowerRecord = await runMinimalAgentCycle(
      async () => ({
        kind: "action",
        action: { type: "bet", asset: "BTC", marketKind: "higher_lower", direction: "lower", horizon: "24h", amount: 5 },
        readiness: { requiresWallet: true, requiresMarketContext: true },
      }),
      {
        omni: higherLowerOmni,
        stateDir: higherLowerStateDir,
        cwd: higherLowerStateDir,
        cycleId: "cycle-hl-unconfirmed",
        verification: { timeoutMs: 0, pollMs: 1, limit: 10 },
        now: makeNow(1_700_000_003_100, 1_700_000_003_100),
      },
    );

    expect(higherLowerRecord.outcome.execution.status).toBe("failed");
    expect(higherLowerRecord.outcome.execution.verification?.verificationPath).toBe("higher_lower_pool");
    expect(higherLowerRecord.outcome.execution.verification?.visible).toBe(true);
    expect(higherLowerRecord.outcome.execution.verification?.indexedVisible).toBe(false);
    const higherLowerResult = await readJson(resolve(higherLowerStateDir, "sessions", higherLowerRecord.sessionId, "result.json"));
    expect(higherLowerResult.stop_reasons).not.toContain("indexer_lag");
  });

  it("accepts higher/lower readback when the pre-snapshot is unavailable", async () => {
    const verification = { timeoutMs: 1, pollMs: 1, limit: 10 };
    const higherLowerOmni = makeOmni({
      colony: {
        placeHL: vi.fn().mockResolvedValue({
          ok: true,
          data: { txHash: "0xhl-after-only", memo: "HIVE_HL:BTC:LOWER:24h", amount: 5, registered: true },
        }),
        getHigherLowerPool: vi.fn()
          .mockResolvedValueOnce({ ok: false, error: { message: "temporary_pool_outage" } })
          .mockResolvedValueOnce({
            ok: true,
            data: {
              asset: "BTC",
              horizon: "24h",
              totalHigher: 10,
              totalLower: 5,
              totalDem: 15,
              higherCount: 2,
              lowerCount: 1,
              roundEnd: 1,
              referencePrice: 50000,
              poolAddress: "0xpool-hl-after-only",
              currentPrice: 49850,
            },
          }),
      },
    });

    const higherLowerEnvelope = await executeResolvedIntent({
      omni: higherLowerOmni,
      resolution: normalizeDecisionToResolvedIntent({
        kind: "action",
        action: { type: "bet", asset: "BTC", marketKind: "higher_lower", direction: "lower", horizon: "24h", amount: 5 },
        readiness: { requiresWallet: true, requiresMarketContext: true },
      }, {
        runtimeCapabilities: {
          ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }),
          actionFamilies: {
            ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies,
            bet: {
              ...describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} }).actionFamilies.bet,
              executable: true,
              readiness: "ready",
              proofLevel: "real_runtime_action_family",
            },
          },
        },
      })!,
      verification,
    });

    expect(higherLowerEnvelope.execution).toMatchObject({
      status: "executed",
      actionType: "bet",
      txHash: "0xhl-after-only",
      demSpendEstimate: 5,
      verificationPath: "higher_lower_pool",
      indexedVisible: true,
    });
  });

  it("blocks live publishes that still use placeholder attestation URLs", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni();

    const record = await runMinimalAgentCycle(
      async () => ({
        kind: "publish",
        category: "ANALYSIS",
        text: "Placeholder publish should be blocked.",
        attestUrl: "https://example.com/report",
      }),
      {
        omni,
        stateDir,
        cwd: stateDir,
        cycleId: "cycle-placeholder-block",
        now: makeNow(1_700_000_002_500, 1_700_000_002_800),
      },
    );

    expect(omni.colony.publish).not.toHaveBeenCalled();
    expect(record.outcome.execution.status).toBe("failed");
    expect(record.outcome.execution.error?.message).toContain("placeholder_attest_url");
  });

  it("reuses one omni session across loop iterations and advances persisted iteration", async () => {
    const stateDir = await createTempDir();
    const omni = makeOmni();
    const observe = vi.fn().mockResolvedValue({
      kind: "skip",
      reason: "steady_state",
      nextState: { stable: true },
    });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await runMinimalAgentLoop(observe, {
      omni,
      stateDir,
      maxIterations: 2,
      intervalMs: 25,
      sleep,
      now: makeNow(
        1_700_000_003_000,
        1_700_000_003_100,
        1_700_000_004_000,
        1_700_000_004_100,
      ),
    });

    expect(observe).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    const state = await readJson(resolve(stateDir, "state", "current.json"));
    expect(state.iteration).toBe(2);
    expect(state.agentState).toEqual({ stable: true });
  });

  it("defaults state output under the current working directory", () => {
    expect(getDefaultMinimalStateDir("/tmp/demo")).toBe(resolve("/tmp/demo", ".omniweb-agent"));
  });
});
