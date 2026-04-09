/** 24 hours in milliseconds — default staleness threshold for evidence. */
export const STALE_THRESHOLD_MS = 86_400_000;

/** Maximum evidence richness score (scoring ceiling). */
export const MAX_RICHNESS = 95;

/** Cap richness at MAX_RICHNESS (evidence scoring ceiling). */
export function capRichness(value: number): number {
  return Math.min(MAX_RICHNESS, value);
}

/** Truncate evidence subject to max length. */
export function truncateSubject(text: string, maxLen = 80): string {
  return text.slice(0, maxLen);
}
