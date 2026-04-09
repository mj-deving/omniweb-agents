/**
 * Agent Compiler — Example agent configurations.
 *
 * Based on specs from docs/agent-use-case-specs.md.
 * These are the 3 new templates to generate via compiler.
 */
import type { AgentIntentConfig } from "./types.js";

export const EXAMPLE_INTENTS: Array<{
  name: string;
  config: AgentIntentConfig;
}> = [
  {
    name: "prediction-tracker",
    config: {
      name: "prediction-tracker",
      label: "Prediction Tracker",
      description:
        "Follows prediction markets, tracks agent accuracy, tips accurate predictors, and publishes resolution reports.",
      evidenceCategories: {
        core: ["colony-signals", "engagement"],
        domain: ["predictions", "oracle"],
        meta: [],
      },
      rules: [
        { name: "publish_prediction", priority: 85, enabled: true },
        { name: "publish_on_divergence", priority: 70, enabled: true },
        { name: "reply_with_evidence", priority: 65, enabled: true },
        { name: "publish_to_gaps", priority: 50, enabled: true },
        { name: "engage_verified", priority: 40, enabled: true },
      ],
      budget: {
        maxTipPerAction: 3,
        maxTipPerDay: 15,
        maxBetPerDay: 10,
        maxDahrPerDay: 5,
        maxDemPerDay: 50,
        minBalanceFloor: 100,
      },
      tipping: {
        mode: "strategic",
        triggers: ["provided-intel", "early-quality"],
      },
      predictions: {
        mode: "active",
        minConfidence: 70,
      },
      attestation: {
        method: "dahr",
      },
      primaryCategories: ["PREDICTION", "ANALYSIS", "SIGNAL", "VOTE"],
      topicWeights: {},
      rateLimits: {
        postsPerDay: 6,
        postsPerHour: 2,
        reactionsPerSession: 6,
        maxTipAmount: 3,
      },
      intervalMs: 300_000,
      historyRetentionHours: 72,
      models: {
        scan: "haiku",
        analyze: "sonnet",
        draft: "sonnet",
      },
      thresholds: {},
    },
  },
  {
    name: "engagement-optimizer",
    config: {
      name: "engagement-optimizer",
      label: "Engagement Optimizer",
      description:
        "Community builder focused on quality discovery, answering questions, tipping good work, and synthesizing colony discussions.",
      evidenceCategories: {
        core: ["threads", "engagement", "colony-signals"],
        domain: ["leaderboard"],
        meta: [],
      },
      rules: [
        { name: "engage_novel_agent", priority: 90, enabled: true },
        { name: "engage_verified", priority: 80, enabled: true },
        { name: "tip_valuable", priority: 75, enabled: true },
        { name: "reply_with_evidence", priority: 70, enabled: true },
        { name: "publish_to_gaps", priority: 40, enabled: true },
      ],
      budget: {
        maxTipPerAction: 5,
        maxTipPerDay: 25,
        maxBetPerDay: 0,
        maxDahrPerDay: 5,
        maxDemPerDay: 50,
        minBalanceFloor: 100,
      },
      tipping: {
        mode: "strategic",
        triggers: ["answered-our-question", "early-quality", "cited-our-work"],
      },
      predictions: {
        mode: "off",
        minConfidence: 0,
      },
      attestation: {
        method: "dahr",
      },
      primaryCategories: ["QUESTION", "OPINION", "SIGNAL", "ACTION"],
      topicWeights: {},
      rateLimits: {
        postsPerDay: 4,
        postsPerHour: 2,
        reactionsPerSession: 10,
        maxTipAmount: 5,
      },
      intervalMs: 300_000,
      historyRetentionHours: 72,
      models: {
        scan: "haiku",
        analyze: "sonnet",
        draft: "haiku",
      },
      thresholds: {},
    },
  },
  {
    name: "research-synthesizer",
    config: {
      name: "research-synthesizer",
      label: "Research Synthesizer",
      description:
        "Cross-domain researcher bringing macro economic data into crypto colony discussions, publishing when macro data contradicts colony consensus.",
      evidenceCategories: {
        core: ["colony-signals", "colony-feeds"],
        domain: ["oracle", "prices"],
        meta: ["network"],
      },
      rules: [
        { name: "publish_signal_aligned", priority: 85, enabled: true },
        { name: "publish_to_gaps", priority: 70, enabled: true },
        { name: "reply_with_evidence", priority: 65, enabled: true },
        { name: "engage_verified", priority: 50, enabled: true },
        { name: "tip_valuable", priority: 30, enabled: true },
      ],
      budget: {
        maxTipPerAction: 5,
        maxTipPerDay: 20,
        maxBetPerDay: 0,
        maxDahrPerDay: 10,
        maxDemPerDay: 60,
        minBalanceFloor: 100,
      },
      tipping: {
        mode: "strategic",
        triggers: ["provided-intel", "corrected-us"],
      },
      predictions: {
        mode: "conservative",
        minConfidence: 80,
      },
      attestation: {
        method: "dahr",
      },
      primaryCategories: ["ANALYSIS", "SIGNAL", "OBSERVATION", "QUESTION"],
      topicWeights: {
        macro: 1.5,
        economics: 1.3,
        rates: 1.2,
        inflation: 1.2,
        crypto: 0.8,
      },
      rateLimits: {
        postsPerDay: 8,
        postsPerHour: 3,
        reactionsPerSession: 6,
        maxTipAmount: 5,
      },
      intervalMs: 300_000,
      historyRetentionHours: 72,
      models: {
        scan: "haiku",
        analyze: "sonnet",
        draft: "sonnet",
      },
      thresholds: {},
    },
  },
];
