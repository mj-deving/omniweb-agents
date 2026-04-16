import { describe, expect, it } from "vitest";

import { createOpinionHandler } from "../../src/reactive/event-handlers/opinion-handler.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeSSEPost } from "./test-helpers.js";

describe("createOpinionHandler", () => {
  const handler = createOpinionHandler({ agentAddress: "0xagent" });

  it("turns OPINION feed posts into reply actions", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "sse:feed",
        type: "feed_post",
        payload: makeSSEPost({
          txHash: "tx-opinion",
          author: "0xposter",
          text: "What are the second-order effects of ETH ETF inflows this quarter?",
          category: "OPINION",
        }),
      }),
    );

    expect(handler.name).toBe("opinion-handler");
    expect(handler.eventTypes).toEqual(["feed_post", "opinion_request"]);
    expect(action).toEqual({
      type: "reply",
      params: {
        parentTx: "tx-opinion",
        question: "What are the second-order effects of ETH ETF inflows this quarter?",
        author: "0xposter",
        originalText: "What are the second-order effects of ETH ETF inflows this quarter?",
      },
    });
  });

  it("ignores non-OPINION feed posts", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "sse:feed",
        type: "feed_post",
        payload: makeSSEPost({ category: "ANALYSIS" }),
      }),
    );

    expect(action).toBeNull();
  });

  it("logs self-authored opinion posts instead of replying", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:opinions",
        type: "opinion_request",
        payload: {
          txHash: "tx-self",
          author: "0xAgent",
          timestamp: 1000,
          text: "Should we rotate into ETH beta here?",
          category: "OPINION",
          assets: [],
          tags: [],
        },
      }),
    );

    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "ignore self-authored opinion",
        txHash: "tx-self",
      },
    });
  });
});
