#!/usr/bin/env npx tsx

import { hasFlag, loadPackageExport } from "./_shared.js";

interface ToolkitCapabilityManifest {
  source: "omniweb-toolkit";
  capabilities: Array<{
    id: string;
    methods: string[];
    responseDepth: string;
    proofTier: string;
    lifecycle: {
      readbackSurfaces: string[];
      statusVocabulary: string[];
      writesLifecycleRecord: boolean;
    };
  }>;
}

interface ResponseDepthAccess {
  manifestField: "toolkitCapabilityManifest";
  preservedFields: string[];
  surfaces: Array<{
    id: string;
    capabilityIds: string[];
    methods: string[];
    responseDepths: string[];
    proofTiers: string[];
    readbackSurfaces: string[];
    envelopeFields: string[];
    preservationStatus: string;
  }>;
  missingSurfaces: string[];
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-colony-operator-response-depth.ts

Assert that colony-operator runtime discovery preserves deep read and lifecycle-proof access through toolkit manifest truth rather than flattening it into prose summaries.

Output: JSON response-depth preservation proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const buildToolkitCapabilityManifest = await loadPackageExport<
  (opts?: Record<string, unknown>) => ToolkitCapabilityManifest
>("../dist/agent.js", "../src/agent.ts", "buildToolkitCapabilityManifest");
const buildColonyOperatorResponseDepthAccess = await loadPackageExport<
  (manifest: ToolkitCapabilityManifest) => ResponseDepthAccess
>("../dist/agent.js", "../src/agent.ts", "buildColonyOperatorResponseDepthAccess");

const started = Date.now();
const manifest = buildToolkitCapabilityManifest({
  now: new Date("2026-05-18T08:10:00.000Z"),
  runtimeCapabilities: {
    authReady: true,
    writeReady: true,
    recommendedMode: "write-ready",
    blockers: [],
    readiness: {
      ok: true,
      canRead: true,
      canAuth: true,
      canWrite: true,
      authState: "ready",
      writeState: "ready",
      missingEnv: [],
      missingPackages: [],
    },
    actionFamilies: {
      publish: readyActionFamily(),
      reply: readyActionFamily({ requiresTargetPost: true }),
      react: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true, spendsDem: false }),
      tip: readyActionFamily({ requiresAttestation: false, requiresTargetPost: true }),
      bet: readyActionFamily({ requiresAttestation: false, requiresMarketContext: true }),
    },
  },
});
const responseDepthAccess = buildColonyOperatorResponseDepthAccess(manifest);
const surfaces = Object.fromEntries(responseDepthAccess.surfaces.map((surface) => [surface.id, surface]));
const checks = {
  manifestDetailPointer: responseDepthAccess.manifestField === "toolkitCapabilityManifest"
    && responseDepthAccess.preservedFields.includes("toolkitCapabilityManifest"),
  noMissingSurfaces: responseDepthAccess.missingSurfaces.length === 0,
  allSurfacesPreserved: responseDepthAccess.surfaces.every((surface) => surface.preservationStatus === "preserved"),
  postDetailThread: surfaceHas("post-detail-thread", {
    methods: ["omni.colony.getPostDetail"],
    readbackSurfaces: ["post-detail", "thread"],
    depths: ["rich"],
  }),
  signalsConvergence: surfaceHas("signals-convergence", {
    methods: ["omni.colony.getSignals", "omni.colony.getConvergence", "omni.colony.getReport"],
    readbackSurfaces: ["signals", "convergence", "reports"],
    depths: ["rich"],
  }),
  priceHistory: surfaceHas("price-history", {
    methods: ["omni.colony.getPriceHistory"],
    readbackSurfaces: ["price-history"],
    depths: ["rich"],
  }),
  poolState: surfaceHas("pool-state", {
    methods: ["omni.colony.getPool", "omni.colony.getHigherLowerPool"],
    readbackSurfaces: ["active-pool", "higher-lower-pool", "winners-history"],
    depths: ["rich"],
  }),
  reactionsTipStats: surfaceHas("reactions-tip-stats", {
    methods: ["omni.colony.getReactions", "omni.colony.getTipStats", "omni.colony.getAgentTipStats"],
    readbackSurfaces: ["reaction-summary", "post-tip-stats", "agent-tip-stats"],
    depths: ["standard"],
  }),
  identityReadbacks: surfaceHas("identity-link-readbacks", {
    methods: ["omni.colony.lookupIdentity", "omni.colony.getLinkedAgents", "omni.colony.unlinkAgent"],
    readbackSurfaces: ["identity-lookup", "linked-agents", "post-cleanup-readback"],
    depths: ["rich", "proof"],
  }),
  lifecycleProofPackets: surfaceHas("lifecycle-proof-packets", {
    methods: ["omni.colony.publish", "omni.colony.reply", "omni.colony.publishVote", "omni.colony.react", "omni.colony.tip", "omni.colony.placeBet", "omni.colony.placeHL"],
    readbackSurfaces: ["chain", "attestation", "post-detail", "thread", "reaction-summary", "post-tip-stats", "active-pool", "higher-lower-pool", "resolved-winners"],
    depths: ["proof", "lifecycle"],
    envelopeFields: ["lifecyclePlan.recordId", "lifecyclePlan.proofPath", "cycle.outcome.execution"],
  }),
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  checks,
  contract: {
    responseDepthPreserved: ok,
    sourceOfTruth: "toolkitCapabilityManifest",
    noSkillProseRequired: true,
    liveWriteProven: false,
    spendsDem: false,
  },
  responseDepthAccess,
}, null, 2));

process.exit(ok ? 0 : 1);

function surfaceHas(
  id: string,
  expected: {
    methods: string[];
    readbackSurfaces: string[];
    depths: string[];
    envelopeFields?: string[];
  },
): boolean {
  const surface = surfaces[id];
  if (!surface) return false;
  return expected.methods.every((method) => surface.methods.includes(method))
    && expected.readbackSurfaces.every((readbackSurface) => surface.readbackSurfaces.includes(readbackSurface))
    && expected.depths.every((depth) => surface.responseDepths.includes(depth))
    && (expected.envelopeFields ?? []).every((field) => surface.envelopeFields.includes(field));
}

function readyActionFamily(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    executable: true,
    readiness: "ready",
    requiresWallet: true,
    requiresAttestation: true,
    requiresTargetPost: false,
    requiresMarketContext: false,
    notes: [],
    ...overrides,
  };
}
