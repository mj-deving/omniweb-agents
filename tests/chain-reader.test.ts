import { describe, expect, it, vi } from "vitest";

import { getHivePosts, getRepliesTo } from "../src/toolkit/chain-reader";

describe("chain-reader", () => {
  it("returns an empty list when getTransactions yields a non-array object", async () => {
    const rpc = {
      getTransactions: vi.fn().mockResolvedValue({ txs: [] }),
    };

    await expect(getHivePosts(rpc, 10)).resolves.toEqual([]);
    expect(rpc.getTransactions).toHaveBeenCalledWith("latest", 100);
  });

  it("does not throw when reply scans receive a non-array transaction payload", async () => {
    const rpc = {
      getTransactions: vi.fn().mockResolvedValue({ txs: [] }),
    };

    await expect(getRepliesTo(rpc, ["tx-1"])).resolves.toEqual([]);
    expect(rpc.getTransactions).toHaveBeenCalledWith("latest", 100);
  });
});
