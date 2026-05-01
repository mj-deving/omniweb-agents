#!/usr/bin/env npx tsx

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getStringArg,
  hasFlag,
  loadConnect,
  loadPackageExport,
} from "./_shared.ts";

export type ReplyParentInventoryClassification =
  | "evidence_ready"
  | "detail_unavailable"
  | "no_attestation_urls"
  | "attestation_plan_not_ready"
  | "evidence_fetch_failed";

export interface ReplyParentInventoryCandidate {
  txHash: string;
  author: string;
  text: string;
  category: string;
  score: number | null;
  agreeCount: number;
  replyCount: number;
  ageMs: number | null;
  selectionScore: number;
  feedSourceAttestationUrls: string[];
  detailSourceAttestationUrls: string[];
  effectiveSourceAttestationUrls: string[];
  attestationSourceLayer: "detail" | "feed" | "none";
  classification: ReplyParentInventoryClassification;
  classificationReason: string;
  detailOk: boolean;
  detailError: string | null;
  replyBodiesVisible: number;
  attestationPlanPrimary: {
    name: string | null;
    url: string;
    catalogPath: string | null;
  } | null;
  evidenceSummary: {
    source: string;
    url: string;
    fetchedAt: string;
    valueKeys: string[];
    derivedMetricKeys: string[];
  } | null;
}

export interface ReplyParentInventoryReport {
  checkedAt: string;
  ok: boolean;
  stateDir: string | null;
  parentCategory: string;
  feedLimit: number;
  minAgreeCount: number;
  minReplyCount: number;
  maxParentAgeHours: number;
  minScore: number;
  feedPagesRead: number;
  topPostsFetched: number;
  candidateCount: number;
  classificationCounts: Record<ReplyParentInventoryClassification, number>;
  candidates: ReplyParentInventoryCandidate[];
}

type FeedWindowResult = {
  ok: boolean;
  posts: unknown[];
  pages: number;
  error?: string;
};

type BuildReplyParentInventoryOptions = {
  ownAddress: string;
  parentCategory: string;
  feedLimit: number;
  minAgreeCount: number;
  minReplyCount: number;
  maxParentAgeHours: number;
  minScore: number;
};

type BuildReplyParentInventoryDeps = {
  omni: {
    colony: {
      getFeed(opts: {
        limit: number;
        category?: string;
        cursor?: string;
        replies?: boolean;
      }): Promise<any>;
      getTopPosts?(opts: {
        category?: string;
        minScore?: number;
        limit?: number;
      }): Promise<any>;
      getPostDetail(txHash: string): Promise<any>;
    };
  };
  buildMinimalAttestationPlanFromUrls: (opts: {
    topic: string;
    urls: string[];
    minSupportingSources?: number;
  }) => any;
  fetchResearchEvidenceSummary: (opts: {
    source: unknown;
    topic: string;
  }) => Promise<any>;
  now?: number;
};

const DEFAULT_FEED_LIMIT = 100;
const DEFAULT_PARENT_CATEGORY = "ANALYSIS";
const DEFAULT_MIN_AGREE_COUNT = 3;
const DEFAULT_MIN_REPLY_COUNT = 1;
const DEFAULT_MAX_PARENT_AGE_HOURS = 6;
const DEFAULT_MIN_SCORE = 80;

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-reply-parent-inventory.ts [options]

Options:
  --parent-category CAT     Parent category to scan (default: ${DEFAULT_PARENT_CATEGORY})
  --feed-limit N            Number of recent posts to scan (default: ${DEFAULT_FEED_LIMIT})
  --min-agree-count N       Minimum agree-count floor (default: ${DEFAULT_MIN_AGREE_COUNT})
  --min-reply-count N       Minimum reply-count floor (default: ${DEFAULT_MIN_REPLY_COUNT})
  --max-parent-age-hours N  Maximum parent age in hours (default: ${DEFAULT_MAX_PARENT_AGE_HOURS})
  --min-score N             Minimum score floor (default: ${DEFAULT_MIN_SCORE})
  --state-dir PATH          Override state directory for connect()
  --out PATH                Write the JSON report to a file as well as stdout
  --allow-insecure          Forwarded to connect() for local debugging only
  --help, -h                Show this help

Output: JSON report of evidence-ready reply-parent candidates
Exit codes: 0 = inventory built, 1 = runtime or read failure, 2 = invalid args`);
  process.exit(0);
}

const parentCategory = (getStringArg(args, "--parent-category") ?? DEFAULT_PARENT_CATEGORY).trim().toUpperCase();
const feedLimit = getPositiveInt("--feed-limit", DEFAULT_FEED_LIMIT);
const minAgreeCount = getPositiveInt("--min-agree-count", DEFAULT_MIN_AGREE_COUNT);
const minReplyCount = getPositiveInt("--min-reply-count", DEFAULT_MIN_REPLY_COUNT);
const maxParentAgeHours = getPositiveInt("--max-parent-age-hours", DEFAULT_MAX_PARENT_AGE_HOURS);
const minScore = getPositiveInt("--min-score", DEFAULT_MIN_SCORE);
const stateDir = getStringArg(args, "--state-dir") ?? null;
const outputPath = getStringArg(args, "--out");
const allowInsecureUrls = hasFlag(args, "--allow-insecure");

const isDirectRun = (() => {
  const current = fileURLToPath(import.meta.url);
  const entry = process.argv[1];
  return typeof entry === "string" && resolve(entry) === current;
})();

if (isDirectRun) {
  try {
  const connect = await loadConnect();
  const buildMinimalAttestationPlanFromUrls = await loadPackageExport<any>(
    "../dist/agent.js",
    "../src/agent.ts",
    "buildMinimalAttestationPlanFromUrls",
  );
  const fetchResearchEvidenceSummary = await loadPackageExport<any>(
    "../dist/agent.js",
    "../src/agent.ts",
    "fetchResearchEvidenceSummary",
  );

  const omni = await connect({ stateDir: stateDir ?? undefined, allowInsecureUrls });
  const report = await buildReplyParentInventory(
    {
      ownAddress: omni.address,
      parentCategory,
      feedLimit,
      minAgreeCount,
      minReplyCount,
      maxParentAgeHours,
      minScore,
    },
    {
      omni,
      buildMinimalAttestationPlanFromUrls,
      fetchResearchEvidenceSummary,
    },
  );

  if (outputPath) {
    await mkdir(dirname(resolve(outputPath)), { recursive: true });
    await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
  } catch (error) {
    console.log(JSON.stringify({
      checkedAt: new Date().toISOString(),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, null, 2));
    process.exit(1);
  }
}

export async function buildReplyParentInventory(
  opts: BuildReplyParentInventoryOptions,
  deps: BuildReplyParentInventoryDeps,
): Promise<ReplyParentInventoryReport> {
  const feed = await fetchFeedWindow(deps.omni, {
    limit: opts.feedLimit,
    category: opts.parentCategory,
  });

  if (!feed.ok) {
    throw new Error(feed.error ?? "feed_read_failed");
  }

  const topPosts = await fetchTopPostsWindow(deps.omni, {
    category: opts.parentCategory,
    minScore: opts.minScore,
    limit: opts.feedLimit,
  });
  const rankedCandidates = rankReplyParentCandidates(
    mergeCandidateRecords(feed.posts, topPosts.posts),
    {
      ownAddress: opts.ownAddress,
      maxAgeMs: opts.maxParentAgeHours * 60 * 60 * 1000,
      minAgreeCount: 0,
      minReplyCount: 0,
      minScore: opts.minScore,
      category: opts.parentCategory,
      now: deps.now ?? Date.now(),
    },
  );

  const candidates = await Promise.all(rankedCandidates.map(async (candidate) => {
    const detailResult = await deps.omni.colony.getPostDetail(candidate.txHash);
    const detailPost = detailResult?.ok ? extractPostRecord(detailResult.data) : null;
    const detailReactions = detailPost ? readReactionCounts(detailPost) : null;
    const detailReplyCount = detailPost
      ? toNumber(detailPost.replyCount) ?? readNestedNumber(detailPost.payload, "replyCount") ?? countVisibleReplies(detailResult.data)
      : null;
    const effectiveAgreeCount = detailReactions?.agree ?? (toNumber(candidate.agreeCount) ?? 0);
    const effectiveReplyCount = detailReplyCount ?? (toNumber(candidate.replyCount) ?? 0);
    const effectiveScore = detailPost ? (toNumber(detailPost.score) ?? candidate.score) : candidate.score;

    if ((effectiveScore ?? 0) < opts.minScore) return null;
    if (effectiveAgreeCount < opts.minAgreeCount) return null;
    if (effectiveReplyCount < opts.minReplyCount) return null;

    const detailSourceAttestationUrls = detailPost ? readAttestationUrls(detailPost) : [];
    const effectiveSourceAttestationUrls = detailSourceAttestationUrls.length > 0
      ? detailSourceAttestationUrls
      : Array.isArray(candidate.sourceAttestationUrls)
        ? candidate.sourceAttestationUrls.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
        : [];
    const attestationSourceLayer = detailSourceAttestationUrls.length > 0
      ? "detail"
      : effectiveSourceAttestationUrls.length > 0
        ? "feed"
        : "none";

    let classification: ReplyParentInventoryClassification = "detail_unavailable";
    let classificationReason = "authenticated getPostDetail() did not recover a post payload";
    let attestationPlanPrimary: ReplyParentInventoryCandidate["attestationPlanPrimary"] = null;
    let evidenceSummary: ReplyParentInventoryCandidate["evidenceSummary"] = null;

    if (detailResult?.ok) {
      if (effectiveSourceAttestationUrls.length === 0) {
        classification = "no_attestation_urls";
        classificationReason = "no sourceAttestations visible in post detail or feed candidate";
      } else {
        const attestationPlan = deps.buildMinimalAttestationPlanFromUrls({
          topic: String(candidate.text ?? "").slice(0, 120),
          urls: effectiveSourceAttestationUrls,
          minSupportingSources: 0,
        });
        const primary = attestationPlan?.primary ?? null;

        if (!primary) {
          classification = "attestation_plan_not_ready";
          classificationReason = `minimal attestation plan has no primary source (${attestationPlan?.reason ?? "unknown_reason"})`;
        } else {
          attestationPlanPrimary = {
            name: typeof primary.name === "string" ? primary.name : null,
            url: String(primary.url),
            catalogPath: typeof primary.catalogPath === "string" ? primary.catalogPath : null,
          };

          const evidence = await deps.fetchResearchEvidenceSummary({
            source: primary,
            topic: candidate.text,
          });

          if (evidence?.ok) {
            classification = "evidence_ready";
            classificationReason = "detail-attested parent yields a fetchable primary evidence summary";
            evidenceSummary = {
              source: String(evidence.summary.source),
              url: String(evidence.summary.url),
              fetchedAt: String(evidence.summary.fetchedAt),
              valueKeys: Object.keys(evidence.summary.values ?? {}),
              derivedMetricKeys: Object.keys(evidence.summary.derivedMetrics ?? {}),
            };
          } else {
            classification = "evidence_fetch_failed";
            classificationReason = `primary evidence fetch failed (${evidence?.error ?? "unknown_error"})`;
          }
        }
      }
    }

    return {
      txHash: String(candidate.txHash),
      author: String(candidate.author),
      text: String(candidate.text),
      category: String(candidate.category),
      score: effectiveScore,
      agreeCount: effectiveAgreeCount,
      replyCount: effectiveReplyCount,
      ageMs: toNumber(candidate.ageMs),
      selectionScore: toNumber(candidate.selectionScore) ?? 0,
      feedSourceAttestationUrls: Array.isArray(candidate.sourceAttestationUrls)
        ? candidate.sourceAttestationUrls.filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
        : [],
      detailSourceAttestationUrls,
      effectiveSourceAttestationUrls,
      attestationSourceLayer,
      classification,
      classificationReason,
      detailOk: !!detailResult?.ok,
      detailError: detailResult?.ok ? null : (detailResult?.error ?? "post_detail_failed"),
      replyBodiesVisible: countVisibleReplies(detailResult?.ok ? detailResult.data : null),
      attestationPlanPrimary,
      evidenceSummary,
    } satisfies ReplyParentInventoryCandidate;
  }));
  const filteredCandidates = candidates.filter((candidate): candidate is ReplyParentInventoryCandidate => candidate != null);

  return {
    checkedAt: new Date().toISOString(),
    ok: true,
    stateDir: stateDirOrNull(stateDir),
    parentCategory: opts.parentCategory,
    feedLimit: opts.feedLimit,
    minAgreeCount: opts.minAgreeCount,
    minReplyCount: opts.minReplyCount,
    maxParentAgeHours: opts.maxParentAgeHours,
    minScore: opts.minScore,
    feedPagesRead: feed.pages,
    topPostsFetched: topPosts.posts.length,
    candidateCount: filteredCandidates.length,
    classificationCounts: countClassifications(filteredCandidates),
    candidates: filteredCandidates,
  };
}

function rankReplyParentCandidates(
  posts: unknown[],
  opts: {
    ownAddress: string;
    now?: number;
    maxAgeMs: number;
    minAgreeCount: number;
    minReplyCount: number;
    minScore: number;
    category: string;
  },
): Array<{
  txHash: string;
  author: string;
  text: string;
  category: string;
  score: number | null;
  agreeCount: number;
  replyCount: number;
  ageMs: number | null;
  selectionScore: number;
  sourceAttestationUrls: string[];
}> {
  const ownAddress = opts.ownAddress.trim().toLowerCase();
  const now = opts.now ?? Date.now();
  const category = opts.category.trim().toUpperCase();
  const candidates: Array<{
    txHash: string;
    author: string;
    text: string;
    category: string;
    score: number | null;
    agreeCount: number;
    replyCount: number;
    ageMs: number | null;
    selectionScore: number;
    sourceAttestationUrls: string[];
  }> = [];

  for (const post of posts) {
    if (!post || typeof post !== "object") continue;
    const record = post as Record<string, unknown>;
    const txHash = readString(record.txHash) ?? readString(record.tx_hash);
    const author = readString(record.author);
    const text = sanitizeText(
      readString(record.text)
      ?? readNestedString(record.payload, "text")
      ?? readString(record.content)
      ?? "",
    );
    const postCategory = (
      readString(record.category)
      ?? readNestedString(record.payload, "cat")
      ?? ""
    ).trim().toUpperCase();
    const timestampMs = normalizeTimestamp(record.timestamp);
    const ageMs = timestampMs == null ? null : Math.max(0, now - timestampMs);
    const score = toNumber(record.score);
    const reactions = readReactionCounts(record);
    const replyCount = toNumber(record.replyCount) ?? readNestedNumber(record.payload, "replyCount") ?? 0;
    const sourceAttestationUrls = readAttestationUrls(record);

    if (!txHash || !author || !text || !postCategory) continue;
    if (postCategory !== category) continue;
    if (author.trim().toLowerCase() === ownAddress) continue;
    if ((score ?? 0) < opts.minScore) continue;
    if (reactions.agree < opts.minAgreeCount) continue;
    if (replyCount < opts.minReplyCount) continue;
    if (ageMs != null && ageMs > opts.maxAgeMs) continue;

    candidates.push({
      txHash,
      author,
      text,
      category: postCategory,
      score,
      agreeCount: reactions.agree,
      replyCount,
      ageMs,
      selectionScore: scoreReplyParentCandidate({
        score: score ?? 0,
        agreeCount: reactions.agree,
        replyCount,
        attestationCount: sourceAttestationUrls.length,
        ageMs,
      }),
      sourceAttestationUrls,
    });
  }

  return candidates.sort((left, right) =>
    right.selectionScore - left.selectionScore
    || (right.score ?? 0) - (left.score ?? 0)
    || right.agreeCount - left.agreeCount
    || right.replyCount - left.replyCount
    || left.txHash.localeCompare(right.txHash));
}

function stateDirOrNull(stateDir: string | null): string | null {
  return stateDir ?? null;
}

async function fetchFeedWindow(
  omni: {
    colony: {
      getFeed(opts: {
        limit: number;
        category?: string;
        cursor?: string;
        replies?: boolean;
      }): Promise<any>;
    };
  },
  opts: {
    limit: number;
    category?: string;
  },
): Promise<FeedWindowResult> {
  const posts: unknown[] = [];
  let cursor: string | undefined;
  let pages = 0;

  while (posts.length < opts.limit) {
    const batchSize = Math.min(100, opts.limit - posts.length);
    const result = await omni.colony.getFeed({
      limit: batchSize,
      category: opts.category,
      cursor,
      replies: true,
    });

    if (!result?.ok) {
      return {
        ok: false,
        posts,
        pages,
        error: result?.error ?? "feed_not_ok",
      };
    }

    const batch = Array.isArray(result.data?.posts) ? result.data.posts : [];
    if (batch.length === 0) break;

    posts.push(...batch);
    pages += 1;

    if (!result.data?.hasMore) break;

    const last = batch[batch.length - 1];
    const nextCursor = last && typeof last === "object" ? (last as { txHash?: unknown }).txHash : undefined;
    if (typeof nextCursor !== "string" || nextCursor.length === 0) break;
    cursor = nextCursor;
  }

  return {
    ok: true,
    posts,
    pages,
  };
}

async function fetchTopPostsWindow(
  omni: {
    colony: {
      getTopPosts?(opts: {
        category?: string;
        minScore?: number;
        limit?: number;
      }): Promise<any>;
    };
  },
  opts: {
    category?: string;
    minScore?: number;
    limit: number;
  },
): Promise<{ posts: unknown[] }> {
  if (typeof omni.colony.getTopPosts !== "function") {
    return { posts: [] };
  }

  const result = await omni.colony.getTopPosts({
    category: opts.category,
    minScore: opts.minScore,
    limit: opts.limit,
  });

  if (!result?.ok) {
    return { posts: [] };
  }

  const posts = Array.isArray(result.data?.posts)
    ? result.data.posts
    : Array.isArray(result.data)
      ? result.data
      : [];

  return { posts };
}

function mergeCandidateRecords(feedPosts: unknown[], topPosts: unknown[]): unknown[] {
  const merged = new Map<string, unknown>();

  for (const post of [...feedPosts, ...topPosts]) {
    if (!post || typeof post !== "object") continue;
    const record = post as Record<string, unknown>;
    const txHash = readString(record.txHash) ?? readString(record.tx_hash);
    if (!txHash) continue;

    const existing = merged.get(txHash);
    if (!existing) {
      merged.set(txHash, post);
      continue;
    }

    merged.set(txHash, {
      ...(existing as Record<string, unknown>),
      ...record,
      payload: {
        ...(((existing as Record<string, unknown>).payload as Record<string, unknown> | undefined) ?? {}),
        ...((record.payload as Record<string, unknown> | undefined) ?? {}),
      },
    });
  }

  return Array.from(merged.values());
}

export function countClassifications(
  candidates: Array<Pick<ReplyParentInventoryCandidate, "classification">>,
): Record<ReplyParentInventoryClassification, number> {
  const counts: Record<ReplyParentInventoryClassification, number> = {
    evidence_ready: 0,
    detail_unavailable: 0,
    no_attestation_urls: 0,
    attestation_plan_not_ready: 0,
    evidence_fetch_failed: 0,
  };

  for (const candidate of candidates) {
    counts[candidate.classification] += 1;
  }

  return counts;
}

export function extractPostRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const post = data.post;
  if (post && typeof post === "object") return post as Record<string, unknown>;
  const nested = (data.data as { post?: unknown } | undefined)?.post;
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  return data;
}

export function readAttestationUrls(record: Record<string, unknown>): string[] {
  const payload = record.payload;
  const entries = Array.isArray(record.sourceAttestations)
    ? record.sourceAttestations
    : Array.isArray((payload as { sourceAttestations?: unknown } | undefined)?.sourceAttestations)
      ? (payload as { sourceAttestations: unknown[] }).sourceAttestations
      : [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const url = (entry as Record<string, unknown>).url;
      return typeof url === "string" && url.length > 0 ? url : null;
    })
    .filter((value): value is string => typeof value === "string");
}

export function countVisibleReplies(input: unknown): number {
  if (!input || typeof input !== "object") return 0;
  const direct = Array.isArray((input as { replies?: unknown }).replies) ? (input as { replies: unknown[] }).replies : null;
  const nested = Array.isArray(((input as { data?: { replies?: unknown } }).data)?.replies)
    ? ((input as { data: { replies: unknown[] } }).data.replies)
    : null;
  return (direct ?? nested ?? []).filter((reply) => reply && typeof reply === "object").length;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNestedString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  return readString((value as Record<string, unknown>)[key]);
}

function readNestedNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  return toNumber((value as Record<string, unknown>)[key]);
}

function getPositiveInt(flag: string, fallback: number): number {
  const value = getStringArg(args, flag);
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.error(`Error: ${flag} must be a positive integer`);
    process.exit(2);
  }
  return parsed;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeTimestamp(value: unknown): number | null {
  const raw = toNumber(value);
  if (raw == null) return null;
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}

function sanitizeText(text: string): string {
  return text
    .replace(/<\/?agent_post>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readReactionCounts(record: Record<string, unknown>): {
  agree: number;
  disagree: number;
  flag: number;
} {
  const reactions = record.reactions;
  const payloadReactions = (record.payload as { reactions?: unknown } | undefined)?.reactions;
  const source = reactions && typeof reactions === "object"
    ? reactions as Record<string, unknown>
    : payloadReactions && typeof payloadReactions === "object"
      ? payloadReactions as Record<string, unknown>
      : {};

  return {
    agree: toNumber(source.agree) ?? 0,
    disagree: toNumber(source.disagree) ?? 0,
    flag: toNumber(source.flag) ?? 0,
  };
}

function scoreReplyParentCandidate(input: {
  score: number;
  agreeCount: number;
  replyCount: number;
  attestationCount: number;
  ageMs: number | null;
}): number {
  const attestationBoost = Math.min(input.attestationCount, 3) * 3;
  const supportHeat = (input.agreeCount * 3) + Math.min(input.replyCount, 5) * 2;
  const freshnessBoost = input.ageMs == null
    ? 0
    : input.ageMs <= 30 * 60 * 1000
      ? 6
      : input.ageMs <= 60 * 60 * 1000
        ? 3
        : 0;
  return input.score + supportHeat + attestationBoost + freshnessBoost;
}
