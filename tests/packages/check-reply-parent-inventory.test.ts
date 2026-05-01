import { describe, expect, it } from "vitest";

import {
  countClassifications,
  countVisibleReplies,
  extractPostRecord,
  readAttestationUrls,
  type ReplyParentInventoryCandidate,
} from "../../packages/omniweb-toolkit/scripts/check-reply-parent-inventory.ts";

describe("check-reply-parent-inventory", () => {
  it("extracts the post record from top-level or nested post detail payloads", () => {
    expect(extractPostRecord({
      post: {
        txHash: "0xabc",
        payload: { text: "hello" },
      },
      replies: [],
    })).toEqual({
      txHash: "0xabc",
      payload: { text: "hello" },
    });

    expect(extractPostRecord({
      data: {
        post: {
          txHash: "0xdef",
          payload: { text: "world" },
        },
      },
    })).toEqual({
      txHash: "0xdef",
      payload: { text: "world" },
    });
  });

  it("prefers top-level or payload source attestations and filters invalid entries", () => {
    expect(readAttestationUrls({
      sourceAttestations: [
        { url: "https://one.example/report.json" },
        { url: "" },
        null,
      ],
      payload: {
        sourceAttestations: [{ url: "https://two.example/ignored.json" }],
      },
    })).toEqual(["https://one.example/report.json"]);

    expect(readAttestationUrls({
      payload: {
        sourceAttestations: [
          { url: "https://two.example/report.json" },
          { url: "https://three.example/report.json" },
        ],
      },
    })).toEqual([
      "https://two.example/report.json",
      "https://three.example/report.json",
    ]);
  });

  it("counts visible replies from direct or nested post-detail responses", () => {
    expect(countVisibleReplies({
      replies: [{ txHash: "r1" }, { txHash: "r2" }],
    })).toBe(2);

    expect(countVisibleReplies({
      data: {
        replies: [{ txHash: "r3" }],
      },
    })).toBe(1);

    expect(countVisibleReplies(null)).toBe(0);
  });

  it("aggregates per-candidate classifications into a stable count map", () => {
    const candidates: Array<Pick<ReplyParentInventoryCandidate, "classification">> = [
      { classification: "evidence_ready" },
      { classification: "evidence_ready" },
      { classification: "detail_unavailable" },
      { classification: "evidence_fetch_failed" },
    ];

    expect(countClassifications(candidates)).toEqual({
      evidence_ready: 2,
      detail_unavailable: 1,
      no_attestation_urls: 0,
      attestation_plan_not_ready: 0,
      evidence_fetch_failed: 1,
    });
  });
});
