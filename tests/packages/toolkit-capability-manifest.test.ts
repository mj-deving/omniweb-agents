import { describe, expect, it } from "vitest";
import {
  buildToolkitCapabilityManifest,
  describeToolkitCapabilities,
} from "../../packages/omniweb-toolkit/src/capability-manifest.js";
import {
  OFFICIAL_SKILL_COVERAGE_CLASSIFICATIONS,
  buildColonyOperatorResponseDepthAccess,
  buildOfficialSkillCoverageReport,
  getOfficialSkillSurfaceAreas,
} from "../../packages/omniweb-toolkit/src/agent.js";
import { describeRuntimeCapabilities, type RuntimeCapabilityResult } from "../../packages/omniweb-toolkit/src/readiness.js";

function readyRuntime(): RuntimeCapabilityResult {
  const runtime = describeRuntimeCapabilities({ cwd: "/tmp", homeDir: "/tmp", env: {} });
  return {
    ...runtime,
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    readiness: {
      ...runtime.readiness,
      ok: true,
      canAuth: true,
      canWrite: true,
      authState: "ready",
      writeState: "ready",
      missingEnv: [],
      missingPackages: [],
    },
    actionFamilies: {
      publish: { ...runtime.actionFamilies.publish, readiness: "ready" },
      reply: { ...runtime.actionFamilies.reply, readiness: "ready" },
      react: { ...runtime.actionFamilies.react, readiness: "ready" },
      tip: { ...runtime.actionFamilies.tip, readiness: "ready" },
      bet: { ...runtime.actionFamilies.bet, readiness: "ready" },
    },
  };
}

describe("toolkit capability manifest", () => {
  it("reports method names, params, status, proof tier, response depth, and lifecycle surfaces", () => {
    const manifest = buildToolkitCapabilityManifest({
      runtimeCapabilities: readyRuntime(),
      now: new Date("2026-05-18T07:30:00.000Z"),
    });

    expect(manifest.generatedAt).toBe("2026-05-18T07:30:00.000Z");
    expect(manifest.source).toBe("omniweb-toolkit");
    expect(manifest.coverage.domains).toEqual(["colony", "identity", "escrow", "storage", "ipfs", "chain"]);
    expect(manifest.coverage.readCapabilities).toBeGreaterThanOrEqual(10);
    expect(manifest.coverage.writeCapabilities).toBeGreaterThanOrEqual(10);
    expect(manifest.coverage.lifecycleAwareCapabilities).toEqual(expect.arrayContaining([
      "colony.publish",
      "colony.reply",
      "colony.publish-vote",
      "colony.bet-fixed",
    ]));

    expect(manifest.capabilities.find((capability) => capability.id === "colony.publish")).toMatchObject({
      domain: "colony",
      kind: "write",
      methods: ["omni.colony.publish"],
      status: "available",
      responseDepth: "proof",
      proofTier: "lifecycle_proven",
      requirements: {
        wallet: true,
        auth: true,
        write: true,
        spend: true,
        attestation: true,
        explicitExecute: true,
      },
      lifecycle: {
        writesLifecycleRecord: true,
        readbackSurfaces: expect.arrayContaining(["chain", "attestation", "post-detail"]),
        statusVocabulary: expect.arrayContaining(["planned", "chain-confirmed", "indexed", "degraded"]),
      },
    });

    expect(manifest.capabilities.find((capability) => capability.id === "colony.post-detail")).toMatchObject({
      kind: "read",
      methods: ["omni.colony.getPostDetail"],
      params: [{ name: "txHash", required: true, type: "string", description: expect.any(String) }],
      responseDepth: "rich",
      proofTier: "read_live_audited",
      lifecycle: {
        readbackSurfaces: ["post-detail", "thread"],
      },
    });

    expect(manifest.capabilities.find((capability) => capability.id === "colony.bet-higher-lower")).toMatchObject({
      status: "pending",
      proofTier: "pending_current_recheck",
      lifecycle: {
        readbackSurfaces: expect.arrayContaining(["higher-lower-pool", "resolved-winners"]),
      },
    });
  });

  it("overlays missing runtime readiness without hiding read-only capability truth", () => {
    const manifest = describeToolkitCapabilities({
      cwd: "/tmp",
      homeDir: "/tmp",
      env: {},
      now: new Date("2026-05-18T07:30:00.000Z"),
    });

    expect(manifest.recommendedMode).toBe("read-only");
    expect(manifest.coverage.blockedCapabilities).toEqual(expect.arrayContaining([
      "colony.publish",
      "colony.reply",
      "colony.tip",
      "colony.bet-fixed",
      "colony.identity",
    ]));
    expect(manifest.capabilities.find((capability) => capability.id === "colony.feed")).toMatchObject({
      status: "available",
      requirements: {
        wallet: false,
        write: false,
        spend: false,
      },
    });
    expect(manifest.capabilities.find((capability) => capability.id === "colony.publish")).toMatchObject({
      status: "blocked",
      notes: expect.arrayContaining(["Blocked by runtime readiness: missing_credentials."]),
    });
    expect(JSON.stringify(manifest)).not.toMatch(/mnemonic|seed phrase|approvalToken|challengeSecret/i);
  });

  it("keeps supervised and advanced boundaries explicit", () => {
    const manifest = buildToolkitCapabilityManifest({ runtimeCapabilities: readyRuntime() });

    expect(manifest.capabilities.find((capability) => capability.id === "colony.identity")).toMatchObject({
      status: "supervised",
      proofTier: "supervised_identity",
      requirements: {
        wallet: true,
        write: true,
        explicitExecute: true,
      },
    });
    expect(manifest.capabilities.find((capability) => capability.id === "colony.bet-recovery")).toMatchObject({
      status: "advanced",
      kind: "recovery",
      proofTier: "manual_recovery",
    });
    expect(manifest.capabilities.find((capability) => capability.id === "storage.programs")).toMatchObject({
      status: "degraded",
      domain: "storage",
      responseDepth: "rich",
      lifecycle: {
        readbackSurfaces: expect.arrayContaining(["storage-program-rpc", "recent-storage-transactions"]),
      },
    });
  });

  it("preserves response-depth access for deep read and lifecycle proof surfaces", () => {
    const manifest = buildToolkitCapabilityManifest({ runtimeCapabilities: readyRuntime() });
    const responseDepthAccess = buildColonyOperatorResponseDepthAccess(manifest);

    expect(responseDepthAccess.missingSurfaces).toEqual([]);
    expect(responseDepthAccess.surfaces).toHaveLength(7);
    expect(responseDepthAccess.surfaces.every((surface) => surface.preservationStatus === "preserved")).toBe(true);
    expect(responseDepthAccess.surfaces.find((surface) => surface.id === "signals-convergence")).toMatchObject({
      capabilityIds: ["colony.signals"],
      methods: expect.arrayContaining(["omni.colony.getSignals", "omni.colony.getConvergence", "omni.colony.getReport"]),
      responseDepths: ["rich"],
      readbackSurfaces: expect.arrayContaining(["signals", "convergence", "reports"]),
    });
    expect(responseDepthAccess.surfaces.find((surface) => surface.id === "price-history")).toMatchObject({
      capabilityIds: ["colony.markets.read"],
      methods: expect.arrayContaining(["omni.colony.getPriceHistory"]),
      readbackSurfaces: expect.arrayContaining(["price-history"]),
    });
    expect(responseDepthAccess.surfaces.find((surface) => surface.id === "pool-state")).toMatchObject({
      capabilityIds: ["colony.pools.read"],
      methods: expect.arrayContaining(["omni.colony.getPool", "omni.colony.getHigherLowerPool"]),
      readbackSurfaces: expect.arrayContaining(["active-pool", "higher-lower-pool", "winners-history"]),
    });
    expect(responseDepthAccess.surfaces.find((surface) => surface.id === "reactions-tip-stats")).toMatchObject({
      capabilityIds: ["colony.engagement-reads"],
      methods: expect.arrayContaining(["omni.colony.getReactions", "omni.colony.getTipStats", "omni.colony.getAgentTipStats"]),
      readbackSurfaces: expect.arrayContaining(["reaction-summary", "post-tip-stats", "agent-tip-stats"]),
    });
    expect(responseDepthAccess.surfaces.find((surface) => surface.id === "identity-link-readbacks")).toMatchObject({
      capabilityIds: expect.arrayContaining(["colony.identity-reads", "colony.identity"]),
      methods: expect.arrayContaining(["omni.colony.lookupIdentity", "omni.colony.getLinkedAgents", "omni.colony.unlinkAgent"]),
      readbackSurfaces: expect.arrayContaining(["identity-lookup", "linked-agents", "post-cleanup-readback"]),
    });
    expect(responseDepthAccess.surfaces.find((surface) => surface.id === "lifecycle-proof-packets")).toMatchObject({
      responseDepths: expect.arrayContaining(["proof", "lifecycle"]),
      proofTiers: expect.arrayContaining(["lifecycle_proven", "pending_current_recheck"]),
      envelopeFields: expect.arrayContaining(["lifecyclePlan.recordId", "lifecyclePlan.proofPath", "cycle.outcome.execution"]),
    });
  });

  it("classifies the official SuperColony skill surface against manifest truth", () => {
    const manifest = buildToolkitCapabilityManifest({
      runtimeCapabilities: readyRuntime(),
      now: new Date("2026-05-18T09:15:00.000Z"),
    });
    const report = buildOfficialSkillCoverageReport(manifest, {
      now: new Date("2026-05-18T09:16:00.000Z"),
    });

    expect(report.generatedAt).toBe("2026-05-18T09:16:00.000Z");
    expect(report.source).toMatchObject({
      officialSkillUrl: "https://supercolony.ai/skill",
      officialSkillMarkdownUrl: "https://supercolony.ai/supercolony-skill.md",
      comparedAgainst: "toolkitCapabilityManifest",
      sourceOfTruth: "omniweb-toolkit",
    });
    expect(report.classificationVocabulary).toEqual(OFFICIAL_SKILL_COVERAGE_CLASSIFICATIONS);
    expect(report.summary.missingCapabilityIds).toEqual([]);
    expect(report.summary.byClassification).toMatchObject({
      covered: expect.any(Number),
      partial: expect.any(Number),
      supervised: expect.any(Number),
      advanced: expect.any(Number),
      pending: expect.any(Number),
      degraded: expect.any(Number),
      intentionally_excluded: expect.any(Number),
    });
    for (const classification of OFFICIAL_SKILL_COVERAGE_CLASSIFICATIONS) {
      expect(report.summary.byClassification[classification]).toBeGreaterThan(0);
    }

    expect(report.entries.find((entry) => entry.id === "feed-search")).toMatchObject({
      classification: "covered",
      capabilityIds: ["colony.search"],
      capabilityStatuses: [
        expect.objectContaining({
          id: "colony.search",
          status: "available",
          methods: expect.arrayContaining(["createClient().searchFeed", "omni.colony.search"]),
        }),
      ],
    });
    expect(report.entries.find((entry) => entry.id === "higher-lower-betting")).toMatchObject({
      classification: "pending",
      capabilityIds: expect.arrayContaining(["colony.bet-higher-lower"]),
      capabilityStatuses: expect.arrayContaining([
        expect.objectContaining({
          id: "colony.bet-higher-lower",
          status: "pending",
          proofTier: "pending_current_recheck",
        }),
      ]),
    });
    expect(report.entries.find((entry) => entry.id === "agent-identity")).toMatchObject({
      classification: "supervised",
      capabilityStatuses: expect.arrayContaining([
        expect.objectContaining({
          id: "colony.identity",
          status: "supervised",
          proofTier: "supervised_identity",
        }),
      ]),
    });
    expect(report.entries.find((entry) => entry.id === "proof-storage")).toMatchObject({
      classification: "degraded",
      capabilityStatuses: [
        expect.objectContaining({
          id: "storage.programs",
          status: "degraded",
        }),
      ],
    });
    expect(report.entries.find((entry) => entry.id === "chat")).toMatchObject({
      classification: "pending",
      capabilityIds: [],
      notes: expect.arrayContaining(["Official chat is a known surface not yet represented by the toolkit capability manifest."]),
    });
    expect(report.entries.find((entry) => entry.id === "integration-packages")).toMatchObject({
      classification: "intentionally_excluded",
      capabilityIds: [],
    });
    expect(getOfficialSkillSurfaceAreas()).toHaveLength(report.entries.length);
  });
});
