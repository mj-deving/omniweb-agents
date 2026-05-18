#!/usr/bin/env npx tsx

import { hasFlag, loadPackageExport } from "./_shared.js";

type CoverageClassification =
  | "covered"
  | "partial"
  | "supervised"
  | "advanced"
  | "pending"
  | "degraded"
  | "intentionally_excluded";

interface ToolkitCapabilityManifest {
  source: "omniweb-toolkit";
  capabilities: Array<{ id: string; status: string }>;
}

interface CoverageReport {
  source: {
    officialSkillUrl: string;
    officialSkillMarkdownUrl: string;
    comparedAgainst: string;
    sourceOfTruth: string;
  };
  classificationVocabulary: CoverageClassification[];
  entries: Array<{
    id: string;
    sourceSection: string;
    classification: CoverageClassification;
    capabilityIds: string[];
    capabilityStatuses: Array<{
      id: string;
      status: string;
      methods: string[];
      responseDepth: string;
      proofTier: string;
    }>;
    missingCapabilityIds: string[];
  }>;
  summary: {
    totalAreas: number;
    byClassification: Record<CoverageClassification, number>;
    missingCapabilityIds: string[];
    partialAreas: string[];
    supervisedAreas: string[];
    advancedAreas: string[];
    pendingAreas: string[];
    degradedAreas: string[];
    intentionallyExcludedAreas: string[];
  };
}

const args = process.argv.slice(2);
const allowedArgs = new Set(["--help", "-h"]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-colony-operator-official-skill-coverage.ts

Assert that the toolkit-owned capability manifest has a maintained comparison against the official SuperColony skill surface.

Output: JSON official-skill coverage proof
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
const buildOfficialSkillCoverageReport = await loadPackageExport<
  (manifest: ToolkitCapabilityManifest, opts?: Record<string, unknown>) => CoverageReport
>("../dist/agent.js", "../src/agent.ts", "buildOfficialSkillCoverageReport");

const started = Date.now();
const manifest = buildToolkitCapabilityManifest({
  now: new Date("2026-05-18T09:25:00.000Z"),
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
const coverageReport = buildOfficialSkillCoverageReport(manifest, {
  now: new Date("2026-05-18T09:26:00.000Z"),
});
const entries = Object.fromEntries(coverageReport.entries.map((entry) => [entry.id, entry]));
const checks = {
  sourceAnchoredToOfficialSkill: coverageReport.source.officialSkillUrl === "https://supercolony.ai/skill"
    && coverageReport.source.officialSkillMarkdownUrl === "https://supercolony.ai/supercolony-skill.md"
    && coverageReport.source.comparedAgainst === "toolkitCapabilityManifest"
    && coverageReport.source.sourceOfTruth === "omniweb-toolkit",
  allClassificationsRepresented: includesAll(coverageReport.classificationVocabulary, [
    "covered",
    "partial",
    "supervised",
    "advanced",
    "pending",
    "degraded",
    "intentionally_excluded",
  ]) && coverageReport.classificationVocabulary.every((classification) => (
    coverageReport.summary.byClassification[classification] > 0
  )),
  noMappedCapabilityMissing: coverageReport.summary.missingCapabilityIds.length === 0
    && coverageReport.entries.every((entry) => entry.missingCapabilityIds.length === 0),
  officialReadSurfaceCovered: entries.feed?.classification === "covered"
    && hasCapability(entries.feed, "colony.feed", "available")
    && entries["feed-search"]?.classification === "covered"
    && hasCapability(entries["feed-search"], "colony.search", "available")
    && entries["post-thread"]?.classification === "covered"
    && hasCapability(entries["post-thread"], "colony.post-detail", "available")
    && entries.signals?.classification === "covered"
    && hasCapability(entries.signals, "colony.signals", "available"),
  officialTransportsPartial: entries.rss?.classification === "partial"
    && entries["sse-stream"]?.classification === "partial"
    && coverageReport.summary.partialAreas.includes("binary-commodity-sports-markets")
    && coverageReport.summary.partialAreas.includes("eth-betting"),
  writeAndProofSurfaceCovered: entries.publish?.classification === "covered"
    && hasCapability(entries.publish, "colony.publish", "available")
    && entries["dahr-attestation"]?.classification === "covered"
    && hasCapability(entries["dahr-attestation"], "colony.attest", "available")
    && entries["tlsnotary-attestation"]?.classification === "advanced"
    && hasCapability(entries["tlsnotary-attestation"], "colony.attest-tlsn", "advanced"),
  marketBoundariesExplicit: entries["fixed-price-betting"]?.classification === "covered"
    && hasCapability(entries["fixed-price-betting"], "colony.bet-fixed", "available")
    && entries["higher-lower-betting"]?.classification === "pending"
    && hasCapability(entries["higher-lower-betting"], "colony.bet-higher-lower", "pending")
    && entries["bet-registration-recovery"]?.classification === "advanced"
    && hasCapability(entries["bet-registration-recovery"], "colony.bet-recovery", "advanced"),
  identityAndWebhookBoundariesExplicit: entries["agent-identity"]?.classification === "supervised"
    && hasCapability(entries["agent-identity"], "colony.identity", "supervised")
    && entries["web2-identity"]?.classification === "advanced"
    && hasCapability(entries["web2-identity"], "identity.web2", "advanced")
    && entries.webhooks?.classification === "advanced"
    && hasCapability(entries.webhooks, "colony.webhooks", "advanced"),
  knownGapsAreNamed: entries.chat?.classification === "pending"
    && entries.chat.capabilityIds.length === 0
    && entries["proof-storage"]?.classification === "degraded"
    && hasCapability(entries["proof-storage"], "storage.programs", "degraded")
    && entries["integration-packages"]?.classification === "intentionally_excluded"
    && entries["health-diagnostics"]?.classification === "intentionally_excluded",
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  durationMs: Date.now() - started,
  checks,
  contract: {
    officialSurfaceComparedToManifest: ok,
    classifications: coverageReport.classificationVocabulary,
    sourceOfTruth: "toolkitCapabilityManifest",
    noSkillProseRequiredAtRuntime: true,
    liveWriteProven: false,
    spendsDem: false,
  },
  coverageReport,
}, null, 2));

process.exit(ok ? 0 : 1);

function hasCapability(
  entry: CoverageReport["entries"][number] | undefined,
  id: string,
  status: string,
): boolean {
  if (!entry) return false;
  return entry.capabilityStatuses.some((capability) => capability.id === id && capability.status === status);
}

function includesAll<T>(actual: T[], expected: T[]): boolean {
  return expected.every((value) => actual.includes(value));
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
