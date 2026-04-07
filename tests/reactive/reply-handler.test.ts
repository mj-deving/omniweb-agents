import { describe, expect, it } from "vitest";

import { createReplyHandler } from "../../src/reactive/event-handlers/reply-handler.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeReply } from "./test-helpers.js";

describe("createReplyHandler", () => {
  const handler = createReplyHandler();

  it("reacts with agree for substantive replies", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:replies",
        type: "reply",
        payload: makeReply({
          txHash: "tx-substantive",
          author: "0xAUTHOR1234",
          text: "This is a detailed reply that comfortably clears the minimum length.",
        }),
      }),
    );

    expect(handler.name).toBe("reply-handler");
    expect(handler.eventTypes).toEqual(["reply"]);
    expect(action).toEqual({
      type: "react",
      params: {
        txHash: "tx-substantive",
        reaction: "agree",
        reason: "Substantive reply from 0xAUTHOR12",
      },
    });
  });

  it("logs replies shorter than 30 characters", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:replies",
        type: "reply",
        payload: makeReply({ txHash: "tx-short", text: "a".repeat(29) }),
      }),
    );

    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "reply too short",
        txHash: "tx-short",
      },
    });
  });

  it("rejects malformed payloads without text", async () => {
    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "social:replies",
          type: "reply",
          payload: { txHash: "broken" } as never,
        }),
      ),
    ).rejects.toThrow();
  });
});
