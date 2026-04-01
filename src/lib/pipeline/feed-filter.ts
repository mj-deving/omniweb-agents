/**
 * Feed filtering + indexing utilities.
 *
 * Mostly lightweight data transforms, plus a small reusable topic-search helper
 * for SuperColony feed limitations around tag search.
 */

import { apiCall } from "../network/sdk.js";
import { observe } from "./observe.js";
import { toErrorMessage } from "../util/errors.js";

export interface QualityFilter {
  minScore: number;
  requireAttestation: boolean;
  excludeAuthors?: string[];
}

export interface FilteredPost {
  txHash: string;
  author: string;
  timestamp: number;
  score: number;
  category: string;
  tags: string[];
  assets: string[];
  hasAttestation: boolean;
  reactions: { agree: number; disagree: number };
  textPreview: string;
}

export interface TopicStats {
  count: number;
  totalReactions: number;
  attestedCount: number;
  uniqueAuthors: Set<string>;
  avgScore: number;
  newestTimestamp: number;
}

export interface AgentStats {
  address: string;
  displayName?: string;
  postCount: number;
  avgScore: number;
  attestationRate: number;
}

export type TopicSearchSource = "asset" | "text";

export interface CombinedTopicSearchOptions {
  searchLimit?: number;
  /** Filter by post category (OBSERVATION, ANALYSIS, PREDICTION, etc.) */
  category?: string;
  /** Filter by agent address */
  agent?: string;
  /** Unix timestamp in SECONDS — only posts after this time */
  since?: number;
  /** Cursor for pagination (txHash of last post in previous page) */
  cursor?: string;
  fetchFeed?: (path: string, label: string) => Promise<unknown[]>;
  onRawResults?: (source: TopicSearchSource, rawPosts: unknown[]) => void;
  onFallbackFiltered?: (filteredPosts: FilteredPost[]) => void;
}

export const NUMERIC_CLAIM_PATTERN = /\d+(\.\d+)?%|\$\d+|\d+\.\d+\s*(bbl|usd|btc|eth)/i;

function toArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

function clampScore(raw: unknown): number {
  const parsed = Number(raw ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function normalizeTimestamp(raw: unknown): number {
  const parsed = Number(raw ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

/** Raw post shape from API/chain — loosely typed at system boundary. */
interface RawPost {
  txHash?: string;
  author?: string;
  address?: string;
  agent?: { address?: string };
  timestamp?: number;
  score?: number;
  qualityScore?: number;
  text?: string;
  cat?: string;
  payload?: {
    text?: string;
    cat?: string;
    tags?: string[];
    assets?: string[];
    sourceAttestations?: unknown[];
  };
  reactions?: { agree?: number; disagree?: number };
}

function getAuthor(raw: RawPost): string {
  return String(raw?.author || raw?.address || raw?.agent?.address || "")
    .trim()
    .toLowerCase();
}

function hasAttestation(raw: RawPost): boolean {
  // Only DAHR sourceAttestations contribute to quality score.
  // TLSN proofs (tlsnAttestations) do NOT score per official skill docs.
  return Boolean(
    Array.isArray(raw?.payload?.sourceAttestations) && raw.payload.sourceAttestations.length > 0
  );
}

function getText(raw: RawPost): string {
  const text = String(raw?.payload?.text || raw?.text || "");
  return text.slice(0, 200);
}

function getCategory(raw: RawPost): string {
  return String(raw?.payload?.cat || raw?.cat || "UNKNOWN").toUpperCase();
}

export function normalizeFeedPosts(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const d = (typeof p.data === "object" && p.data !== null) ? p.data as Record<string, unknown> : undefined;
  const posts = p.posts ?? p.results ?? p.items ?? d?.posts ?? p.data ?? [];
  if (!Array.isArray(posts)) return [];
  return posts;
}

function dedupeFilteredPosts(posts: FilteredPost[]): FilteredPost[] {
  const byTxHash = new Map<string, FilteredPost>();
  for (const post of posts) {
    const existing = byTxHash.get(post.txHash);
    if (!existing || post.timestamp > existing.timestamp) {
      byTxHash.set(post.txHash, post);
    }
  }
  return [...byTxHash.values()];
}

function matchesTopicTagOrAsset(raw: RawPost, topicLower: string): boolean {
  const tags = toArray(raw?.payload?.tags).map((tag) => tag.toLowerCase());
  const assets = toArray(raw?.payload?.assets).map((asset) => asset.toLowerCase());
  return tags.some((tag) => tag.includes(topicLower) || topicLower.includes(tag)) ||
    assets.some((asset) => asset.includes(topicLower) || topicLower.includes(asset));
}

async function defaultFeedFetch(path: string, token: string): Promise<unknown[]> {
  const res = await apiCall(path, token);
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return normalizeFeedPosts(res.data);
}

/**
 * Filter raw feed posts and extract lightweight fields.
 */
export function filterPosts(rawPosts: unknown[], filter: QualityFilter): FilteredPost[] {
  const exclude = new Set((filter.excludeAuthors || []).map((a) => String(a).toLowerCase()));
  const minScore = Number.isFinite(filter.minScore) ? filter.minScore : 70;

  const out: FilteredPost[] = [];
  for (const item of rawPosts || []) {
    const raw = item as RawPost;
    const txHash = String(raw?.txHash || "").trim();
    if (!txHash) continue;

    const author = getAuthor(raw);
    if (!author) continue;
    if (exclude.has(author)) continue;

    const score = clampScore(raw?.score ?? raw?.qualityScore);
    if (score < minScore) continue;

    const attested = hasAttestation(raw);
    if (filter.requireAttestation && !attested) continue;

    const filtered: FilteredPost = {
      txHash,
      author,
      timestamp: normalizeTimestamp(raw?.timestamp),
      score,
      category: getCategory(raw),
      tags: toArray(raw?.payload?.tags),
      assets: toArray(raw?.payload?.assets),
      hasAttestation: attested,
      reactions: {
        agree: Number(raw?.reactions?.agree || 0),
        disagree: Number(raw?.reactions?.disagree || 0),
      },
      textPreview: getText(raw),
    };

    out.push(filtered);
  }

  return out;
}

/**
 * Combined topic search for SuperColony feed quirks.
 *
 * The search endpoint only indexes post body text for `text=` lookups, so
 * topic discovery needs:
 * 1. asset search
 * 2. text search
 * 3. local tag/asset matching against a caller-provided broad pool if both are empty
 *
 * The helper accepts an optional broad-pool getter so callers can memoize the
 * broad feed fetch once and reuse it across multiple topic queries.
 */
export async function combinedTopicSearch(
  topic: string,
  authToken: string,
  qualityFilter: QualityFilter,
  broadPool?: unknown[] | (() => Promise<unknown[]>),
  options: CombinedTopicSearchOptions = {}
): Promise<FilteredPost[]> {
  const searchLimit = Number.isFinite(options.searchLimit) ? Number(options.searchLimit) : 30;
  const fetchFeed = options.fetchFeed || ((path: string) => defaultFeedFetch(path, authToken));
  const normalizedTopic = String(topic || "").trim();

  if (!normalizedTopic) return [];

  // Build additional query params from options (per official skill spec: category, since, agent, cursor)
  const extraParams: string[] = [];
  if (options.category) extraParams.push(`category=${encodeURIComponent(options.category)}`);
  if (options.agent) extraParams.push(`agent=${encodeURIComponent(options.agent)}`);
  if (options.since != null && Number.isFinite(options.since)) extraParams.push(`since=${options.since}`);
  if (options.cursor) extraParams.push(`cursor=${encodeURIComponent(options.cursor)}`);
  const extraQuery = extraParams.length > 0 ? `&${extraParams.join("&")}` : "";

  const searchResults = await Promise.allSettled([
    fetchFeed(
      `/api/feed/search?asset=${encodeURIComponent(normalizedTopic)}&limit=${searchLimit}${extraQuery}`,
      `topic-search asset="${normalizedTopic}"`
    ),
    fetchFeed(
      `/api/feed/search?text=${encodeURIComponent(normalizedTopic)}&limit=${searchLimit}${extraQuery}`,
      `topic-search text="${normalizedTopic}"`
    ),
  ]);

  const filteredMatches: FilteredPost[] = [];
  for (const [index, result] of searchResults.entries()) {
    const source: TopicSearchSource = index === 0 ? "asset" : "text";
    if (result.status === "fulfilled") {
      options.onRawResults?.(source, result.value);
      filteredMatches.push(...filterPosts(result.value, qualityFilter));
      continue;
    }

    observe("inefficiency", `topic-search ${source}="${normalizedTopic}" failed`, {
      phase: "scan",
      source: "feed-filter.ts:combinedTopicSearch",
      data: {
        topic: normalizedTopic,
        source,
        error: toErrorMessage(result.reason),
      },
    });
  }

  if (filteredMatches.length > 0) {
    return dedupeFilteredPosts(filteredMatches);
  }

  if (!broadPool) {
    return [];
  }

  try {
    const pool = typeof broadPool === "function" ? await broadPool() : broadPool;
    const topicLower = normalizedTopic.toLowerCase();
    const tagMatches = (pool || []).filter((post) => matchesTopicTagOrAsset(post as RawPost, topicLower));
    const filteredFallback = filterPosts(tagMatches, qualityFilter);
    options.onFallbackFiltered?.(filteredFallback);
    return dedupeFilteredPosts(filteredFallback);
  } catch (err) {
    observe("inefficiency", `topic-search broad feed failed for "${normalizedTopic}"`, {
      phase: "scan",
      source: "feed-filter.ts:combinedTopicSearch",
      data: {
        topic: normalizedTopic,
        error: toErrorMessage(err),
      },
    });
    return [];
  }
}

/**
 * Fetch a conversation thread via SuperColony API.
 *
 * API fallback for chain-native `getRepliesTo` — returns the thread
 * rooted at the given txHash including parent context and all replies.
 * Returns null on API failure (graceful degradation).
 *
 * Per official skill spec: GET /api/feed/thread/{txHash}
 */
export async function fetchThread(
  txHash: string,
  authToken: string,
  fetchFeed?: (path: string, label: string) => Promise<unknown>,
): Promise<{ posts: FilteredPost[] } | null> {
  const fetcher = fetchFeed || ((path: string) => defaultFeedFetch(path, authToken));
  try {
    const raw = await fetcher(
      `/api/feed/thread/${encodeURIComponent(txHash)}`,
      `thread lookup ${txHash.slice(0, 16)}`,
    );
    if (!raw || !Array.isArray(raw)) return null;
    return { posts: filterPosts(raw, { minScore: 0, requireAttestation: false }) };
  } catch (err) {
    observe("inefficiency", `thread fetch failed for ${txHash.slice(0, 16)}...`, {
      phase: "scan",
      source: "feed-filter.ts:fetchThread",
      data: { txHash, error: toErrorMessage(err) },
    });
    return null;
  }
}

/**
 * Build topic index from filtered posts.
 */
export function buildTopicIndex(posts: FilteredPost[]): Map<string, TopicStats> {
  const topicIndex = new Map<string, TopicStats>();

  for (const post of posts) {
    const topics = new Set<string>();
    for (const tag of post.tags) topics.add(tag.toLowerCase());
    for (const asset of post.assets) topics.add(asset.toLowerCase());
    if (topics.size === 0) topics.add(post.category.toLowerCase());

    const reactionCount = post.reactions.agree + post.reactions.disagree;

    for (const topic of topics) {
      const current = topicIndex.get(topic) || {
        count: 0,
        totalReactions: 0,
        attestedCount: 0,
        uniqueAuthors: new Set<string>(),
        avgScore: 0,
        newestTimestamp: 0,
      };
      current.count += 1;
      current.totalReactions += reactionCount;
      current.attestedCount += post.hasAttestation ? 1 : 0;
      current.uniqueAuthors.add(post.author);
      current.avgScore += post.score;
      current.newestTimestamp = Math.max(current.newestTimestamp, post.timestamp || 0);
      topicIndex.set(topic, current);
    }
  }

  for (const [topic, stats] of topicIndex.entries()) {
    stats.avgScore = stats.count > 0 ? +(stats.avgScore / stats.count).toFixed(1) : 0;
    topicIndex.set(topic, stats);
  }

  return topicIndex;
}

/**
 * Build agent quality index from filtered posts.
 */
export function buildAgentIndex(posts: FilteredPost[]): Map<string, AgentStats> {
  const acc = new Map<string, { totalScore: number; postCount: number; attestedCount: number }>();

  for (const post of posts) {
    const key = post.author.toLowerCase();
    const current = acc.get(key) || { totalScore: 0, postCount: 0, attestedCount: 0 };
    current.totalScore += post.score;
    current.postCount += 1;
    current.attestedCount += post.hasAttestation ? 1 : 0;
    acc.set(key, current);
  }

  const out = new Map<string, AgentStats>();
  for (const [address, stats] of acc.entries()) {
    const avgScore = stats.postCount > 0 ? +(stats.totalScore / stats.postCount).toFixed(1) : 0;
    const attestationRate = stats.postCount > 0 ? +(stats.attestedCount / stats.postCount).toFixed(3) : 0;
    out.set(address, {
      address,
      postCount: stats.postCount,
      avgScore,
      attestationRate,
    });
  }
  return out;
}
