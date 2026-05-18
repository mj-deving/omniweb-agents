import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { observe } from "../../packages/omniweb-toolkit/agents/openclaw/colony-operator/skills/omniweb-colony-operator/starter.ts";
import {
  buildToolkitCapabilityManifest,
  buildColonyOperatorCapabilityTruth,
  runColonyOperatorCycle,
  type ColonyOperatorLifecycleStore,
} from "../../packages/omniweb-toolkit/src/agent.js";
import { describeRuntimeCapabilities } from "../../packages/omniweb-toolkit/src/readiness.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(resolve(tmpdir(), "colony-operator-entrypoint-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("colony operator execution entrypoint", () => {
  it("returns the maintained dry-run execution envelope without writing lifecycle records", async () => {
    const stateDir = await createTempDir();
    const lifecycleStore = makeLifecycleStore();

    const envelope = await runColonyOperatorCycle(observe, {
      stateDir,
      cwd: stateDir,
      readinessOptions: { cwd: stateDir, homeDir: stateDir, env: {} },
      omni: makeOmni(),
      lifecycleStore,
      now: makeNow(Date.UTC(2026, 4, 16, 14, 30, 0), Date.UTC(2026, 4, 16, 14, 30, 1)),
    });

    expect(envelope.mode).toBe("dry-run");
    expect(envelope.execution.dryRun).toBe(true);
    expect(envelope.execution.status).toBe("dry_run");
    expect(envelope.execution.demSpendEstimate).toBe(0);
    expect(envelope.selectedAction.actionFamily).toBe("publish");
    expect(envelope.selectedAction.intent).toMatchObject({
      actionFamily: "publish",
      actionType: "publish",
      executionPathFamily: "direct_attested_write",
      requirements: {
        wallet: true,
        attestation: true,
        explicitExecute: true,
      },
    });
    expect(envelope.skippedAlternatives.map((item) => item.actionFamily)).toContain("bet-hl");
    expect(envelope.skippedAlternatives.find((item) => item.actionFamily === "bet-hl")?.intent).toMatchObject({
      actionType: "bet",
      marketKind: "higher_lower",
      status: "lifecycle-pending",
    });
    expect(envelope.capabilitySummary).toMatchObject({
      selectedFamily: "publish",
      noSpendDefault: true,
      allRequiredFamiliesHaveIntent: true,
    });
    expect(envelope.capabilitySummary.lifecyclePendingFamilies).toContain("bet-hl");
    expect(envelope.capabilitySummary.explicitExecuteFamilies).toEqual(expect.arrayContaining(["publish", "tip", "VOTE", "register", "human-link"]));
    expect(envelope.capabilityTruth.coverage.allRequiredFamiliesPresent).toBe(true);
    expect(envelope.capabilityDiscovery).toMatchObject({
      source: "omniweb-toolkit",
      compact: {
        availableReadCapabilities: expect.arrayContaining(["colony.feed", "colony.post-detail", "colony.markets.read"]),
        blockedCapabilities: expect.arrayContaining(["colony.publish", "colony.tip", "colony.identity"]),
        richResponseCapabilities: expect.arrayContaining(["colony.post-detail", "colony.markets.read", "colony.pools.read"]),
        proofResponseCapabilities: expect.arrayContaining(["colony.publish", "colony.reply", "colony.bet-fixed"]),
        defaultBoundaries: {
          noSpendDefault: true,
          liveExecutionRequiresExplicitExecute: true,
          strategyLayer: "skill/playbook",
          protocolLayer: "toolkit/runtime",
        },
      },
      fullDetailAccess: {
        manifestField: "toolkitCapabilityManifest",
        includes: expect.arrayContaining(["methods", "params", "requirements", "responseDepth", "proofTier", "lifecycle", "status"]),
      },
    });
    expect(envelope.capabilityDiscovery.fullDetailAccess.capabilityIds).toEqual(expect.arrayContaining([
      "colony.publish",
      "colony.identity",
      "storage.programs",
    ]));
    expect(envelope.capabilityDiscovery.responseDepthAccess).toMatchObject({
      manifestField: "toolkitCapabilityManifest",
      preservedFields: expect.arrayContaining(["toolkitCapabilityManifest", "cycle", "lifecyclePlan"]),
      missingSurfaces: [],
    });
    expect(envelope.capabilityDiscovery.responseDepthAccess.surfaces.map((surface) => surface.id)).toEqual(expect.arrayContaining([
      "post-detail-thread",
      "signals-convergence",
      "price-history",
      "pool-state",
      "reactions-tip-stats",
      "identity-link-readbacks",
      "lifecycle-proof-packets",
    ]));
    expect(envelope.capabilityDiscovery.responseDepthAccess.surfaces.find((surface) => surface.id === "post-detail-thread")).toMatchObject({
      capabilityIds: ["colony.post-detail"],
      methods: ["omni.colony.getPostDetail"],
      readbackSurfaces: expect.arrayContaining(["post-detail", "thread"]),
      preservationStatus: "preserved",
    });
    expect(envelope.capabilityDiscovery.responseDepthAccess.surfaces.find((surface) => surface.id === "lifecycle-proof-packets")).toMatchObject({
      capabilityIds: expect.arrayContaining(["colony.publish", "colony.reply", "colony.bet-fixed", "colony.bet-higher-lower"]),
      methods: expect.arrayContaining(["omni.colony.publish", "omni.colony.reply", "omni.colony.placeBet", "omni.colony.placeHL"]),
      readbackSurfaces: expect.arrayContaining(["chain", "attestation", "post-detail", "thread", "active-pool", "resolved-winners"]),
      envelopeFields: expect.arrayContaining(["lifecyclePlan.proofPath", "cycle.outcome.execution"]),
      preservationStatus: "preserved",
    });
    expect(envelope.toolkitCapabilityManifest.capabilities.find((capability) => capability.id === "colony.publish")).toMatchObject({
      methods: ["omni.colony.publish"],
      params: expect.arrayContaining([{ name: "text", required: true, type: "string" }]),
      responseDepth: "proof",
      proofTier: "lifecycle_proven",
    });
    expect(envelope.toolkitCapabilityManifest.capabilities.find((capability) => capability.id === "colony.post-detail")).toMatchObject({
      lifecycle: {
        readbackSurfaces: ["post-detail", "thread"],
      },
    });
    expect(envelope.lifecyclePlan).toMatchObject({
      required: true,
      status: "planned",
      actionFamily: "publish",
    });
    expect(lifecycleStore.created).toHaveLength(0);
  });

  it("requires explicit execute before writing a lifecycle proof record", async () => {
    const stateDir = await createTempDir();
    const lifecycleStore = makeLifecycleStore();
    const runtime = describeRuntimeCapabilities({ cwd: stateDir, homeDir: stateDir, env: {} });
    const readyRuntime = {
      ...runtime,
      authReady: true,
      writeReady: true,
      blockers: [],
      recommendedMode: "write-ready" as const,
      actionFamilies: {
        ...runtime.actionFamilies,
        publish: { ...runtime.actionFamilies.publish, readiness: "ready" as const },
      },
    };
    const capabilityTruth = buildColonyOperatorCapabilityTruth({
      runtimeCapabilities: readyRuntime,
      now: new Date("2026-05-16T14:30:00.000Z"),
    });
    const toolkitCapabilityManifest = buildToolkitCapabilityManifest({
      runtimeCapabilities: readyRuntime,
      now: new Date("2026-05-16T14:30:00.000Z"),
    });

    const envelope = await runColonyOperatorCycle(observe, {
      execute: true,
      stateDir,
      cwd: stateDir,
      omni: makeOmni(),
      lifecycleStore,
      capabilityTruth,
      toolkitCapabilityManifest,
      walletAddress: "0xoperator",
      command: "check-colony-operator-entrypoint --execute",
      commit: "testcommit",
      verification: { timeoutMs: 1, pollMs: 1, limit: 10 },
      now: makeNow(Date.UTC(2026, 4, 16, 14, 31, 0), Date.UTC(2026, 4, 16, 14, 31, 1)),
    });

    expect(envelope.mode).toBe("execute");
    expect(envelope.capabilitySummary.executableFamilies).toContain("publish");
    expect(envelope.capabilitySummary.spendFamilies).toContain("publish");
    expect(envelope.capabilityDiscovery.compact.availableWriteCapabilities).toContain("colony.publish");
    expect(envelope.capabilityDiscovery.operatorActionFamilies.executableFamilies).toContain("publish");
    expect(envelope.execution.dryRun).toBe(false);
    expect(envelope.execution.status).toBe("published");
    expect(envelope.execution.txHash).toBe("0xentrypoint-publish");
    expect(envelope.execution.productReadback).toMatchObject({
      attempted: true,
      visible: true,
      indexedVisible: true,
      verificationPath: "feed",
    });
    expect(envelope.lifecyclePlan).toMatchObject({
      required: true,
      status: "recorded",
      recordId: "wl-test-1",
      proofPath: "/tmp/wl-test-1.proof.json",
    });
    expect(lifecycleStore.created[0]).toMatchObject({
      actionFamily: "publish",
      walletAddress: "0xoperator",
      txHash: "0xentrypoint-publish",
      attestationTxHash: "0xattestation",
      expectedReadback: ["recent-feed", "category-search", "post-detail"],
      status: "indexed",
      budget: {
        amount: 1,
        unit: "DEM",
        spendStatus: "executed",
      },
    });
    expect(lifecycleStore.created[0].observations[0]).toMatchObject({
      surface: "recent-feed",
      status: "indexed",
      ok: true,
      summary: expect.stringContaining("product readback indexed via recent-feed"),
    });
  });
});

function makeNow(...values: number[]): () => number {
  const queue = [...values];
  const last = values.at(-1) ?? Date.now();
  return () => queue.shift() ?? last;
}

function makeLifecycleStore(): ColonyOperatorLifecycleStore & { created: any[] } {
  const created: any[] = [];
  return {
    created,
    recordsDir: "/tmp/write-lifecycle/records",
    create: vi.fn(async (input) => {
      const record = {
        id: `wl-test-${created.length + 1}`,
        status: input.status,
        observations: [],
        txHash: input.txHash,
        attestationTxHash: input.attestationTxHash,
        ...input,
      };
      created.push(record);
      return record;
    }),
    update: vi.fn(async (id: string, patch: any) => {
      const record = created.find((entry) => entry.id === id);
      if (!record) throw new Error(`missing record ${id}`);
      Object.assign(record, patch.status ? { status: patch.status } : {});
      if (patch.observation) {
        record.observations.push({
          observedAt: "2026-05-16T14:31:00.000Z",
          ...patch.observation,
        });
      }
      if (patch.finalVerdict) {
        record.finalVerdict = patch.finalVerdict;
      }
      return record;
    }),
    writeProofPacket: vi.fn(async (record: any) => `/tmp/${record.id}.proof.json`),
  };
}

function makeOmni(): any {
  const publishedText = "BTC funding split is now live across colony surfaces";
  return {
    colony: {
      getSignals: async () => ({
        ok: true,
        data: [
          { shortTopic: "BTC funding split", confidence: 78, direction: "bearish", assets: ["BTC"] },
          { shortTopic: "ETH ETF drift", confidence: 61, direction: "mixed", assets: ["ETH"] },
        ],
      }),
      getConvergence: async () => ({
        ok: true,
        data: {
          mindshare: {
            series: [{
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
            }],
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          meta: { lastBlock: 123 },
          posts: [{
            txHash: "0xentrypoint-publish",
            payload: { cat: "OBSERVATION", text: publishedText },
            category: "OBSERVATION",
            blockNumber: 123,
            score: 20,
          }],
        },
      }),
      getLeaderboard: async () => ({
        ok: true,
        data: { agents: [{ address: "0xauthor1" }, { address: "0xauthor2" }] },
      }),
      getBalance: async () => ({
        ok: true,
        data: { balance: 42 },
      }),
      getPostDetail: async () => ({
        ok: true,
        data: {
          post: {
            payload: { cat: "OBSERVATION", text: publishedText },
            blockNumber: 123,
          },
        },
      }),
      publish: vi.fn(async () => ({
        ok: true,
        data: { txHash: "0xentrypoint-publish" },
        provenance: {
          path: "local",
          attestation: {
            txHash: "0xattestation",
            responseHash: "0xattestation-response",
          },
        },
      })),
    },
    runtime: {
      sdkBridge: {},
    },
  };
}
