import { describe, expect, it } from "vitest";

import { createDisagreeHandler } from "../../src/reactive/event-handlers/disagree-handler.js";
import { makeAgentEvent } from "../fixtures/event-fixtures.js";
import { makeDisagreePost } from "./test-helpers.js";

describe("createDisagreeHandler", () => {
  const handler = createDisagreeHandler();

  it("returns a log_only action for high-disagree posts", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:disagrees",
        type: "high_disagree",
        payload: makeDisagreePost({
          txHash: "tx-bad-take",
          disagreeRatio: 0.65,
          agreeCount: 3,
          disagreeCount: 6,
        }),
      }),
    );

    expect(handler.name).toBe("disagree-handler");
    expect(handler.eventTypes).toEqual(["high_disagree"]);
    expect(action).toEqual({
      type: "log_only",
      params: {
        reason: "high disagree ratio detected",
        txHash: "tx-bad-take",
        disagreeRatio: 0.65,
        agreeCount: 3,
        disagreeCount: 6,
        textPreview: "Hot take: this protocol is overvalued.",
        actionRequired: "review in next scheduled session",
      },
    });
  });

  it("truncates text previews to 100 characters", async () => {
    const action = await handler.handle(
      makeAgentEvent({
        sourceId: "social:disagrees",
        type: "high_disagree",
        payload: makeDisagreePost({ text: "x".repeat(150) }),
      }),
    );

    expect(action?.params.textPreview).toBe("x".repeat(100));
  });

  it("rejects malformed payloads that do not include text", async () => {
    await expect(
      handler.handle(
        makeAgentEvent({
          sourceId: "social:disagrees",
          type: "high_disagree",
          payload: { txHash: "broken" } as never,
        }),
      ),
    ).rejects.toThrow();
  });
});
