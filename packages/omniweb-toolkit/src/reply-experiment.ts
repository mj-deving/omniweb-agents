import type { QualityGateResult } from "../../../src/toolkit/publish/quality-gate.js";
import { checkPublishQuality } from "../../../src/toolkit/publish/quality-gate.js";
import type { ResearchEvidenceSummary } from "./research-evidence.js";

export interface ReplyExperimentCandidate {
  txHash: string;
  author: string;
  text: string;
  category: string;
  timestampMs: number | null;
  ageMs: number | null;
  score: number | null;
  agreeCount: number;
  disagreeCount: number;
  flagCount: number;
  replyCount: number;
  reactionTotal: number;
  sourceAttestationUrls: string[];
  selectionScore: number;
}

export interface SelectReplyExperimentCandidateOptions {
  ownAddress: string;
  now?: number;
  maxAgeMs?: number;
  minAgreeCount?: number;
  minReplyCount?: number;
  minScore?: number;
  category?: string;
  excludeParentTxHashes?: string[];
}

export interface ReplyDraftQualityOptions {
  text: string;
  parentText: string;
  evidenceSummary: ResearchEvidenceSummary;
  minTextLength?: number;
}

const DEFAULT_MIN_TEXT_LENGTH = 200;
const DEFAULT_MAX_TEXT_LENGTH = 320;
const DEFAULT_MAX_PARENT_AGE_MS = 2 * 60 * 60 * 1000;
const DEFAULT_MIN_AGREE_COUNT = 3;
const DEFAULT_MIN_REPLY_COUNT = 1;
const DEFAULT_MIN_SCORE = 0;
const DEFAULT_CATEGORY = "ANALYSIS";

const REPLY_META_PATTERNS: Array<{ name: string; pattern: RegExp; detail: string }> = [
  {
    name: "operational-narration",
    pattern: /\b(?:operational|verification|probe|workflow|maintained path|state dir|live proof)\b/i,
    detail: "narrates infrastructure or proof workflow instead of making a market claim",
  },
  {
    name: "attestation-pipeline-narration",
    pattern: /\b(?:attestation pipeline|source selection|readback|indexed visible|feed visibility)\b/i,
    detail: "mentions the attestation or visibility pipeline instead of using the evidence directly",
  },
];

const HEDGED_DISMISSAL_PATTERNS: Array<{ name: string; pattern: RegExp; detail: string }> = [
  {
    name: "nothing-to-see",
    pattern: /\bnothing (?:new|to see|is happening)\b/i,
    detail: "tells the colony the setup is a non-event instead of making a committed update",
  },
  {
    name: "just-drift-noise",
    pattern: /\bjust (?:drift|noise|chop|positioning)\b/i,
    detail: "shrugs the setup off as drift or noise",
  },
  {
    name: "positioning-drift",
    pattern: /\bpositioning drift\b/i,
    detail: "repeats the exact anti-pattern that previously stalled at 80",
  },
  {
    name: "background-noise",
    pattern: /\bbackground noise\b/i,
    detail: "downgrades the setup to background noise instead of staking a view",
  },
  {
    name: "merely",
    pattern: /\b(?:mere|merely)\b/i,
    detail: "leans on minimizing language instead of a committed implication",
  },
];

export function selectReplyExperimentCandidate(
  posts: unknown[],
  opts: SelectReplyExperimentCandidateOptions,
): ReplyExperimentCandidate | null {
  return rankReplyExperimentCandidates(posts, opts)[0] ?? null;
}

export function rankReplyExperimentCandidates(
  posts: unknown[],
  opts: SelectReplyExperimentCandidateOptions,
): ReplyExperimentCandidate[] {
  const normalizedOwn = opts.ownAddress.trim().toLowerCase();
  const now = opts.now ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_PARENT_AGE_MS;
  const minAgreeCount = opts.minAgreeCount ?? DEFAULT_MIN_AGREE_COUNT;
  const minReplyCount = opts.minReplyCount ?? DEFAULT_MIN_REPLY_COUNT;
  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
  const category = (opts.category ?? DEFAULT_CATEGORY).trim().toUpperCase();
  const excluded = new Set((opts.excludeParentTxHashes ?? []).map((value) => value.toLowerCase()));

  const candidates: ReplyExperimentCandidate[] = [];

  for (const post of posts) {
    if (!post || typeof post !== "object") continue;
    const record = post as Record<string, unknown>;
    const txHash = readString(record.txHash) ?? readString(record.tx_hash);
    const author = readString(record.author);
    const text = sanitizeReplyExperimentText(
      readString(record.text)
      ?? readNestedString(record.payload, "text")
      ?? readString(record.content)
      ?? "",
    );
    const postCategory =
      readString(record.category)
      ?? readNestedString(record.payload, "cat")
      ?? null;
    const timestampMs = normalizeTimestamp(record.timestamp);
    const ageMs = timestampMs == null ? null : Math.max(0, now - timestampMs);
    const score = readNumber(record.score);
    const sourceAttestationUrls = readAttestationUrls(record);
    const reactions = readReactionCounts(record);
    const replyCount = readNumber(record.replyCount) ?? readNestedNumber(record.payload, "replyCount") ?? 0;
    const reactionTotal = reactions.agree + reactions.disagree + reactions.flag;

    if (!txHash || !author || !text || !postCategory) continue;
    if (postCategory.trim().toUpperCase() !== category) continue;
    if (author.trim().toLowerCase() === normalizedOwn) continue;
    if (excluded.has(txHash.toLowerCase())) continue;
    if (sourceAttestationUrls.length === 0) continue;
    if (reactions.agree < minAgreeCount) continue;
    if (replyCount < minReplyCount) continue;
    if ((score ?? 0) < minScore) continue;
    if (ageMs != null && ageMs > maxAgeMs) continue;

    candidates.push({
      txHash,
      author,
      text,
      category: postCategory,
      timestampMs,
      ageMs,
      score,
      agreeCount: reactions.agree,
      disagreeCount: reactions.disagree,
      flagCount: reactions.flag,
      replyCount,
      reactionTotal,
      sourceAttestationUrls,
      selectionScore: scoreReplyExperimentCandidate({
        score: score ?? 0,
        agreeCount: reactions.agree,
        disagreeCount: reactions.disagree,
        flagCount: reactions.flag,
        replyCount,
        attestationCount: sourceAttestationUrls.length,
        ageMs,
      }),
    });
  }

  return candidates.sort((left, right) =>
    right.selectionScore - left.selectionScore
    || (right.score ?? 0) - (left.score ?? 0)
    || right.agreeCount - left.agreeCount
    || right.replyCount - left.replyCount
    || left.txHash.localeCompare(right.txHash));
}

export function checkReplyDraftQuality(
  opts: ReplyDraftQualityOptions,
): QualityGateResult {
  const minTextLength = opts.minTextLength ?? DEFAULT_MIN_TEXT_LENGTH;
  const base = checkPublishQuality(
    { text: opts.text, category: "ANALYSIS" },
    { minTextLength },
  );
  const metaLeak = findPattern(REPLY_META_PATTERNS, opts.text);
  const hedgedDismissal = findPattern(HEDGED_DISMISSAL_PATTERNS, opts.text);
  const evidenceOverlap = checkEvidenceNumberOverlap(opts.text, opts.evidenceSummary);
  const novelNumber = checkNovelNumberAgainstParent(opts.text, opts.parentText);

  const checks = [
    ...base.checks,
    {
      name: "compact-claim-length",
      pass: opts.text.length <= DEFAULT_MAX_TEXT_LENGTH,
      detail: opts.text.length <= DEFAULT_MAX_TEXT_LENGTH
        ? `${opts.text.length}/${DEFAULT_MAX_TEXT_LENGTH} chars`
        : `${opts.text.length}/${DEFAULT_MAX_TEXT_LENGTH} chars — too long for the reply compact-claim format`,
    },
    {
      name: "no-operational-meta-leak",
      pass: metaLeak == null,
      detail: metaLeak == null ? "no operational or workflow narration detected" : `${metaLeak.name}: ${metaLeak.detail}`,
    },
    {
      name: "no-hedged-dismissal",
      pass: hedgedDismissal == null,
      detail: hedgedDismissal == null ? "reply stakes an actual update" : `${hedgedDismissal.name}: ${hedgedDismissal.detail}`,
    },
    {
      name: "evidence-number-overlap",
      pass: evidenceOverlap.pass,
      detail: evidenceOverlap.detail,
    },
    {
      name: "new-data-point-vs-parent",
      pass: novelNumber.pass,
      detail: novelNumber.detail,
    },
  ];

  if (!base.pass) {
    return {
      pass: false,
      reason: base.reason,
      checks,
    };
  }

  if (opts.text.length > DEFAULT_MAX_TEXT_LENGTH) {
    return {
      pass: false,
      reason: `failed: compact-claim-length — ${opts.text.length}/${DEFAULT_MAX_TEXT_LENGTH} chars exceeds the reply compact-claim ceiling`,
      checks,
    };
  }

  if (metaLeak) {
    return {
      pass: false,
      reason: `failed: no-operational-meta-leak — ${metaLeak.detail}`,
      checks,
    };
  }

  if (hedgedDismissal) {
    return {
      pass: false,
      reason: `failed: no-hedged-dismissal — ${hedgedDismissal.detail}`,
      checks,
    };
  }

  if (!evidenceOverlap.pass) {
    return {
      pass: false,
      reason: `failed: evidence-number-overlap — ${evidenceOverlap.detail}`,
      checks,
    };
  }

  if (!novelNumber.pass) {
    return {
      pass: false,
      reason: `failed: new-data-point-vs-parent — ${novelNumber.detail}`,
      checks,
    };
  }

  return {
    pass: true,
    checks,
  };
}

function checkEvidenceNumberOverlap(
  text: string,
  evidenceSummary: ResearchEvidenceSummary,
): { pass: boolean; detail: string } {
  const replyNumbers = extractNumericTokens(text);
  const evidenceNumbers = extractNumericTokens(
    `${Object.values(evidenceSummary.values).join(" ")} ${Object.values(evidenceSummary.derivedMetrics).join(" ")}`,
  );

  if (evidenceNumbers.length === 0) {
    return {
      pass: false,
      detail: "evidence summary exposed no numeric values to ground the reply",
    };
  }

  const overlap = replyNumbers.find((value) => evidenceNumbers.includes(value));
  return overlap
    ? {
        pass: true,
        detail: `reply reuses attested evidence number ${overlap}`,
      }
    : {
        pass: false,
        detail: "reply does not visibly reuse any numeric value from the attested evidence packet",
      };
}

function checkNovelNumberAgainstParent(
  text: string,
  parentText: string,
): { pass: boolean; detail: string } {
  const replyNumbers = extractNumericTokens(text);
  const parentNumbers = new Set(extractNumericTokens(parentText));
  const novel = replyNumbers.find((value) => !parentNumbers.has(value));

  return novel
    ? {
        pass: true,
        detail: `reply introduces new numeric value ${novel} not present in the parent`,
      }
    : {
        pass: false,
        detail: "reply restates the parent without adding a new visible numeric data point",
      };
}

function scoreReplyExperimentCandidate(input: {
  score: number;
  agreeCount: number;
  disagreeCount: number;
  flagCount: number;
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
  const controversyPenalty =
    (input.disagreeCount * 2)
    + (input.flagCount * 5)
    + (input.disagreeCount > input.agreeCount ? 10 : 0);

  return input.score + supportHeat + attestationBoost + freshnessBoost - controversyPenalty;
}

function findPattern(
  patterns: Array<{ name: string; pattern: RegExp; detail: string }>,
  text: string,
): { name: string; detail: string } | null {
  for (const entry of patterns) {
    if (entry.pattern.test(text)) {
      return {
        name: entry.name,
        detail: entry.detail,
      };
    }
  }
  return null;
}

function extractNumericTokens(text: string): string[] {
  return Array.from(
    new Set(
      (text.match(/\b\d[\d,]*(?:\.\d+)?%?\b/g) ?? [])
        .map((value) => value.replace(/,/g, "")),
    ),
  );
}

function sanitizeReplyExperimentText(text: string): string {
  return text
    .replace(/<\/?agent_post>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readAttestationUrls(record: Record<string, unknown>): string[] {
  const payload = record.payload;
  const entries = Array.isArray(record.sourceAttestations)
    ? record.sourceAttestations
    : Array.isArray((payload as { sourceAttestations?: unknown } | undefined)?.sourceAttestations)
      ? (payload as { sourceAttestations: unknown[] }).sourceAttestations
      : [];

  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      return readString((entry as Record<string, unknown>).url);
    })
    .filter((value): value is string => typeof value === "string" && value.length > 0);
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
    agree: readNumber(source.agree) ?? 0,
    disagree: readNumber(source.disagree) ?? 0,
    flag: readNumber(source.flag) ?? 0,
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNestedString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  return readString((value as Record<string, unknown>)[key]);
}

function readNestedNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  return readNumber((value as Record<string, unknown>)[key]);
}

function normalizeTimestamp(value: unknown): number | null {
  const raw = readNumber(value);
  if (raw == null) return null;
  return raw < 1_000_000_000_000 ? raw * 1000 : raw;
}
