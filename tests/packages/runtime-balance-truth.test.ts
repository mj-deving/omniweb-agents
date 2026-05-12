import { describe, expect, it } from "vitest";

import { deriveRuntimeBalanceTruth } from "../../packages/omniweb-toolkit/scripts/_runtime-balance-truth";

describe("runtime balance truth", () => {
  it("blocks write readiness when colony and chain balances diverge on the active RPC", () => {
    const truth = deriveRuntimeBalanceTruth({
      rpcUrl: "https://node2.demos.sh/",
      address: "demo-address",
      chainBlockNumber: 2235363,
      colony: { ok: true, dem: 1000, cached: true },
      chain: { ok: true, dem: 0 },
    });

    expect(truth.effectiveDem).toBe(1000);
    expect(truth.effectiveSource).toBe("colony");
    expect(truth.divergence).toMatchObject({
      hasDivergence: true,
      kind: "colony_gt_chain",
      demDelta: 1000,
      blocksWriteReadiness: true,
    });
    expect(truth.readiness).toBe("blocked_upstream_balance_truth");
  });

  it("uses chain fallback when colony balance is unavailable or empty but chain balance is present", () => {
    const truth = deriveRuntimeBalanceTruth({
      rpcUrl: "https://node3.demos.sh/",
      address: "demo-address",
      chainBlockNumber: 2235363,
      colony: { ok: true, dem: 0, cached: false },
      chain: { ok: true, dem: 1000 },
    });

    expect(truth.effectiveDem).toBe(1000);
    expect(truth.effectiveSource).toBe("chain_fallback");
    expect(truth.divergence).toMatchObject({
      hasDivergence: true,
      kind: "chain_gt_colony",
      demDelta: -1000,
      blocksWriteReadiness: true,
    });
    expect(truth.readiness).toBe("blocked_upstream_balance_truth");
  });

  it("stays ready when both surfaces agree", () => {
    const truth = deriveRuntimeBalanceTruth({
      rpcUrl: "https://node3.demos.sh/",
      address: "demo-address",
      chainBlockNumber: 2235363,
      colony: { ok: true, dem: 1000, cached: false },
      chain: { ok: true, dem: 1000 },
    });

    expect(truth.divergence.hasDivergence).toBe(false);
    expect(truth.readiness).toBe("ready");
  });
});
