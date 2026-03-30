import { describe, expect, it } from "vitest";

import {
  ASSET_MAP,
  MACRO_ENTITY_MAP,
  inferAssetAlias,
  inferMacroEntity,
} from "../../../src/toolkit/chain/asset-helpers.js";
import * as attestationPolicy from "../../../src/lib/attestation/attestation-policy.js";

describe("toolkit chain asset helpers", () => {
  it("exports populated asset and macro lookup tables", () => {
    expect(ASSET_MAP.length).toBeGreaterThan(10);
    expect(MACRO_ENTITY_MAP.length).toBeGreaterThan(5);
  });

  it("infers crypto asset aliases without colliding with plain english", () => {
    expect(inferAssetAlias("bitcoin price outlook")).toEqual({
      asset: "bitcoin",
      symbol: "BTC",
    });
    expect(inferAssetAlias("chainlink price breakout")).toEqual({
      asset: "chainlink",
      symbol: "LINK",
    });
    expect(inferAssetAlias("open the link in a new tab")).toBeNull();
  });

  it("infers macro entities for non-crypto claims", () => {
    expect(inferMacroEntity("GDP growth")).toEqual({
      series: "GDP",
      indicator: "NY.GDP.MKTP.CD",
      asset: "gdp",
    });
    expect(inferMacroEntity("unemployment rate at 4.2%")).toEqual({
      series: "UNRATE",
      indicator: "SL.UEM.TOTL.ZS",
      asset: "unemployment",
    });
    expect(inferMacroEntity("bitcoin")).toBeNull();
  });

  it("keeps attestation-policy aligned with the toolkit helpers", () => {
    expect(attestationPolicy.inferAssetAlias("ethereum")).toEqual(
      inferAssetAlias("ethereum")
    );
    expect(attestationPolicy.inferMacroEntity("inflation")).toEqual(
      inferMacroEntity("inflation")
    );
  });
});
