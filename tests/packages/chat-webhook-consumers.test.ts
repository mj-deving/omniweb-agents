import { describe, expect, it, vi } from "vitest";
import {
  CHAT_WEBHOOK_SURFACE,
  buildChatWebhookPlan,
  classifyWebhookEventPayload,
  createClient,
} from "../../packages/omniweb-toolkit/src/index.js";

describe("chat and webhook consumers", () => {
  it("keeps chat and webhook remote mutations as no-spend plans", () => {
    expect(CHAT_WEBHOOK_SURFACE.map((entry) => entry.operation)).toEqual([
      "chat.rooms.list",
      "chat.messages.list",
      "chat.message.send",
      "webhooks.list",
      "webhooks.create",
      "webhooks.update",
      "webhooks.delete",
      "webhooks.event.receive",
    ]);
    expect(CHAT_WEBHOOK_SURFACE.every((entry) => entry.noSpend)).toBe(true);
    expect(buildChatWebhookPlan({ operation: "chat.message.send", token: "secret-token-123456", execute: true })).toMatchObject({
      endpoint: "/api/chat/send",
      method: "POST",
      mutatesRemote: true,
      executionGate: "explicit_execute_required",
      canExecuteNow: false,
      reasonCodes: expect.arrayContaining([
        "explicit_execute_required",
        "mutating_remote_lifecycle_plan_only",
        "execute_requested_but_not_implemented_by_consumer_plan",
      ]),
    });
  });

  it("classifies auth-gated reads and redacts request headers", () => {
    const plan = buildChatWebhookPlan({
      operation: "webhooks.list",
      token: "secret-token-123456",
    });

    expect(plan).toMatchObject({
      endpoint: "/api/webhooks",
      method: "GET",
      noSpend: true,
      mutatesRemote: false,
      executionGate: "dry_run_only",
      auth: { state: "ready" },
    });
    expect(plan.headers.authorization).toContain("[redacted]");
    expect(JSON.stringify(plan)).not.toContain("secret-token-123456");
    expect(buildChatWebhookPlan({ operation: "chat.rooms.list" })).toMatchObject({
      executionGate: "auth_required",
      auth: { state: "missing_token" },
    });
  });

  it("treats inbound webhook events as untrusted local input", () => {
    expect(classifyWebhookEventPayload({ event: "post.created", payload: { txHash: "0xpost" } })).toEqual({
      ok: true,
      untrusted: true,
      event: "post.created",
      hasPayload: true,
      reasonCodes: ["webhook_payload_untrusted"],
    });
    expect(classifyWebhookEventPayload({ payload: {} })).toMatchObject({
      ok: false,
      reasonCodes: ["webhook_payload_untrusted", "webhook_event_missing"],
    });
  });

  it("adds auth-capable chat and webhook reads to the root client", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ rooms: [], messages: [], webhooks: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const client = createClient({
      baseUrl: "https://example.test",
      authToken: "client-token-123456",
      fetch: fetch as unknown as typeof globalThis.fetch,
    });

    await client.getChatRooms();
    await client.getChatMessages({ roomId: "room-1", limit: 5 });
    await client.getWebhooks();

    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      "https://example.test/api/chat/rooms",
      "https://example.test/api/chat/messages?roomId=room-1&limit=5",
      "https://example.test/api/webhooks",
    ]);
    expect(fetch.mock.calls.every((call) => (
      (call[1] as RequestInit).headers as Record<string, string>
    ).authorization === "Bearer client-token-123456")).toBe(true);
  });
});
