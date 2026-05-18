#!/usr/bin/env npx tsx
/**
 * check-read-profile-consumers.ts — No-spend proof for root read/profile/scoring/verification consumers.
 */

import {
  READ_PROFILE_SURFACE,
  classifyReadProfileShape,
  summarizeReadProfileCoverage,
} from "../src/index.js";

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
