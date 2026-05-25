import { describe, expect, it } from "vitest";

import {
  classifyEscrowProofReadback,
  classifyEscrowReadbackSupport,
  classifyEscrowRecheckRuntimeBlock,
} from "../../packages/omniweb-toolkit/src/escrow-readback-classifier.js";

describe("escrow readback classifier", () => {
  it("returns GREEN when tx confirmation and readback wrappers are both supported", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [{ platform: "github", username: "phase24-continuation-20260521" }] },
      { ok: true, data: { balance: 0.1 } },
      { platform: "github", username: "phase24-continuation-20260521", amount: 0.1 },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("supported");
    expect(proof).toMatchObject({
      ok: true,
      status: "GREEN",
      confirmationSurface: "tx_and_readback_wrappers",
    });
  });

  it("returns DEGRADED when tx is confirmed but readback payloads do not prove product escrow state", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [] },
      { ok: true, data: { balance: 0 } },
      { platform: "github", username: "phase24-continuation-20260521", amount: 0.1 },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("inconclusive-readback");
    expect(readback.reasonCodes).toEqual([
      "claimable_product_state_not_proven",
      "escrow_balance_product_state_not_proven",
    ]);
    expect(proof).toMatchObject({
      ok: false,
      status: "DEGRADED",
      confirmationSurface: "tx_confirmed_readback_inconclusive",
    });
    expect(proof.reasonCodes).toContain("readback_product_state_not_proven");
  });

  it("returns DEGRADED when claimable readback does not match the expected identity", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [{ platform: "github", username: "someone-else" }] },
      { ok: true, data: { balance: 0.1 } },
      { platform: "github", username: "phase24-continuation-20260521", amount: 0.1 },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("inconclusive-readback");
    expect(readback.reasonCodes).toContain("claimable_product_state_not_proven");
    expect(proof.status).toBe("DEGRADED");
  });

  it("accepts tx-hash or combined identity claimable rows as product evidence", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [{ txHash: "ABC123", identity: "github:phase24-continuation-20260521" }] },
      { ok: true, data: { claimableAmount: "0.1 DEM" } },
      {
        platform: "github",
        username: "phase24-continuation-20260521",
        amount: 0.1,
        txHash: "abc123",
      },
    );

    expect(readback.classification).toBe("supported");
    expect(readback.reasonCodes).toEqual([]);
  });

  it("rejects username-only combined identity rows when the explicit platform mismatches", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: [{ platform: "twitter", identity: "phase24-continuation-20260521" }] },
      { ok: true, data: { claimableAmount: "0.1 DEM" } },
      { platform: "github", username: "phase24-continuation-20260521", amount: 0.1 },
    );

    expect(readback.classification).toBe("inconclusive-readback");
    expect(readback.reasonCodes).toContain("claimable_product_state_not_proven");
  });

  it("does not treat nested message text as an SDK missing-method signal", () => {
    const readback = classifyEscrowReadbackSupport(
      {
        ok: true,
        data: [{
          platform: "github",
          username: "phase24-continuation-20260521",
          message: "This note says not a function, but it is user text.",
        }],
      },
      { ok: true, data: { balance: 0.1 } },
      { platform: "github", username: "phase24-continuation-20260521", amount: 0.1 },
    );

    expect(readback.classification).toBe("supported");
    expect(readback.reasonCodes).not.toContain("escrow_query_method_not_implemented");
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

  it("returns DEGRADED when SDK escrow query methods return not-implemented payloads", () => {
    const readback = classifyEscrowReadbackSupport(
      { ok: true, data: "Method not implemented: get_claimable_escrows" },
      { ok: true, data: "Method not implemented: get_escrow_balance" },
    );
    const proof = classifyEscrowProofReadback(readback, true);

    expect(readback.classification).toBe("degraded-wrapper");
    expect(readback.reasonCodes).toEqual(["escrow_query_method_not_implemented"]);
    expect(proof).toMatchObject({
      ok: false,
      status: "DEGRADED",
      confirmationSurface: "tx_confirmed_readback_wrappers_degraded",
    });
    expect(proof.reasonCodes).toEqual([
      "escrow_query_method_not_implemented",
      "readback_wrappers_degraded",
    ]);
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

  it("returns BLOCKED with reason codes when the recheck runtime fails before readback", () => {
    const proof = classifyEscrowRecheckRuntimeBlock("Request failed with status code 502");

    expect(proof).toMatchObject({
      ok: false,
      status: "BLOCKED",
      confirmationSurface: "runtime_or_api_blocked",
    });
    expect(proof.reasonCodes).toContain("escrow_recheck_runtime_unavailable");
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
