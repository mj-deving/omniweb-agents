import { describe, expect, it } from "vitest";

import {
  classifyIPFSPayloadSafety,
  classifyIPFSQuoteSupport,
} from "../../packages/omniweb-toolkit/src/ipfs-quote-classifier.js";

describe("IPFS quote classifier", () => {
  it("accepts concrete DEM quotes within budget", () => {
    const support = classifyIPFSQuoteSupport({
      quote: { feeDem: 0.25 },
      budgetDem: 5,
    });

    expect(support).toMatchObject({
      classification: "concrete",
      concrete: true,
      quotedFeeDem: 0.25,
      withinBudget: true,
      reasonCodes: [],
    });
  });

  it("classifies Unknown message quote surfaces as unsupported runtime", () => {
    const support = classifyIPFSQuoteSupport({
      quote: "{ error: \"Unknown message\"}",
      budgetDem: 5,
    });

    expect(support).toMatchObject({
      classification: "unsupported-runtime",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      reasonCodes: ["ipfs_quote_unknown_message"],
    });
  });

  it("keeps concrete over-budget quotes blocked by reason code", () => {
    const support = classifyIPFSQuoteSupport({
      quote: { cost: "7.5 DEM" },
      budgetDem: 5,
    });

    expect(support.classification).toBe("concrete");
    expect(support.withinBudget).toBe(false);
    expect(support.reasonCodes).toContain("ipfs_quote_exceeds_budget");
  });

  it("blocks content with secret-looking markers", () => {
    const safety = classifyIPFSPayloadSafety("public text with token=abc123");

    expect(safety.ok).toBe(false);
    expect(safety.reasonCodes).toContain("payload_secret_marker:token_");
  });
});
