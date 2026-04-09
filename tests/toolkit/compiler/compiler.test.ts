/**
 * Agent Compiler — Tests for intent parser, template composer, and validator.
 *
 * TDD: These tests define the contract. Implementation follows.
 */
import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { buildIntentPrompt, parseIntentResponse } from "../../../src/toolkit/compiler/intent-parser.js";
import { composeTemplate } from "../../../src/toolkit/compiler/template-composer.js";
import { validateComposedTemplate } from "../../../src/toolkit/compiler/validator.js";
import { validateIntentConfig } from "../../../src/toolkit/compiler/schema.js";
import { EXAMPLE_INTENTS } from "../../../src/toolkit/compiler/examples.js";
import type { AgentIntentConfig } from "../../../src/toolkit/compiler/types.js";

// ── Test fixtures ──────────────────────────────

function makeValidConfig(overrides: Partial<AgentIntentConfig> = {}): AgentIntentConfig {
  return {
    name: "test-agent",
    label: "Test Agent",
    description: "A test agent for unit tests",
    evidenceCategories: {
      core: ["colony-signals"],
      domain: ["oracle"],
      meta: [],
    },
    rules: [
      { name: "publish_to_gaps", priority: 70, enabled: true },
      { name: "engage_verified", priority: 50, enabled: true },
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
      mode: "off",
      minConfidence: 70,
    },
    attestation: {
      method: "dahr",
    },
    primaryCategories: ["ANALYSIS", "SIGNAL"],
    topicWeights: { crypto: 1.0 },
    rateLimits: {
      postsPerDay: 6,
      postsPerHour: 2,
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
    ...overrides,
  };
}

// ── Intent Parser Tests ──────────────────────────────

describe("intent-parser", () => {
  describe("buildIntentPrompt", () => {
    it("returns a string containing schema information", () => {
      const prompt = buildIntentPrompt("I want a prediction market agent");
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(100);
      // Must contain key schema fields
      expect(prompt).toContain("name");
      expect(prompt).toContain("evidenceCategories");
      expect(prompt).toContain("rules");
      expect(prompt).toContain("rateLimits");
    });

    it("includes the user intent text in the prompt", () => {
      const intent = "Monitor prediction markets and tip accurate predictors";
      const prompt = buildIntentPrompt(intent);
      expect(prompt).toContain(intent);
    });

    it("includes valid enum values for categories", () => {
      const prompt = buildIntentPrompt("any agent");
      expect(prompt).toContain("colony-signals");
      expect(prompt).toContain("colony-feeds");
      expect(prompt).toContain("oracle");
      expect(prompt).toContain("predictions");
    });

    it("includes valid tipping trigger values", () => {
      const prompt = buildIntentPrompt("any agent");
      expect(prompt).toContain("provided-intel");
      expect(prompt).toContain("early-quality");
      expect(prompt).toContain("answered-our-question");
    });

    it("includes example intent-to-config mappings", () => {
      const prompt = buildIntentPrompt("any agent");
      // Should contain at least one example
      expect(prompt.toLowerCase()).toContain("example");
    });
  });

  describe("parseIntentResponse", () => {
    it("parses valid JSON response", () => {
      const config = makeValidConfig({ name: "parsed-agent" });
      const response = JSON.stringify(config);
      const result = parseIntentResponse(response);
      expect(result.name).toBe("parsed-agent");
      expect(result.rules).toHaveLength(2);
    });

    it("handles markdown code block wrapping", () => {
      const config = makeValidConfig({ name: "markdown-agent" });
      const response = "```json\n" + JSON.stringify(config) + "\n```";
      const result = parseIntentResponse(response);
      expect(result.name).toBe("markdown-agent");
    });

    it("handles code block without language specifier", () => {
      const config = makeValidConfig({ name: "plain-block" });
      const response = "```\n" + JSON.stringify(config) + "\n```";
      const result = parseIntentResponse(response);
      expect(result.name).toBe("plain-block");
    });

    it("throws on invalid JSON", () => {
      expect(() => parseIntentResponse("not json at all")).toThrow();
    });

    it("throws on valid JSON that fails schema validation", () => {
      const badConfig = { name: 123, rules: "not an array" };
      expect(() => parseIntentResponse(JSON.stringify(badConfig))).toThrow(
        "Invalid AgentIntentConfig",
      );
    });
  });
});

// ── Template Composer Tests ──────────────────────────────

describe("template-composer", () => {
  const config = makeValidConfig({
    name: "compose-test",
    label: "Compose Test Agent",
  });

  describe("composeTemplate", () => {
    it("generates 4 files", () => {
      const result = composeTemplate(config);
      expect(result.files.size).toBe(4);
      expect(result.files.has("strategy.yaml")).toBe(true);
      expect(result.files.has("observe.ts")).toBe(true);
      expect(result.files.has("agent.ts")).toBe(true);
      expect(result.files.has(".env.example")).toBe(true);
    });

    it("strategy.yaml is valid YAML", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml);
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe("object");
    });

    it("strategy.yaml has correct rules from config", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      const rules = parsed.rules as Array<Record<string, unknown>>;
      expect(rules).toHaveLength(2);
      expect(rules[0].name).toBe("publish_to_gaps");
      expect(rules[0].priority).toBe(70);
      expect(rules[1].name).toBe("engage_verified");
      expect(rules[1].priority).toBe(50);
    });

    it("strategy.yaml has evidence.categories section", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      const evidence = parsed.evidence as Record<string, unknown>;
      expect(evidence).toBeDefined();
      expect(evidence.categories).toBeDefined();
      const categories = evidence.categories as Record<string, unknown>;
      expect(categories.core).toEqual(["colony-signals"]);
      expect(categories.domain).toEqual(["oracle"]);
    });

    it("strategy.yaml has rateLimits from config", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      const limits = parsed.rateLimits as Record<string, unknown>;
      expect(limits.postsPerDay).toBe(6);
      expect(limits.postsPerHour).toBe(2);
    });

    it("strategy.yaml has topicWeights from config", () => {
      const customConfig = makeValidConfig({
        topicWeights: { macro: 1.5, crypto: 0.8 },
      });
      const result = composeTemplate(customConfig);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      expect(parsed.topicWeights).toEqual({ macro: 1.5, crypto: 0.8 });
    });

    it("strategy.yaml has budget section", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      const budget = parsed.budget as Record<string, unknown>;
      expect(budget).toBeDefined();
      expect(budget.maxTipPerAction).toBe(3);
      expect(budget.maxDemPerDay).toBe(50);
    });

    it("strategy.yaml has tipping section", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      const tipping = parsed.tipping as Record<string, unknown>;
      expect(tipping).toBeDefined();
      expect(tipping.mode).toBe("strategic");
      expect(tipping.triggers).toEqual(["provided-intel", "early-quality"]);
    });

    it("strategy.yaml has attestation section", () => {
      const result = composeTemplate(config);
      const yaml = result.files.get("strategy.yaml")!;
      const parsed = parseYaml(yaml) as Record<string, unknown>;
      const attestation = parsed.attestation as Record<string, unknown>;
      expect(attestation).toBeDefined();
      expect(attestation.method).toBe("dahr");
    });

    it("agent.ts contains the agent label", () => {
      const result = composeTemplate(config);
      const agentTs = result.files.get("agent.ts")!;
      expect(agentTs).toContain("Compose Test Agent");
      expect(agentTs).toContain("compose-test");
    });

    it("observe.ts contains learnFirstObserve", () => {
      const result = composeTemplate(config);
      const observeTs = result.files.get("observe.ts")!;
      expect(observeTs).toContain("learnFirstObserve");
    });

    it(".env.example contains interval from config", () => {
      const result = composeTemplate(config);
      const env = result.files.get(".env.example")!;
      expect(env).toContain("LOOP_INTERVAL_MS=300000");
      expect(env).toContain("DRY_RUN=true");
      expect(env).toContain("DEMOS_MNEMONIC");
    });
  });
});

// ── Validator Tests ──────────────────────────────

describe("validator", () => {
  describe("validateComposedTemplate", () => {
    it("passes for valid composed template", () => {
      const config = makeValidConfig();
      const composed = composeTemplate(config);
      const result = validateComposedTemplate(composed.files);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails for missing required files", () => {
      const files = new Map<string, string>();
      files.set("strategy.yaml", "rules: []");
      // Missing agent.ts and observe.ts
      const result = validateComposedTemplate(files);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("agent.ts"))).toBe(true);
      expect(result.errors.some((e) => e.includes("observe.ts"))).toBe(true);
    });

    it("fails for invalid strategy.yaml content", () => {
      const files = new Map<string, string>();
      files.set("strategy.yaml", "not: valid: yaml: [}}}");
      files.set("agent.ts", "// stub");
      files.set("observe.ts", "// stub");
      const result = validateComposedTemplate(files);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("strategy.yaml"))).toBe(true);
    });

    it("fails when strategy.yaml has no rules", () => {
      const files = new Map<string, string>();
      files.set("strategy.yaml", "topicWeights:\n  crypto: 1.0\n");
      files.set("agent.ts", "// stub");
      files.set("observe.ts", "// stub");
      const result = validateComposedTemplate(files);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("strategy.yaml"))).toBe(true);
    });
  });
});

// ── Example Agents Tests ──────────────────────────────

describe("example-agents", () => {
  it("has 3 example intents defined", () => {
    expect(EXAMPLE_INTENTS).toHaveLength(3);
  });

  it("all example configs pass schema validation", () => {
    for (const example of EXAMPLE_INTENTS) {
      expect(() => validateIntentConfig(example.config)).not.toThrow();
    }
  });

  it("generates prediction-tracker template with valid files", () => {
    const example = EXAMPLE_INTENTS.find((e) => e.name === "prediction-tracker");
    expect(example).toBeDefined();
    const composed = composeTemplate(example!.config);
    const result = validateComposedTemplate(composed.files);
    expect(result.valid).toBe(true);
    // Verify prediction-specific rules
    const yaml = parseYaml(composed.files.get("strategy.yaml")!) as Record<string, unknown>;
    const rules = yaml.rules as Array<Record<string, unknown>>;
    expect(rules.some((r) => r.name === "publish_prediction")).toBe(true);
  });

  it("generates engagement-optimizer template with valid files", () => {
    const example = EXAMPLE_INTENTS.find((e) => e.name === "engagement-optimizer");
    expect(example).toBeDefined();
    const composed = composeTemplate(example!.config);
    const result = validateComposedTemplate(composed.files);
    expect(result.valid).toBe(true);
    // Verify engagement-specific config
    const yaml = parseYaml(composed.files.get("strategy.yaml")!) as Record<string, unknown>;
    const rules = yaml.rules as Array<Record<string, unknown>>;
    expect(rules.some((r) => r.name === "engage_verified")).toBe(true);
    const rateLimits = yaml.rateLimits as Record<string, unknown>;
    expect(rateLimits.reactionsPerSession).toBe(10);
  });

  it("generates research-synthesizer template with valid files", () => {
    const example = EXAMPLE_INTENTS.find((e) => e.name === "research-synthesizer");
    expect(example).toBeDefined();
    const composed = composeTemplate(example!.config);
    const result = validateComposedTemplate(composed.files);
    expect(result.valid).toBe(true);
    // Verify topic weights
    const yaml = parseYaml(composed.files.get("strategy.yaml")!) as Record<string, unknown>;
    const weights = yaml.topicWeights as Record<string, number>;
    expect(weights.macro).toBe(1.5);
    expect(weights.economics).toBe(1.3);
  });

  it("all example names are kebab-case", () => {
    for (const example of EXAMPLE_INTENTS) {
      expect(example.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(example.config.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
