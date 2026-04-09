/**
 * Agent Compiler — Zod schema for AgentIntentConfig validation.
 */
import { z } from "zod";
import type { AgentIntentConfig } from "./types.js";

const CoreCategorySchema = z.enum([
  "colony-feeds",
  "colony-signals",
  "threads",
  "engagement",
]);

const DomainCategorySchema = z.enum([
  "oracle",
  "leaderboard",
  "prices",
  "predictions",
]);

const MetaCategorySchema = z.enum(["verification", "network"]);

const TippingTriggerSchema = z.enum([
  "answered-our-question",
  "provided-intel",
  "cited-our-work",
  "corrected-us",
  "early-quality",
]);

const VALID_RULE_NAMES = [
  "publish_to_gaps", "publish_signal_aligned", "publish_on_divergence",
  "publish_prediction", "reply_with_evidence", "engage_verified",
  "engage_novel_agent", "tip_valuable", "vote_on_pool", "bet_on_prediction",
] as const;

const RuleSchema = z.object({
  name: z.enum(VALID_RULE_NAMES),
  priority: z.number().int().min(0).max(100),
  enabled: z.boolean(),
});

const BudgetSchema = z.object({
  maxTipPerAction: z.number().nonnegative(),
  maxTipPerDay: z.number().nonnegative(),
  maxBetPerDay: z.number().nonnegative(),
  maxDahrPerDay: z.number().nonnegative(),
  maxDemPerDay: z.number().nonnegative(),
  minBalanceFloor: z.number().nonnegative(),
});

const TippingSchema = z.object({
  mode: z.enum(["strategic", "off"]),
  triggers: z.array(TippingTriggerSchema),
});

const PredictionsSchema = z.object({
  mode: z.enum(["active", "conservative", "off"]),
  minConfidence: z.number().int().min(0).max(100),
});

const AttestationSchema = z.object({
  method: z.enum(["dahr", "tlsn"]),
  tlsnTriggers: z.array(z.string()).optional(),
});

const RateLimitsSchema = z.object({
  postsPerDay: z.number().int().positive().transform(v => Math.min(v, 14)),
  postsPerHour: z.number().int().positive().transform(v => Math.min(v, 5)),
  reactionsPerSession: z.number().int().positive(),
  maxTipAmount: z.number().positive().transform(v => Math.min(v, 10)),
});

const ModelsSchema = z.object({
  scan: z.enum(["haiku", "none"]),
  analyze: z.enum(["haiku", "sonnet"]),
  draft: z.enum(["haiku", "sonnet"]),
});

export const AgentIntentConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Must be kebab-case"),
  label: z.string().min(1),
  description: z.string().min(1),
  evidenceCategories: z.object({
    core: z.array(CoreCategorySchema).min(1),
    domain: z.array(DomainCategorySchema),
    meta: z.array(MetaCategorySchema),
  }),
  rules: z.array(RuleSchema).min(1),
  budget: BudgetSchema,
  tipping: TippingSchema,
  predictions: PredictionsSchema,
  attestation: AttestationSchema,
  primaryCategories: z.array(z.string()).min(1),
  topicWeights: z.record(z.string(), z.number()),
  rateLimits: RateLimitsSchema,
  intervalMs: z.number().int().positive(),
  historyRetentionHours: z.number().int().positive(),
  models: ModelsSchema,
  thresholds: z.record(z.string(), z.record(z.string(), z.union([z.number(), z.string()]))),
});

/**
 * Validate a parsed object against the AgentIntentConfig schema.
 * Returns the validated config or throws on validation failure.
 */
export function validateIntentConfig(input: unknown): AgentIntentConfig {
  const result = AgentIntentConfigSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid AgentIntentConfig: ${result.error.message}`);
  }
  return result.data as AgentIntentConfig;
}
