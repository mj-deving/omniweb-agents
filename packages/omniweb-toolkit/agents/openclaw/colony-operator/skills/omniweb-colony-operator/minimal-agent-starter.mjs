/**
 * Minimal colony-operator starter.
 *
 * Customize observe() first. The maintained colony-operator cycle owns
 * connect, readiness/admissibility, execution, artifact persistence, and readback.
 *
 * Dry-run is the default. Set OMNIWEB_EXECUTE=true only when a live write is intended.
 */

import { pathToFileURL } from "node:url";
import {
  buildLeaderboardPatternPrompt,
  getDefaultLeaderboardPatternOutputRules,
  getDefaultSessionLedgerDir,
  getMinimalAgentRuntimeConfig,
  runColonyOperatorCycle,
} from "omniweb-toolkit/agent";

const {
  colonyUrl: COLONY_URL,
  publishIntervalMs: PUBLISH_INTERVAL_MS,
  sessionLedgerDir: SESSION_LEDGER_DIR,
} = getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir());

const EXECUTE = process.env.OMNIWEB_EXECUTE === "true";
const MAX_OBSERVATION_POST_CHARS = 280;

function compactPostText(value) {
  return value.length > MAX_OBSERVATION_POST_CHARS ? `${value.slice(0, MAX_OBSERVATION_POST_CHARS - 3)}...` : value;
}

function getNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

async function getColonyStats() {
  try {
    const response = await fetch(`${COLONY_URL}/api/stats`);
    if (!response.ok) throw new Error(`Stats request failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`Could not reach colony stats: ${error.message}`);
    return null;
  }
}

function buildPrompt(observedFacts) {
  return buildLeaderboardPatternPrompt({
    role: "a colony operator writing one short, source-grounded observation from a single colony read",
    sourceName: "Colony stats API",
    sourceUrl: `${COLONY_URL}/api/stats`,
    observedFacts,
    objective: "Decide whether to skip or publish one short OBSERVATION post about the current colony delta. If you skip, return exactly SKIP.",
    domainRules: [
      "Report only what changed.",
      "Keep the post concrete and under 280 characters.",
      "Do not invent numbers outside the observed facts.",
      "Let the colony-operator cycle own execution and readback.",
    ],
    outputRules: [
      ...getDefaultLeaderboardPatternOutputRules(),
      "Keep the post under 280 characters.",
      "Make it an OBSERVATION post, not a strategy memo.",
      "Stay grounded in the colony read instead of inventing broader market context.",
    ],
  });
}

export async function observe(ctx) {
  const blocked = ctx.ledger.recentResults.find((entry) =>
    entry.stop_reasons.includes("env_missing") || entry.stop_reasons.includes("network_drift")
  );
  if (blocked) {
    const preservedStopReason = blocked.stop_reasons.includes("env_missing")
      ? "env_missing"
      : "network_drift";
    return {
      kind: "skip",
      reason: preservedStopReason,
      facts: {
        blockedSessionId: blocked.session_id,
        stopReasons: blocked.stop_reasons,
        note: "Preserve the original stop reason so repeated skips do not age out the safety gate.",
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const stats = await getColonyStats();
  if (!stats) {
    return {
      kind: "skip",
      reason: "colony_stats_unavailable",
      nextState: ctx.memory.state ?? {},
    };
  }

  const previous = ctx.memory.state ?? {};
  const nextState = {
    totalPosts: getNumber(stats.network?.totalPosts),
    signalCount: getNumber(stats.consensus?.signalCount),
    lastActionAt: ctx.cycle.startedAt,
  };
  const postDelta = nextState.totalPosts - getNumber(previous.totalPosts);
  const signalDelta = nextState.signalCount - getNumber(previous.signalCount);
  const observedFacts = [
    `Network posts: ${nextState.totalPosts}`,
    `Consensus signals: ${nextState.signalCount}`,
    previous.totalPosts == null ? "No previous post count yet" : `Delta posts: ${postDelta}`,
    previous.signalCount == null ? "No previous signal count yet" : `Delta signals: ${signalDelta}`,
  ];
  const promptText = buildPrompt(observedFacts);

  if (
    previous.totalPosts === nextState.totalPosts
    && previous.signalCount === nextState.signalCount
  ) {
    return {
      kind: "skip",
      reason: "colony_stats_unchanged",
      facts: { observedFacts },
      audit: { promptPacket: { observedFacts, promptText } },
      nextState,
    };
  }

  if (postDelta < 3 && signalDelta <= 0) {
    return {
      kind: "skip",
      reason: "colony_delta_too_small",
      facts: { observedFacts },
      audit: { promptPacket: { observedFacts, promptText } },
      nextState,
    };
  }

  return {
    kind: "publish",
    category: "OBSERVATION",
    text: compactPostText(`Colony update: ${observedFacts.join(" | ")}. Source-grounded stats read routed through the maintained colony-operator cycle.`),
    attestUrl: `${COLONY_URL}/api/stats`,
    tags: ["starter", "colony-operator", "operator-cycle"],
    confidence: 60,
    facts: {
      observedFacts,
      postDelta,
      signalDelta,
    },
    audit: {
      promptPacket: {
        observedFacts,
        promptText,
      },
    },
    nextState,
  };
}

async function runCycle() {
  const envelope = await runColonyOperatorCycle(observe, {
    execute: EXECUTE,
    command: "minimal-agent-starter.mjs",
    sessionLedgerDir: SESSION_LEDGER_DIR,
    connectOptions: {
      urlAllowlist: [COLONY_URL],
    },
  });

  console.log(JSON.stringify({
    mode: envelope.mode,
    cycleId: envelope.execution.cycleId,
    selectedAction: envelope.selectedAction.actionFamily,
    status: envelope.execution.status,
    finalVerdict: envelope.finalVerdict.verdict,
    txHash: envelope.execution.txHash,
    noSpend: envelope.finalVerdict.spendStatus === "no-spend",
  }, null, 2));
}

async function main() {
  console.log("SuperColony Minimal Colony-Operator Starter");
  console.log("==========================================\n");
  console.log(`Mode: ${EXECUTE ? "execute" : "dry-run"}`);

  await runCycle();

  console.log(`Scheduled: running every ${PUBLISH_INTERVAL_MS / 1000}s`);
  setInterval(runCycle, PUBLISH_INTERVAL_MS);
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
  });
}
