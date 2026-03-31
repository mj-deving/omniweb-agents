import { describe, expect, it } from "vitest";

import { extractClaimsRegex } from "../../../src/toolkit/publish/claim-extractor.js";
import { runFaithfulnessGate } from "../../../src/toolkit/publish/faithfulness-gate.js";
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
      price_usd: 64_000,
      tvl: 1_400_000_000,
    },
    timestamp: "2026-03-31T10:00:00.000Z",
    method: "dahr",
    ...overrides,
  };
}

describe("runFaithfulnessGate", () => {
  it("passes on exact value match", () => {
    const draft = "Bitcoin hash rate is 877.9 EH/s.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [makeAttestation()],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(true);
    expect(result.attestationTxHash).toBe("0xattestation");
    expect(result.matchedMetric).toBe("hash_rate");
    expect(result.matchedValue).toBe(877.9);
  });

  it("passes when value drift is within 1%", () => {
    const draft = "Bitcoin hash rate is 886.6 EH/s.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [makeAttestation()],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("fails when value drift exceeds 2% and suggests a revision", () => {
    const draft = "Bitcoin hash rate is 904.3 EH/s.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [makeAttestation()],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("value drift");
    expect(result.suggestedRevision).toEqual({
      field: "hash_rate",
      correctValue: 877.9,
    });
  });

  it("fails when the attestation subject does not match the claim subject", () => {
    const draft = "Ethereum hash rate is 877.9 EH/s.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [makeAttestation({ sourceId: "bitcoin-network-stats", data: { asset: "bitcoin", hash_rate: 877.9 } })],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("no attestation found");
  });

  it("fails on stale data", () => {
    const draft = "Bitcoin hash rate is 877.9 EH/s.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [makeAttestation({ timestamp: "2026-03-31T00:00:00.000Z" })],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("attested data is");
    expect(result.reason).toContain("hash_rate");
  });

  it("fails when extra factual claims are not attested", () => {
    const draft = "Bitcoin hash rate is 877.9 EH/s and Compound TVL is $1.4B.";
    const extraction = extractClaimsRegex(draft);
    const primaryClaim = extraction.claims.find((claim) => claim.identity.metric === "hash_rate");
    const result = runFaithfulnessGate(
      draft,
      primaryClaim!,
      [makeAttestation()],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(false);
    expect(result.reason).toContain("unattested factual claim");
    expect(result.contaminatedClaims).toHaveLength(1);
    expect(result.contaminatedClaims![0].identity.metric).toBe("tvl");
  });

  it("handles sub-1 attested values with max(abs,1) denominator", () => {
    const draft = "Bitcoin fee rate is 0.00103%.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [makeAttestation({ data: { asset: "bitcoin", symbol: "BTC", percentage: 0.001 } })],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    // max(abs(0.001), 1) = 1, drift = abs(0.00103 - 0.001) / 1 = 0.00003, well under 2%
    expect(result.pass).toBe(true);
  });

  it("prefers best value match over newest attestation", () => {
    const draft = "Bitcoin hash rate is 877.9 EH/s.";
    const extraction = extractClaimsRegex(draft);
    const result = runFaithfulnessGate(
      draft,
      extraction.claims[0],
      [
        makeAttestation({ txHash: "0xnew", data: { asset: "bitcoin", symbol: "BTC", hash_rate: 900 }, timestamp: "2026-03-31T10:30:00.000Z" }),
        makeAttestation({ txHash: "0xold", data: { asset: "bitcoin", symbol: "BTC", hash_rate: 877.9 }, timestamp: "2026-03-31T10:00:00.000Z" }),
      ],
      { now: new Date("2026-03-31T11:00:00.000Z"), allClaims: extraction.claims },
    );

    expect(result.pass).toBe(true);
    expect(result.attestationTxHash).toBe("0xold");
  });
});
