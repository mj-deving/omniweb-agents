import { describe, expect, it } from "vitest";
import {
  buildToolkitCapabilityManifest,
  describeToolkitCapabilities,
} from "../../packages/omniweb-toolkit/src/capability-manifest.js";
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
});
