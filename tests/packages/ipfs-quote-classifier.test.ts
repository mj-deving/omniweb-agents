import { describe, expect, it } from "vitest";

import {
  classifyIPFSPayloadSafety,
  classifyIPFSQuoteSupport,
  classifyIPFSSuccessorReadiness,
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

  it("accepts the SDK ipfsQuote cost_dem response shape with exact path evidence", () => {
    const support = classifyIPFSQuoteSupport({
      quote: {
        cost_dem: "0.25",
        file_size_bytes: 128,
        operation: "IPFS_ADD",
        breakdown: {
          base_cost: "0.1",
          size_cost: "0.15",
          free_tier_bytes: 0,
          chargeable_bytes: 128,
        },
      },
      budgetDem: 5,
      quotePath: "omni.runtime.demos.ipfs.quote",
      quoteMessage: "ipfsQuote",
      quoteArgs: { file_size_bytes: 128, operation: "IPFS_ADD" },
    });

    expect(support).toMatchObject({
      classification: "concrete",
      concrete: true,
      quotedFeeDem: 0.25,
      withinBudget: true,
      reasonCodes: [],
      quotePath: "omni.runtime.demos.ipfs.quote",
      quoteMessage: "ipfsQuote",
    });
    expect(support.evidence).toEqual(expect.arrayContaining([
      "quote_path=omni.runtime.demos.ipfs.quote",
      "node_call=ipfsQuote",
      "quote_args={\"file_size_bytes\":128,\"operation\":\"IPFS_ADD\"}",
      "quoted_fee_dem=0.25",
    ]));
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
    expect(support.evidence.join("\n")).toContain("unknown message");
  });

  it("classifies thrown Unknown message quote errors as unsupported runtime", () => {
    const support = classifyIPFSQuoteSupport({
      quote: null,
      quoteError: "Error: Unknown message",
      budgetDem: 5,
      quotePath: "omni.runtime.demos.ipfs.quote",
      quoteMessage: "ipfsQuote",
    });

    expect(support).toMatchObject({
      classification: "unsupported-runtime",
      concrete: false,
      quotedFeeDem: null,
      withinBudget: null,
      reasonCodes: ["ipfs_quote_unknown_message"],
      sanitizedError: "Error: Unknown message",
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

  it("classifies non-empty quote payloads without a fee as degraded runtime", () => {
    const support = classifyIPFSQuoteSupport({
      quote: { ok: true, operation: "IPFS_ADD" },
      budgetDem: 5,
    });

    expect(support.classification).toBe("degraded-runtime");
    expect(support.reasonCodes).toContain("ipfs_quote_fee_missing");
  });

  it("blocks content with secret-looking markers", () => {
    const safety = classifyIPFSPayloadSafety("public text with token=abc123");

    expect(safety.ok).toBe(false);
    expect(safety.reasonCodes).toContain("payload_secret_marker:token_");
  });

  it("recommends excluding IPFS from successor packets when the quote runtime is unsupported", () => {
    const quoteSupport = classifyIPFSQuoteSupport({
      quote: "{ error: \"Unknown message\"}",
      budgetDem: 5,
      quotePath: "omni.runtime.demos.ipfs.quote",
      quoteMessage: "ipfsQuote",
      quoteArgs: { file_size_bytes: 199, operation: "IPFS_ADD" },
    });
    const successorReadiness = classifyIPFSSuccessorReadiness({
      quoteSupport,
      payloadSafety: { ok: true, reasonCodes: [] },
      hasReadbackExpectation: true,
    });

    expect(successorReadiness).toMatchObject({
      status: "EXCLUDED",
      includeInSuccessor: false,
      recommendation: "exclude-ipfs-from-successor-live-packet",
    });
    expect(successorReadiness.reasonCodes).toEqual([
      "ipfs_quote_unknown_message",
      "successor_ipfs_excluded_unsupported_quote",
    ]);
    expect(successorReadiness.evidence).toEqual(expect.arrayContaining([
      "quote_path=omni.runtime.demos.ipfs.quote",
      "node_call=ipfsQuote",
      "quote_args={\"file_size_bytes\":199,\"operation\":\"IPFS_ADD\"}",
    ]));
  });

  it("allows successor inclusion only for concrete quotes within budget and with readback", () => {
    const quoteSupport = classifyIPFSQuoteSupport({
      quote: { cost_dem: "0.25" },
      budgetDem: 5,
    });
    const successorReadiness = classifyIPFSSuccessorReadiness({
      quoteSupport,
      payloadSafety: { ok: true, reasonCodes: [] },
      hasReadbackExpectation: true,
    });

    expect(successorReadiness).toMatchObject({
      status: "READY",
      includeInSuccessor: true,
      recommendation: "include-ipfs-upload-in-successor-live-packet",
      reasonCodes: [],
    });
  });

  it("keeps over-budget concrete quotes blocked without calling them non-concrete", () => {
    const quoteSupport = classifyIPFSQuoteSupport({
      quote: { cost_dem: "7.5" },
      budgetDem: 5,
    });
    const successorReadiness = classifyIPFSSuccessorReadiness({
      quoteSupport,
      payloadSafety: { ok: true, reasonCodes: [] },
      hasReadbackExpectation: true,
    });

    expect(successorReadiness).toMatchObject({
      status: "BLOCKED",
      includeInSuccessor: false,
      recommendation: "keep-ipfs-blocked-pending-concrete-quote",
    });
    expect(successorReadiness.reasonCodes).toEqual([
      "ipfs_quote_exceeds_budget",
      "successor_ipfs_quote_concrete_but_blocked",
    ]);
    expect(successorReadiness.reasonCodes).not.toContain("successor_ipfs_quote_not_concrete");
  });
});
