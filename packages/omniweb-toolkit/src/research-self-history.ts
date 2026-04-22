import type { ResearchPostInput } from "./research-opportunities.js";

export interface ResearchPublishHistoryEntry {
  topic: string;
  family: string | null;
  publishedAt: string;
  opportunityKind: string;
  textSnippet: string | null;
  evidenceValues: Record<string, string>;
}

export interface ResearchSelfHistoryPostSummary {
  topic: string;
  family: string | null;
  publishedAt: string;
  hoursAgo: number;
  textSnippet: string | null;
}

export interface ResearchSelfHistoryDelta {
  comparedToPublishedAt: string;
  changedFields: string[];
  hasMeaningfulChange: boolean;
}

export interface ResearchColonyNoveltyPostSummary {
  txHash: string | null;
  author: string | null;
  category: string | null;
  score: number | null;
  publishedAt: string;
  hoursAgo: number;
  textSnippet: string;
  sharedTerms: string[];
  sharedNumbers: string[];
}

export interface ResearchColonyNoveltySummary {
  recentOverlapCount2h: number;
  recentOverlapCount24h: number;
  strongestOverlapPost: ResearchColonyNoveltyPostSummary | null;
  skipSuggested: boolean;
  overlapReason: string | null;
}

export interface ResearchSelfHistorySummary {
  lastPost: ResearchSelfHistoryPostSummary | null;
  lastSameTopicPost: ResearchSelfHistoryPostSummary | null;
  lastSameFamilyPost: ResearchSelfHistoryPostSummary | null;
  windows: {
    total24h: number;
    total7d: number;
    sameTopic24h: number;
    sameTopic7d: number;
    sameFamily24h: number;
    sameFamily7d: number;
  };
  changeSinceLastSameTopic: ResearchSelfHistoryDelta | null;
  changeSinceLastSameFamily: ResearchSelfHistoryDelta | null;
  colonyNovelty: ResearchColonyNoveltySummary | null;
  repeatRisk: "low" | "medium" | "high";
  skipSuggested: boolean;
  repetitionReason: string | null;
}

export interface BuildResearchSelfHistoryOptions {
  history: ResearchPublishHistoryEntry[];
  topic: string;
  family: string | null;
  now: string;
  currentEvidenceValues: Record<string, string>;
  recentColonyPosts?: ResearchPostInput[];
  minMeaningfulPercentDelta?: number;
  minMeaningfulAbsoluteDelta?: number;
}

const DEFAULT_MIN_MEANINGFUL_PERCENT_DELTA = 1;
const DEFAULT_MIN_MEANINGFUL_ABSOLUTE_DELTA = 0.001;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const COLONY_OVERLAP_WINDOW_MS = 2 * 60 * 60 * 1000;
const NOVELTY_TOKEN_STOPWORDS = new Set([
  "about",
  "again",
  "before",
  "being",
  "from",
  "have",
  "into",
  "just",
  "market",
  "still",
  "that",
  "their",
  "there",
  "these",
  "this",
  "with",
]);

export function buildResearchSelfHistory(opts: BuildResearchSelfHistoryOptions): ResearchSelfHistorySummary {
  const nowMs = Date.parse(opts.now);
  const minMeaningfulPercentDelta = opts.minMeaningfulPercentDelta ?? DEFAULT_MIN_MEANINGFUL_PERCENT_DELTA;
  const minMeaningfulAbsoluteDelta = opts.minMeaningfulAbsoluteDelta ?? DEFAULT_MIN_MEANINGFUL_ABSOLUTE_DELTA;
  const sortedHistory = [...opts.history]
    .filter((entry) => typeof entry.topic === "string" && entry.topic.length > 0 && typeof entry.publishedAt === "string")
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));

  const lastPost = sortedHistory[0] ? summarizePost(sortedHistory[0], nowMs) : null;
  const lastSameTopic = sortedHistory.find((entry) => normalize(entry.topic) === normalize(opts.topic)) ?? null;
  const lastSameFamily = opts.family == null
    ? null
    : sortedHistory.find((entry) => normalize(entry.family) === normalize(opts.family)) ?? null;
  const lastSameFamilyIsSameTopic = lastSameFamily != null
    && normalize(lastSameFamily.topic) === normalize(opts.topic);

  const windows = {
    total24h: countSince(sortedHistory, nowMs, DAY_MS),
    total7d: countSince(sortedHistory, nowMs, WEEK_MS),
    sameTopic24h: countSince(sortedHistory.filter((entry) => normalize(entry.topic) === normalize(opts.topic)), nowMs, DAY_MS),
    sameTopic7d: countSince(sortedHistory.filter((entry) => normalize(entry.topic) === normalize(opts.topic)), nowMs, WEEK_MS),
    sameFamily24h: countSince(sortedHistory.filter((entry) => normalize(entry.family) === normalize(opts.family)), nowMs, DAY_MS),
    sameFamily7d: countSince(sortedHistory.filter((entry) => normalize(entry.family) === normalize(opts.family)), nowMs, WEEK_MS),
  };

  const changeSinceLastSameTopic = lastSameTopic
    ? buildDelta(lastSameTopic, opts.currentEvidenceValues, minMeaningfulAbsoluteDelta, minMeaningfulPercentDelta)
    : null;
  const changeSinceLastSameFamily = lastSameFamily
    ? buildDelta(lastSameFamily, opts.currentEvidenceValues, minMeaningfulAbsoluteDelta, minMeaningfulPercentDelta)
    : null;
  const colonyNovelty = buildColonyNoveltySummary(
    opts.recentColonyPosts ?? [],
    opts.topic,
    opts.currentEvidenceValues,
    nowMs,
  );

  let repeatRisk: ResearchSelfHistorySummary["repeatRisk"] = "low";
  let skipSuggested = false;
  let repetitionReason: string | null = null;
  const lastSameTopicSummary = lastSameTopic ? summarizePost(lastSameTopic, nowMs) : null;
  const lastSameFamilySummary = lastSameFamily ? summarizePost(lastSameFamily, nowMs) : null;

  if (lastSameTopicSummary && changeSinceLastSameTopic && !changeSinceLastSameTopic.hasMeaningfulChange && lastSameTopicSummary.hoursAgo <= 24 * 7) {
    repeatRisk = "high";
    skipSuggested = true;
    repetitionReason = "same_topic_no_material_change_within_7d";
  } else if (
    lastSameFamilySummary
    && lastSameFamilyIsSameTopic
    && changeSinceLastSameFamily
    && !changeSinceLastSameFamily.hasMeaningfulChange
    && lastSameFamilySummary.hoursAgo <= 24
  ) {
    repeatRisk = "high";
    skipSuggested = true;
    repetitionReason = "same_family_no_material_change_within_24h";
  } else if (windows.sameFamily24h > 0 || windows.sameTopic7d > 1) {
    repeatRisk = "medium";
    repetitionReason = windows.sameFamily24h > 0
      ? "recent_same_family_coverage"
      : "recent_same_topic_coverage";
  }

  if (!skipSuggested && colonyNovelty?.skipSuggested) {
    repeatRisk = "high";
    skipSuggested = true;
    repetitionReason = colonyNovelty.overlapReason;
  } else if (
    repeatRisk === "low"
    && (colonyNovelty?.recentOverlapCount24h ?? 0) > 0
  ) {
    repeatRisk = "medium";
    repetitionReason ??= colonyNovelty?.overlapReason ?? "recent_colony_overlap";
  }

  return {
    lastPost,
    lastSameTopicPost: lastSameTopicSummary,
    lastSameFamilyPost: lastSameFamilySummary,
    windows,
    changeSinceLastSameTopic,
    changeSinceLastSameFamily,
    colonyNovelty,
    repeatRisk,
    skipSuggested,
    repetitionReason,
  };
}

function summarizePost(entry: ResearchPublishHistoryEntry, nowMs: number): ResearchSelfHistoryPostSummary {
  return {
    topic: entry.topic,
    family: entry.family,
    publishedAt: entry.publishedAt,
    hoursAgo: Number((((nowMs - Date.parse(entry.publishedAt)) / (60 * 60 * 1000))).toFixed(2)),
    textSnippet: entry.textSnippet ?? null,
  };
}

function countSince(history: ResearchPublishHistoryEntry[], nowMs: number, windowMs: number): number {
  return history.filter((entry) => {
    const publishedAtMs = Date.parse(entry.publishedAt);
    return Number.isFinite(publishedAtMs) && nowMs - publishedAtMs <= windowMs;
  }).length;
}

function buildDelta(
  entry: ResearchPublishHistoryEntry,
  currentEvidenceValues: Record<string, string>,
  minMeaningfulAbsoluteDelta: number,
  minMeaningfulPercentDelta: number,
): ResearchSelfHistoryDelta {
  const changedFields = Object.entries(currentEvidenceValues)
    .filter(([key, currentValue]) => isMeaningfulDelta(entry.evidenceValues[key] ?? null, currentValue, minMeaningfulAbsoluteDelta, minMeaningfulPercentDelta))
    .map(([key]) => key);

  return {
    comparedToPublishedAt: entry.publishedAt,
    changedFields,
    hasMeaningfulChange: changedFields.length > 0,
  };
}

function isMeaningfulDelta(
  previousValue: string | null,
  currentValue: string,
  minMeaningfulAbsoluteDelta: number,
  minMeaningfulPercentDelta: number,
): boolean {
  const currentNumber = parseNumeric(currentValue);
  const previousNumber = parseNumeric(previousValue);
  if (currentNumber == null || previousNumber == null) {
    return previousValue !== currentValue;
  }
  const absoluteChange = Math.abs(currentNumber - previousNumber);
  if (absoluteChange >= minMeaningfulAbsoluteDelta) return true;
  if (previousNumber === 0) return absoluteChange > 0;
  const percentChange = (absoluteChange / Math.abs(previousNumber)) * 100;
  return percentChange >= minMeaningfulPercentDelta;
}

function parseNumeric(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function buildColonyNoveltySummary(
  posts: ResearchPostInput[],
  topic: string,
  currentEvidenceValues: Record<string, string>,
  nowMs: number,
): ResearchColonyNoveltySummary | null {
  const topicTerms = extractNoveltyTerms(topic);
  const evidenceTokens = extractEvidenceTokens(currentEvidenceValues);
  const overlapPosts = posts
    .map((post) => summarizeColonyOverlap(post, topicTerms, evidenceTokens, nowMs))
    .filter((value): value is ResearchColonyNoveltyPostSummary => value != null);

  if (overlapPosts.length === 0) {
    return null;
  }

  const strongestOverlapPost = [...overlapPosts].sort((left, right) =>
    Number(right.hoursAgo <= 2) - Number(left.hoursAgo <= 2)
    || right.sharedNumbers.length - left.sharedNumbers.length
    || right.sharedTerms.length - left.sharedTerms.length
    || (right.score ?? 0) - (left.score ?? 0)
    || left.hoursAgo - right.hoursAgo
  )[0] ?? null;
  const recentOverlapCount2h = overlapPosts.filter((post) => post.hoursAgo <= 2).length;
  const recentOverlapCount24h = overlapPosts.filter((post) => post.hoursAgo <= 24).length;
  const recentStrongOverlap = overlapPosts.find((post) =>
    post.hoursAgo <= 2
    && (post.sharedNumbers.length > 0 || post.sharedTerms.length >= 4)
  ) ?? null;

  return {
    recentOverlapCount2h,
    recentOverlapCount24h,
    strongestOverlapPost,
    skipSuggested: recentStrongOverlap != null,
    overlapReason: recentStrongOverlap == null
      ? recentOverlapCount24h > 0
        ? "recent_colony_overlap"
        : null
      : recentStrongOverlap.sharedNumbers.length > 0
        ? "recent_colony_numeric_overlap_within_2h"
        : "recent_colony_topic_overlap_within_2h",
  };
}

function summarizeColonyOverlap(
  post: ResearchPostInput,
  topicTerms: Set<string>,
  evidenceTokens: Set<string>,
  nowMs: number,
): ResearchColonyNoveltyPostSummary | null {
  if (typeof post.text !== "string" || typeof post.timestamp !== "number") {
    return null;
  }
  const ageMs = nowMs - post.timestamp;
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > DAY_MS) {
    return null;
  }

  const postTerms = extractNoveltyTerms(post.text);
  const sharedTerms = [...topicTerms].filter((token) => postTerms.has(token));
  const sharedNumbers = [...evidenceTokens].filter((token) => normalize(post.text).includes(token));
  if (sharedNumbers.length === 0 && sharedTerms.length < 3) {
    return null;
  }

  return {
    txHash: post.txHash,
    author: post.author,
    category: post.category,
    score: post.score ?? null,
    publishedAt: new Date(post.timestamp).toISOString(),
    hoursAgo: Number((ageMs / (60 * 60 * 1000)).toFixed(2)),
    textSnippet: post.text.length > 220 ? `${post.text.slice(0, 217)}...` : post.text,
    sharedTerms,
    sharedNumbers,
  };
}

function extractNoveltyTerms(text: string): Set<string> {
  const tokens = normalize(text).match(/[a-z][a-z-]{2,}/g) ?? [];
  return new Set(tokens.filter((token) => token.length >= 4 && !NOVELTY_TOKEN_STOPWORDS.has(token)));
}

function extractEvidenceTokens(values: Record<string, string>): Set<string> {
  const tokens = new Set<string>();
  for (const rawValue of Object.values(values)) {
    for (const token of extractNumericFragments(rawValue)) {
      tokens.add(token);
    }
  }
  return tokens;
}

function extractNumericFragments(value: string): string[] {
  const normalizedValue = normalize(value).replace(/,/g, "");
  const matches = normalizedValue.match(/\b\d+(?:\.\d+)?(?:bps?|%|usd)?\b/g) ?? [];
  return matches;
}
