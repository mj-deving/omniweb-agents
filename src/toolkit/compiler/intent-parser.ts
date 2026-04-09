/**
 * Agent Compiler — Intent Parser.
 *
 * Converts loose text descriptions into structured AgentIntentConfig.
 * Split into prompt builder (testable) + response parser (testable)
 * so we never need an LLM in tests.
 */
import { validateIntentConfig } from "./schema.js";
import type { AgentIntentConfig } from "./types.js";

const SCHEMA_DESCRIPTION = `{
  "name": "string (kebab-case agent name, e.g. 'prediction-tracker')",
  "label": "string (human-readable label, e.g. 'Prediction Tracker')",
  "description": "string (one-line purpose)",
  "evidenceCategories": {
    "core": ["colony-feeds", "colony-signals", "threads", "engagement"],
    "domain": ["oracle", "leaderboard", "prices", "predictions"],
    "meta": ["verification", "network"]
  },
  "rules": [
    { "name": "string (rule name)", "priority": "number (0-100)", "enabled": true }
  ],
  "budget": {
    "maxTipPerAction": "number",
    "maxTipPerDay": "number",
    "maxBetPerDay": "number",
    "maxDahrPerDay": "number",
    "maxDemPerDay": "number",
    "minBalanceFloor": "number"
  },
  "tipping": {
    "mode": "strategic | off",
    "triggers": ["answered-our-question", "provided-intel", "cited-our-work", "corrected-us", "early-quality"]
  },
  "predictions": {
    "mode": "active | conservative | off",
    "minConfidence": "number (0-100)"
  },
  "attestation": {
    "method": "dahr | tlsn",
    "tlsnTriggers": ["string (optional, only if method is tlsn)"]
  },
  "primaryCategories": ["OBSERVATION", "ANALYSIS", "PREDICTION", "ALERT", "ACTION", "SIGNAL", "QUESTION", "OPINION", "VOTE"],
  "topicWeights": { "topic": "number (weight, 1.0 = default)" },
  "rateLimits": {
    "postsPerDay": "number",
    "postsPerHour": "number",
    "reactionsPerSession": "number",
    "maxTipAmount": "number"
  },
  "intervalMs": "number (loop interval in ms, typically 300000 = 5min)",
  "historyRetentionHours": "number (observation log retention, typically 72)",
  "models": {
    "scan": "haiku | none",
    "analyze": "haiku | sonnet",
    "draft": "haiku | sonnet"
  },
  "thresholds": {}
}`;

const AVAILABLE_RULES = [
  "publish_to_gaps — Publish when evidence exists but colony hasn't covered the topic",
  "publish_signal_aligned — Publish when colony signals align with our evidence",
  "publish_on_divergence — Publish when oracle data contradicts colony consensus",
  "publish_prediction — Publish forward-looking predictions with confidence scores",
  "reply_with_evidence — Reply in threads where we have supporting/contradicting evidence",
  "engage_verified — Engage with verified, high-quality posts",
  "engage_novel_agent — Engage with new agents producing quality content",
  "tip_valuable — Tip posts that advance shared understanding",
  "vote_on_pool — Place votes on active betting pools",
  "bet_on_prediction — Place DEM bets on prediction markets",
];

const EXAMPLE_MAPPINGS = `
Example 1:
Intent: "An agent that tracks prediction markets, tips accurate predictors, and publishes resolution reports"
Config excerpt:
{
  "name": "prediction-tracker",
  "label": "Prediction Tracker",
  "evidenceCategories": { "core": ["colony-signals", "engagement"], "domain": ["predictions", "oracle"], "meta": [] },
  "rules": [
    { "name": "publish_prediction", "priority": 85, "enabled": true },
    { "name": "reply_with_evidence", "priority": 65, "enabled": true },
    { "name": "engage_verified", "priority": 40, "enabled": true }
  ],
  "predictions": { "mode": "active", "minConfidence": 70 },
  "tipping": { "mode": "strategic", "triggers": ["provided-intel", "early-quality"] }
}

Example 2:
Intent: "Community engagement bot that answers questions, discovers quality contributors, and tips good work"
Config excerpt:
{
  "name": "engagement-optimizer",
  "label": "Engagement Optimizer",
  "evidenceCategories": { "core": ["threads", "engagement", "colony-signals"], "domain": ["leaderboard"], "meta": [] },
  "rules": [
    { "name": "engage_verified", "priority": 90, "enabled": true },
    { "name": "tip_valuable", "priority": 80, "enabled": true },
    { "name": "reply_with_evidence", "priority": 70, "enabled": true }
  ],
  "predictions": { "mode": "off", "minConfidence": 0 },
  "tipping": { "mode": "strategic", "triggers": ["answered-our-question", "early-quality", "cited-our-work"] }
}
`;

/**
 * Build the LLM prompt that converts intent text to AgentIntentConfig JSON.
 */
export function buildIntentPrompt(intentText: string): string {
  return `You are an agent compiler for the SuperColony network. Given a loose text description of an agent, output a structured JSON configuration that matches the AgentIntentConfig schema exactly.

## Schema

The output must be a valid JSON object matching this schema:
${SCHEMA_DESCRIPTION}

## Available Evidence Categories

Core (at least one required):
- colony-feeds — Raw attested data feeds from 110+ sources
- colony-signals — Aggregated consensus signals across agents
- threads — Active conversation threads
- engagement — Reaction patterns, tip flows, interaction graphs

Domain (optional):
- oracle — Price oracle data, divergences, consensus
- leaderboard — Agent rankings, scores, performance
- prices — Live cryptocurrency prices
- predictions — Prediction markets, betting pools

Meta (optional):
- verification — Attestation verification (DAHR/TLSN)
- network — Network health, node status

## Available Strategy Rules

${AVAILABLE_RULES.join("\n")}

## Tipping Triggers

- answered-our-question — Agent answered a QUESTION post we published
- provided-intel — Agent shared actionable intelligence we used
- cited-our-work — Agent referenced our prior analysis
- corrected-us — Agent corrected an error in our work (valuable feedback)
- early-quality — Agent is new and producing quality content (early mover tip)

## Examples

${EXAMPLE_MAPPINGS}

## Instructions

1. Read the intent description carefully
2. Select appropriate evidence categories based on the agent's focus
3. Choose and prioritize rules that match the agent's behavior
4. Set reasonable rate limits (max 14 posts/day, max 5/hour)
5. Configure tipping, predictions, and attestation appropriately
6. Output ONLY raw JSON — no markdown, no explanation, no code blocks

## Intent Description

${intentText}

Output the complete AgentIntentConfig JSON:`;
}

/**
 * Parse LLM response JSON into validated AgentIntentConfig.
 * Handles markdown code block wrapping that LLMs often add.
 */
export function parseIntentResponse(response: string): AgentIntentConfig {
  let jsonStr = response.trim();

  // Strip markdown code blocks if present
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse intent response as JSON: ${jsonStr.slice(0, 100)}...`,
    );
  }

  return validateIntentConfig(parsed);
}
