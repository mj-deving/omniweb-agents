import { describe, expect, it } from "vitest";

import {
  classifyEscrowProofReadback,
  classifyEscrowReadbackSupport,
} from "../../packages/omniweb-toolkit/src/escrow-readback-classifier.js";

describe("escrow readback classifier", () => {
  it("returns GREEN when tx confirmation and readback wrappers are both supported", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [] },
      { ok: true, data: { balance: 0.1 } },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("supported");
    expect(proof).toMatchObject({
      ok: true,
      status: "GREEN",
      confirmationSurface: "tx_and_readback_wrappers",
    });
  });

  it("returns DEGRADED when SDK escrow query methods are not implemented after tx confirmation", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: false, error: "Method not implemented: get_claimable_escrows" },
      { ok: false, error: "Method not implemented: get_escrow_balance" },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("degraded-wrapper");
    expect(readback.reasonCodes).toContain("escrow_query_method_not_implemented");
    expect(proof.status).toBe("DEGRADED");
    expect(proof.reasonCodes).toContain("readback_wrappers_degraded");
  });

  it("returns BLOCKED for runtime or API 502 rechecks", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: false, error: "502 Bad Gateway" },
      { ok: false, error: "readback failed" },
    );
    const proof = classifyEscrowProofReadback(readback, false, "502 Bad Gateway");

    expect(readback.classification).toBe("runtime-api-error");
    expect(proof.status).toBe("BLOCKED");
    expect(proof.confirmationSurface).toBe("runtime_or_api_blocked");
    expect(proof.reasonCodes).toContain("runtime_or_api_502");
  });

  it("does not classify successful readback payload values containing 502 as runtime API errors", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [{ escrowId: "escrow-502" }] },
      { ok: true, data: { balance: 0.502 } },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("supported");
    expect(readback.reasonCodes).not.toContain("runtime_api_502");
    expect(proof.status).toBe("GREEN");
  });

  it("returns STUCK when tx confirmation is still absent", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: false, error: "Method not implemented: get_claimable_escrows" },
      { ok: false, error: "Method not implemented: get_escrow_balance" },
    );
    const proof = classifyEscrowProofReadback(readback, false, "verifyTransaction did not confirm tx");

    expect(proof.status).toBe("STUCK");
    expect(proof.reasonCodes).toContain("tx_not_confirmed");
    expect(proof.reasonCodes).toContain("readback_degraded_and_tx_unconfirmed");
  });
});
