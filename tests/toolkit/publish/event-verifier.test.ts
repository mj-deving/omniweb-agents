import { describe, expect, it } from "vitest";

import { verifyEventClaim } from "../../../src/toolkit/publish/event-verifier.js";
import { runFaithfulnessGate } from "../../../src/toolkit/publish/faithfulness-gate.js";
import type { PublishAttestation, StructuredClaim } from "../../../src/toolkit/publish/types.js";

function makeEventClaim(
  overrides: Partial<StructuredClaim> = {},
): StructuredClaim {
  return {
    identity: {
      chain: "eth:1",
      address: null,
      market: null,
      entityId: "247",
      metric: "proposal_state",
      ...overrides.identity,
    },
    subject: "aave",
    value: null,
    unit: "none",
    direction: null,
    dataTimestamp: null,
    sourceField: "state",
    type: "editorial",
    ...overrides,
  };
}

function makeAttestation(
  overrides: Partial<PublishAttestation> = {},
): PublishAttestation {
  return {
    txHash: "0xevent",
    sourceId: "aave-governance",
    data: {
      protocol: "aave",
      proposal_id: 247,
      state: "executed",
    },
    timestamp: "2026-03-31T10:00:00.000Z",
    method: "dahr",
    ...overrides,
  };
}

describe("verifyEventClaim", () => {
  it("passes tier 1 on exact entity binding with a positive state", () => {
    const claim = makeEventClaim();

    const result = verifyEventClaim(claim, {
      proposal_id: 247,
      state: "executed",
      protocol: "aave",
    });

    expect(result).toMatchObject({
      pass: true,
      tier: "field_match",
      promotable: true,
    });
    expect(result.evidence).toContain("state = executed");
  });

  it("fails tier 1 when the attested entity does not match the claim", () => {
    const claim = makeEventClaim();

    const result = verifyEventClaim(claim, {
      proposal_id: 248,
      state: "executed",
      protocol: "aave",
    });

    expect(result).toMatchObject({
      pass: false,
      tier: "field_match",
      promotable: false,
    });
    expect(result.reason).toContain("entity mismatch");
  });

  it("fails tier 1 when the attested state contradicts the claim", () => {
    const claim = makeEventClaim();

    const result = verifyEventClaim(claim, {
      proposal_id: 247,
      state: "defeated",
      protocol: "aave",
    });

    expect(result).toMatchObject({
      pass: false,
      tier: "field_match",
      promotable: false,
    });
    expect(result.reason).toContain("defeated");
  });

  it("passes tier 2 when at least 60% of keywords appear in the attested data", () => {
    const claim = makeEventClaim({
      subject: "ethereum dencun upgrade",
      identity: {
        chain: "eth:1",
        address: null,
        market: null,
        entityId: "dencun",
        metric: "upgrade_status",
      },
      sourceField: "upgradePhase",
    });

    const result = verifyEventClaim(claim, {
      network: "ethereum",
      headline: "Dencun upgrade schedule",
      summary: "Ethereum Dencun rollout update",
    });

    expect(result).toMatchObject({
      pass: true,
      tier: "keyword",
      promotable: false,
    });
    expect(result.evidence).toContain("keywords");
  });

  it("fails tier 2 when keyword containment stays below the threshold", () => {
    const claim = makeEventClaim({
      subject: "ethereum dencun upgrade",
      identity: {
        chain: "eth:1",
        address: null,
        market: null,
        entityId: "dencun",
        metric: "upgrade_status",
      },
      sourceField: "upgradePhase",
    });

    const result = verifyEventClaim(claim, {
      headline: "Ethereum roadmap update",
      summary: "Protocol timelines remain under discussion",
    });

    expect(result.pass).toBe(false);
    expect(result.tier).toBe("llm_semantic");
  });

  it("returns the tier 3 placeholder type when earlier tiers do not verify the claim", () => {
    const claim = makeEventClaim({
      subject: "sec approved bitcoin etf",
      identity: {
        chain: "web2",
        address: null,
        market: null,
        entityId: "spot-bitcoin-etf",
        metric: "listing_status",
      },
      sourceField: "approvalStatus",
    });

    const result = verifyEventClaim(claim, {
      headline: "Commodity markets remain mixed",
      summary: "No ETF decision was referenced in the attested data",
    });

    expect(result).toEqual({
      pass: false,
      tier: "llm_semantic",
      promotable: false,
      reason: "semantic verification not implemented; claim remains editorial",
    });
  });
});

describe("runFaithfulnessGate event verification", () => {
  it("passes when a null-value primary claim is promotable via tier 1 event verification", () => {
    const claim = makeEventClaim();

    const result = runFaithfulnessGate(
      "Aave proposal #247 passed.",
      claim,
      [makeAttestation()],
      {
        now: new Date("2026-03-31T11:00:00.000Z"),
        allClaims: [claim],
      },
    );

    expect(result.pass).toBe(true);
    expect(result.attestationTxHash).toBe("0xevent");
    expect(result.matchedMetric).toBe("proposal_state");
    expect(result.matchedValue).toBeUndefined();
  });

  it("fails when a null-value primary claim only reaches a non-promotable verification tier", () => {
    const claim = makeEventClaim();

    const result = runFaithfulnessGate(
      "Aave proposal #247 passed.",
      claim,
      [makeAttestation({
        data: {
          protocol: "aave",
          title: "Aave proposal 247 governance update",
        },
      })],
      {
        now: new Date("2026-03-31T11:00:00.000Z"),
        allClaims: [claim],
      },
    );

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("non-numeric claim");
  });
});
