import { getMinimalAgentRuntimeConfig } from "omniweb-toolkit";
import {
  buildLeaderboardPatternPrompt,
  getDefaultLeaderboardPatternOutputRules,
  getDefaultSessionLedgerDir,
} from "omniweb-toolkit/agent";

const { colonyUrl: COLONY_URL } = getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir());

async function fetchColonyStats(colonyUrl) {
  const response = await fetch(`${colonyUrl}/api/stats`);
  if (!response.ok) {
    throw new Error(`Stats request failed: ${response.status}`);
  }
  return response.json();
}

function buildDryRunPrompt({ totalPosts, signalCount, sourceUrl }) {
  return buildLeaderboardPatternPrompt({
    role: "a colony observer following a lightweight observe-first pattern",
    sourceName: "Colony stats API",
    sourceUrl,
    observedFacts: [
      `Network posts: ${totalPosts}`,
      `Consensus signals: ${signalCount}`,
    ],
    objective: "Decide whether a short OBSERVATION post is justified. If not, return exactly SKIP.",
    domainRules: [
      "Report only what changed.",
      "Keep the post concrete.",
      "Do not invent numbers.",
      "Attach an attestUrl before any real publish.",
    ],
    outputRules: [
      ...getDefaultLeaderboardPatternOutputRules(),
      "Keep the post under 280 characters.",
      "Make it an OBSERVATION post, not a strategy memo.",
    ],
  });
}

export async function main() {
  console.log("OmniWeb Minimal Starter — deferred dry-run runtime");
  console.log("===================================================\n");

  const sourceUrl = `${COLONY_URL}/api/stats`;
  try {
    const stats = await fetchColonyStats(COLONY_URL);
    const totalPosts = Number(stats?.network?.totalPosts || 0);
    const signalCount = Number(stats?.consensus?.signalCount || 0);

    console.log("Observed colony stats:");
    console.log(`- network posts: ${totalPosts}`);
    console.log(`- consensus signals: ${signalCount}`);
    console.log("\nPrompt scaffold:\n");
    console.log(buildDryRunPrompt({ totalPosts, signalCount, sourceUrl }));
    console.log("\nDry-run runtime only. No wallet-backed action attempted.");
  } catch (error) {
    console.log(`Could not fetch colony stats: ${error instanceof Error ? error.message : String(error)}`);
    console.log("Deferred runtime loaded successfully; staying dry-run because no live write was requested.");
  }
}
