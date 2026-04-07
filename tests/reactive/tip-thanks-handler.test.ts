import { describe, expect, it } from "vitest";

import { createTipThanksHandler } from "../../src/reactive/event-handlers/tip-thanks-handler.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeTip } from "./test-helpers.js";

describe("createTipThanksHandler", () => {
  const handler = createTipThanksHandler();

  it("logs incoming tip details", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:tips",
        type: "tip_received",
        payload: makeTip({ txHash: "tx-tip-42", from: "0xGENEROUS", amount: 7 }),
      }),
    );

    expect(handler.name).toBe("tip-thanks-handler");
    expect(handler.eventTypes).toEqual(["tip_received"]);
    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "tip received",
        from: "0xGENEROUS",
        amount: 7,
        txHash: "tx-tip-42",
        acknowledgment: true,
      },
    });
  });

  it("treats zero-value tips the same way", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:tips",
        type: "tip_received",
        payload: makeTip({ amount: 0 }),
      }),
    );

    expect(action?.type).toBe("log_only");
    expect(action?.params.amount).toBe(0);
  });

  it("rejects malformed payloads that are missing tip fields", async () => {
    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "social:tips",
          type: "tip_received",
          payload: null as never,
        }),
      ),
    ).rejects.toThrow();
  });
});
