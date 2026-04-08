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

  it("matches SOL only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("SOL price rally")).toEqual({ asset: "solana", symbol: "SOL" });
    expect(inferAssetAlias("solana ecosystem growth")).toEqual({ asset: "solana", symbol: "SOL" });
    // Lowercase "sol" should NOT match (collides with Spanish word)
    expect(inferAssetAlias("sol is a common word")).toBeNull();
  });

  it("matches DOT only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("DOT staking rewards")).toEqual({ asset: "polkadot", symbol: "DOT" });
    expect(inferAssetAlias("polkadot parachain")).toEqual({ asset: "polkadot", symbol: "DOT" });
    expect(inferAssetAlias("connect the dot")).toBeNull();
  });

  it("matches LINK only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("LINK oracle integration")).toEqual({ asset: "chainlink", symbol: "LINK" });
    expect(inferAssetAlias("click the link below")).toBeNull();
  });

  it("matches UNI only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("UNI governance vote")).toEqual({ asset: "uniswap", symbol: "UNI" });
    expect(inferAssetAlias("uni students")).toBeNull();
  });

  it("matches ATOM only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("ATOM IBC transfers")).toEqual({ asset: "cosmos", symbol: "ATOM" });
    expect(inferAssetAlias("atom is the smallest unit")).toBeNull();
  });

  it("matches NEAR only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("NEAR protocol sharding")).toEqual({ asset: "near", symbol: "NEAR" });
    expect(inferAssetAlias("near the finish line")).toBeNull();
  });

  it("matches OP only as uppercase ticker (case-sensitive)", () => {
    expect(inferAssetAlias("OP superchain")).toEqual({ asset: "optimism", symbol: "OP" });
    expect(inferAssetAlias("op is slang")).toBeNull();
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
