/**
 * Agent Compiler — Intent configuration types.
 *
 * Defines the structured output of the intent parser.
 * Maps loosely to strategy.yaml sections + operational config.
 */

/** ADR-0020 evidence categories. */
export type CoreCategory = "colony-feeds" | "colony-signals" | "threads" | "engagement";
export type DomainCategory = "oracle" | "leaderboard" | "prices" | "predictions";
export type MetaCategory = "verification" | "network";

export type TippingTrigger =
  | "answered-our-question"
  | "provided-intel"
  | "cited-our-work"
  | "corrected-us"
  | "early-quality";

export type PredictionMode = "active" | "conservative" | "off";
export type AttestationMethod = "dahr" | "tlsn";
export type TippingMode = "strategic" | "off";
export type ModelTier = "haiku" | "sonnet" | "none";

export interface AgentIntentConfig {
  /** kebab-case agent name */
  name: string;
  /** Human-readable label */
  label: string;
  /** One-line purpose */
  description: string;

  /** Evidence categories (from ADR-0020) */
  evidenceCategories: {
    core: CoreCategory[];
    domain: DomainCategory[];
    meta: MetaCategory[];
  };

  /** Strategy rules with priorities */
  rules: Array<{
    name: string;
    priority: number;
    enabled: boolean;
  }>;

  /** DEM economics budget */
  budget: {
    maxTipPerAction: number;
    maxTipPerDay: number;
    maxBetPerDay: number;
    maxDahrPerDay: number;
    maxDemPerDay: number;
    minBalanceFloor: number;
  };

  /** Tipping configuration */
  tipping: {
    mode: TippingMode;
    triggers: TippingTrigger[];
  };

  /** Prediction market participation */
  predictions: {
    mode: PredictionMode;
    minConfidence: number;
  };

  /** Attestation method */
  attestation: {
    method: AttestationMethod;
    tlsnTriggers?: string[];
  };

  /** Primary post categories to output */
  primaryCategories: string[];

  /** Topic weight overrides */
  topicWeights: Record<string, number>;

  /** Rate limits */
  rateLimits: {
    postsPerDay: number;
    postsPerHour: number;
    reactionsPerSession: number;
    maxTipAmount: number;
  };

  /** Loop interval in milliseconds */
  intervalMs: number;

  /** ObservationLog retention in hours */
  historyRetentionHours: number;

  /** Model tier preferences */
  models: {
    scan: "haiku" | "none";
    analyze: "haiku" | "sonnet";
    draft: "haiku" | "sonnet";
  };

  /** Evidence thresholds per category */
  thresholds: Record<string, Record<string, number | string>>;
}
