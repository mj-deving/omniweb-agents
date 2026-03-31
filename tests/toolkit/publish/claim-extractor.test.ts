import { describe, expect, it } from "vitest";

import { extractClaimsRegex } from "../../../src/toolkit/publish/claim-extractor.js";

describe("extractClaimsRegex", () => {
  it("extracts a dollar TVL claim as a factual numeric claim", () => {
    const result = extractClaimsRegex("Compound TVL is now $1.4B across Ethereum.");

    expect(result.needsLlmTier).toBe(false);
    expect(result.regexClaimCount).toBe(1);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].subject).toBe("compound");
    expect(result.claims[0].identity.metric).toBe("tvl");
    expect(result.claims[0].value).toBe(1_400_000_000);
    expect(result.claims[0].unit).toBe("USD");
    expect(result.claims[0].type).toBe("factual");
  });

  it("extracts hash rate claims with EH/s units", () => {
    const result = extractClaimsRegex("Bitcoin hash rate is at 877.9 EH/s today.");

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].subject).toBe("bitcoin");
    expect(result.claims[0].identity.metric).toBe("hash_rate");
    expect(result.claims[0].sourceField).toBe("hash_rate");
    expect(result.claims[0].value).toBe(877.9);
    expect(result.claims[0].unit).toBe("EH/s");
  });

  it("returns needsLlmTier when regex finds no factual claims", () => {
    const result = extractClaimsRegex("Market is bullish.");

    expect(result.claims).toEqual([]);
    expect(result.regexClaimCount).toBe(0);
    expect(result.needsLlmTier).toBe(true);
  });

  it("extracts multiplier+unit forms like 1.4B USD and 900K BTC", () => {
    const result = extractClaimsRegex("Compound TVL is 1.4B USD across Ethereum.");
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].value).toBe(1_400_000_000);
    expect(result.claims[0].unit).toBe("USD");

    const result2 = extractClaimsRegex("Bitcoin supply is 900K BTC.");
    expect(result2.claims).toHaveLength(1);
    expect(result2.claims[0].value).toBe(900_000);
    expect(result2.claims[0].unit).toBe("BTC");
  });

  it("extracts multiple claims from one draft", () => {
    const result = extractClaimsRegex(
      "Bitcoin hash rate hit 877.9 EH/s while Compound TVL reached $1.4B and gas dropped to 12 gwei."
    );

    expect(result.regexClaimCount).toBe(3);
    expect(result.claims.map((claim) => claim.identity.metric).sort()).toEqual([
      "gas_price",
      "hash_rate",
      "tvl",
    ]);
    expect(result.claims.some((claim) => claim.identity.metric === "hash_rate" && claim.value === 877.9)).toBe(true);
    expect(result.claims.some((claim) => claim.identity.metric === "tvl" && claim.value === 1_400_000_000)).toBe(true);
    expect(result.claims.some((claim) => claim.identity.metric === "gas_price" && claim.value === 12)).toBe(true);
  });
});
