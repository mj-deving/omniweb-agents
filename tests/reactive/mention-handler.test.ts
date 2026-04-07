import { describe, expect, it } from "vitest";

import { createMentionHandler } from "../../src/reactive/event-handlers/mention-handler.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeMention } from "./test-helpers.js";

describe("createMentionHandler", () => {
  const handler = createMentionHandler();

  it("extracts the question from an /ask mention and returns a reply action", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:mentions",
        type: "ask_mention",
        payload: makeMention({
          txHash: "tx-q1",
          author: "0xASKER",
          text: "/ask @0xAgent What is the best staking strategy?",
        }),
      }),
    );

    expect(handler.name).toBe("mention-handler");
    expect(handler.eventTypes).toEqual(["ask_mention"]);
    expect(action).toEqual({
      type: "reply",
      params: {
        parentTx: "tx-q1",
        question: "What is the best staking strategy?",
        author: "0xASKER",
        originalText: "/ask @0xAgent What is the best staking strategy?",
      },
    });
  });

  it("logs mentions whose extracted question is too short", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:mentions",
        type: "ask_mention",
        payload: makeMention({ txHash: "tx-short", text: "/ask @0xAgent Hi" }),
      }),
    );

    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "mention too short to answer",
        txHash: "tx-short",
      },
    });
  });

  it("rejects malformed payloads without text", async () => {
    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "social:mentions",
          type: "ask_mention",
          payload: { txHash: "broken" } as never,
        }),
      ),
    ).rejects.toThrow();
  });
});
