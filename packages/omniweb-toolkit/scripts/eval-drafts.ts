#!/usr/bin/env npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getStringArg, hasFlag } from "./_shared.js";

export type DraftCategory =
  | "ACTION"
  | "ALERT"
  | "ANALYSIS"
  | "FEED"
  | "OBSERVATION"
  | "OPINION"
  | "PREDICTION"
  | "QUESTION"
  | "SIGNAL"
  | "VOTE";

export type DraftTrack =
  | "ACTION"
  | "ALERT"
  | "ANALYSIS"
  | "OBSERVATION"
  | "PREDICTION"
  | "QUESTION"
  | "REPLY-ANALYSIS"
  | "SIGNAL";

export interface DraftAttestationInput {
  url?: string | null;
  shape?: string | null;
  status?: number | null;
  allowlisted?: boolean | null;
  jsonPathResolved?: boolean | null;
  prepared?: boolean | null;
  requireNormalizedJson?: boolean | null;
  contentType?: string | null;
}

export interface DraftInput {
  draft_id?: string;
  id?: string;
  category: string;
  text: string;
  attestation?: string | DraftAttestationInput | null;
  replyTo?: string | null;
  reply_to?: string | null;
  ownRecentTexts?: string[];
  recentTexts24h?: string[];
  anchorHints?: {
    assets?: string[];
    institutions?: string[];
  };
  metadata?: Record<string, unknown>;
}

export interface DraftEvalConfig {
  rubricVersion: string;
  liveCandidateMinScore: number;
  duplicateNgramSize: number;
  hardLengthMin: number;
  hardLengthMax: number;
  fillerAdverbs: string[];
  hedgeWords: string[];
  shieldPhrases: string[];
  assetTerms: string[];
  institutionTerms: string[];
  categoryProfiles: Record<DraftTrack, {
    band: [number, number];
    sweet: [number, number];
    preferredFrames: number;
    maxFrames: number;
  }>;
}

export interface SoftHit {
  code: string;
  delta: number;
  reason: string;
}

export interface DraftEvalRow {
  draft_id: string;
  category: string;
  track: DraftTrack | "INELIGIBLE";
  text: string;
  length: number;
  score_rubric: number;
  band: "hard-reject" | "rework" | "shape-eligible" | "perfect";
  hard_gates: Record<string, "pass" | "fail">;
  hard_fail_reasons: string[];
  soft_hits: Array<[string, string, string]>;
  anchors: {
    assets: string[];
    dollar: boolean;
    percent: boolean;
    numbersWithUnits: boolean;
    institutions: string[];
  };
  frames: number;
  opener: string;
  attestation: {
    url: string | null;
    shape: string | null;
    status: number | null;
    allowlisted: boolean | null;
    jsonPathResolved: boolean | null;
    prepared: boolean | null;
  };
  novelty: "deferred_to_live_check";
  decision:
    | "publish_candidate"
    | "rework"
    | "do_not_publish"
    | "ineligible_for_score_100_track";
}

export interface DraftEvalSummary {
  wave_id: string;
  generated_at: string;
  rubric_version: string;
  rows: DraftEvalRow[];
  band_counts: Record<string, number>;
  category_hit_rates: Record<string, string>;
  shortlist: DraftEvalRow[];
}

export const DEFAULT_EVAL_DRAFTS_CONFIG: DraftEvalConfig = {
  rubricVersion: "v1-2026-04-23",
  liveCandidateMinScore: 80,
  duplicateNgramSize: 5,
  hardLengthMin: 80,
  hardLengthMax: 1000,
  fillerAdverbs: ["notably", "importantly", "critically", "clearly", "indeed"],
  hedgeWords: [
    "may",
    "might",
    "could",
    "suggests",
    "suggest",
    "appears",
    "appears to",
    "seems",
    "likely",
    "possibly",
    "perhaps",
  ],
  shieldPhrases: [
    "shield alert",
  ],
  assetTerms: [
    "btc",
    "bitcoin",
    "eth",
    "ethereum",
    "sol",
    "solana",
    "usdt",
    "tether",
    "vix",
    "wti",
    "brent",
    "rrp",
    "walcl",
    "tga",
    "fed",
    "treasury",
    "2y",
    "10y",
    "yield curve",
    "curve",
  ],
  institutionTerms: ["federal reserve", "fed", "treasury", "cboe", "opec", "sec", "ecb", "eia"],
  categoryProfiles: {
    "REPLY-ANALYSIS": { band: [180, 320], sweet: [220, 280], preferredFrames: 2, maxFrames: 3 },
    ANALYSIS: { band: [150, 320], sweet: [200, 260], preferredFrames: 2, maxFrames: 3 },
    OBSERVATION: { band: [260, 680], sweet: [380, 520], preferredFrames: 3, maxFrames: 5 },
    PREDICTION: { band: [150, 300], sweet: [180, 240], preferredFrames: 2, maxFrames: 3 },
    QUESTION: { band: [150, 260], sweet: [180, 220], preferredFrames: 2, maxFrames: 3 },
    SIGNAL: { band: [150, 260], sweet: [180, 240], preferredFrames: 2, maxFrames: 3 },
    ACTION: { band: [150, 260], sweet: [180, 240], preferredFrames: 2, maxFrames: 3 },
    ALERT: { band: [150, 260], sweet: [180, 240], preferredFrames: 2, maxFrames: 3 },
  },
};

const SUPPORTED_CATEGORIES = new Set<DraftCategory>([
  "ACTION",
  "ALERT",
  "ANALYSIS",
  "FEED",
  "OBSERVATION",
  "OPINION",
  "PREDICTION",
  "QUESTION",
  "SIGNAL",
  "VOTE",
]);

const INELIGIBLE_CATEGORIES = new Set(["OPINION", "VOTE", "FEED"]);

export function mergeEvalDraftsConfig(
  override?: Partial<DraftEvalConfig>,
): DraftEvalConfig {
  if (!override) return DEFAULT_EVAL_DRAFTS_CONFIG;
  const mergedCategoryProfiles = Object.fromEntries(
    Object.entries(DEFAULT_EVAL_DRAFTS_CONFIG.categoryProfiles).map(([track, profile]) => [
      track,
      {
        ...profile,
        ...(override.categoryProfiles?.[track as DraftTrack] ?? {}),
      },
    ]),
  ) as DraftEvalConfig["categoryProfiles"];

  return {
    ...DEFAULT_EVAL_DRAFTS_CONFIG,
    ...override,
    fillerAdverbs: override.fillerAdverbs ?? DEFAULT_EVAL_DRAFTS_CONFIG.fillerAdverbs,
    hedgeWords: override.hedgeWords ?? DEFAULT_EVAL_DRAFTS_CONFIG.hedgeWords,
    shieldPhrases: override.shieldPhrases ?? DEFAULT_EVAL_DRAFTS_CONFIG.shieldPhrases,
    assetTerms: override.assetTerms ?? DEFAULT_EVAL_DRAFTS_CONFIG.assetTerms,
    institutionTerms: override.institutionTerms ?? DEFAULT_EVAL_DRAFTS_CONFIG.institutionTerms,
    categoryProfiles: mergedCategoryProfiles,
  };
}

export function evaluateDraftBatch(
  drafts: DraftInput[],
  config?: Partial<DraftEvalConfig>,
): DraftEvalSummary {
  const merged = mergeEvalDraftsConfig(config);
  const normalized = drafts.map((draft, index) => ({
    ...draft,
    draft_id: draft.draft_id ?? draft.id ?? `draft-${index + 1}`,
  }));
  const rows = normalized.map((draft, index) =>
    evaluateDraft(draft, {
      index,
      drafts: normalized,
      config: merged,
    }),
  );

  const shortlist = rows
    .filter((row) => row.score_rubric >= merged.liveCandidateMinScore && row.decision === "publish_candidate")
    .sort((a, b) => b.score_rubric - a.score_rubric || a.draft_id.localeCompare(b.draft_id))
    .slice(0, 10);

  const bandCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.band] = (acc[row.band] ?? 0) + 1;
    return acc;
  }, {});

  const categoryGroups = new Map<string, DraftEvalRow[]>();
  for (const row of rows) {
    const list = categoryGroups.get(row.category) ?? [];
    list.push(row);
    categoryGroups.set(row.category, list);
  }

  const categoryHitRates = Object.fromEntries(
    Array.from(categoryGroups.entries()).map(([category, entries]) => {
      const passing = entries.filter((entry) => entry.score_rubric >= merged.liveCandidateMinScore).length;
      return [category, `${passing} of ${entries.length} shape-eligible`];
    }),
  );

  return {
    wave_id: `dry-run-${new Date().toISOString().slice(0, 10)}`,
    generated_at: new Date().toISOString(),
    rubric_version: merged.rubricVersion,
    rows,
    band_counts: bandCounts,
    category_hit_rates: categoryHitRates,
    shortlist,
  };
}

export function evaluateDraft(
  draft: DraftInput & { draft_id: string },
  context: {
    index: number;
    drafts: Array<DraftInput & { draft_id: string }>;
    config: DraftEvalConfig;
  },
): DraftEvalRow {
  const { config, drafts, index } = context;
  const text = draft.text ?? "";
  const category = String(draft.category ?? "").toUpperCase();
  const length = text.trim().length;
  const track = deriveTrack(category, draft);
  const normalizedText = normalizeForComparison(text);
  const attestation = normalizeAttestation(draft.attestation);
  const anchors = extractAnchors(draft, config);
  const frames = countFrames(text);
  const opener = extractOpener(text);
  const stockOpener = normalizeForComparison(opener);
  const fillerCount = countWordHits(text, config.fillerAdverbs);
  const hedgeCount = countWordHits(text, config.hedgeWords);
  const shieldLookalike = isShieldLookalike(text, config);
  const siblingDuplicate = hasSiblingDuplicate(index, draft, drafts, config);
  const ownDuplicate = hasOwnDuplicate(draft, config);

  const hardGates: Record<string, "pass" | "fail"> = {
    G1: passesAttestation(attestation) ? "pass" : "fail",
    G2: SUPPORTED_CATEGORIES.has(category as DraftCategory) ? "pass" : "fail",
    G3: length >= config.hardLengthMin && length <= config.hardLengthMax ? "pass" : "fail",
    G4: INELIGIBLE_CATEGORIES.has(category) ? "fail" : "pass",
    G5: ownDuplicate ? "fail" : "pass",
    G6: siblingDuplicate ? "fail" : "pass",
    G7: shieldLookalike ? "fail" : "pass",
  };

  const hardFailReasons = collectHardFailReasons(hardGates);
  if (hardFailReasons.length > 0) {
    const decision = INELIGIBLE_CATEGORIES.has(category)
      ? "ineligible_for_score_100_track"
      : "do_not_publish";
    return {
      draft_id: draft.draft_id,
      category,
      track: INELIGIBLE_CATEGORIES.has(category) ? "INELIGIBLE" : track,
      text,
      length,
      score_rubric: hardRejectScore(hardGates),
      band: "hard-reject",
      hard_gates: hardGates,
      hard_fail_reasons: hardFailReasons,
      soft_hits: [],
      anchors,
      frames,
      opener,
      attestation,
      novelty: "deferred_to_live_check",
      decision,
    };
  }

  const profile = config.categoryProfiles[track];
  const softHits: SoftHit[] = [];
  let score = 60;

  const inSweet = between(length, profile.sweet[0], profile.sweet[1]);
  const inBand = between(length, profile.band[0], profile.band[1]);
  const openerFits = openerFitsTrack(track, text, anchors);
  const anchorOk = anchorsFitTrack(track, anchors, text);
  const frameOk = frames <= profile.preferredFrames;
  const frameOverCap = frames > profile.maxFrames;
  const voiceOk = hedgeCount === 0 || !startsWithHedgedMainVerb(text, config.hedgeWords);
  const throughLineOk = hasThroughLine(track, text);
  const predictionConfidence = hasPredictionConfidence(text);
  const predictionHorizon = hasPredictionHorizon(text);
  const questionTension = hasQuestionTension(text);
  const questionFirst = isQuestionFirst(text);
  const overrun = length > Math.floor(profile.sweet[1] * 1.2) && inBand;
  const stockOpenersInSession = countSessionOpenerMatches(stockOpener, drafts);

  if (inSweet) {
    score += addHit(softHits, "S1", 10, `length ${length} in ${profile.sweet[0]}-${profile.sweet[1]} sweet`);
  } else if (inBand) {
    score += addHit(softHits, "S2", -5, `length ${length} in band but outside sweet`);
  }

  if (openerFits) {
    score += addHit(softHits, "S3", 8, "opener shape fits category");
  } else {
    score += addHit(softHits, "S4", -8, "opener shape mismatches category track");
  }

  if (requiresNumericAnchor(track)) {
    if (anchorOk) {
      score += addHit(softHits, "S5", 6, "required anchor present");
    } else {
      score += addHit(softHits, "S6", -20, "required numeric/asset anchor missing");
    }
  } else if (track === "OBSERVATION") {
    if (anchors.institutions.length > 0 || anchors.assets.length > 0) {
      score += addHit(softHits, "S7", 6, "observation anchor present");
    }
  }

  if (frameOk) {
    score += addHit(softHits, "S8", 3, `frames=${frames} within preferred cap`);
  } else if (frameOverCap) {
    score += addHit(softHits, "S9", -8, `frames=${frames} over max ${profile.maxFrames}`);
  }

  if (voiceOk) {
    score += addHit(softHits, "S10", 3, "declarative voice");
  } else {
    score += addHit(softHits, "S11", -10, "hedged main verb voice");
  }

  if (throughLineOk) {
    score += addHit(softHits, "S12", 4, "through-line present");
  } else {
    score += addHit(softHits, "S13", -8, "through-line missing");
  }

  if (track === "PREDICTION") {
    score += predictionConfidence
      ? addHit(softHits, "S14", 8, "explicit confidence present")
      : addHit(softHits, "S15", -15, "explicit confidence missing");
    score += predictionHorizon
      ? addHit(softHits, "S16", 4, "explicit horizon present")
      : addHit(softHits, "S17", -10, "explicit horizon missing");
  }

  if (track === "QUESTION") {
    score += questionTension
      ? addHit(softHits, "S18", 4, "tension stated before question")
      : 0;
    score += questionFirst
      ? addHit(softHits, "S19", -6, "question-first opener")
      : 0;
  }

  if (fillerCount === 0) {
    score += addHit(softHits, "S20", 2, "no filler adverbs");
  } else {
    score += addHit(softHits, "S21", -2 * fillerCount, `${fillerCount} filler adverb(s)`);
  }

  if (hedgeCount <= 2) {
    score += addHit(softHits, "S22", 2, `hedge density ${hedgeCount}`);
  }

  if (stockOpenersInSession > 1) {
    score += addHit(softHits, "S23", -6, "stock opener reused");
  }

  if (overrun) {
    score += addHit(softHits, "P_OVER", -4, "length over 1.2x sweet max");
  }

  if (shieldLookalike) {
    score += addHit(softHits, "P_SHIELD", -12, "shield-alert lookalike");
  }

  if (hedgeCount > 2) {
    score += addHit(softHits, "P_HEDGE", -4, `hedge density ${hedgeCount} > 2`);
  }

  const boundedScore = Math.max(0, Math.min(90, score));
  const band = boundedScore >= 90
    ? "perfect"
    : boundedScore >= 80
      ? "shape-eligible"
      : "rework";

  return {
    draft_id: draft.draft_id,
    category,
    track,
    text,
    length,
    score_rubric: boundedScore,
    band,
    hard_gates: hardGates,
    hard_fail_reasons: hardFailReasons,
    soft_hits: softHits.map((hit) => [hit.code, hit.delta > 0 ? `+${hit.delta}` : `${hit.delta}`, hit.reason]),
    anchors,
    frames,
    opener,
    attestation,
    novelty: "deferred_to_live_check",
    decision: boundedScore >= config.liveCandidateMinScore ? "publish_candidate" : boundedScore >= 60 ? "rework" : "do_not_publish",
  };
}

function deriveTrack(category: string, draft: DraftInput): DraftTrack {
  const hasReply = Boolean(draft.replyTo ?? draft.reply_to);
  if (category === "ANALYSIS" && hasReply) return "REPLY-ANALYSIS";
  if (category === "ANALYSIS") return "ANALYSIS";
  if (category === "OBSERVATION") return "OBSERVATION";
  if (category === "PREDICTION") return "PREDICTION";
  if (category === "QUESTION") return "QUESTION";
  if (category === "SIGNAL") return "SIGNAL";
  if (category === "ACTION") return "ACTION";
  return "ALERT";
}

function normalizeAttestation(input: DraftInput["attestation"]): DraftEvalRow["attestation"] {
  if (typeof input === "string") {
    return {
      url: input,
      shape: null,
      status: null,
      allowlisted: null,
      jsonPathResolved: null,
      prepared: null,
    };
  }
  return {
    url: input?.url ?? null,
    shape: input?.shape ?? null,
    status: input?.status ?? null,
    allowlisted: input?.allowlisted ?? null,
    jsonPathResolved: input?.jsonPathResolved ?? null,
    prepared: input?.prepared ?? null,
  };
}

function passesAttestation(attestation: DraftEvalRow["attestation"]): boolean {
  return Boolean(attestation.url)
    && (attestation.shape === null || attestation.shape.toLowerCase().includes("json"))
    && (attestation.status === null || (attestation.status >= 200 && attestation.status < 400))
    && attestation.allowlisted !== false
    && attestation.jsonPathResolved !== false
    && attestation.prepared !== false;
}

function collectHardFailReasons(hardGates: Record<string, "pass" | "fail">): string[] {
  const reasons: Record<string, string> = {
    G1: "no_attest",
    G2: "bad_category",
    G3: "length_out_of_bounds",
    G4: "dead_category",
    G5: "own_duplicate",
    G6: "sibling_duplicate",
    G7: "shield_lookalike",
  };
  return Object.entries(hardGates)
    .filter(([, status]) => status === "fail")
    .map(([gate]) => reasons[gate] ?? gate.toLowerCase());
}

function hardRejectScore(hardGates: Record<string, "pass" | "fail">): number {
  const passCount = Object.values(hardGates).filter((value) => value === "pass").length;
  return Math.min(19, passCount * 2 + 5);
}

function extractAnchors(draft: DraftInput, config: DraftEvalConfig): DraftEvalRow["anchors"] {
  const text = draft.text ?? "";
  const normalized = text.toLowerCase();
  const hintedAssets = draft.anchorHints?.assets ?? [];
  const hintedInstitutions = draft.anchorHints?.institutions ?? [];
  const explicitAssets = config.assetTerms.filter((term) => hasWord(normalized, term));
  const explicitInstitutions = config.institutionTerms.filter((term) => hasWord(normalized, term));
  const tokenAssets = Array.from(new Set([
    ...extractUppercaseTokens(text),
    ...extractMetricLikeTokens(text),
  ]));
  const institutions = Array.from(new Set([
    ...hintedInstitutions,
    ...explicitInstitutions,
    ...extractProperNounPhrases(text).filter((phrase) => phrase.split(" ").length <= 3),
  ]));
  const assets = Array.from(new Set([
    ...hintedAssets,
    ...explicitAssets,
    ...tokenAssets,
  ]));
  return {
    assets,
    dollar: /\$\s?\d[\d,.]*(?:\s?[kmbt])?/i.test(text),
    percent: /\b\d+(?:\.\d+)?%/.test(text),
    numbersWithUnits: /\b\d+(?:\.\d+)?\s?(?:bp|bps|billion|million|trillion|hours?|hrs?|days?|weeks?|months?|years?|usd)\b/i.test(text),
    institutions,
  };
}

function countFrames(text: string): number {
  const sentences = text
    .split(/(?<!\d)[.!?]+(?!\d)/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const connectors = (text.match(/\b(?:but|while|because|instead|yet|although|however|which means|that means)\b/gi) ?? []).length;
  return Math.max(1, sentences + Math.min(2, connectors));
}

function extractOpener(text: string): string {
  const trimmed = text.trim();
  const sentence = trimmed.split(/(?<!\d)[.!?]+(?!\d)/)[0] ?? trimmed;
  return sentence.slice(0, 120).trim();
}

function openerFitsTrack(track: DraftTrack, text: string, anchors: DraftEvalRow["anchors"]): boolean {
  const opener = extractOpener(text);
  const first = opener.toLowerCase();
  const hasNumber = /\d/.test(opener);
  const startsNarrative = /^(the|this|that|these|those)\b/.test(first) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/.test(opener);
  const dualAnchor = /\b[A-Z][A-Za-z0-9.+-]*\s+and\s+[A-Z][A-Za-z0-9.+-]*/.test(opener);
  const questionLast = text.trim().endsWith("?") && !opener.trim().startsWith("?");
  switch (track) {
    case "REPLY-ANALYSIS":
      return (anchors.assets.length > 0 && hasNumber) || dualAnchor || /\b(is|are|shows|prints|sits|trades)\b/i.test(opener);
    case "ANALYSIS":
      return hasNumber && (anchors.assets.length > 0 || /\b(is|are|shows|prints|sits|trades)\b/i.test(opener));
    case "OBSERVATION":
      return startsNarrative;
    case "PREDICTION":
      return /^prediction:/i.test(first) || (anchors.assets.length > 0 && /\b(?:remain|stay|close|finish|trade|hold)\b/i.test(opener));
    case "QUESTION":
      return questionLast && !isQuestionFirst(text);
    case "SIGNAL":
    case "ACTION":
    case "ALERT":
      return hasNumber || startsNarrative;
    default:
      return false;
  }
}

function anchorsFitTrack(track: DraftTrack, anchors: DraftEvalRow["anchors"], text: string): boolean {
  switch (track) {
    case "REPLY-ANALYSIS":
      return anchors.assets.length > 0 && (anchors.percent || anchors.dollar);
    case "ANALYSIS":
      return anchors.percent || anchors.dollar || anchors.numbersWithUnits;
    case "PREDICTION":
      return anchors.assets.length > 0 && hasThresholdLanguage(text);
    case "QUESTION":
      return anchors.assets.length > 0 && anchors.percent;
    case "SIGNAL":
    case "ACTION":
    case "ALERT":
      return anchors.assets.length > 0 || anchors.percent || anchors.dollar || anchors.numbersWithUnits;
    default:
      return anchors.institutions.length > 0 || anchors.assets.length > 0;
  }
}

function requiresNumericAnchor(track: DraftTrack): boolean {
  return track !== "OBSERVATION";
}

function startsWithHedgedMainVerb(text: string, hedgeWords: string[]): boolean {
  const opener = extractOpener(text).toLowerCase();
  return hedgeWords.some((word) => opener.startsWith(word));
}

function hasThroughLine(track: DraftTrack, text: string): boolean {
  const lower = text.toLowerCase();
  if (track === "ANALYSIS" || track === "REPLY-ANALYSIS") {
    return /\b(but|while|instead|which means|that means|so |therefore|because)\b/.test(lower);
  }
  if (track === "OBSERVATION") {
    return /\b(while|as|after|before|with|through)\b/.test(lower) || countFrames(text) >= 2;
  }
  if (track === "PREDICTION") {
    return hasThresholdLanguage(text) && /\b(which|because|if|as)\b/i.test(text);
  }
  if (track === "QUESTION") {
    return hasQuestionTension(text);
  }
  return true;
}

function hasPredictionConfidence(text: string): boolean {
  return /\b(?:confidence:? ?\d{1,3}%|\d{1,3}% confidence)\b/i.test(text);
}

function hasPredictionHorizon(text: string): boolean {
  return /\b(?:within|over|in the next)\s+\d+\s?(?:m|min|minutes?|h|hr|hours?|d|days?|w|weeks?|q|quarters?)\b/i.test(text)
    || /\b(?:today|tomorrow|this week|this month|this quarter)\b/i.test(text);
}

function hasThresholdLanguage(text: string): boolean {
  return /\b(?:above|below|over|under|at least|at most|remain above|remain below|stay above|stay below)\b/i.test(text)
    || /\$\s?\d/.test(text);
}

function hasQuestionTension(text: string): boolean {
  return text.trim().endsWith("?") && /\b(?:but|while|yet|instead|after|despite)\b/i.test(text);
}

function isQuestionFirst(text: string): boolean {
  const opener = extractOpener(text).trim();
  return opener.endsWith("?") || opener.startsWith("why ") || opener.startsWith("what ") || opener.startsWith("how ");
}

function countWordHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.reduce((sum, word) => sum + (hasWord(lower, word) ? 1 : 0), 0);
}

function extractUppercaseTokens(text: string): string[] {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/\b[A-Z]{2,10}\b/g))
        .map((match) => match[0])
        .filter((token) => !/^(AND|THE|FOR|WITH|THIS|THAT)$/.test(token)),
    ),
  );
}

function extractMetricLikeTokens(text: string): string[] {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/\b(?:[A-Z][a-z]+|[A-Z]{2,10})(?:\s+(?:curve|yields?|spread|supply|funding|debt|notes?|bonds?|vol|volatility))?\b/g))
        .map((match) => match[0])
        .filter((token) => /\b(?:[A-Z]{2,10}|Bitcoin|Ethereum|Solana|Tether|Treasury|Fed|VIX|Brent|WTI)\b/.test(token)),
    ),
  );
}

function extractProperNounPhrases(text: string): string[] {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g))
        .map((match) => match[0])
        .filter((token) => token.length > 2),
    ),
  );
}

function hasWord(normalizedText: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(normalizedText);
}

function isShieldLookalike(text: string, config: DraftEvalConfig): boolean {
  const lower = text.toLowerCase();
  return config.shieldPhrases.some((phrase) => lower.includes(phrase));
}

function hasSiblingDuplicate(
  currentIndex: number,
  draft: DraftInput & { draft_id: string },
  drafts: Array<DraftInput & { draft_id: string }>,
  config: DraftEvalConfig,
): boolean {
  const target = normalizedNgrams(draft.text, config.duplicateNgramSize);
  return drafts.some((entry, entryIndex) => entryIndex !== currentIndex && intersects(target, normalizedNgrams(entry.text, config.duplicateNgramSize)));
}

function hasOwnDuplicate(
  draft: DraftInput,
  config: DraftEvalConfig,
): boolean {
  const recentTexts = draft.ownRecentTexts ?? draft.recentTexts24h ?? [];
  const target = normalizedNgrams(draft.text, config.duplicateNgramSize);
  return recentTexts.some((text) => intersects(target, normalizedNgrams(text, config.duplicateNgramSize)));
}

function normalizedNgrams(text: string, size: number): Set<string> {
  const tokens = normalizeForComparison(text).split(/\s+/).filter(Boolean);
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9%$.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function intersects(left: Set<string>, right: Set<string>): boolean {
  for (const entry of left) {
    if (right.has(entry)) return true;
  }
  return false;
}

function addHit(hits: SoftHit[], code: string, delta: number, reason: string): number {
  hits.push({ code, delta, reason });
  return delta;
}

function countSessionOpenerMatches(opener: string, drafts: DraftInput[]): number {
  if (!opener) return 0;
  return drafts.filter((draft) => normalizeForComparison(extractOpener(draft.text)) === opener).length;
}

function between(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function parseConfig(raw: unknown): Partial<DraftEvalConfig> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Config must be a JSON object");
  }
  return raw as Partial<DraftEvalConfig>;
}

function parseDrafts(raw: unknown): DraftInput[] {
  if (!Array.isArray(raw)) {
    throw new Error("Draft input must be a JSON array");
  }
  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Each draft must be an object");
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.text !== "string" || record.text.trim() === "") {
      throw new Error(`Draft ${index + 1} must include a non-empty string text`);
    }
    if (typeof record.category !== "string" || record.category.trim() === "") {
      throw new Error(`Draft ${index + 1} must include a non-empty string category`);
    }
  }
  return raw as DraftInput[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, "--help", "-h")) {
    console.log(`Usage: npx tsx scripts/eval-drafts.ts --in PATH [--config PATH] [--out PATH]

Evaluate dry-run drafts against the 2026-04-23 offline rubric.

Options:
  --in PATH      Input JSON array of draft objects
  --config PATH  Optional config override JSON
  --out PATH     Also write output JSON to PATH
  --help, -h     Show this help

Output: JSON scorecard summary
Exit codes: 0 = success, 2 = invalid args/input`);
    process.exit(0);
  }

  const inputPath = getStringArg(args, "--in");
  const configPath = getStringArg(args, "--config");
  const outPath = getStringArg(args, "--out");
  if (!inputPath) {
    console.error("Error: --in PATH is required");
    process.exit(2);
  }

  const unknownArgs = args.filter((arg, index) => {
    if (["--in", "--config", "--out"].includes(arg)) return false;
    if (index > 0 && ["--in", "--config", "--out"].includes(args[index - 1] ?? "")) return false;
    return !["--help", "-h"].includes(arg);
  });
  if (unknownArgs.length > 0) {
    console.error(`Error: unknown argument(s): ${unknownArgs.join(", ")}`);
    process.exit(2);
  }

  let drafts: DraftInput[];
  let config: Partial<DraftEvalConfig> | undefined;
  try {
    drafts = parseDrafts(JSON.parse(readFileSync(resolve(inputPath), "utf8")) as unknown);
    config = configPath
      ? parseConfig(JSON.parse(readFileSync(resolve(configPath), "utf8")) as unknown)
      : undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: invalid input/config: ${message}`);
    process.exit(2);
  }
  const summary = evaluateDraftBatch(drafts, config);
  const body = JSON.stringify(summary, null, 2);

  if (outPath) {
    const resolved = resolve(outPath);
    mkdirSync(dirname(resolved), { recursive: true });
    writeFileSync(resolved, `${body}\n`, "utf8");
  }

  console.log(body);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
