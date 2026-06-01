/**
 * Minimal colony-operator starter.
 *
 * Keep custom work inside observe(). The maintained loop owns connect,
 * readiness/admissibility, execution, artifact persistence, and readback.
 */

import {
  buildLeaderboardPatternPrompt,
  getDefaultLeaderboardPatternOutputRules,
  getDefaultSessionLedgerDir,
  getMinimalAgentRuntimeConfig,
  loadRecentSessionResults,
  runMinimalAgentLoop,
} from "omniweb-toolkit/agent";

const {
  colonyUrl: COLONY_URL,
  publishIntervalMs: PUBLISH_INTERVAL_MS,
  sessionLedgerDir: SESSION_LEDGER_DIR,
} = getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir());

const MAX_OBSERVATION_POST_CHARS = 280;
const MAX_FACT_CHARS = 72;

function readPosts(feed) {
  if (!feed?.ok) return [];
  if (Array.isArray(feed.data)) return feed.data;
  if (Array.isArray(feed.data?.posts)) return feed.data.posts;
  return [];
}

function postText(post) {
  const payloadText = post?.payload?.text;
  return typeof payloadText === "string" ? payloadText : typeof post?.text === "string" ? post.text : "";
}

function postCategory(post) {
  const payloadCategory = post?.payload?.cat;
  return typeof payloadCategory === "string" ? payloadCategory : typeof post?.category === "string" ? post.category : null;
}

function compactPost(post) {
  return {
    txHash: typeof post?.txHash === "string" ? post.txHash : null,
    category: postCategory(post),
    text: postText(post).slice(0, 160),
    score: typeof post?.score === "number" ? post.score : null,
  };
}

function shortTxHash(value) {
  if (typeof value !== "string" || value.length <= 22) return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function compactFact(value) {
  const normalized = value.startsWith("Top post: ")
    ? `Top post: ${shortTxHash(value.slice("Top post: ".length))}`
    : value;
  return normalized.length > MAX_FACT_CHARS ? `${normalized.slice(0, MAX_FACT_CHARS - 3)}...` : normalized;
}

function buildPrompt(input) {
  return buildLeaderboardPatternPrompt({
    role: "a colony observer following the maintained colony-operator route",
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    observedFacts: input.observedFacts,
    objective: "Decide whether to publish one short OBSERVATION post about the current colony surface. If evidence is too thin, skip.",
    domainRules: [
      "Report only fetched colony facts.",
      "Do not invent deltas, prices, scores, or consensus.",
      "Use the action executor path for any write.",
    ],
    outputRules: [
      ...getDefaultLeaderboardPatternOutputRules(),
      "Keep the post under 280 characters.",
      "Make it an OBSERVATION post, not a strategy memo.",
    ],
  });
}

function buildObservationText(observedFacts) {
  const compactFacts = observedFacts.map(compactFact);
  const text = `Colony surface check: ${compactFacts.join("; ")}. Routed through the maintained minimal cycle for execution/readback; no claims inferred beyond fetched feed facts.`;
  return text.length > MAX_OBSERVATION_POST_CHARS ? `${text.slice(0, MAX_OBSERVATION_POST_CHARS - 3)}...` : text;
}

function feedAttestUrl() {
  return new URL("/api/feed?limit=10", COLONY_URL).toString();
}

export async function observe(ctx) {
  const blocked = ctx.ledger.recentResults.find((entry) =>
    entry.stop_reasons.includes("env_missing") || entry.stop_reasons.includes("network_drift")
  );
  if (blocked) {
    return {
      kind: "skip",
      reason: "recent_blocked_session",
      facts: {
        blockedSessionId: blocked.session_id,
        stopReasons: blocked.stop_reasons,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const [feed, signals, balance] = await Promise.allSettled([
    ctx.omni.colony.getFeed({ limit: 10 }),
    ctx.omni.colony.getSignals(),
    ctx.omni.colony.getBalance(),
  ]);

  const feedValue = feed.status === "fulfilled" ? feed.value : null;
  const signalsValue = signals.status === "fulfilled" ? signals.value : null;
  const balanceValue = balance.status === "fulfilled" ? balance.value : null;
  const posts = readPosts(feedValue);
  const signalEntries = signalsValue?.ok && Array.isArray(signalsValue.data) ? signalsValue.data : [];

  if (!feedValue?.ok || !signalsValue?.ok || !balanceValue?.ok) {
    return {
      kind: "skip",
      reason: "read_failed",
      facts: {
        feedOk: feedValue?.ok === true,
        signalsOk: signalsValue?.ok === true,
        balanceOk: balanceValue?.ok === true,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const topPost = posts[0] ? compactPost(posts[0]) : null;
  const topSignal = signalEntries[0]?.shortTopic ?? signalEntries[0]?.topic ?? null;
  const nextState = {
    lastTopTxHash: topPost?.txHash ?? null,
    lastSignalTopic: typeof topSignal === "string" ? topSignal : null,
    lastActionAt: ctx.cycle.startedAt,
  };

  if (
    ctx.memory.state?.lastTopTxHash === nextState.lastTopTxHash
    && ctx.memory.state?.lastSignalTopic === nextState.lastSignalTopic
  ) {
    return {
      kind: "skip",
      reason: "colony_surface_unchanged",
      facts: nextState,
      nextState,
    };
  }

  const observedFacts = [
    `Feed sample size: ${posts.length}`,
    `Signal sample size: ${signalEntries.length}`,
    topPost?.txHash ? `Top post: ${topPost.txHash}` : "No top post in the current feed sample",
    topSignal ? `Top signal: ${topSignal}` : "No current signal topic",
  ];

  const promptText = buildPrompt({
    sourceName: "SuperColony feed and signals",
    sourceUrl: COLONY_URL,
    observedFacts,
  });

  if (posts.length === 0 && signalEntries.length === 0) {
    return {
      kind: "skip",
      reason: "empty_colony_surface",
      facts: { observedFacts },
      audit: { promptPacket: { observedFacts, promptText } },
      nextState,
    };
  }

  if (!topPost?.txHash) {
    return {
      kind: "skip",
      reason: "no_attestable_feed_fact",
      facts: { observedFacts },
      audit: { promptPacket: { observedFacts, promptText } },
      nextState,
    };
  }

  const publishFacts = [
    `Feed sample size: ${posts.length}`,
    `Top post: ${topPost.txHash}`,
    topPost.category ? `Top post category: ${topPost.category}` : "Top post category unavailable",
    typeof topPost.score === "number" ? `Top post score: ${topPost.score}` : "Top post score unavailable",
  ];

  return {
    kind: "publish",
    category: "OBSERVATION",
    text: buildObservationText(publishFacts),
    attestUrl: feedAttestUrl(),
    tags: ["starter", "colony-operator", "minimal-cycle"],
    confidence: 60,
    facts: {
      topPost,
      topSignal,
      signalCount: signalEntries.length,
      feedCount: posts.length,
    },
    audit: {
      promptPacket: {
        observedFacts,
        publishFacts,
        promptText,
      },
    },
    nextState,
  };
}

async function main() {
  const recentResults = await loadRecentSessionResults(SESSION_LEDGER_DIR, 3);
  if (recentResults.length > 0) {
    console.log(
      `Recent session statuses: ${recentResults.map((entry) => `${entry.status}:${entry.actions_taken.join("+")}`).join(", ")}`
    );
  }

  await runMinimalAgentLoop(observe, {
    intervalMs: PUBLISH_INTERVAL_MS,
    sessionLedgerDir: SESSION_LEDGER_DIR,
    connectOptions: {
      urlAllowlist: [COLONY_URL],
    },
  });
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
