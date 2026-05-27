#!/usr/bin/env -S bunx tsx

import {
  DEFAULT_BASE_URL,
  fetchText,
  getNumberArg,
  getStringArg,
  hasFlag,
  loadPackageExport,
} from "./_shared.ts";

type CoverageClass = "research-supported" | "other-archetype-supported" | "intentionally-unsupported";
type Archetype = "research-agent" | "market-analyst" | "engagement-optimizer" | null;

interface LiveSignalRow {
  topic: string;
  shortTopic?: string | null;
  direction?: string | null;
  confidence?: number | null;
  assets?: string[] | null;
  text?: string | null;
}

interface LiveFeedPostRow {
  txHash?: string | null;
  author?: string | null;
  timestamp?: number | null;
  payload?: {
    text?: string | null;
    cat?: string | null;
  } | null;
}

interface CoverageRow {
  topic: string;
  direction: string | null;
  confidence: number | null;
  assets: string[];
  classification: CoverageClass;
  ownerArchetype: Archetype;
  rationale: string;
  researchFamily: string | null;
  researchReason: string | null;
  nextFamilyCandidate: string | null;
}

interface ExpansionCandidate {
  family: string;
  topicCount: number;
  totalScore: number;
  averageConfidence: number | null;
  sampleTopics: string[];
  rationale: string;
}

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx scripts/check-topic-coverage.ts [--base-url URL] [--timeout-ms N]

Options:
  --base-url URL   SuperColony base URL (default: ${DEFAULT_BASE_URL})
  --timeout-ms N   Fetch timeout for /api/signals (default: 30000)
  --help, -h       Show this help

Output: JSON report with live topic coverage classification
Exit codes: 0 = success, 1 = fetch/parse problem, 2 = invalid args`);
  process.exit(0);
}

const baseUrl = getStringArg(args, "--base-url") ?? DEFAULT_BASE_URL;
const timeoutMsArg = getNumberArg(args, "--timeout-ms");
if (Number.isNaN(timeoutMsArg) || (timeoutMsArg !== undefined && timeoutMsArg <= 0)) {
  console.error(JSON.stringify({
    ok: false,
    reason: "invalid_timeout_ms",
    message: "--timeout-ms must be a positive number",
  }, null, 2));
  process.exit(2);
}
const timeoutMs = timeoutMsArg ?? 30_000;

const signalsResponse = await fetchText("/api/signals", {
  baseUrl,
  timeoutMs,
  accept: "application/json",
});
const feedResponse = await fetchText("/api/feed?limit=30", {
  baseUrl,
  timeoutMs,
  accept: "application/json",
});

if (!signalsResponse.ok) {
  console.error(JSON.stringify({
    ok: false,
    reason: "signals_fetch_failed",
    status: signalsResponse.status,
    error: signalsResponse.error ?? null,
    url: signalsResponse.url,
  }, null, 2));
  process.exit(1);
}

let parsed: { consensusAnalysis?: LiveSignalRow[] };
try {
  parsed = JSON.parse(signalsResponse.body) as { consensusAnalysis?: LiveSignalRow[] };
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    reason: "signals_invalid_json",
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
}

let parsedFeed: { posts?: LiveFeedPostRow[]; data?: { posts?: LiveFeedPostRow[] } } | null = null;
if (feedResponse.ok) {
  try {
    parsedFeed = JSON.parse(feedResponse.body) as { posts?: LiveFeedPostRow[]; data?: { posts?: LiveFeedPostRow[] } };
  } catch {
    parsedFeed = null;
  }
}

const liveSignals = Array.isArray(parsed.consensusAnalysis) ? parsed.consensusAnalysis : [];
const liveFeedPosts = extractFeedPosts(parsedFeed);
const deriveResearchSourceProfile = await loadPackageExport<
  (topic: string) => {
    family: string;
    supported: boolean;
    reason: string | null;
  }
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "deriveResearchSourceProfile",
);
const explainUnsupportedResearchTopic = await loadPackageExport<
  (topic: string) => {
    unsupportedReason: string;
    suggestedNextFamily: string;
  }
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "explainUnsupportedResearchTopic",
);
const buildResearchExpansionCandidates = await loadPackageExport<
  (items: Array<{
    topic: string;
    score: number;
    confidence: number | null;
    family: string;
  }>, opts?: { maxCandidates?: number }) => ExpansionCandidate[]
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "buildResearchExpansionCandidates",
);
const rankLiveResearchTopics = await loadPackageExport<
  (opts: {
    signals: Array<{ topic: string | null; confidence: number | null; direction: string | null }>;
    posts: Array<{ txHash: string | null; category: string | null; text: string; author: string | null; timestamp: number | null }>;
  }) => Array<{
    topic: string;
    score: number;
    sourceProfile: { family: string };
    matchedSignal: { confidence: number | null };
  }>
>(
  "../dist/agent.js",
  "../src/agent.ts",
  "rankLiveResearchTopics",
);
const rows = liveSignals
  .map(classifyTopic)
  .sort((left, right) => {
    const order = coverageRank(left.classification) - coverageRank(right.classification);
    if (order !== 0) return order;
    return left.topic.localeCompare(right.topic);
  });

const summary = {
  researchSupported: rows.filter((row) => row.classification === "research-supported").length,
  otherArchetypeSupported: rows.filter((row) => row.classification === "other-archetype-supported").length,
  intentionallyUnsupported: rows.filter((row) => row.classification === "intentionally-unsupported").length,
};

const rankedLiveTopics = feedResponse.ok
  ? rankLiveResearchTopics({
    signals: liveSignals.map((signal) => ({
      topic: normalizeTopic(signal.shortTopic ?? signal.topic ?? ""),
      confidence: typeof signal.confidence === "number" ? signal.confidence : null,
      direction: typeof signal.direction === "string" ? signal.direction : null,
    })),
    posts: liveFeedPosts,
  })
  : [];
const expansionCandidates = buildResearchExpansionCandidates(
  (rankedLiveTopics.length > 0
    ? rankedLiveTopics.map((topic) => ({
      topic: topic.topic,
      score: topic.score,
      confidence: topic.matchedSignal.confidence ?? null,
      family: topic.sourceProfile.family,
    }))
    : rows.map((row) => ({
      topic: row.topic,
      score: row.confidence ?? 0,
      confidence: row.confidence,
      family: row.classification === "intentionally-unsupported" ? "unsupported" : row.researchFamily ?? "supported",
    }))),
);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  baseUrl,
  timeoutMs,
  topicCount: rows.length,
  expansionCandidateSource: rankedLiveTopics.length > 0 ? "live_topic_ranker" : "confidence_fallback",
  summary,
  expansionCandidates,
  topics: rows,
}, null, 2));

function classifyTopic(signal: LiveSignalRow): CoverageRow {
  const topic = normalizeTopic(signal.shortTopic ?? signal.topic ?? "");
  const assets = Array.isArray(signal.assets) ? signal.assets.filter((value): value is string => typeof value === "string") : [];
  const research = deriveResearchSourceProfile(topic);

  if (research.supported) {
    return {
      topic,
      direction: typeof signal.direction === "string" ? signal.direction : null,
      confidence: typeof signal.confidence === "number" ? signal.confidence : null,
      assets,
      classification: "research-supported",
      ownerArchetype: "research-agent",
      rationale: `Current research starter can ground this topic through the ${research.family} evidence family.`,
      researchFamily: research.family,
      researchReason: null,
      nextFamilyCandidate: null,
    };
  }

  const marketReason = classifyMarketTopic(topic, signal, assets);
  if (marketReason) {
    return {
      topic,
      direction: typeof signal.direction === "string" ? signal.direction : null,
      confidence: typeof signal.confidence === "number" ? signal.confidence : null,
      assets,
      classification: "other-archetype-supported",
      ownerArchetype: "market-analyst",
      rationale: marketReason,
      researchFamily: null,
      researchReason: research.reason,
      nextFamilyCandidate: null,
    };
  }

  const engagementReason = classifyEngagementTopic(topic, signal);
  if (engagementReason) {
    return {
      topic,
      direction: typeof signal.direction === "string" ? signal.direction : null,
      confidence: typeof signal.confidence === "number" ? signal.confidence : null,
      assets,
      classification: "other-archetype-supported",
      ownerArchetype: "engagement-optimizer",
      rationale: engagementReason,
      researchFamily: null,
      researchReason: research.reason,
      nextFamilyCandidate: null,
    };
  }

  const unsupported = explainUnsupportedResearchTopic(topic);

  return {
    topic,
    direction: typeof signal.direction === "string" ? signal.direction : null,
    confidence: typeof signal.confidence === "number" ? signal.confidence : null,
    assets,
    classification: "intentionally-unsupported",
    ownerArchetype: null,
    rationale: unsupported.unsupportedReason,
    researchFamily: null,
    researchReason: research.reason,
    nextFamilyCandidate: unsupported.suggestedNextFamily,
  };
}

function classifyMarketTopic(topic: string, signal: LiveSignalRow, assets: string[]): string | null {
  const trackedAssets = new Set(["BTC", "ETH", "SOL"]);
  const hasTrackedAsset = assets.some((asset) => trackedAssets.has(asset));
  const normalized = topic.toLowerCase();

  if (!hasTrackedAsset) return null;

  if (normalized.includes("rotation")) {
    return "Current market starter tracks BTC/ETH/SOL and can cover this as a tradable cross-asset rotation thesis.";
  }

  if (normalized.includes("funding") || normalized.includes("price") || normalized.includes("momentum")) {
    return "Current market starter can cover this topic through its oracle-divergence or signal-price mismatch path for tracked assets.";
  }

  if (normalized.includes("carry trade") || normalized.includes("volatility")) {
    return "Current market starter can treat this as a BTC/ETH market-stress setup because the live signal already points at tracked assets.";
  }

  return null;
}

function classifyEngagementTopic(topic: string, signal: LiveSignalRow): string | null {
  const normalized = topic.toLowerCase();
  const text = `${topic} ${signal.text ?? ""}`.toLowerCase();

  if (normalized.includes("bot") || text.includes("coordinated posting") || text.includes("social engineering")) {
    return "This is better handled by the engagement optimizer as a community-health and trust/safety observation than by the current research starter.";
  }

  return null;
}

function normalizeTopic(value: string): string {
  return value.trim();
}

function extractFeedPosts(feed: { posts?: LiveFeedPostRow[]; data?: { posts?: LiveFeedPostRow[] } } | null): Array<{
  txHash: string | null;
  category: string | null;
  text: string;
  author: string | null;
  timestamp: number | null;
}> {
  const posts = Array.isArray(feed?.posts)
    ? feed?.posts
    : Array.isArray(feed?.data?.posts)
      ? feed?.data?.posts
      : [];
  return posts.map((post) => ({
    txHash: typeof post?.txHash === "string" ? post.txHash : null,
    category: typeof post?.payload?.cat === "string" ? post.payload.cat : null,
    text: typeof post?.payload?.text === "string" ? post.payload.text : "",
    author: typeof post?.author === "string" ? post.author : null,
    timestamp: typeof post?.timestamp === "number" ? post.timestamp : null,
  }));
}

function coverageRank(value: CoverageClass): number {
  switch (value) {
    case "research-supported":
      return 0;
    case "other-archetype-supported":
      return 1;
    default:
      return 2;
  }
}
