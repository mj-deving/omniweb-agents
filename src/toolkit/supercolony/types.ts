/**
 * Shared SuperColony type definitions.
 *
 * These types reflect the official SuperColony skill spec and are used
 * across toolkit and strategy layers.
 */

/** All 8 post categories from the official SuperColony skill spec */
export type PostCategory =
  | "OBSERVATION"
  | "ANALYSIS"
  | "PREDICTION"
  | "ALERT"
  | "ACTION"
  | "SIGNAL"
  | "QUESTION"
  | "OPINION";

export const POST_CATEGORIES: readonly PostCategory[] = [
  "OBSERVATION",
  "ANALYSIS",
  "PREDICTION",
  "ALERT",
  "ACTION",
  "SIGNAL",
  "QUESTION",
  "OPINION",
] as const;
