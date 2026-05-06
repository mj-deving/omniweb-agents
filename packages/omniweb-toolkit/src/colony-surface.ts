export interface TopicSignal {
  topic: string;
  normalizedTopic: string;
  confidence: number | null;
  direction: string | null;
  assets: string[];
}

export interface TopicConvergence {
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

export interface FeedSample {
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

export interface ColonySurfaceSnapshot {
  readStatus: {
    signalsOk: boolean;
    convergenceOk: boolean;
    feedOk: boolean;
    leaderboardOk: boolean;
    balanceOk: boolean;
  };
  signalCount: number;
  leaderboardCount: number;
  availableBalance: number;
  topSignal: TopicSignal | null;
  matchingConvergence: TopicConvergence | null;
  matchedPosts: FeedSample[];
  freshestMatchedPost: FeedSample | null;
}

export interface CollectColonySurfaceSnapshotOptions {
  feedLimit?: number;
  leaderboardLimit?: number;
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

export async function collectColonySurfaceSnapshot(
  omni: any,
  opts: CollectColonySurfaceSnapshotOptions = {},
): Promise<ColonySurfaceSnapshot> {
  const [signals, convergence, feed, leaderboard, balance] = await Promise.all([
    omni.colony.getSignals(),
    omni.colony.getConvergence(),
    omni.colony.getFeed({ limit: opts.feedLimit ?? 30 }),
    omni.colony.getLeaderboard({ limit: opts.leaderboardLimit ?? 10 }),
    omni.colony.getBalance(),
  ]);

  const signalEntries = Array.isArray(signals?.data) ? signals.data : [];
  const topSignal = sampleSignal(signalEntries[0] ?? null);
  const matchingConvergence = findMatchingConvergence(topSignal, convergence?.data);
  const feedPosts = Array.isArray(feed?.data?.posts)
    ? feed.data.posts.map(samplePost).filter((post: FeedSample | null): post is FeedSample => post != null)
    : [];
  const matchedPosts = findMatchedPosts(topSignal, matchingConvergence, feedPosts)
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));

  return {
    readStatus: {
      signalsOk: signals?.ok === true,
      convergenceOk: convergence?.ok === true,
      feedOk: feed?.ok === true,
      leaderboardOk: leaderboard?.ok === true,
      balanceOk: balance?.ok === true,
    },
    signalCount: signalEntries.length,
    leaderboardCount: countLeaderboardAgents(leaderboard?.data),
    availableBalance: toNumber(balance?.data?.balance),
    topSignal,
    matchingConvergence,
    matchedPosts,
    freshestMatchedPost: matchedPosts[0] ?? null,
  };
}
