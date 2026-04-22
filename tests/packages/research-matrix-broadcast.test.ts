import { describe, expect, it } from "vitest";

import {
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
