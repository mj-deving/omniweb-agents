import { describe, expect, it, vi } from "vitest";
import { createChainReaderFromSdk } from "../../../src/toolkit/colony/proof-ingestion-rpc-adapter.js";

describe("createChainReaderFromSdk", () => {
  it("creates a ChainReaderRpc with getTxByHash when SDK provides it", () => {
    const demos = {
      getTxByHash: vi.fn().mockResolvedValue({ hash: "0x1", blockNumber: 1, status: "confirmed", content: {} }),
    };

    const rpc = createChainReaderFromSdk(demos);
    expect(rpc.getTxByHash).toBeDefined();
  });

  it("creates a ChainReaderRpc without getTxByHash when SDK lacks it", () => {
    const demos = {};

    const rpc = createChainReaderFromSdk(demos);
    expect(rpc.getTxByHash).toBeUndefined();
  });

  it("delegates getTxByHash calls to the SDK", async () => {
    const mockTx = {
      hash: "0xabc",
      blockNumber: 42,
      status: "confirmed",
      content: { from: "agent1", to: "agent2", type: "web2", data: {}, timestamp: 100 },
    };
    const demos = { getTxByHash: vi.fn().mockResolvedValue(mockTx) };

    const rpc = createChainReaderFromSdk(demos);
    const result = await rpc.getTxByHash!("0xabc");

    expect(demos.getTxByHash).toHaveBeenCalledWith("0xabc");
    expect(result).toEqual(mockTx);
  });

  it("limits concurrent calls to the configured concurrency", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;

    const demos = {
      getTxByHash: vi.fn().mockImplementation(async (hash: string) => {
        activeCalls++;
        maxConcurrent = Math.max(maxConcurrent, activeCalls);
        // Simulate async work
        await new Promise((r) => setTimeout(r, 20));
        activeCalls--;
        return { hash, blockNumber: 1, status: "confirmed", content: {} };
      }),
    };

    const rpc = createChainReaderFromSdk(demos, { concurrency: 3 });

    // Fire 10 requests at once
    const promises = Array.from({ length: 10 }, (_, i) => rpc.getTxByHash!(`0x${i}`));
    await Promise.all(promises);

    expect(maxConcurrent).toBeLessThanOrEqual(3);
    expect(demos.getTxByHash).toHaveBeenCalledTimes(10);
  });

  it("defaults to concurrency of 5", async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;

    const demos = {
      getTxByHash: vi.fn().mockImplementation(async (hash: string) => {
        activeCalls++;
        maxConcurrent = Math.max(maxConcurrent, activeCalls);
        await new Promise((r) => setTimeout(r, 10));
        activeCalls--;
        return { hash, blockNumber: 1, status: "confirmed", content: {} };
      }),
    };

    const rpc = createChainReaderFromSdk(demos);

    const promises = Array.from({ length: 15 }, (_, i) => rpc.getTxByHash!(`0x${i}`));
    await Promise.all(promises);

    expect(maxConcurrent).toBeLessThanOrEqual(5);
    expect(maxConcurrent).toBeGreaterThan(1); // Should actually be concurrent
  });

  it("propagates errors from SDK calls", async () => {
    const demos = {
      getTxByHash: vi.fn().mockRejectedValue(new Error("RPC timeout")),
    };

    const rpc = createChainReaderFromSdk(demos);
    await expect(rpc.getTxByHash!("0xbad")).rejects.toThrow("RPC timeout");
  });

  it("releases concurrency slot on error", async () => {
    let callIndex = 0;
    const demos = {
      getTxByHash: vi.fn().mockImplementation(async () => {
        callIndex++;
        if (callIndex <= 2) {
          throw new Error("fail");
        }
        return { hash: "0x", blockNumber: 1, status: "confirmed", content: {} };
      }),
    };

    const rpc = createChainReaderFromSdk(demos, { concurrency: 2 });

    // First two fail, third should still proceed (slots released)
    const results = await Promise.allSettled([
      rpc.getTxByHash!("0x1"),
      rpc.getTxByHash!("0x2"),
      rpc.getTxByHash!("0x3"),
    ]);

    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");
    expect(results[2].status).toBe("fulfilled");
  });
});
