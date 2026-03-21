/**
 * Tests for attestation planner (Phase 3) and value verifier (Phase 4).
 */

import { describe, it, expect } from "vitest";
import {
  buildAttestationPlan,
  resolveAttestationBudget,
  verifyAttestedValues,
} from "../src/lib/attestation-planner.js";
import type { ExtractedClaim } from "../src/lib/claim-extraction.js";
import type { ProviderAdapter, SurgicalCandidate } from "../src/lib/sources/providers/types.js";
import type { AgentSourceView, SourceRecordV2 } from "../src/lib/sources/catalog.js";

// ── Helpers ─────────────────────────────────────────

function makeClaim(overrides: Partial<ExtractedClaim> = {}): ExtractedClaim {
  return {
    text: "BTC at $64,231",
    type: "price",
    entities: ["bitcoin", "BTC"],
    value: 64231,
    unit: "USD",
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<SurgicalCandidate> = {}): SurgicalCandidate {
  return {
    claim: makeClaim(),
    url: "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
    estimatedSizeBytes: 512,
    method: "GET",
    extractionPath: "$.price",
    provider: "binance",
    rateLimitBucket: "binance",
    ...overrides,
  };
}

function makeSource(provider: string): SourceRecordV2 {
  return {
    id: `test-${provider}`,
    name: `Test ${provider}`,
    url: `https://api.${provider}.com`,
    provider,
    adapter: { operation: "ticker-price" },
    topics: ["crypto"],
    status: "active",
    responseFormat: "json",
    attestation: { tlsn: true, dahr: true },
  } as any;
}

function makeAdapter(provider: string, surgicalResult: SurgicalCandidate | null): ProviderAdapter {
  return {
    provider,
    domains: ["crypto"],
    rateLimit: { bucket: provider },
    supports: () => true,
    buildCandidates: () => [],
    validateCandidate: () => ({ ok: true }),
    parseResponse: () => ({ entries: [] }),
    buildSurgicalUrl: () => surgicalResult,
  };
}

function makeSourceView(sources: SourceRecordV2[]): AgentSourceView {
  return { agent: "sentinel", sources, enabledTopics: [] } as any;
}

// ── Budget Tests ────────────────────────────────────

describe("resolveAttestationBudget", () => {
  it("returns defaults when no config", () => {
    const budget = resolveAttestationBudget();
    expect(budget.maxCostPerPost).toBe(15);
    expect(budget.maxTlsnPerPost).toBe(1);
    expect(budget.maxDahrPerPost).toBe(3);
    expect(budget.maxAttestationsPerPost).toBe(4);
  });

  it("uses config values when provided", () => {
    const budget = resolveAttestationBudget({
      attestation: { budget: { maxCostPerPost: 20, maxTlsnPerPost: 2 } },
    });
    expect(budget.maxCostPerPost).toBe(20);
    expect(budget.maxTlsnPerPost).toBe(2);
    expect(budget.maxDahrPerPost).toBe(3); // default
  });

  it("falls back to defaults for bad values", () => {
    const budget = resolveAttestationBudget({
      attestation: { budget: { maxCostPerPost: -5 } },
    });
    expect(budget.maxCostPerPost).toBe(15);
  });
});

// ── Planner Tests ───────────────────────────────────

describe("buildAttestationPlan", () => {
  it("returns null when no claims", () => {
    const result = buildAttestationPlan(
      [],
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map([["binance", makeAdapter("binance", makeCandidate())]]),
    );
    expect(result).toBeNull();
  });

  it("returns null when no adapters", () => {
    const result = buildAttestationPlan(
      [makeClaim()],
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map(),
    );
    expect(result).toBeNull();
  });

  it("returns null when no surgical candidates found", () => {
    const result = buildAttestationPlan(
      [makeClaim()],
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map([["binance", makeAdapter("binance", null)]]),
    );
    expect(result).toBeNull();
  });

  it("selects primary from highest-priority claim type", () => {
    const priceClaim = makeClaim({ type: "price", value: 64231 });
    const metricClaim = makeClaim({ type: "metric", value: 45, unit: "%" });
    const priceCandidate = makeCandidate({ claim: priceClaim });
    const metricCandidate = makeCandidate({
      claim: metricClaim,
      url: "https://other.com",
    });

    // Adapter returns different candidates based on claim type
    const adapter: ProviderAdapter = {
      ...makeAdapter("binance", null),
      buildSurgicalUrl: (claim) =>
        claim.type === "price" ? priceCandidate : metricCandidate,
    };

    const result = buildAttestationPlan(
      [metricClaim, priceClaim], // metric first, but price has higher priority
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map([["binance", adapter]]),
    );

    expect(result).not.toBeNull();
    expect(result!.primary.claim.type).toBe("price");
  });

  it("respects maxAttestationsPerPost budget", () => {
    const claims = [
      makeClaim({ type: "price", value: 1 }),
      makeClaim({ type: "metric", value: 2, unit: "%" }),
      makeClaim({ type: "event" }),
    ];

    const adapter: ProviderAdapter = {
      ...makeAdapter("binance", null),
      buildSurgicalUrl: (claim) => makeCandidate({
        claim,
        url: `https://api.com/${claim.type}`,
      }),
    };

    const result = buildAttestationPlan(
      claims,
      makeSourceView([makeSource("binance")]),
      { attestation: { budget: { maxAttestationsPerPost: 2 } } },
      new Map([["binance", adapter]]),
    );

    expect(result).not.toBeNull();
    // 1 primary + 1 secondary = 2 (budget limit)
    expect(1 + result!.secondary.length).toBe(2);
  });

  it("tracks unattested claims", () => {
    const adapter: ProviderAdapter = {
      ...makeAdapter("binance", null),
      buildSurgicalUrl: (claim) =>
        claim.type === "price" ? makeCandidate({ claim }) : null,
    };

    const result = buildAttestationPlan(
      [makeClaim({ type: "price" }), makeClaim({ type: "metric" })],
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map([["binance", adapter]]),
    );

    expect(result).not.toBeNull();
    expect(result!.unattested).toHaveLength(1);
    expect(result!.unattested[0].type).toBe("metric");
  });

  it("sets plannedMethod on selected candidates", () => {
    const adapter: ProviderAdapter = {
      ...makeAdapter("binance", null),
      buildSurgicalUrl: (claim) => makeCandidate({ claim }),
    };

    const result = buildAttestationPlan(
      [makeClaim({ type: "price" })],
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map([["binance", adapter]]),
    );

    expect(result).not.toBeNull();
    expect(result!.primary.plannedMethod).toBeDefined();
    expect(["TLSN", "DAHR"]).toContain(result!.primary.plannedMethod);
  });

  it("skips trend and quote claims (no priority defined)", () => {
    const result = buildAttestationPlan(
      [makeClaim({ type: "trend" }), makeClaim({ type: "quote" })],
      makeSourceView([makeSource("binance")]),
      undefined,
      new Map([["binance", makeAdapter("binance", makeCandidate())]]),
    );
    expect(result).toBeNull();
  });
});

// ── Verifier Tests (Phase 4) ────────────────────────

describe("verifyAttestedValues", () => {
  it("verifies price within 2% tolerance", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "price", value: 64231 }),
      extractionPath: "$.price",
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: { price: "64500" } }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(true);
    expect(results[0].drift).toBeDefined();
    expect(results[0].drift!).toBeLessThan(0.02);
  });

  it("rejects price outside 2% tolerance", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "price", value: 64231 }),
      extractionPath: "$.price",
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: { price: "70000" } }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(false);
    expect(results[0].failureReason).toContain("tolerance");
  });

  it("verifies metric within 5% tolerance", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "metric", value: 100, unit: "%" }),
      extractionPath: "$.value",
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: { value: 104 } }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(true);
    expect(results[0].drift!).toBeLessThan(0.05);
  });

  it("trend claims always pass", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "trend", value: undefined }),
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: { some: "data" } }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(true);
  });

  it("missing data fails verification", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "price", value: 64231 }),
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: undefined }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(false);
    expect(results[0].failureReason).toContain("no data");
  });

  it("missing extractionPath passes gracefully", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "price", value: 64231 }),
      extractionPath: "",
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: { price: 99999 } }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(true);
  });

  it("nested JSON extraction with templated path", () => {
    const candidate = makeCandidate({
      claim: makeClaim({ type: "price", value: 64231 }),
      extractionPath: "$.bitcoin.usd",
    });

    const results = verifyAttestedValues(
      [{ url: candidate.url, data: { bitcoin: { usd: 64300 } } }],
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(true);
    expect(results[0].attestedValue).toBe(64300);
  });

  it("missing attestation result marks as failed", () => {
    const candidate = makeCandidate();

    const results = verifyAttestedValues(
      [], // no attestation results
      [candidate],
    );

    expect(results).toHaveLength(1);
    expect(results[0].verified).toBe(false);
    expect(results[0].failureReason).toContain("No attestation result");
  });
});
