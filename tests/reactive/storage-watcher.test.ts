import { describe, expect, it, vi } from "vitest";

import { createStorageWatcher } from "../../src/reactive/event-sources/storage-watcher.js";

describe("createStorageWatcher", () => {
  it("polls each watched address, forwards agent identity, and filters watched fields", async () => {
    vi.spyOn(Date, "now").mockReturnValue(6_543);
    const fetchStorage = vi.fn()
      .mockResolvedValueOnce({ status: "ready", owner: "0x1", ignored: true })
      .mockResolvedValueOnce({ status: "busy", owner: "0x2", ignored: false });
    const source = createStorageWatcher(
      {
        watchAddresses: ["store-1", "store-2"],
        watchFields: ["status", "owner"],
        rpcUrl: "https://rpc.example",
        agentAddress: "0xagent",
      },
      fetchStorage,
    );

    await expect(source.poll()).resolves.toEqual({
      timestamp: 6_543,
      states: {
        "store-1": { status: "ready", owner: "0x1" },
        "store-2": { status: "busy", owner: "0x2" },
      },
    });
    expect(fetchStorage).toHaveBeenNthCalledWith(1, "https://rpc.example", "store-1", "0xagent");
    expect(fetchStorage).toHaveBeenNthCalledWith(2, "https://rpc.example", "store-2", "0xagent");
  });

  it("uses warm-up semantics and emits field-level storage_update events for changed values", () => {
    const source = createStorageWatcher(
      {
        watchAddresses: ["store-1"],
        rpcUrl: "https://rpc.example",
      },
      vi.fn(),
    );

    expect(
      source.diff(null, { timestamp: 1, states: { "store-1": { status: "ready" } } }),
    ).toEqual([]);

    const diff = source.diff(
      { timestamp: 1, states: { "store-1": { status: "ready", details: { height: 1 } } } },
      { timestamp: 2, states: { "store-1": { status: "busy", details: { height: 2 } } } },
    );

    expect(diff).toEqual([
      {
        id: "storage:watcher:storage_update:2:store-1:status",
        sourceId: "storage:watcher",
        type: "storage_update",
        detectedAt: 2,
        payload: {
          storageAddress: "store-1",
          field: "status",
          oldValue: "ready",
          newValue: "busy",
          timestamp: 2,
        },
        watermark: { timestamp: 2, address: "store-1", field: "status" },
      },
      {
        id: "storage:watcher:storage_update:2:store-1:details",
        sourceId: "storage:watcher",
        type: "storage_update",
        detectedAt: 2,
        payload: {
          storageAddress: "store-1",
          field: "details",
          oldValue: { height: 1 },
          newValue: { height: 2 },
          timestamp: 2,
        },
        watermark: { timestamp: 2, address: "store-1", field: "details" },
      },
    ]);
    expect(source.extractWatermark({ timestamp: 2, states: {} })).toEqual({ timestamp: 2 });
  });

  it("skips unreachable storage programs instead of crashing the poll cycle", async () => {
    const fetchStorage = vi.fn()
      .mockRejectedValueOnce(new Error("unreachable"))
      .mockResolvedValueOnce(null);
    const source = createStorageWatcher(
      {
        watchAddresses: ["store-1", "store-2"],
        rpcUrl: "https://rpc.example",
      },
      fetchStorage,
    );

    await expect(source.poll()).resolves.toEqual({
      timestamp: expect.any(Number),
      states: {},
    });
  });
});
