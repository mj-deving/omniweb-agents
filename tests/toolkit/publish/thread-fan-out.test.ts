import { describe, expect, it } from "vitest";

import { planThreadFanOut, scoreAttestability } from "../../../src/toolkit/publish/thread-fan-out.js";
import type { StructuredClaim } from "../../../src/toolkit/publish/types.js";

function makeClaim(overrides: Partial<StructuredClaim> = {}): StructuredClaim {
  return {
    identity: { chain: "eth:1", address: null, market: null, entityId: null, metric: "price_usd" },
    subject: "bitcoin",
    value: 65000,
    unit: "USD",
    direction: null,
    dataTimestamp: null,
    sourceField: "price",
    type: "factual",
    ...overrides,
  };
}

describe("scoreAttestability", () => {
  it("scores factual numeric claim with source field highest", () => {
    const score = scoreAttestability(makeClaim({ type: "factual", value: 100, sourceField: "price" }));
    expect(score).toBe(100); // 50 + 30 + 20
  });

  it("scores factual numeric claim without source field", () => {
    const score = scoreAttestability(makeClaim({ type: "factual", value: 100, sourceField: null }));
    expect(score).toBe(80); // 50 + 30
  });

  it("scores factual null-value claim lower", () => {
    const score = scoreAttestability(makeClaim({ type: "factual", value: null, sourceField: null }));
    expect(score).toBe(50); // 50 only
  });

  it("scores editorial claim lowest", () => {
    const score = scoreAttestability(makeClaim({ type: "editorial", value: null, sourceField: null }));
    expect(score).toBe(0);
  });
});

describe("planThreadFanOut", () => {
  it("throws on zero claims", () => {
    expect(() => planThreadFanOut([])).toThrow("Cannot plan thread fan-out with zero claims");
  });

  it("passes through single-claim drafts without fan-out", () => {
    const claim = makeClaim();
    const plan = planThreadFanOut([claim]);

    expect(plan.rootClaim).toBe(claim);
    expect(plan.replyClaims).toHaveLength(0);
    expect(plan.totalClaims).toBe(1);
    expect(plan.fanOutApplied).toBe(false);
  });

  it("selects highest attestability claim as root", () => {
    const editorial = makeClaim({ subject: "opinion", type: "editorial", value: null, sourceField: null });
    const factualNoSource = makeClaim({ subject: "hash_rate", type: "factual", value: 877.9, sourceField: null });
    const factualFull = makeClaim({ subject: "price", type: "factual", value: 65000, sourceField: "price_usd" });

    const plan = planThreadFanOut([editorial, factualNoSource, factualFull]);

    expect(plan.rootClaim).toBe(factualFull); // score 100
    expect(plan.replyClaims[0]).toBe(factualNoSource); // score 80
    expect(plan.replyClaims[1]).toBe(editorial); // score 0
    expect(plan.fanOutApplied).toBe(true);
    expect(plan.totalClaims).toBe(3);
  });

  it("caps replies at maxClaimsPerThread - 1", () => {
    const claims = Array.from({ length: 8 }, (_, i) =>
      makeClaim({ subject: `claim-${i}`, value: i * 10 }),
    );

    const plan = planThreadFanOut(claims, { maxClaimsPerThread: 3 });

    // Root + 2 replies = 3 total (capped)
    expect(plan.replyClaims).toHaveLength(2);
    expect(plan.totalClaims).toBe(8);
    expect(plan.fanOutApplied).toBe(true);
  });

  it("uses default max of 5 claims per thread", () => {
    const claims = Array.from({ length: 10 }, (_, i) =>
      makeClaim({ subject: `claim-${i}`, value: i * 10 }),
    );

    const plan = planThreadFanOut(claims);

    // Root + 4 replies = 5 total (default cap)
    expect(plan.replyClaims).toHaveLength(4);
  });

  it("handles two claims as root + one reply", () => {
    const claim1 = makeClaim({ subject: "a", value: 100, sourceField: "price" }); // score 100
    const claim2 = makeClaim({ subject: "b", value: 50, sourceField: null }); // score 80

    const plan = planThreadFanOut([claim2, claim1]);

    expect(plan.rootClaim).toBe(claim1);
    expect(plan.replyClaims).toEqual([claim2]);
    expect(plan.fanOutApplied).toBe(true);
  });

  it("does not mutate the original claims array", () => {
    const claims = [
      makeClaim({ subject: "z", type: "editorial", value: null, sourceField: null }),
      makeClaim({ subject: "a", type: "factual", value: 100, sourceField: "price" }),
    ];
    const originalFirst = claims[0];

    planThreadFanOut(claims);

    expect(claims[0]).toBe(originalFirst); // Not reordered
  });
});
