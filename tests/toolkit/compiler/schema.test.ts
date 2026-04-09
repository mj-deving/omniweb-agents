import { describe, it, expect } from "vitest";
import { validateIntentConfig, AgentIntentConfigSchema } from "../../../src/toolkit/compiler/schema.js";
import type { AgentIntentConfig } from "../../../src/toolkit/compiler/types.js";
import { loadStrategyConfig } from "../../../src/toolkit/strategy/config-loader.js";

/** Minimal valid config — all required fields provided. */
function minimalConfig(): Record<string, unknown> {
  return {
    name: "my-agent",
    label: "My Agent",
    description: "A test agent",
    evidenceCategories: {
      core: ["colony-feeds"],
      domain: [],
      meta: [],
    },
    rules: [
      { name: "engage_verified", priority: 50, enabled: true },
    ],
    budget: {
      maxTipPerAction: 5,
      maxTipPerDay: 25,
      maxBetPerDay: 50,
      maxDahrPerDay: 5,
      maxDemPerDay: 100,
      minBalanceFloor: 50,
    },
    tipping: { mode: "off", triggers: [] },
    predictions: { mode: "off", minConfidence: 70 },
    attestation: { method: "dahr" },
    primaryCategories: ["ANALYSIS"],
    topicWeights: {},
    rateLimits: {
      postsPerDay: 8,
      postsPerHour: 3,
      reactionsPerSession: 6,
      maxTipAmount: 5,
    },
    intervalMs: 300_000,
    historyRetentionHours: 72,
    models: { scan: "haiku", analyze: "sonnet", draft: "sonnet" },
    thresholds: {},
  };
}

/** Fully populated config — all fields explicit. */
function fullConfig(): Record<string, unknown> {
  return {
    name: "prediction-tracker",
    label: "Prediction Tracker",
    description: "Tracks prediction markets and tips accurate predictors",
    evidenceCategories: {
      core: ["colony-feeds", "colony-signals"],
      domain: ["oracle", "predictions"],
      meta: ["verification"],
    },
    rules: [
      { name: "publish_prediction", priority: 85, enabled: true },
      { name: "tip_valuable", priority: 75, enabled: true },
      { name: "engage_verified", priority: 60, enabled: true },
    ],
    budget: {
      maxTipPerAction: 5,
      maxTipPerDay: 50,
      maxBetPerDay: 100,
      maxDahrPerDay: 10,
      maxDemPerDay: 200,
      minBalanceFloor: 100,
    },
    tipping: {
      mode: "strategic",
      triggers: ["provided-intel", "cited-our-work"],
    },
    predictions: {
      mode: "active",
      minConfidence: 70,
    },
    attestation: {
      method: "dahr",
    },
    primaryCategories: ["PREDICTION", "ANALYSIS"],
    topicWeights: { crypto: 1.5, macro: 0.8 },
    rateLimits: {
      postsPerDay: 10,
      postsPerHour: 3,
      reactionsPerSession: 8,
      maxTipAmount: 10,
    },
    intervalMs: 300_000,
    historyRetentionHours: 72,
    models: {
      scan: "haiku",
      analyze: "sonnet",
      draft: "sonnet",
    },
    thresholds: {
      oracle: { minSources: 3, stalenessMs: 60_000 },
    },
  };
}

describe("AgentIntentConfig schema validation", () => {
  it("validates a complete config", () => {
    const config = validateIntentConfig(fullConfig());
    expect(config.name).toBe("prediction-tracker");
    expect(config.rules).toHaveLength(3);
    expect(config.budget.maxTipPerAction).toBe(5);
    expect(config.tipping.mode).toBe("strategic");
    expect(config.predictions.mode).toBe("active");
    expect(config.attestation.method).toBe("dahr");
    expect(config.models.draft).toBe("sonnet");
    expect(config.thresholds.oracle.minSources).toBe(3);
  });

  it("validates a minimal config with all required fields", () => {
    const config = validateIntentConfig(minimalConfig());
    expect(config.name).toBe("my-agent");
    expect(config.budget.maxTipPerAction).toBe(5);
    expect(config.tipping.mode).toBe("off");
    expect(config.tipping.triggers).toEqual([]);
    expect(config.predictions.mode).toBe("off");
    expect(config.attestation.method).toBe("dahr");
    expect(config.primaryCategories).toEqual(["ANALYSIS"]);
    expect(config.topicWeights).toEqual({});
    expect(config.rateLimits.postsPerDay).toBe(8);
    expect(config.intervalMs).toBe(300_000);
    expect(config.historyRetentionHours).toBe(72);
    expect(config.models.draft).toBe("sonnet");
    expect(config.thresholds).toEqual({});
  });

  it("rejects invalid name (not kebab-case)", () => {
    const config = minimalConfig();
    config.name = "MyAgent";
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects name with spaces", () => {
    const config = minimalConfig();
    config.name = "my agent";
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects name with uppercase", () => {
    const config = minimalConfig();
    config.name = "My-Agent";
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects priority out of range (>100)", () => {
    const config = minimalConfig();
    config.rules = [{ name: "engage_verified", priority: 150, enabled: true }];
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects negative priority", () => {
    const config = minimalConfig();
    config.rules = [{ name: "engage_verified", priority: -5, enabled: true }];
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects negative budget amounts", () => {
    const config = minimalConfig();
    config.budget = {
      maxTipPerAction: -1,
      maxTipPerDay: 50,
      maxBetPerDay: 100,
      maxDahrPerDay: 10,
      maxDemPerDay: 200,
      minBalanceFloor: 100,
    };
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("clamps rate limits exceeding caps", () => {
    const config = minimalConfig();
    config.rateLimits = {
      postsPerDay: 50,    // exceeds cap of 14
      postsPerHour: 20,   // exceeds cap of 5
      reactionsPerSession: 100,
      maxTipAmount: 50,
    };
    const result = validateIntentConfig(config);
    expect(result.rateLimits.postsPerDay).toBe(14);
    expect(result.rateLimits.postsPerHour).toBe(5);
  });

  it("rejects empty rules array", () => {
    const config = minimalConfig();
    config.rules = [];
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects invalid evidence category values", () => {
    const config = minimalConfig();
    config.evidenceCategories = {
      core: ["invalid-category"],
      domain: [],
      meta: [],
    };
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects invalid tipping trigger", () => {
    const config = minimalConfig();
    config.tipping = { mode: "strategic", triggers: ["not-a-trigger"] };
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects invalid prediction mode", () => {
    const config = minimalConfig();
    config.predictions = { mode: "yolo", minConfidence: 50 };
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("rejects invalid model tier", () => {
    const config = minimalConfig();
    config.models = { scan: "gpt-4", analyze: "sonnet", draft: "sonnet" };
    expect(() => validateIntentConfig(config)).toThrow();
  });

  it("allows valid kebab-case names", () => {
    for (const name of ["a", "my-agent", "prediction-market-tracker", "agent-42"]) {
      const config = minimalConfig();
      config.name = name;
      expect(() => validateIntentConfig(config)).not.toThrow();
    }
  });

  it("allows tlsnTriggers when attestation method is tlsn", () => {
    const config = minimalConfig();
    config.attestation = {
      method: "tlsn",
      tlsnTriggers: ["price-feed", "api-response"],
    };
    const result = validateIntentConfig(config);
    expect(result.attestation.method).toBe("tlsn");
    expect(result.attestation.tlsnTriggers).toEqual(["price-feed", "api-response"]);
  });
});

describe("StrategyConfig evidence categories (backward compat)", () => {
  const baseYaml = `
rules:
  - name: engage_verified
    type: ENGAGE
    priority: 80
    conditions: []
    enabled: true
`;

  it("parses strategy.yaml with evidence.categories", () => {
    const yaml = `${baseYaml}
evidence:
  categories:
    core: [colony-feeds, colony-signals]
    domain: [oracle, prices]
    meta: [network]
`;
    const config = loadStrategyConfig(yaml);
    expect(config.evidence).toBeDefined();
    expect(config.evidence!.categories).toBeDefined();
    expect(config.evidence!.categories!.core).toEqual(["colony-feeds", "colony-signals"]);
    expect(config.evidence!.categories!.domain).toEqual(["oracle", "prices"]);
    expect(config.evidence!.categories!.meta).toEqual(["network"]);
  });

  it("parses strategy.yaml without evidence.categories (backward compat)", () => {
    const config = loadStrategyConfig(baseYaml);
    // enrichment still works as before
    expect(config.enrichment.minSignalAgents).toBeDefined();
    // evidence section is undefined or has defaults
    expect(config.evidence).toBeUndefined();
  });

  it("parses strategy.yaml with partial evidence.categories", () => {
    const yaml = `${baseYaml}
evidence:
  categories:
    core: [colony-feeds]
`;
    const config = loadStrategyConfig(yaml);
    expect(config.evidence!.categories!.core).toEqual(["colony-feeds"]);
    expect(config.evidence!.categories!.domain).toBeUndefined();
    expect(config.evidence!.categories!.meta).toBeUndefined();
  });
});
