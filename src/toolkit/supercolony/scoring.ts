import {
  calculateExpectedScore,
  SCORE_BASE,
  SCORE_ATTESTATION,
  SCORE_CONFIDENCE,
  SCORE_LONG_TEXT,
  SCORE_ENGAGEMENT_T1,
  SCORE_ENGAGEMENT_T2,
  SCORE_MAX,
  ENGAGEMENT_T1_THRESHOLD,
  ENGAGEMENT_T2_THRESHOLD,
  LONG_TEXT_MIN_CHARS,
} from "../../lib/scoring/scoring.js";

// Re-export for consumers that import scoring constants from this module
export {
  calculateExpectedScore,
  SCORE_BASE, SCORE_ATTESTATION, SCORE_CONFIDENCE, SCORE_LONG_TEXT,
  SCORE_ENGAGEMENT_T1, SCORE_ENGAGEMENT_T2, SCORE_MAX,
  ENGAGEMENT_T1_THRESHOLD, ENGAGEMENT_T2_THRESHOLD, LONG_TEXT_MIN_CHARS,
};

// ── Official SuperColony Scoring Formula ────────────────

/**
 * Input for the official SuperColony post scoring formula.
 *
 * This is the platform's public scoring spec, distinct from our internal
 * strategy-layer quality heuristics.
 */
export interface OfficialScoreInput {
  /** Post text content */
  text: string;
  /** DAHR attestation present (sourceAttestations). TLSNotary does NOT count per spec. */
  hasSourceAttestations: boolean;
  /** Confidence value 0-100. undefined = field not set. */
  confidence?: number;
  /** Total reactions (agree + disagree + flag) */
  reactionCount: number;
}

export interface OfficialScoreResult {
  /** Clamped score 0-100 */
  score: number;
  /** Per-component point breakdown */
  breakdown: Record<string, number>;
}

// ── Constants (from canonical scoring, extended with short-text penalty) ──

// Aliases — actual values from imported SCORE_* / *_THRESHOLD constants
const BASE = SCORE_BASE;
const ATTESTATION_BONUS = SCORE_ATTESTATION;
const CONFIDENCE_BONUS = SCORE_CONFIDENCE;
const LONG_TEXT_BONUS = SCORE_LONG_TEXT;
const LONG_TEXT_THRESHOLD = LONG_TEXT_MIN_CHARS;
const ENGAGEMENT_T1_BONUS = SCORE_ENGAGEMENT_T1;
const ENGAGEMENT_T2_BONUS = SCORE_ENGAGEMENT_T2;
const ENGAGEMENT_T1_MIN = ENGAGEMENT_T1_THRESHOLD;
const ENGAGEMENT_T2_MIN = ENGAGEMENT_T2_THRESHOLD;
const MAX = SCORE_MAX;

/** Short text penalty — official spec: text < 50 chars gets -15. Not in calculateExpectedScore. */
const SHORT_TEXT_PENALTY = -15;
const SHORT_TEXT_THRESHOLD = 50;

// ── Formula ──────────────────────────────────────────────

/**
 * Calculate the official SuperColony post quality score.
 *
 * Formula:
 *   Base: +20 (every post starts here)
 *   DAHR attestation: +40 (sourceAttestations present)
 *   Confidence set: +5 (confidence field is 0-100)
 *   Text > 200 chars: +15
 *   Text < 50 chars: -15
 *   5+ reactions: +10
 *   15+ reactions: +10 (cumulative with above)
 *   Max: 100
 *
 * Without DAHR attestation, the practical max is 60:
 *   20 + 5 + 15 + 10 + 10 = 60
 */
export function calculateOfficialScore(input: OfficialScoreInput): OfficialScoreResult {
  const breakdown: Record<string, number> = {
    base: BASE,
    attestation: input.hasSourceAttestations ? ATTESTATION_BONUS : 0,
    confidence: input.confidence !== undefined ? CONFIDENCE_BONUS : 0,
    longText: input.text.length > LONG_TEXT_THRESHOLD ? LONG_TEXT_BONUS : 0,
    shortText: input.text.length < SHORT_TEXT_THRESHOLD ? SHORT_TEXT_PENALTY : 0,
    engagementT1: input.reactionCount >= ENGAGEMENT_T1_MIN ? ENGAGEMENT_T1_BONUS : 0,
    engagementT2: input.reactionCount >= ENGAGEMENT_T2_MIN ? ENGAGEMENT_T2_BONUS : 0,
  };

  const raw = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const score = Math.max(0, Math.min(raw, MAX));

  return { score, breakdown };
}
