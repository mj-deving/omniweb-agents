#!/usr/bin/env -S bunx tsx
/**
 * check-read-profile-consumers.ts — No-spend proof for root read/profile/scoring/verification consumers.
 */

import {
  hasFlag,
  loadPackageExport,
} from "./_shared.js";

type ReadProfileSurfaceEntry = { family: string; noSpend: boolean; noMutation: boolean; status?: string };
type ReadProfileCoverage = { ok: boolean; coveredFamilies: string[]; unsupportedFamilies: string[] };
type ReadProfileShapeCheck = { verdict: string };

const args = process.argv.slice(2);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bun ./scripts/check-read-profile-consumers.ts

No-spend proof for root read/profile/scoring/verification consumers.

Options:
  --help, -h  Show this help`);
  process.exit(0);
}
if (args.length > 0) {
  console.error(`Error: unsupported arguments: ${args.join(" ")}`);
  process.exit(2);
}

const READ_PROFILE_SURFACE = await loadPackageExport<ReadProfileSurfaceEntry[]>(
  "../dist/index.js",
  "../src/index.js",
  "READ_PROFILE_SURFACE",
);
const classifyReadProfileShape = await loadPackageExport<
  (family: string, payload: Record<string, unknown>) => ReadProfileShapeCheck
>(
  "../dist/index.js",
  "../src/index.js",
  "classifyReadProfileShape",
);
const summarizeReadProfileCoverage = await loadPackageExport<() => ReadProfileCoverage>(
  "../dist/index.js",
  "../src/index.js",
  "summarizeReadProfileCoverage",
);

const coverage = summarizeReadProfileCoverage();
const shapeChecks = [
  classifyReadProfileShape("feed", { posts: [], hasMore: false }),
  classifyReadProfileShape("thread", { focusedPost: {}, posts: [], totalReplies: 0 }),
  classifyReadProfileShape("signals", { consensusAnalysis: [], computed: [], meta: {} }),
  classifyReadProfileShape("report", { reports: [] }),
  classifyReadProfileShape("stats", { network: {}, activity: {}, quality: {} }),
  classifyReadProfileShape("agents", { agents: [{ address: "0xagent", level: 1 }] }),
  classifyReadProfileShape("identity", { identity: { platform: "x", username: "alice" } }),
  classifyReadProfileShape("scoring", { agents: [], globalAvg: 76.8 }),
  classifyReadProfileShape("verification", { verified: true, attestations: [] }),
  classifyReadProfileShape("engagement", { agree: 0, disagree: 0, flag: 0 }),
];

const checks = {
  coverageOk: coverage.ok,
  noSpend: READ_PROFILE_SURFACE.every((entry) => entry.noSpend === true),
  noMutation: READ_PROFILE_SURFACE.every((entry) => entry.noMutation === true),
  feedThreadCovered: coverage.coveredFamilies.includes("feed"),
  profilesCovered: coverage.coveredFamilies.includes("agents"),
  scoringCovered: coverage.coveredFamilies.includes("scoring"),
  verificationCovered: coverage.coveredFamilies.includes("verification"),
  levelGapHonest: coverage.unsupportedFamilies.includes("levels")
    && READ_PROFILE_SURFACE.some((entry) => entry.family === "levels" && entry.status === "advertised_but_404"),
  shapeChecksPass: shapeChecks.every((check) => check.verdict === "pass"),
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  coverage,
  shapeChecks,
  contract: {
    ownerBead: "omniweb-agents-spectrum.6",
    noSpend: true,
    noMutation: true,
    publicRegistryProof: false,
    release: false,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
