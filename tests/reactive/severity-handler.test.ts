import { describe, expect, it, vi } from "vitest";

import { createSeverityHandler } from "../../src/reactive/event-handlers/severity-handler.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";

describe("createSeverityHandler", () => {
  it("builds a log_only handler using mapped severities", async () => {
    const buildParams = vi.fn((event, severity) => ({
      reason: `handled ${event.type}`,
      severity,
      seen: event.payload,
    }));
    const handler = createSeverityHandler({
      name: "severity-test",
      eventTypes: ["warning_event", "other_event"] as const,
      mapping: { severities: { warning_event: "warning" } },
      buildParams,
    });

    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "test-source",
        type: "warning_event",
        payload: { value: 1 },
      }),
    );

    expect(handler.name).toBe("severity-test");
    expect(handler.eventTypes).toEqual(["warning_event", "other_event"]);
    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "handled warning_event",
        severity: "warning",
        seen: { value: 1 },
      },
    });
    expect(buildParams).toHaveBeenCalledWith(
      expect.objectContaining({ type: "warning_event", payload: { value: 1 } }),
      "warning",
    );
  });

  it("uses the configured default severity for unmapped events", async () => {
    const handler = createSeverityHandler({
      name: "severity-default",
      eventTypes: ["known", "unknown"] as const,
      mapping: {
        severities: { known: "critical" },
        defaultSeverity: "warning",
      },
      buildParams: (_event, severity) => ({ reason: "defaulted", severity }),
    });

    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "test-source",
        type: "unknown",
        payload: null,
      }),
    );

    expect(action).toEqual({
      type: "log_only",
      params: { reason: "defaulted", severity: "warning" },
    });
  });

  it("propagates buildParams failures", async () => {
    const handler = createSeverityHandler({
      name: "severity-fail",
      eventTypes: ["boom"] as const,
      mapping: { severities: {} },
      buildParams: () => {
        throw new Error("build failed");
      },
    });

    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "test-source",
          type: "boom",
          payload: null,
        }),
      ),
    ).rejects.toThrow("build failed");
  });
});
