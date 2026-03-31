import { describe, expect, it } from "vitest";

import { runSignalFirstPipeline } from "../../../src/toolkit/publish/signal-first-pipeline.js";
import type { PublishAttestation } from "../../../src/toolkit/publish/types.js";

function makeAttestation(
  overrides: Partial<PublishAttestation> = {},
): PublishAttestation {
  return {
    txHash: "0xattestation",
    sourceId: "bitcoin-network-stats",
    data: {
      asset: "bitcoin",
      symbol: "BTC",
      hash_rate: 877.9,
    },
    timestamp: "2026-03-31T10:00:00.000Z",
    method: "tlsn",
    ...overrides,
  };
}

describe("runSignalFirstPipeline", () => {
  it("returns PROCEED for an attestable supported claim", () => {
    const result = runSignalFirstPipeline({
      draftText: "Bitcoin hash rate is 877.9 EH/s.",
      attestations: [makeAttestation()],
    }, {
      now: new Date("2026-03-31T11:00:00.000Z"),
    });

    expect(result.decision).toBe("PROCEED");
    expect(result.primaryClaim?.identity.metric).toBe("hash_rate");
    expect(result.faithfulness?.pass).toBe(true);
  });

  it("returns REVISE when the primary claim drifts from attested data", () => {
    const result = runSignalFirstPipeline({
      draftText: "Bitcoin hash rate is 904.3 EH/s.",
      attestations: [makeAttestation()],
    }, {
      now: new Date("2026-03-31T11:00:00.000Z"),
    });

    expect(result.decision).toBe("REVISE");
    expect(result.faithfulness?.suggestedRevision).toEqual({
      field: "hash_rate",
      correctValue: 877.9,
    });
  });

  it("returns DITCH when the draft has no factual claims", () => {
    const result = runSignalFirstPipeline({
      draftText: "Market is bullish.",
      attestations: [makeAttestation()],
    }, {
      now: new Date("2026-03-31T11:00:00.000Z"),
    });

    expect(result.decision).toBe("DITCH");
    expect(result.primaryClaim).toBeNull();
    expect(result.reason).toContain("LLM tier");
  });

  it("returns REVISE when the draft is contaminated by unattested factual claims", () => {
    const result = runSignalFirstPipeline({
      draftText: "Bitcoin hash rate is 877.9 EH/s and Compound TVL is $1.4B.",
      attestations: [makeAttestation()],
    }, {
      now: new Date("2026-03-31T11:00:00.000Z"),
    });

    expect(result.decision).toBe("REVISE");
    expect(result.faithfulness?.pass).toBe(false);
    expect(result.faithfulness?.contaminatedClaims).toHaveLength(1);
    expect(result.reason).toContain("unattested factual claim");
  });
});
