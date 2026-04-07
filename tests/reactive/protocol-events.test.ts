import { describe, expect, it, vi } from "vitest";

import {
  PROTOCOL_EVENT_TYPES,
  createProtocolEventSource,
} from "../../src/reactive/event-sources/protocol-events.js";
import { makeProtocolEvent } from "./test-helpers.js";

describe("createProtocolEventSource", () => {
  it("polls protocol events and exposes the configured metadata", async () => {
    vi.spyOn(Date, "now").mockReturnValue(5_555);
    const events = [makeProtocolEvent({ id: "evt-1" })];
    const fetchEvents = vi.fn().mockResolvedValue(events);
    const source = createProtocolEventSource({ fetchEvents });

    await expect(source.poll()).resolves.toEqual({ timestamp: 5_555, events });
    expect(source.id).toBe("defi:protocol-events");
    expect(source.eventTypes).toEqual([...PROTOCOL_EVENT_TYPES]);
  });

  it("uses warm-up semantics and emits only newly seen protocol events", () => {
    vi.spyOn(Date, "now").mockReturnValue(8_888);
    const source = createProtocolEventSource({ fetchEvents: vi.fn() });
    const oldEvent = makeProtocolEvent({ id: "evt-1", timestamp: 100, type: "governance" });
    const newEvent = makeProtocolEvent({ id: "evt-2", timestamp: 200, type: "rate_change" });

    expect(source.diff(null, { timestamp: 1, events: [oldEvent] })).toEqual([]);

    const diff = source.diff(
      { timestamp: 2, events: [oldEvent] },
      { timestamp: 3, events: [oldEvent, newEvent] },
    );

    expect(diff).toEqual([
      {
        id: "defi:protocol-events:200:evt-2",
        sourceId: "defi:protocol-events",
        type: "rate_change",
        detectedAt: 8_888,
        payload: newEvent,
        watermark: { id: "evt-2", timestamp: 200 },
      },
    ]);
    expect(source.extractWatermark({ timestamp: 3, events: [oldEvent, newEvent] })).toEqual({
      id: "evt-2",
      timestamp: 200,
    });
  });

  it("propagates fetchEvents failures", async () => {
    const source = createProtocolEventSource({
      fetchEvents: vi.fn().mockRejectedValue(new Error("provider down")),
    });

    await expect(source.poll()).rejects.toThrow("provider down");
  });
});
