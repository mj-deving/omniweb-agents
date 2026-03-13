/**
 * Source matcher — post-generation source verification.
 *
 * After LLM generates a post draft, `match()` verifies that a source from the
 * catalog actually substantiates the post's claims. This is the second pass of
 * the two-pass matching system (preflight → generate → match).
 *
 * Threshold: 50 (canonical, from unified-loop-architecture-v2.md)
 *
 * Import graph:
 *   matcher.ts → ./catalog.ts (types, tokenizeTopic, sourceTopicTokens)
 *   session-runner.ts → ./index.ts → matcher.ts
 */

import type { AttestationType } from "../attestation-policy.js";
import type { AgentSourceView, SourceRecordV2 } from "./catalog.js";
import { tokenizeTopic, sourceTopicTokens } from "./catalog.js";
import type { PreflightCandidate } from "./policy.js";

// ── Constants ───────────────────────────────────────

/** Canonical match threshold from unified plan */
const MATCH_THRESHOLD = 50;

/** Stopwords excluded from claim extraction */
const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "been", "will", "would", "could",
  "should", "their", "there", "these", "those", "about", "which", "when",
  "what", "more", "than", "very", "most", "also", "just", "into", "over",
  "such", "only", "some", "other", "each", "much", "between", "through",
  "after", "before", "while", "still", "might", "being", "does", "here",
]);

// ── Types ───────────────────────────────────────────

export interface MatchInput {
  topic: string;
  postText: string;
  postTags: string[];
  candidates: PreflightCandidate[];
  sourceView: AgentSourceView;
}

export interface MatchResult {
  pass: boolean;
  reason: string;
  reasonCode: "PASS" | "NO_POST_MATCH" | "MATCH_FETCH_FAILED" | "MATCH_THRESHOLD_NOT_MET";
  best?: {
    sourceId: string;
    method: AttestationType;
    url: string;
    score: number;
    matchedClaims: string[];
    evidence: string[];
  };
  considered: Array<{ sourceId: string; score?: number; error?: string }>;
}

// ── Claim Extraction ────────────────────────────────

/**
 * Extract key claims/terms from post text for source matching.
 * Uses token-based extraction (v1 — LLM-assisted in Phase 5).
 *
 * Extracts:
 * - Named entities (capitalized multi-word sequences)
 * - Numbers with context (percentages, dollar amounts)
 * - Topic-specific terms (tokens >= 4 chars that aren't stopwords)
 */
export function extractClaims(postText: string, postTags: string[]): string[] {
  const claims: string[] = [];

  // Extract capitalized phrases (potential named entities)
  const capitalizedPhrases = postText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];
  for (const phrase of capitalizedPhrases) {
    if (phrase.length >= 4) claims.push(phrase.toLowerCase());
  }

  // Extract numbers with context (e.g., "$1.2B", "45%", "2024")
  const numberContexts = postText.match(/\$[\d,.]+[BMKTbmkt]?|\d+(?:\.\d+)?%|\b\d{4}\b/g) || [];
  for (const nc of numberContexts) {
    claims.push(nc.toLowerCase());
  }

  // Extract significant tokens from text (>= 4 chars, not stopwords)
  const textTokens = postText
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));

  // Deduplicate and add unique tokens
  const seen = new Set(claims);
  for (const token of textTokens) {
    if (!seen.has(token)) {
      claims.push(token);
      seen.add(token);
    }
  }

  // Add post tags as claims
  for (const tag of postTags) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      claims.push(lower);
      seen.add(lower);
    }
  }

  return claims;
}

// ── Scoring ─────────────────────────────────────────

interface CandidateScore {
  sourceId: string;
  source: SourceRecordV2;
  method: AttestationType;
  url: string;
  score: number;
  matchedClaims: string[];
  evidence: string[];
}

/**
 * Score how well a source matches the post's claims.
 *
 * Scoring breakdown (0-100):
 * - Topic token overlap (0-40): how many post claims match source topics
 * - Domain tag overlap (0-20): how many post tags match source domain tags
 * - Provider relevance (0-20): if claims mention provider-specific terms
 * - Source name match (0-10): if source name matches significant claims
 * - Alias match bonus (0-10): if topicAliases match claims
 */
export function scoreMatch(
  claims: string[],
  source: SourceRecordV2,
  postTags: string[]
): CandidateScore & { matchedClaims: string[]; evidence: string[] } {
  const matched: string[] = [];
  const evidence: string[] = [];
  let score = 0;

  // Topic token overlap (0-40)
  const sourceTokens = sourceTopicTokens(source);
  const claimTokens = new Set(claims.map((c) => c.toLowerCase()));
  let topicOverlap = 0;
  for (const token of claimTokens) {
    if (sourceTokens.has(token)) {
      topicOverlap++;
      matched.push(token);
    }
  }
  const topicScore = claimTokens.size > 0
    ? Math.min(40, Math.round((topicOverlap / Math.min(claimTokens.size, 10)) * 40))
    : 0;
  score += topicScore;
  if (topicOverlap > 0) evidence.push(`${topicOverlap} topic token(s) matched`);

  // Domain tag overlap (0-20)
  const sourceDomainTags = new Set(source.domainTags.map((t) => t.toLowerCase()));
  let domainOverlap = 0;
  for (const tag of postTags) {
    if (sourceDomainTags.has(tag.toLowerCase())) {
      domainOverlap++;
      matched.push(tag.toLowerCase());
    }
  }
  const domainScore = Math.min(20, domainOverlap * 10);
  score += domainScore;
  if (domainOverlap > 0) evidence.push(`${domainOverlap} domain tag(s) matched`);

  // Provider relevance (0-20): check if claims mention provider-related terms
  const providerTerms: Record<string, string[]> = {
    "coingecko": ["crypto", "coin", "token", "market", "price"],
    "hn-algolia": ["tech", "software", "startup", "programming", "hacker"],
    "github": ["repository", "code", "open", "source", "developer"],
    "defillama": ["defi", "tvl", "protocol", "yield", "liquidity"],
    "binance": ["trading", "exchange", "pair", "volume"],
    "arxiv": ["paper", "research", "preprint", "study"],
    "wikipedia": ["encyclopedia", "article", "history"],
  };
  const relevantTerms = providerTerms[source.provider] || [];
  let providerOverlap = 0;
  for (const term of relevantTerms) {
    if (claimTokens.has(term)) providerOverlap++;
  }
  const providerScore = Math.min(20, providerOverlap * 5);
  score += providerScore;
  if (providerOverlap > 0) evidence.push(`${providerOverlap} provider-relevant term(s)`);

  // Source name match (0-10)
  const sourceName = source.name.toLowerCase();
  let nameMatch = 0;
  for (const claim of claims) {
    if (claim.length >= 4 && sourceName.includes(claim)) nameMatch++;
  }
  const nameScore = Math.min(10, nameMatch * 5);
  score += nameScore;
  if (nameMatch > 0) evidence.push(`${nameMatch} name match(es)`);

  // Alias match bonus (0-10)
  const aliasTokens = new Set<string>();
  for (const alias of source.topicAliases || []) {
    for (const tok of alias.toLowerCase().split(/[^a-z0-9]+/)) {
      if (tok.length >= 2) aliasTokens.add(tok);
    }
  }
  let aliasOverlap = 0;
  for (const token of claimTokens) {
    if (aliasTokens.has(token)) aliasOverlap++;
  }
  const aliasScore = Math.min(10, aliasOverlap * 5);
  score += aliasScore;
  if (aliasOverlap > 0) evidence.push(`${aliasOverlap} alias match(es)`);

  return {
    sourceId: source.id,
    source,
    method: source.tlsn_safe ? "TLSN" : "DAHR",
    url: source.url,
    score: Math.min(100, score),
    matchedClaims: matched,
    evidence,
  };
}

// ── Match ───────────────────────────────────────────

/**
 * Post-generation source matching.
 *
 * Verifies that at least one candidate source substantiates the post's claims.
 * Uses two-pass approach: preflight identified candidates, match() verifies
 * alignment with actual post content.
 *
 * If no candidate meets the threshold (50), returns pass=false with
 * reasonCode MATCH_THRESHOLD_NOT_MET. The session-runner should skip
 * publish with PUBLISH_NO_MATCHING_SOURCE observation.
 */
export function match(input: MatchInput): MatchResult {
  const { postText, postTags, candidates } = input;

  if (candidates.length === 0) {
    return {
      pass: false,
      reason: "No candidates from preflight",
      reasonCode: "NO_POST_MATCH",
      considered: [],
    };
  }

  // Extract claims from the generated post
  const claims = extractClaims(postText, postTags);
  if (claims.length === 0) {
    return {
      pass: false,
      reason: "No claims extracted from post text",
      reasonCode: "NO_POST_MATCH",
      considered: candidates.map((c) => ({ sourceId: c.sourceId })),
    };
  }

  // Score each candidate
  const scored: CandidateScore[] = [];
  const considered: MatchResult["considered"] = [];

  for (const candidate of candidates) {
    const result = scoreMatch(claims, candidate.source, postTags);
    // Use the candidate's resolved URL and method from preflight
    result.url = candidate.url;
    result.method = candidate.method;

    scored.push(result);
    considered.push({
      sourceId: candidate.sourceId,
      score: result.score,
    });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (best.score >= MATCH_THRESHOLD) {
    return {
      pass: true,
      reason: `Source "${best.source.name}" matches with score ${best.score}`,
      reasonCode: "PASS",
      best: {
        sourceId: best.sourceId,
        method: best.method,
        url: best.url,
        score: best.score,
        matchedClaims: best.matchedClaims,
        evidence: best.evidence,
      },
      considered,
    };
  }

  return {
    pass: false,
    reason: `Best source "${best.source.name}" scored ${best.score} (threshold: ${MATCH_THRESHOLD})`,
    reasonCode: "MATCH_THRESHOLD_NOT_MET",
    best: {
      sourceId: best.sourceId,
      method: best.method,
      url: best.url,
      score: best.score,
      matchedClaims: best.matchedClaims,
      evidence: best.evidence,
    },
    considered,
  };
}
