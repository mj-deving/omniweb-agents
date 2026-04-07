import { describe, expect, it } from "vitest";

import { createMarketAlertHandler } from "../../src/reactive/event-handlers/market-alert-handler.js";
import { PROTOCOL_EVENT_TYPES } from "../../src/reactive/event-sources/protocol-events.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeProtocolEvent } from "./test-helpers.js";

describe("createMarketAlertHandler", () => {
  const handler = createMarketAlertHandler();

  it("logs exploit events at critical severity", async () => {
    const payload = makeProtocolEvent({
      protocol: "demo-lend",
      type: "exploit",
      data: { lossUsd: 1_000_000 },
    });
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "defi:protocol-events",
        type: "exploit",
        payload,
      }),
    );

    expect(handler.name).toBe("market-alert");
    expect(handler.eventTypes).toEqual([...PROTOCOL_EVENT_TYPES]);
    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "Protocol exploit detected: demo-lend",
        severity: "critical",
        protocol: "demo-lend",
        data: { lossUsd: 1_000_000 },
      },
    });
  });

  it("uses the generic market-event reason for non-special event types", async () => {
    const payload = makeProtocolEvent({
      protocol: "demo-pool",
      type: "rate_change",
      data: { apr: 4.2 },
    });
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "defi:protocol-events",
        type: "rate_change",
        payload,
      }),
    );

    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "Market event rate_change: demo-pool",
        severity: "info",
        protocol: "demo-pool",
        data: { apr: 4.2 },
      },
    });
  });

  it("rejects null payloads instead of masking malformed events", async () => {
    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "defi:protocol-events",
          type: "exploit",
          payload: null as never,
        }),
      ),
    ).rejects.toThrow();
  });
});
