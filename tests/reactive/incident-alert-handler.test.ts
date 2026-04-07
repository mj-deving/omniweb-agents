import { describe, expect, it } from "vitest";

import { createIncidentAlertHandler } from "../../src/reactive/event-handlers/incident-alert-handler.js";
import { STATUS_EVENT_TYPES } from "../../src/reactive/event-sources/status-monitor.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeServiceStatus } from "./test-helpers.js";

describe("createIncidentAlertHandler", () => {
  const handler = createIncidentAlertHandler();

  it("classifies outages as critical log entries", async () => {
    const status = makeServiceStatus({ id: "svc-1", service: "api", status: "down" });
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "infra:status-monitor",
        type: "outage",
        payload: status,
      }),
    );

    expect(handler.name).toBe("incident-alert");
    expect(handler.eventTypes).toEqual([...STATUS_EVENT_TYPES]);
    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: `Service outage detected: ${JSON.stringify(status)}`,
        severity: "critical",
      },
    });
  });

  it("falls back to a generic info log for unmapped status changes", async () => {
    const status = makeServiceStatus({ service: "worker", status: "maintenance" });
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "infra:status-monitor",
        type: "status_change",
        payload: status,
      }),
    );

    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: `Status change: ${JSON.stringify(status)}`,
        severity: "info",
      },
    });
  });

  it("propagates JSON serialization failures from circular payloads", async () => {
    const payload: Record<string, unknown> = {};
    payload.self = payload;

    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "infra:status-monitor",
          type: "outage",
          payload: payload as never,
        }),
      ),
    ).rejects.toThrow();
  });
});
