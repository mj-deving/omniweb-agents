/**
 * Tests for templates/market-intelligence/ — compiler-generated observe function.
 *
 * Verifies:
 * - learnFirstObserve uses strategyObserve (single-fetch router)
 * - Evidence categories: colony-signals, colony-feeds, oracle, prices, predictions
 * - Null-safe when API calls fail
 * - strategy.yaml is well-formed with 6 rules
 * - sources.yaml exists and has required fields
 * - agent.ts uses learnFirstObserve
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadStrategyConfig } from "../../src/toolkit/strategy/config-loader.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";
import type { ObserveResult } from "../../src/toolkit/agent-loop.js";

const TEMPLATE_DIR = resolve(import.meta.dirname, "../../templates/market-intelligence");
const STRATEGY_PATH = resolve(TEMPLATE_DIR, "strategy.yaml");

// ── Mock Toolkit factory ──────────────────────────

function createMockToolkit(overrides: Record<string, unknown> = {}): Toolkit {
  return {
    feed: {
      getRecent: vi.fn().mockResolvedValue({ ok: true, data: { posts: [] } }),
      search: vi.fn().mockResolvedValue(null),
      getPost: vi.fn().mockResolvedValue(null),
      getThread: vi.fn().mockResolvedValue(null),
    },
    intelligence: {
      getSignals: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      getReport: vi.fn().mockResolvedValue(null),
    },
    scores: { getLeaderboard: vi.fn().mockResolvedValue(null) },
    agents: {
      list: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue(null),
      getIdentities: vi.fn().mockResolvedValue(null),
    },
    actions: {
      tip: vi.fn().mockResolvedValue(null),
      react: vi.fn().mockResolvedValue(null),
      getReactions: vi.fn().mockResolvedValue(null),
      getTipStats: vi.fn().mockResolvedValue(null),
      getAgentTipStats: vi.fn().mockResolvedValue(null),
      placeBet: vi.fn().mockResolvedValue(null),
    },
    oracle: { get: vi.fn().mockResolvedValue(null) },
    prices: { get: vi.fn().mockResolvedValue(null) },
    verification: {
      verifyDahr: vi.fn().mockResolvedValue(null),
      verifyTlsn: vi.fn().mockResolvedValue(null),
    },
    predictions: {
      query: vi.fn().mockResolvedValue(null),
      resolve: vi.fn().mockResolvedValue(null),
      markets: vi.fn().mockResolvedValue(null),
    },
    ballot: {
      getState: vi.fn().mockResolvedValue(null),
      getAccuracy: vi.fn().mockResolvedValue(null),
      getLeaderboard: vi.fn().mockResolvedValue(null),
      getPerformance: vi.fn().mockResolvedValue(null),
      getPool: vi.fn().mockResolvedValue(null),
    },
    webhooks: {
      list: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
    },
    identity: { lookup: vi.fn().mockResolvedValue(null) },
    balance: { get: vi.fn().mockResolvedValue(null) },
    health: { check: vi.fn().mockResolvedValue(null) },
    stats: { get: vi.fn().mockResolvedValue(null) },
    ...overrides,
  } as unknown as Toolkit;
}

const OUR_ADDRESS = "0xmarket-agent";

// ── Lazy-load the observe function ────────────────

let learnFirstObserve: (toolkit: Toolkit, address: string, strategyPath?: string) => Promise<ObserveResult>;

beforeEach(async () => {
  const mod = await import("../../templates/market-intelligence/observe.js");
  learnFirstObserve = mod.learnFirstObserve;
});

// ── Tests ─────────────────────────────────────────

describe("templates/market-intelligence", () => {
  describe("learnFirstObserve()", () => {
    it("calls feed.getRecent for colony state", async () => {
      const toolkit = createMockToolkit();
      await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      expect(toolkit.feed.getRecent).toHaveBeenCalled();
    });

    it("calls intelligence.getSignals() via strategy router", async () => {
      const toolkit = createMockToolkit();
      await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      expect(toolkit.intelligence.getSignals).toHaveBeenCalled();
    });

    it("calls oracle.get() via strategy router", async () => {
      const toolkit = createMockToolkit();
      await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      expect(toolkit.oracle.get).toHaveBeenCalled();
    });

    it("calls prices.get() via strategy router", async () => {
      const toolkit = createMockToolkit();
      await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      expect(toolkit.prices.get).toHaveBeenCalled();
    });

    it("produces signal evidence from colony signals via extractor", async () => {
      const toolkit = createMockToolkit({
        intelligence: {
          getSignals: vi.fn().mockResolvedValue({
            ok: true,
            data: [
              { topic: "defi", agentCount: 5, totalAgents: 10, confidence: 80, text: "DeFi bullish on lending rates", trending: true, direction: "bullish", consensus: true },
            ],
          }),
          getReport: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      const signalEvidence = result.evidence.filter(e => e.sourceId.startsWith("signal-"));
      expect(signalEvidence.length).toBeGreaterThanOrEqual(1);
    });

    it("produces divergence evidence from oracle via extractor", async () => {
      const toolkit = createMockToolkit({
        oracle: {
          get: vi.fn().mockResolvedValue({
            ok: true,
            data: {
              divergences: [
                { type: "agents_vs_market", asset: "ETH", description: "High divergence — agents bullish, market down", severity: "high" },
              ],
              assets: [],
            },
          }),
        },
      });

      const result = await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      const divEvidence = result.evidence.filter(e => e.sourceId.startsWith("divergence-"));
      expect(divEvidence.length).toBeGreaterThanOrEqual(1);
    });

    it("is null-safe when all API calls return null", async () => {
      const toolkit = createMockToolkit({
        feed: {
          getRecent: vi.fn().mockResolvedValue({ ok: false }),
          search: vi.fn().mockResolvedValue(null),
          getPost: vi.fn().mockResolvedValue(null),
          getThread: vi.fn().mockResolvedValue(null),
        },
        oracle: { get: vi.fn().mockResolvedValue(null) },
        prices: { get: vi.fn().mockResolvedValue(null) },
        intelligence: { getSignals: vi.fn().mockResolvedValue(null), getReport: vi.fn().mockResolvedValue(null) },
        ballot: { getPool: vi.fn().mockResolvedValue(null) },
      });

      const result = await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      expect(result).toBeDefined();
      expect(result.colonyState).toBeDefined();
      expect(result.evidence).toBeInstanceOf(Array);
    });

    it("returns apiEnrichment in context", async () => {
      const toolkit = createMockToolkit();
      const result = await learnFirstObserve(toolkit, OUR_ADDRESS, STRATEGY_PATH);
      expect(result.context).toBeDefined();
    });
  });

  describe("strategy.yaml", () => {
    it("exists", () => {
      expect(existsSync(resolve(TEMPLATE_DIR, "strategy.yaml"))).toBe(true);
    });

    it("loads via loadStrategyConfig without errors", () => {
      const yaml = readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8");
      const config = loadStrategyConfig(yaml);
      expect(config).toBeDefined();
      expect(config.rules).toBeInstanceOf(Array);
    });

    it("has 6 rules with correct names", () => {
      const yaml = readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8");
      const config = loadStrategyConfig(yaml);

      expect(config.rules).toHaveLength(6);
      const ruleNames = config.rules.map(r => r.name);
      expect(ruleNames).toContain("publish_on_divergence");
      expect(ruleNames).toContain("reply_with_evidence");
      expect(ruleNames).toContain("publish_prediction");
      expect(ruleNames).toContain("publish_to_gaps");
      expect(ruleNames).toContain("engage_verified");
      expect(ruleNames).toContain("tip_valuable");
    });

    it("has correct action types for each rule", () => {
      const yaml = readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8");
      const config = loadStrategyConfig(yaml);

      const ruleMap = new Map(config.rules.map(r => [r.name, r]));
      expect(ruleMap.get("publish_on_divergence")!.type).toBe("PUBLISH");
      expect(ruleMap.get("reply_with_evidence")!.type).toBe("REPLY");
      expect(ruleMap.get("publish_prediction")!.type).toBe("PUBLISH");
      expect(ruleMap.get("publish_to_gaps")!.type).toBe("PUBLISH");
      expect(ruleMap.get("engage_verified")!.type).toBe("ENGAGE");
      expect(ruleMap.get("tip_valuable")!.type).toBe("TIP");
    });

    it("has all rules enabled", () => {
      const yaml = readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8");
      const config = loadStrategyConfig(yaml);
      expect(config.rules.every(r => r.enabled)).toBe(true);
    });

    it("has market-specific rate limits", () => {
      const yaml = readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8");
      const config = loadStrategyConfig(yaml);
      expect(config.rateLimits.postsPerDay).toBe(12);
      expect(config.rateLimits.postsPerHour).toBe(4);
      expect(config.rateLimits.reactionsPerSession).toBe(6);
      expect(config.rateLimits.maxTipAmount).toBe(5);
    });

    it("has topic weights for defi, crypto, macro", () => {
      const yaml = readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8");
      const config = loadStrategyConfig(yaml);
      expect(config.topicWeights).toEqual({
        defi: 1.2,
        crypto: 1,
        macro: 0.8,
      });
    });
  });

  describe("sources.yaml", () => {
    it("exists", () => {
      expect(existsSync(resolve(TEMPLATE_DIR, "sources.yaml"))).toBe(true);
    });

    it("has valid YAML with sources array", () => {
      const { parse } = require("yaml");
      const content = readFileSync(resolve(TEMPLATE_DIR, "sources.yaml"), "utf-8");
      const parsed = parse(content);
      expect(parsed.sources).toBeInstanceOf(Array);
      expect(parsed.sources.length).toBeGreaterThanOrEqual(4);
    });

    it("each source has required fields: name, url, dahr_safe, topics", () => {
      const { parse } = require("yaml");
      const content = readFileSync(resolve(TEMPLATE_DIR, "sources.yaml"), "utf-8");
      const parsed = parse(content);

      for (const source of parsed.sources) {
        expect(source).toHaveProperty("name");
        expect(source).toHaveProperty("url");
        expect(source).toHaveProperty("dahr_safe");
        expect(source).toHaveProperty("topics");
        expect(Array.isArray(source.topics)).toBe(true);
        expect(typeof source.url).toBe("string");
        expect(typeof source.dahr_safe).toBe("boolean");
      }
    });
  });

  describe("agent.ts", () => {
    it("exists", () => {
      expect(existsSync(resolve(TEMPLATE_DIR, "agent.ts"))).toBe(true);
    });

    it("imports createAgentRuntime and runAgentLoop", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "agent.ts"), "utf-8");
      expect(content).toContain("createAgentRuntime");
      expect(content).toContain("runAgentLoop");
    });

    it("exports learnFirstObserve function", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "agent.ts"), "utf-8");
      expect(content).toContain("export");
      expect(content).toContain("learnFirstObserve");
    });

    it("does NOT use defaultObserve or marketObserve", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "agent.ts"), "utf-8");
      expect(content).not.toContain("defaultObserve");
      expect(content).not.toContain("marketObserve");
    });
  });
});
