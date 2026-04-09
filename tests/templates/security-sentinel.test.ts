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
 * - security-sources.ts exports fetcher functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { loadStrategyConfig } from "../../src/toolkit/strategy/config-loader.js";
import type { Toolkit } from "../../src/toolkit/primitives/types.js";
import type { ObserveResult } from "../../src/toolkit/agent-loop.js";

const TEMPLATE_DIR = resolve(import.meta.dirname, "../../templates/security-sentinel");
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

// ── Mock fetch data ───────────────────────────────

const MOCK_NVD = {
  vulnerabilities: [
    { cve: { id: "CVE-2026-1234", descriptions: [{ lang: "en", value: "Critical buffer overflow" }], metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.8, baseSeverity: "CRITICAL" } }] } } },
    { cve: { id: "CVE-2026-5678", descriptions: [{ lang: "en", value: "SQL injection" }], metrics: { cvssMetricV31: [{ cvssData: { baseScore: 8.1, baseSeverity: "HIGH" } }] } } },
  ],
};

const MOCK_GHSA = [
  { ghsa_id: "GHSA-abcd-1234-efgh", summary: "RCE in framework", severity: "critical", html_url: "https://github.com/advisories/GHSA-abcd-1234-efgh" },
  { ghsa_id: "GHSA-ijkl-5678-mnop", summary: "Auth bypass", severity: "high", html_url: "https://github.com/advisories/GHSA-ijkl-5678-mnop" },
];

function mockFetchBoth() {
  return vi.fn().mockImplementation(async (url: string) => {
    if (String(url).includes("nvd.nist.gov")) return { ok: true, json: async () => MOCK_NVD };
    if (String(url).includes("github.com")) return { ok: true, json: async () => MOCK_GHSA };
    return { ok: true, json: async () => ({}) };
  });
}

function mockFetchEmpty() {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ vulnerabilities: [] }) });
}

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
      expect(content).toContain("export async function learnFirstObserve");
    });
  });

  describe("security-sources.ts", () => {
    it("exists and exports fetchNvd and fetchGhsa", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "security-sources.ts"), "utf-8");
      expect(content).toContain("export async function fetchNvd");
      expect(content).toContain("export async function fetchGhsa");
    });

    it("exports NvdVulnerability and GhAdvisory interfaces", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "security-sources.ts"), "utf-8");
      expect(content).toContain("export interface NvdVulnerability");
      expect(content).toContain("export interface GhAdvisory");
    });

    it("exports nvdToEvidence and ghsaToEvidence converters", () => {
      const content = readFileSync(resolve(TEMPLATE_DIR, "security-sources.ts"), "utf-8");
      expect(content).toContain("export function nvdToEvidence");
      expect(content).toContain("export function ghsaToEvidence");
    });
  });

  // ── Observe function tests ──────────────────────

  describe("learnFirstObserve()", () => {
    let learnFirstObserve: (toolkit: Toolkit, address: string, strategyPath?: string) => Promise<ObserveResult>;
    let originalFetch: typeof globalThis.fetch;

    beforeEach(async () => {
      originalFetch = globalThis.fetch;
      const mod = await import("../../templates/security-sentinel/observe.js");
      learnFirstObserve = mod.learnFirstObserve;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it("calls intelligence.getSignals() via strategy router", async () => {
      globalThis.fetch = mockFetchEmpty();
      const tk = createMockToolkit();
      await learnFirstObserve(tk, "0xTEST", STRATEGY_PATH);
      expect(tk.intelligence.getSignals).toHaveBeenCalled();
    });

    it("fetches NVD CVEs via global fetch", async () => {
      const mf = mockFetchBoth();
      globalThis.fetch = mf;
      await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      expect(mf.mock.calls.some((c: any[]) => String(c[0]).includes("nvd.nist.gov"))).toBe(true);
    });

    it("fetches GitHub advisories via global fetch", async () => {
      const mf = mockFetchBoth();
      globalThis.fetch = mf;
      await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      expect(mf.mock.calls.some((c: any[]) => String(c[0]).includes("api.github.com/advisories"))).toBe(true);
    });

    it("produces CVE evidence with AvailableEvidence shape", async () => {
      globalThis.fetch = mockFetchBoth();
      const result = await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      const cves = result.evidence.filter(e => e.sourceId.startsWith("nvd-"));
      expect(cves.length).toBeGreaterThanOrEqual(2);
      const first = cves.find(e => e.sourceId === "nvd-CVE-2026-1234")!;
      expect(first.subject).toBe("security-vulnerability");
      expect(first.metrics).toContain("CRITICAL");
      expect(first.metrics).toContain("CVE-2026-1234");
      expect(typeof first.richness).toBe("number");
      expect(typeof first.freshness).toBe("number");
      expect(first.stale).toBe(false);
    });

    it("produces GitHub advisory evidence with AvailableEvidence shape", async () => {
      globalThis.fetch = mockFetchBoth();
      const result = await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      const ghs = result.evidence.filter(e => e.sourceId.startsWith("ghsa-"));
      expect(ghs.length).toBeGreaterThanOrEqual(2);
      const first = ghs.find(e => e.sourceId === "ghsa-GHSA-abcd-1234-efgh")!;
      expect(first.subject).toBe("security-advisory");
      expect(typeof first.richness).toBe("number");
      expect(first.stale).toBe(false);
    });

    it("handles fetch failures gracefully (try/catch)", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));
      const result = await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      expect(result).toBeDefined();
      expect(result.colonyState).toBeDefined();
    });

    it("handles NVD non-ok response without CVE evidence", async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes("nvd.nist.gov")) return { ok: false, status: 503 };
        if (String(url).includes("github.com")) return { ok: true, json: async () => MOCK_GHSA };
        return { ok: true, json: async () => ({}) };
      });
      const result = await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      expect(result.evidence.filter(e => e.sourceId.startsWith("nvd-"))).toHaveLength(0);
      expect(result.evidence.filter(e => e.sourceId.startsWith("ghsa-")).length).toBeGreaterThanOrEqual(2);
    });

    it("runs NVD + GHSA fetches in parallel with strategy observe", async () => {
      const mf = mockFetchEmpty();
      globalThis.fetch = mf;
      await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      // Both NVD and GitHub should be called
      expect(mf).toHaveBeenCalledTimes(2);
    });

    it("is null-safe when all API calls and fetches fail", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("down"));
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
      globalThis.fetch = mockFetchEmpty();
      const result = await learnFirstObserve(createMockToolkit(), "0xTEST", STRATEGY_PATH);
      expect(result.context).toBeDefined();
    });
  });
});
