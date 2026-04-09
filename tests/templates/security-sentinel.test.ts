/**
 * Tests for templates/security-sentinel/ — compiler-generated observe + custom NVD/GHSA.
 *
 * Validates:
 * - learnFirstObserve uses strategyObserve + external security fetchers
 * - NVD/GHSA evidence appended to strategy evidence
 * - Null-safe when API calls and fetch fail
 * - strategy.yaml is well-formed with 5 rules
 * - sources.yaml exists and has security sources
 * - agent.ts uses learnFirstObserve
 * - NVD and GHSA are catalog sources (not custom fetchers)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadStrategyConfig } from "../../src/toolkit/strategy/config-loader.js";
import { createMockToolkit } from "./_mock-toolkit.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";
import type { ObserveResult } from "../../src/toolkit/agent-loop.js";

const TEMPLATE_DIR = resolve(import.meta.dirname, "../../templates/security-sentinel");
const STRATEGY_PATH = resolve(TEMPLATE_DIR, "strategy.yaml");

// ── Mock fetch data ───────────────────────────────

// ── File structure tests ──────────────────────────

describe("templates/security-sentinel", () => {
  describe("strategy.yaml", () => {
    it("loads with 5 rules of correct types", () => {
      const config = loadStrategyConfig(readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8"));
      expect(config.rules).toHaveLength(5);
      const m = new Map(config.rules.map(r => [r.name, r]));
      expect(m.get("publish_signal_aligned")!.type).toBe("PUBLISH");
      expect(m.get("reply_with_evidence")!.type).toBe("REPLY");
      expect(m.get("engage_verified")!.type).toBe("ENGAGE");
      expect(m.get("publish_to_gaps")!.type).toBe("PUBLISH");
      expect(m.get("tip_valuable")!.type).toBe("TIP");
    });

    it("has REPLY enabled", () => {
      const config = loadStrategyConfig(readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8"));
      const reply = config.rules.find(r => r.type === "REPLY");
      expect(reply).toBeDefined();
      expect(reply!.enabled).toBe(true);
    });

    it("all rules enabled", () => {
      const config = loadStrategyConfig(readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8"));
      expect(config.rules.every(r => r.enabled)).toBe(true);
    });

    it("has security-focused rate limits", () => {
      const config = loadStrategyConfig(readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8"));
      expect(config.rateLimits.postsPerDay).toBe(8);
      expect(config.rateLimits.postsPerHour).toBe(3);
      expect(config.rateLimits.reactionsPerSession).toBe(4);
      expect(config.rateLimits.maxTipAmount).toBe(3);
    });

    it("has security topic weights", () => {
      const config = loadStrategyConfig(readFileSync(resolve(TEMPLATE_DIR, "strategy.yaml"), "utf-8"));
      expect(config.topicWeights.security).toBe(1.5);
      expect(config.topicWeights.vulnerability).toBe(1.3);
    });
  });

  describe("sources.yaml", () => {
    it("has 3 security sources", () => {
      const parsed = parseYaml(readFileSync(resolve(TEMPLATE_DIR, "sources.yaml"), "utf-8"));
      expect(parsed.sources).toHaveLength(3);
      const names = parsed.sources.map((s: any) => s.name);
      expect(names).toContain("NVD Recent CVEs");
      expect(names).toContain("GitHub Security Advisories");
      expect(names).toContain("HackerNews Security");
      for (const s of parsed.sources) expect(s.topics).toContain("security");
    });
  });

  describe("agent.ts", () => {
    it("exists and imports runtime, loop, and learnFirstObserve", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "agent.ts"), "utf-8");
      expect(content).toContain("createAgentRuntime");
      expect(content).toContain("runAgentLoop");
      expect(content).toContain("learnFirstObserve");
    });

    it("does NOT use securityObserve or defaultObserve", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "agent.ts"), "utf-8");
      expect(content).not.toContain("securityObserve");
      expect(content).not.toContain("defaultObserve");
    });

    it("observe.ts exists and exports learnFirstObserve", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "observe.ts"), "utf-8");
      expect(content).toContain("learnFirstObserve");
    });
  });

  describe("catalog sources", () => {
    it("NVD and GHSA exist in catalog.json", () => {
      const catalogPath = resolve(TEMPLATE_DIR, "../../config/sources/catalog.json");
      const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
      const ids = catalog.sources.map((s: any) => s.id);
      expect(ids).toContain("nvd-cve-recent");
      expect(ids).toContain("github-security-advisories");
    });
  });

  // ── Observe function tests ──────────────────────

  describe("learnFirstObserve()", () => {
    let learnFirstObserve: (toolkit: Toolkit, address: string, strategyPath?: string) => Promise<ObserveResult>;

    beforeEach(async () => {
      const mod = await import("../../templates/security-sentinel/observe.js");
      learnFirstObserve = mod.learnFirstObserve;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls intelligence.getSignals() via strategy router", async () => {
      const tk = createMockToolkit();
      await learnFirstObserve(tk, "0xTEST", STRATEGY_PATH);
      expect(tk.intelligence.getSignals).toHaveBeenCalled();
    });

    it("returns colony evidence from strategy-driven extractors", async () => {
      const tk = createMockToolkit({
        intelligence: {
          getSignals: vi.fn().mockResolvedValue({
            ok: true,
            data: [{ topic: "CVE-2026-critical", consensus: true, direction: "alert", agentCount: 4, confidence: 90, text: "Critical vulnerability discussion", trending: true }],
          }),
          getReport: vi.fn().mockResolvedValue(null),
        },
      });
      const result = await learnFirstObserve(tk, "0xTEST", STRATEGY_PATH);
      const signals = result.evidence.filter(e => e.sourceId.startsWith("signal-"));
      expect(signals.length).toBeGreaterThanOrEqual(1);
    });

    it("is null-safe when all API calls fail", async () => {
      const toolkit = createMockToolkit({
        feed: {
          getRecent: vi.fn().mockResolvedValue({ ok: false }),
          search: vi.fn().mockResolvedValue(null),
          getPost: vi.fn().mockResolvedValue(null),
          getThread: vi.fn().mockResolvedValue(null),
        },
        intelligence: { getSignals: vi.fn().mockResolvedValue(null), getReport: vi.fn().mockResolvedValue(null) },
      });

      const result = await learnFirstObserve(toolkit, "0xTEST", STRATEGY_PATH);
      expect(result).toBeDefined();
      expect(result.colonyState).toBeDefined();
      expect(result.evidence).toBeInstanceOf(Array);
    });

    it("returns apiEnrichment in context", async () => {
      const result = await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      expect(result.context).toBeDefined();
    });
  });
});
