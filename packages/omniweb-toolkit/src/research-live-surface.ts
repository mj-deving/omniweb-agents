export interface ResearchSurfaceFeedSample {
  txHash: string | null;
  category: string | null;
  text: string;
  author: string | null;
  timestamp: number | null;
}

export interface ResearchSurfaceSignalSample {
  topic: string | null;
  confidence: number | null;
  direction: string | null;
}

export interface ResearchSurfaceReadStatus {
  ok: boolean;
  error: string | null;
  status?: number | null;
  detail?: string | null;
  likelyCause?: "upstream_api" | "base_url_or_path" | "auth_or_wallet" | "runtime_or_network" | "unknown";
}

interface ReadEnvelope {
  ok?: boolean;
  status?: unknown;
  error?: unknown;
  message?: unknown;
  data?: unknown;
}

interface UnwrappedRead<T extends ReadEnvelope> {
  ok: boolean;
  data: T | null;
  error: string | null;
  status: number | null;
  detail: string | null;
  likelyCause: ResearchSurfaceReadStatus["likelyCause"];
}

export interface ResearchLiveSurfaceSnapshot {
  posts: ResearchSurfaceFeedSample[];
  signals: ResearchSurfaceSignalSample[];
  leaderboardAgents: unknown[];
  availableBalance: number;
  readStatus: {
    feed: ResearchSurfaceReadStatus;
    signals: ResearchSurfaceReadStatus;
    leaderboard: ResearchSurfaceReadStatus;
    balance: ResearchSurfaceReadStatus;
  };
}

export interface CollectResearchLiveSurfaceOptions {
  colony: {
    getFeed(args?: { limit?: number }): Promise<ReadEnvelope>;
    getSignals(): Promise<ReadEnvelope>;
    getLeaderboard(args?: { limit?: number }): Promise<ReadEnvelope>;
    getBalance(): Promise<ReadEnvelope>;
  };
  feedLimit?: number;
  leaderboardLimit?: number;
}

export async function collectResearchLiveSurface(
  opts: CollectResearchLiveSurfaceOptions,
): Promise<ResearchLiveSurfaceSnapshot> {
  const [feedRead, signalsRead, leaderboardRead, balanceRead] = await Promise.all([
    settled(opts.colony.getFeed({ limit: opts.feedLimit ?? 30 })),
    settled(opts.colony.getSignals()),
    settled(opts.colony.getLeaderboard({ limit: opts.leaderboardLimit ?? 10 })),
    settled(opts.colony.getBalance()),
  ]);

  const reads = {
    feed: unwrap(feedRead),
    signals: unwrap(signalsRead),
    leaderboard: unwrap(leaderboardRead),
    balance: unwrap(balanceRead),
  };

  return {
    posts: reads.feed.ok ? extractFeedPosts(reads.feed.data) : [],
    signals: reads.signals.ok ? extractSignals(reads.signals.data) : [],
    leaderboardAgents: reads.leaderboard.ok ? extractLeaderboardAgents(reads.leaderboard.data) : [],
    availableBalance: reads.balance.ok ? extractAvailableBalance(reads.balance.data) : 0,
    readStatus: {
      feed: describeRead(reads.feed),
      signals: describeRead(reads.signals),
      leaderboard: describeRead(reads.leaderboard),
      balance: describeRead(reads.balance),
    },
  };
}

function settled<T extends ReadEnvelope>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  return promise.then(
    (value) => ({ status: "fulfilled", value } as PromiseFulfilledResult<T>),
    (reason) => ({ status: "rejected", reason } as PromiseRejectedResult),
  );
}

function unwrap<T extends ReadEnvelope>(
  result: PromiseSettledResult<T>,
): UnwrappedRead<T> {
  if (result.status === "rejected") {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    return {
      ok: false,
      data: null,
      error: message,
      status: null,
      detail: message,
      likelyCause: classifyLikelyCause({ status: null, error: message, detail: message }),
    };
  }
  if (result.value?.ok !== true) {
    const status = typeof result.value?.status === "number" ? result.value.status : null;
    const detail = extractDetail(result.value);
    const error = extractErrorCode(result.value, status);
    return {
      ok: false,
      data: result.value,
      error,
      status,
      detail,
      likelyCause: classifyLikelyCause({ status, error, detail }),
    };
  }
  return {
    ok: true,
    data: result.value,
    error: null,
    status: typeof result.value?.status === "number" ? result.value.status : null,
    detail: null,
    likelyCause: undefined,
  };
}

function describeRead(result: UnwrappedRead<ReadEnvelope>): ResearchSurfaceReadStatus {
  return {
    ok: result.ok,
    error: result.error,
    status: result.status,
    detail: result.detail,
    likelyCause: result.likelyCause,
  };
}

function extractErrorCode(value: { status?: unknown; error?: unknown; message?: unknown; data?: unknown }, status: number | null): string {
  if (typeof value.error === "string" && value.error.trim().length > 0) return value.error;
  if (typeof value.message === "string" && value.message.trim().length > 0) return value.message;
  if (status != null) return `http_${status}`;
  return "api_not_ok";
}

function extractDetail(value: { error?: unknown; message?: unknown; data?: unknown }): string | null {
  if (typeof value.message === "string" && value.message.trim().length > 0) return value.message;
  if (typeof value.error === "string" && value.error.trim().length > 0) return value.error;
  if (value.data && typeof value.data === "object") {
    try {
      const json = JSON.stringify(value.data);
      return json.length > 220 ? `${json.slice(0, 217)}...` : json;
    } catch {
      return "non_serializable_error_payload";
    }
  }
  return null;
}

function classifyLikelyCause(opts: {
  status: number | null;
  error: string | null;
  detail: string | null;
}): ResearchSurfaceReadStatus["likelyCause"] {
  const haystack = `${opts.error ?? ""} ${opts.detail ?? ""}`.toLowerCase();
  if (opts.status === 401 || opts.status === 403 || haystack.includes("unauthorized") || haystack.includes("forbidden")) {
    return "auth_or_wallet";
  }
  if (opts.status === 404 || haystack.includes("not found") || haystack.includes("wrong path") || haystack.includes("wrong endpoint")) {
    return "base_url_or_path";
  }
  if (opts.status != null && opts.status >= 500) {
    return "upstream_api";
  }
  if (haystack.includes("fetch") || haystack.includes("network") || haystack.includes("econn") || haystack.includes("timeout")) {
    return "runtime_or_network";
  }
  return "unknown";
}

function extractFeedPosts(feed: unknown): ResearchSurfaceFeedSample[] {
  if (!feed || typeof feed !== "object") return [];
  const posts = (feed as { data?: { posts?: unknown } }).data?.posts;
  if (!Array.isArray(posts)) return [];
  return posts.map((post) => samplePost(post));
}

function extractSignals(signals: unknown): ResearchSurfaceSignalSample[] {
  if (!signals || typeof signals !== "object") return [];
  const list = (signals as { data?: unknown }).data;
  if (!Array.isArray(list)) return [];
  return list.map((signal) => ({
    topic: signalTopic(signal),
    confidence: signalConfidence(signal),
    direction:
      signal && typeof signal === "object" && typeof (signal as { direction?: unknown }).direction === "string"
        ? (signal as { direction: string }).direction
        : null,
  }));
}

function extractLeaderboardAgents(leaderboard: unknown): unknown[] {
  if (!leaderboard || typeof leaderboard !== "object") return [];
  const data = (leaderboard as { data?: unknown }).data;
  if (Array.isArray(data)) return data;
  const agents = (data as { agents?: unknown } | undefined)?.agents;
  return Array.isArray(agents) ? agents : [];
}

function extractAvailableBalance(balance: unknown): number {
  if (!balance || typeof balance !== "object") return 0;
  const direct = (balance as { balance?: unknown }).balance;
  if (typeof direct === "number") return direct;
  if (typeof direct === "string") {
    const parsed = Number.parseFloat(direct.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const nested = (balance as { data?: { balance?: unknown } }).data?.balance;
  if (typeof nested === "number") return nested;
  if (typeof nested === "string") {
    const parsed = Number.parseFloat(nested.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function samplePost(post: unknown): ResearchSurfaceFeedSample {
  if (!post || typeof post !== "object") {
    return {
      txHash: null,
      category: null,
      text: "",
      author: null,
      timestamp: null,
    };
  }
  const payload = (post as { payload?: { text?: unknown; cat?: unknown } }).payload;
  return {
    txHash: typeof (post as { txHash?: unknown }).txHash === "string" ? (post as { txHash: string }).txHash : null,
    category: typeof payload?.cat === "string" ? payload.cat : null,
    text: typeof payload?.text === "string" ? payload.text : "",
    author: typeof (post as { author?: unknown }).author === "string" ? (post as { author: string }).author : null,
    timestamp: typeof (post as { timestamp?: unknown }).timestamp === "number" ? (post as { timestamp: number }).timestamp : null,
  };
}

function signalTopic(signal: unknown): string | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as { shortTopic?: unknown; topic?: unknown }).shortTopic
    ?? (signal as { shortTopic?: unknown; topic?: unknown }).topic;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function signalConfidence(signal: unknown): number | null {
  if (!signal || typeof signal !== "object") return null;
  const candidate = (signal as { confidence?: unknown }).confidence;
  return typeof candidate === "number" ? candidate : null;
}
