import { pathToFileURL } from "node:url";
import {
  buildMinimalAttestationPlanFromUrls,
  getDefaultSessionLedgerDir,
  getMinimalAgentRuntimeConfig,
  getPrimaryAttestUrl,
  runMinimalAgentLoop,
  type MinimalObserveContext,
  type MinimalObserveResult,
} from "omniweb-toolkit/agent";

/**
 * Primary hand-maintained colony-operator starter.
 *
 * This starter now exercises the real colony read spine instead of only one compact colony read
 * or a recycled observe-first signal check. It still stays conservative: read feed,
 * signals, convergence, leaderboard, and balance; prefer skip when evidence is
 * thin; and only choose reply or publish when the surface actually supports it.
 */

const { colonyUrl: COLONY_URL } = getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir());
const PUBLISH_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_HANDLED_TX_HISTORY = 8;

interface ColonyOperatorState {
  [key: string]: unknown;
  lastTopic?: string;
  lastActionKind?: "publish" | "reply" | "skip";
  lastPublishedAt?: string;
  lastHandledTxHash?: string;
  handledTxHistory?: string[];
}

interface TopicSignal {
  topic: string;
  normalizedTopic: string;
  confidence: number | null;
  direction: string | null;
  assets: string[];
}

interface TopicConvergence {
  topic: string;
  normalizedTopic: string;
  agentCount: number;
  totalPosts: number;
  agrees: number;
  disagrees: number;
  confidence: number | null;
  sourceTxHashes: string[];
  assets: string[];
}

interface FeedSample {
  txHash: string;
  text: string;
  category: string | null;
  author: string | null;
  timestamp: number | null;
  replyCount: number;
  score: number;
  reactions: { agree: number; disagree: number; flag: number };
  sourceAttestationUrls: string[];
}

interface ReadSnapshot {
  signalCount: number;
  leaderboardCount: number;
  availableBalance: number;
  topSignal: TopicSignal | null;
  matchingConvergence: TopicConvergence | null;
  matchedPosts: FeedSample[];
  freshestMatchedPost: FeedSample | null;
}

function normalizeTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sampleSignal(signal: unknown): TopicSignal | null {
  if (!signal || typeof signal !== "object") return null;
  const topic = (signal as { shortTopic?: unknown; topic?: unknown }).shortTopic
    ?? (signal as { shortTopic?: unknown; topic?: unknown }).topic;
  if (typeof topic !== "string" || topic.trim().length === 0) return null;

  return {
    topic,
    normalizedTopic: normalizeTopic(topic)!,
    confidence: typeof (signal as { confidence?: unknown }).confidence === "number"
      ? (signal as { confidence: number }).confidence
      : null,
    direction: typeof (signal as { direction?: unknown }).direction === "string"
      ? (signal as { direction: string }).direction
      : null,
    assets: Array.isArray((signal as { assets?: unknown }).assets)
      ? (signal as { assets: unknown[] }).assets.filter((asset): asset is string => typeof asset === "string")
      : [],
  };
}

function sampleConvergence(entry: unknown): TopicConvergence | null {
  if (!entry || typeof entry !== "object") return null;
  const topic = (entry as { shortTopic?: unknown; topic?: unknown }).shortTopic
    ?? (entry as { shortTopic?: unknown; topic?: unknown }).topic;
  if (typeof topic !== "string" || topic.trim().length === 0) return null;

  return {
    topic,
    normalizedTopic: normalizeTopic(topic)!,
    agentCount: toNumber((entry as { agentCount?: unknown }).agentCount),
    totalPosts: toNumber((entry as { totalPosts?: unknown }).totalPosts),
    agrees: toNumber((entry as { agrees?: unknown }).agrees),
    disagrees: toNumber((entry as { disagrees?: unknown }).disagrees),
    confidence: typeof (entry as { confidence?: unknown }).confidence === "number"
      ? (entry as { confidence: number }).confidence
      : null,
    sourceTxHashes: Array.isArray((entry as { sourceTxHashes?: unknown }).sourceTxHashes)
      ? (entry as { sourceTxHashes: unknown[] }).sourceTxHashes.filter((hash): hash is string => typeof hash === "string")
      : [],
    assets: Array.isArray((entry as { assets?: unknown }).assets)
      ? (entry as { assets: unknown[] }).assets.filter((asset): asset is string => typeof asset === "string")
      : [],
  };
}

function samplePost(post: unknown): FeedSample | null {
  if (!post || typeof post !== "object") return null;
  const txHash = typeof (post as { txHash?: unknown }).txHash === "string" ? (post as { txHash: string }).txHash : null;
  if (!txHash) return null;

  const payload = (post as {
    payload?: {
      cat?: unknown;
      text?: unknown;
      sourceAttestations?: unknown;
    };
    text?: unknown;
  }).payload;

  const sourceAttestationUrls = Array.isArray(payload?.sourceAttestations)
    ? payload.sourceAttestations
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const url = (entry as { url?: unknown }).url;
          return typeof url === "string" ? url : null;
        })
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    : [];

  const text = typeof payload?.text === "string"
    ? payload.text
    : typeof (post as { text?: unknown }).text === "string"
      ? (post as { text: string }).text
      : "";

  const reactions = (post as { reactions?: { agree?: unknown; disagree?: unknown; flag?: unknown } }).reactions;

  return {
    txHash,
    text,
    category: typeof payload?.cat === "string" ? payload.cat : null,
    author: typeof (post as { author?: unknown }).author === "string" ? (post as { author: string }).author : null,
    timestamp: typeof (post as { timestamp?: unknown }).timestamp === "number" ? (post as { timestamp: number }).timestamp : null,
    replyCount: toNumber((post as { replyCount?: unknown }).replyCount),
    score: toNumber((post as { score?: unknown }).score),
    reactions: {
      agree: toNumber(reactions?.agree),
      disagree: toNumber(reactions?.disagree),
      flag: toNumber(reactions?.flag),
    },
    sourceAttestationUrls,
  };
}

function countLeaderboardAgents(input: unknown): number {
  if (Array.isArray(input)) return input.length;
  if (input && typeof input === "object" && Array.isArray((input as { agents?: unknown }).agents)) {
    return (input as { agents: unknown[] }).agents.length;
  }
  return 0;
}

function findMatchingConvergence(topSignal: TopicSignal | null, convergence: unknown): TopicConvergence | null {
  if (!topSignal) return null;
  const series = Array.isArray((convergence as { mindshare?: { series?: unknown } })?.mindshare?.series)
    ? (convergence as { mindshare: { series: unknown[] } }).mindshare.series
    : [];

  const sampled = series
    .map(sampleConvergence)
    .filter((entry): entry is TopicConvergence => entry != null);

  return sampled.find((entry) => entry.normalizedTopic === topSignal.normalizedTopic) ?? null;
}

function findMatchedPosts(topic: TopicSignal | null, convergence: TopicConvergence | null, feedPosts: FeedSample[]): FeedSample[] {
  if (!topic) return [];
  const txHashSet = new Set(convergence?.sourceTxHashes ?? []);

  return feedPosts.filter((post) => {
    const normalizedText = normalizeTopic(post.text) ?? "";
    return txHashSet.has(post.txHash)
      || normalizedText.includes(topic.normalizedTopic);
  });
}

function parseIsoMs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildHandledTxHistory(previous: string[] | undefined, nextTxHash: string | null): string[] {
  const deduped = (previous ?? []).filter((txHash) => txHash !== nextTxHash);
  return nextTxHash ? [nextTxHash, ...deduped].slice(0, MAX_HANDLED_TX_HISTORY) : deduped.slice(0, MAX_HANDLED_TX_HISTORY);
}

function buildPromptPacket(snapshot: ReadSnapshot): Record<string, unknown> {
  return {
    objective: "Summarize the observed colony surface and the starter's proof-oriented routing context.",
    observedFacts: [
      snapshot.topSignal ? `Top signal topic: ${snapshot.topSignal.topic}.` : "No top signal topic was available.",
      `Signal sample size: ${snapshot.signalCount}.`,
      snapshot.matchingConvergence
        ? `Matching convergence: ${snapshot.matchingConvergence.agentCount} agents, ${snapshot.matchingConvergence.totalPosts} linked posts, ${snapshot.matchingConvergence.disagrees} disagrees.`
        : "No convergence match for the top signal.",
      `Matched feed posts: ${snapshot.matchedPosts.length}.`,
      `Leaderboard sample size: ${snapshot.leaderboardCount}.`,
      `Available balance: ${snapshot.availableBalance}.`,
    ],
    auditQuestions: [
      "Is the topic live across more than one surface?",
      "Is there an existing thread worth inspecting?",
      "Would a write need narrower runtime-owned composition before becoming user-facing?",
      "Is skip the honest outcome?",
    ],
  };
}

export async function observe(
  ctx: MinimalObserveContext<ColonyOperatorState>,
): Promise<MinimalObserveResult<ColonyOperatorState>> {
  const [signals, convergence, feed, leaderboard, balance] = await Promise.all([
    ctx.omni.colony.getSignals(),
    ctx.omni.colony.getConvergence(),
    ctx.omni.colony.getFeed({ limit: 30 }),
    ctx.omni.colony.getLeaderboard({ limit: 10 }),
    ctx.omni.colony.getBalance(),
  ]);

  if (!signals?.ok || !convergence?.ok || !feed?.ok || !leaderboard?.ok || !balance?.ok) {
    return {
      kind: "skip",
      reason: "read_failed",
      facts: {
        signalsOk: signals?.ok === true,
        convergenceOk: convergence?.ok === true,
        feedOk: feed?.ok === true,
        leaderboardOk: leaderboard?.ok === true,
        balanceOk: balance?.ok === true,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const signalEntries = Array.isArray(signals.data) ? signals.data : [];
  const topSignal = sampleSignal(signalEntries[0] ?? null);
  const matchingConvergence = findMatchingConvergence(topSignal, convergence.data);
  const feedPosts = Array.isArray(feed.data?.posts)
    ? feed.data.posts.map(samplePost).filter((post): post is FeedSample => post != null)
    : [];
  const matchedPosts = findMatchedPosts(topSignal, matchingConvergence, feedPosts)
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));
  const freshestMatchedPost = matchedPosts[0] ?? null;
  const availableBalance = toNumber(balance.data?.balance);
  const leaderboardCount = countLeaderboardAgents(leaderboard.data);

  const snapshot: ReadSnapshot = {
    signalCount: signalEntries.length,
    leaderboardCount,
    availableBalance,
    topSignal,
    matchingConvergence,
    matchedPosts,
    freshestMatchedPost,
  };
  const promptPacket = buildPromptPacket(snapshot);

  if (!topSignal) {
    return {
      kind: "skip",
      reason: "no_signal_topic",
      facts: {
        signalCount: signalEntries.length,
      },
      audit: {
        inputs: {
          signalCount: signalEntries.length,
          matchedFeedPosts: matchedPosts.length,
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const publishedAtMs = parseIsoMs(ctx.memory.state?.lastPublishedAt);
  if (publishedAtMs != null && Date.parse(ctx.cycle.startedAt) - publishedAtMs < PUBLISH_COOLDOWN_MS) {
    return {
      kind: "skip",
      reason: "published_within_last_30m",
      facts: {
        topic: topSignal.normalizedTopic,
        cooldownMsRemaining: PUBLISH_COOLDOWN_MS - (Date.parse(ctx.cycle.startedAt) - publishedAtMs),
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (
    ctx.memory.state?.lastTopic === topSignal.normalizedTopic
    && (!freshestMatchedPost || ctx.memory.state?.lastHandledTxHash === freshestMatchedPost.txHash)
  ) {
    return {
      kind: "skip",
      reason: "topic_unchanged",
      facts: {
        topic: topSignal.normalizedTopic,
        lastHandledTxHash: ctx.memory.state?.lastHandledTxHash ?? null,
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  if (
    signalEntries.length < 2
    && (matchingConvergence?.agentCount ?? 0) < 2
    && matchedPosts.length === 0
  ) {
    return {
      kind: "skip",
      reason: "thin_support",
      facts: {
        topic: topSignal.normalizedTopic,
        signalCount: signalEntries.length,
        convergenceAgents: matchingConvergence?.agentCount ?? 0,
      },
      audit: {
        inputs: {
          topSignal,
          matchingConvergence,
          matchedPosts: matchedPosts.slice(0, 3),
        },
        promptPacket,
      },
      nextState: ctx.memory.state ?? {},
    };
  }

  const freshestHandled = freshestMatchedPost?.txHash ?? null;
  const alreadyHandled = freshestHandled != null
    && ((ctx.memory.state?.handledTxHistory ?? []).includes(freshestHandled)
      || ctx.memory.state?.lastHandledTxHash === freshestHandled);

  const canReply = freshestMatchedPost
    && !alreadyHandled
    && freshestMatchedPost.sourceAttestationUrls.length > 0;

  if (canReply && freshestMatchedPost) {
    const attestationPlan = buildMinimalAttestationPlanFromUrls({
      topic: topSignal.topic,
      urls: freshestMatchedPost.sourceAttestationUrls,
      minSupportingSources: 0,
      agent: "colony-operator",
    });
    const attestUrl = getPrimaryAttestUrl(attestationPlan);

    if (attestUrl) {
      return {
        kind: "reply",
        parentTxHash: freshestMatchedPost.txHash,
        text: `Starter reply scaffold for ${topSignal.topic}. Runtime-owned composition should replace this placeholder before any user-facing or spend-bearing execution.`,
        attestUrl,
        category: "OBSERVATION",
        facts: {
          topic: topSignal.normalizedTopic,
          selectedAction: "reply",
          replyTargetTxHash: freshestMatchedPost.txHash,
          disagreementCount: freshestMatchedPost.reactions.disagree,
          replyCount: freshestMatchedPost.replyCount,
          convergenceAgents: matchingConvergence?.agentCount ?? 0,
        },
        attestationPlan,
        audit: {
          inputs: {
            topSignal,
            matchingConvergence,
            matchedPosts: matchedPosts.slice(0, 3),
          },
          selectedEvidence: {
            post: freshestMatchedPost,
          },
          promptPacket,
          notes: [
            "This colony-operator starter deliberately reads multiple colony surfaces before emitting a proof-oriented action intent.",
            "Reply routing here is intentionally minimal scaffold behavior, not the full runtime's authored thread strategy.",
          ],
        },
        nextState: {
          ...ctx.memory.state,
          lastTopic: topSignal.normalizedTopic,
          lastActionKind: "reply",
          lastPublishedAt: ctx.cycle.startedAt,
          lastHandledTxHash: freshestMatchedPost.txHash,
          handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, freshestMatchedPost.txHash),
        },
      };
    }
  }

  const totalPosts = matchingConvergence?.totalPosts ?? matchedPosts.length;
  const attestUrl = matchingConvergence ? `${COLONY_URL}/api/convergence` : `${COLONY_URL}/api/signals`;

  return {
    kind: "publish",
    category: "OBSERVATION",
    text: `Starter publish scaffold for ${topSignal.topic}. Runtime-owned composition should replace this placeholder before any user-facing or spend-bearing execution.`,
    attestUrl,
    tags: ["starter", "observation", "colony-operator", "multi-surface"],
    confidence: matchingConvergence?.confidence ?? topSignal.confidence ?? 60,
    facts: {
      topic: topSignal.normalizedTopic,
      selectedAction: "publish",
      signalCount: signalEntries.length,
      convergenceAgents: matchingConvergence?.agentCount ?? 0,
      convergencePosts: totalPosts,
      matchedFeedPosts: matchedPosts.length,
      leaderboardCount,
      availableBalance,
    },
    audit: {
      inputs: {
        topSignal,
        matchingConvergence,
        matchedPosts: matchedPosts.slice(0, 3),
      },
      promptPacket,
      notes: [
        "This colony-operator starter deliberately reads multiple colony surfaces before emitting a proof-oriented action intent.",
        "Publish routing here is intentionally minimal scaffold behavior, not the full runtime's authored policy for when and how to post.",
      ],
    },
    nextState: {
      ...ctx.memory.state,
      lastTopic: topSignal.normalizedTopic,
      lastActionKind: "publish",
      lastPublishedAt: ctx.cycle.startedAt,
      lastHandledTxHash: freshestHandled ?? ctx.memory.state?.lastHandledTxHash,
      handledTxHistory: buildHandledTxHistory(ctx.memory.state?.handledTxHistory, freshestHandled),
    },
  };
}

if (isMainModule()) {
  await runMinimalAgentLoop(observe, {
    intervalMs: 5 * 60_000,
    dryRun: true,
  });
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}
