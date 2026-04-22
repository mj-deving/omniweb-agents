import { describe, expect, it } from "vitest";

import {
  buildResearchMatrixEvaluationFamilies,
  chooseResearchMatrixOpportunity,
  selectResearchMatrixBroadcastFamily,
  type ResearchMatrixFamily,
} from "../../packages/omniweb-toolkit/scripts/_research-matrix-broadcast";

describe("selectResearchMatrixBroadcastFamily", () => {
  it("uses the requested family when it is ready", () => {
    expect(
      selectResearchMatrixBroadcastFamily({
        requestedFamily: "macro-liquidity",
        fallbackFamilies: ["vix-credit"],
        readyFamilies: ["macro-liquidity", "vix-credit"],
      }),
    ).toEqual({
      requestedFamily: "macro-liquidity",
      selectedFamily: "macro-liquidity",
      usedFallback: false,
    });
  });

  it("falls back to the first ready fallback family when requested family is not ready", () => {
    expect(
      selectResearchMatrixBroadcastFamily({
        requestedFamily: "macro-liquidity",
        fallbackFamilies: ["vix-credit", "etf-flows"],
        readyFamilies: ["vix-credit"],
      }),
    ).toEqual({
      requestedFamily: "macro-liquidity",
      selectedFamily: "vix-credit",
      usedFallback: true,
    });
  });

  it("returns no selection when nothing is ready", () => {
    expect(
      selectResearchMatrixBroadcastFamily({
        requestedFamily: "macro-liquidity",
        fallbackFamilies: ["vix-credit"],
        readyFamilies: [],
      }),
    ).toEqual({
      requestedFamily: "macro-liquidity",
      selectedFamily: null,
      usedFallback: false,
    });
  });

  it("does nothing when no requested family is provided", () => {
    expect(
      selectResearchMatrixBroadcastFamily({
        requestedFamily: null,
        fallbackFamilies: ["vix-credit"],
        readyFamilies: ["vix-credit"],
      }),
    ).toEqual({
      requestedFamily: null,
      selectedFamily: null,
      usedFallback: false,
    });
  });

  it("ignores duplicate fallback entries", () => {
    const readyFamilies: ResearchMatrixFamily[] = ["vix-credit"];
    expect(
      selectResearchMatrixBroadcastFamily({
        requestedFamily: "macro-liquidity",
        fallbackFamilies: ["vix-credit", "vix-credit"],
        readyFamilies,
      }),
    ).toEqual({
      requestedFamily: "macro-liquidity",
      selectedFamily: "vix-credit",
      usedFallback: true,
    });
  });
});

describe("buildResearchMatrixEvaluationFamilies", () => {
  it("limits evaluation to requested family plus fallbacks when broadcasting", () => {
    expect(
      buildResearchMatrixEvaluationFamilies({
        requestedFamily: "macro-liquidity",
        fallbackFamilies: ["vix-credit", "etf-flows", "vix-credit"],
        supportedFamilies: [
          "funding-structure",
          "etf-flows",
          "spot-momentum",
          "network-activity",
          "stablecoin-supply",
          "macro-liquidity",
          "vix-credit",
        ],
      }),
    ).toEqual(["macro-liquidity", "vix-credit", "etf-flows"]);
  });

  it("returns all supported families when no broadcast family is requested", () => {
    const supported: ResearchMatrixFamily[] = [
      "funding-structure",
      "etf-flows",
      "spot-momentum",
      "network-activity",
      "stablecoin-supply",
      "macro-liquidity",
      "vix-credit",
    ];
    expect(
      buildResearchMatrixEvaluationFamilies({
        requestedFamily: null,
        fallbackFamilies: ["vix-credit"],
        supportedFamilies: supported,
      }),
    ).toEqual(supported);
  });
});

describe("chooseResearchMatrixOpportunity", () => {
  it("prefers balance-sheet macro-liquidity topics over generic treasury/liquidity topics", () => {
    const generic = {
      topic: "oil price energy cost pressure on btc mining and crypto liquidity",
      sourceProfile: {
        family: "macro-liquidity" as const,
        primarySourceIds: ["treasury-interest-rates"],
      },
    };
    const preferred = {
      topic: "federal reserve balance sheet stealth easing and inflation persistence",
      sourceProfile: {
        family: "macro-liquidity" as const,
        primarySourceIds: ["fred-graph-walcl"],
      },
    };

    expect(
      chooseResearchMatrixOpportunity("macro-liquidity", [generic, preferred]),
    ).toEqual(preferred);
  });

  it("falls back to generic macro-liquidity candidates when no balance-sheet source exists", () => {
    const generic = {
      topic: "fed liquidity inflation pressure",
      sourceProfile: {
        family: "macro-liquidity" as const,
        primarySourceIds: ["treasury-interest-rates"],
      },
    };

    expect(
      chooseResearchMatrixOpportunity("macro-liquidity", [generic]),
    ).toEqual(generic);
  });
});
