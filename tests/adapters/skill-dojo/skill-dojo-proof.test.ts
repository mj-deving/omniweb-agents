import { describe, it, expect } from "vitest";
import { extractProofs } from "../../../src/lib/skill-dojo-proof.js";

describe("extractProofs", () => {
  it("extracts defi-agent dahrAttestation shape", () => {
    const data = {
      dahrAttestation: {
        attested: true,
        api: "Binance order book",
        responseHash: "86307d3d",
        txHash: "acbd52d4",
        explorerUrl: "https://explorer.demos.sh/tx/acbd52",
      },
    };

    const proofs = extractProofs(data);
    expect(proofs).toHaveLength(1);
    expect(proofs[0]).toEqual({
      attested: true,
      source: "Binance order book",
      responseHash: "86307d3d",
      txHash: "acbd52d4",
      explorerUrl: "https://explorer.demos.sh/tx/acbd52",
    });
  });

  it("extracts prediction-market demosAttestation.proofs shape", () => {
    const data = {
      demosAttestation: {
        proofs: {
          polymarket: {
            responseHash: "5d87e7",
            source: "gamma-api.polymarket.com",
            marketsAttested: 16,
            explorerUrl: "https://explorer.demos.sh/tx/poly123",
          },
          kalshi: {
            responseHash: "736a18",
            marketsAttested: 0,
            explorerUrl: "https://explorer.demos.sh/tx/kalshi456",
          },
        },
      },
    };

    const proofs = extractProofs(data);
    expect(proofs).toHaveLength(2);
    expect(proofs[0]).toEqual({
      attested: true,
      source: "gamma-api.polymarket.com",
      responseHash: "5d87e7",
      txHash: undefined,
      explorerUrl: "https://explorer.demos.sh/tx/poly123",
    });
    expect(proofs[1]).toEqual({
      attested: true,
      source: "kalshi",
      responseHash: "736a18",
      txHash: undefined,
      explorerUrl: "https://explorer.demos.sh/tx/kalshi456",
    });
  });

  it("extracts generic attestation shape", () => {
    const data = {
      attestation: {
        attested: true,
        source: "generic-api",
        responseHash: "abc123",
      },
    };

    const proofs = extractProofs(data);
    expect(proofs).toHaveLength(1);
    expect(proofs[0].source).toBe("generic-api");
    expect(proofs[0].attested).toBe(true);
  });

  it("extracts generic proof shape", () => {
    const data = {
      proof: {
        attested: false,
        source: "test-source",
        txHash: "tx123",
      },
    };

    const proofs = extractProofs(data);
    expect(proofs).toHaveLength(1);
    expect(proofs[0].attested).toBe(false);
    expect(proofs[0].txHash).toBe("tx123");
  });

  it("returns empty array for null/undefined", () => {
    expect(extractProofs(null)).toEqual([]);
    expect(extractProofs(undefined)).toEqual([]);
  });

  it("returns empty array for non-object", () => {
    expect(extractProofs("string")).toEqual([]);
    expect(extractProofs(42)).toEqual([]);
  });

  it("returns empty array when no proof fields found", () => {
    expect(extractProofs({ someData: "value" })).toEqual([]);
    expect(extractProofs({})).toEqual([]);
  });

  it("handles dahrAttestation with missing optional fields", () => {
    const data = {
      dahrAttestation: {
        attested: true,
        api: "minimal",
      },
    };

    const proofs = extractProofs(data);
    expect(proofs).toHaveLength(1);
    expect(proofs[0].responseHash).toBeUndefined();
    expect(proofs[0].txHash).toBeUndefined();
    expect(proofs[0].explorerUrl).toBeUndefined();
  });
});
