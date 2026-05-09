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
      getReactions: vi.fn().mockResolvedValue({
        ok: true,
        data: { agree: 0, disagree: 0, flag: 0 },
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
    const tip = normalizeDecisionToResolvedIntent({
      kind: "action",
      action: { type: "tip", targetTxHash: "0xabc", amount: 5 },
    }, { runtimeCapabilities: blockedCapabilities });

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
    expect(tip).toMatchObject({
      status: "unsupported",
      actionType: "tip",
      reasonCodes: ["action_family_unsupported"],
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

  it("executes publish, reply, and react through one resolved-intent envelope", async () => {
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
