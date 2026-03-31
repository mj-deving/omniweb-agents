import { describe, expect, it } from "vitest";

import * as publishToolkit from "../../../src/toolkit/publish/index.js";

describe("toolkit publish barrel", () => {
  it("re-exports the publish pipeline primitives", () => {
    expect(typeof publishToolkit.extractClaimsRegex).toBe("function");
    expect(typeof publishToolkit.runFaithfulnessGate).toBe("function");
    expect(typeof publishToolkit.runSignalFirstPipeline).toBe("function");
  });

  it("exports runtime schemas for the public publish types", () => {
    const parsed = publishToolkit.PipelineInputSchema.parse({
      draftText: "Bitcoin hash rate is 877.9 EH/s.",
      attestations: [{
        txHash: "0x1",
        sourceId: "bitcoin-network-stats",
        data: { asset: "bitcoin", hash_rate: 877.9 },
        timestamp: "2026-03-31T10:00:00.000Z",
        method: "dahr",
      }],
    });

    expect(parsed.draftText).toContain("877.9");
    expect(parsed.attestations[0].method).toBe("dahr");
    expect(() => publishToolkit.StructuredClaimSchema.parse({
      subject: "bitcoin",
    })).toThrow();
  });
});
