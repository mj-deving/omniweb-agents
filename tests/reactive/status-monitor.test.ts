import { describe, expect, it, vi } from "vitest";

import {
  STATUS_EVENT_TYPES,
  createStatusMonitorSource,
} from "../../src/reactive/event-sources/status-monitor.js";
import { makeServiceStatus } from "./test-helpers.js";

describe("createStatusMonitorSource", () => {
  it("polls current service statuses", async () => {
    vi.spyOn(Date, "now").mockReturnValue(4_321);
    const statuses = [makeServiceStatus({ service: "api" })];
    const fetchStatuses = vi.fn().mockResolvedValue(statuses);
    const source = createStatusMonitorSource({ fetchStatuses });

    await expect(source.poll()).resolves.toEqual({ timestamp: 4_321, statuses });
    expect(source.id).toBe("infra:status-monitor");
    expect(source.eventTypes).toEqual([...STATUS_EVENT_TYPES]);
  });

  it("emits outage, degradation, recovery, and generic status-change events", () => {
    vi.spyOn(Date, "now").mockReturnValue(9_111);
    const source = createStatusMonitorSource({ fetchStatuses: vi.fn() });
    const prev = {
      timestamp: 1,
      statuses: [
        makeServiceStatus({ id: "svc-api", service: "api", status: "healthy", timestamp: 100 }),
        makeServiceStatus({ id: "svc-worker", service: "worker", status: "healthy", timestamp: 101 }),
      ],
    };
    const curr = {
      timestamp: 2,
      statuses: [
        makeServiceStatus({ id: "svc-api", service: "api", status: "down", timestamp: 200 }),
        makeServiceStatus({ id: "svc-worker", service: "worker", status: "degraded", timestamp: 201 }),
        makeServiceStatus({ id: "svc-db", service: "db", status: "maintenance", timestamp: 202 }),
      ],
    };

    expect(source.diff(null, curr)).toEqual([]);

    const firstDiff = source.diff(prev, curr);
    expect(firstDiff.map(event => event.type)).toEqual(["outage", "degradation", "status_change"]);

    const recovery = source.diff(curr, {
      timestamp: 3,
      statuses: [
        makeServiceStatus({ id: "svc-api", service: "api", status: "healthy", timestamp: 300 }),
      ],
    });
    expect(recovery).toEqual([
      expect.objectContaining({
        type: "recovery",
        detectedAt: 9_111,
        watermark: { id: "svc-api", timestamp: 300 },
      }),
    ]);
    expect(source.extractWatermark({ timestamp: 2, statuses: curr.statuses })).toEqual({
      id: "svc-db",
      timestamp: 202,
    });
  });

  it("propagates fetchStatuses failures", async () => {
    const source = createStatusMonitorSource({
      fetchStatuses: vi.fn().mockRejectedValue(new Error("monitor failed")),
    });

    await expect(source.poll()).rejects.toThrow("monitor failed");
  });
});
