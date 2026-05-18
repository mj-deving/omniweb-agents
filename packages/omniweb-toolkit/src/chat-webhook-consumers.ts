import { classifyTransportAuth, redactSensitiveHeaders, type TransportAuthStatus } from "./transport-consumers.js";

export type ChatWebhookOperation =
  | "chat.rooms.list"
  | "chat.messages.list"
  | "chat.message.send"
  | "webhooks.list"
  | "webhooks.create"
  | "webhooks.update"
  | "webhooks.delete"
  | "webhooks.event.receive";

export type ChatWebhookStatus =
  | "auth_required"
  | "plan_only"
  | "explicit_execute_required"
  | "unsupported";

export interface ChatWebhookSurfaceEntry {
  operation: ChatWebhookOperation;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "LOCAL";
  endpoint: string;
  status: ChatWebhookStatus;
  noSpend: true;
  mutatesRemote: boolean;
  notes: string[];
}

export interface ChatWebhookPlan {
  operation: ChatWebhookOperation;
  method: "GET" | "POST" | "PATCH" | "DELETE" | "LOCAL";
  endpoint: string;
  headers: Record<string, string>;
  auth: TransportAuthStatus;
  noSpend: true;
  mutatesRemote: boolean;
  executionGate: "auth_required" | "dry_run_only" | "explicit_execute_required" | "unsupported";
  canExecuteNow: false;
  reasonCodes: string[];
}

export interface WebhookEventClassification {
  ok: boolean;
  untrusted: true;
  event: string | null;
  hasPayload: boolean;
  reasonCodes: string[];
}

export const CHAT_WEBHOOK_SURFACE: ChatWebhookSurfaceEntry[] = [
  entry("chat.rooms.list", "GET", "/api/chat/rooms", "auth_required", false, [
    "Live GET without auth returned 401 on 2026-05-18 with the standard auth challenge hint.",
  ]),
  entry("chat.messages.list", "GET", "/api/chat/messages", "auth_required", false),
  entry("chat.message.send", "POST", "/api/chat/send", "explicit_execute_required", true),
  entry("webhooks.list", "GET", "/api/webhooks", "auth_required", false, [
    "Live GET without auth returned 401 on 2026-05-18 with the standard auth challenge hint.",
  ]),
  entry("webhooks.create", "POST", "/api/webhooks", "explicit_execute_required", true),
  entry("webhooks.update", "PATCH", "/api/webhooks/[id]", "explicit_execute_required", true, [
    "Update is represented as a lifecycle plan only until a maintained non-mutating proof exists.",
  ]),
  entry("webhooks.delete", "DELETE", "/api/webhooks/[id]", "explicit_execute_required", true),
  entry("webhooks.event.receive", "LOCAL", "local:webhook-event", "plan_only", false, [
    "Inbound webhook events are local untrusted input; they are classified, not executed.",
  ]),
];

export function buildChatWebhookPlan(input: {
  operation: ChatWebhookOperation;
  token?: string | null;
  execute?: boolean;
  id?: string | null;
}): ChatWebhookPlan {
  const surface = CHAT_WEBHOOK_SURFACE.find((entry) => entry.operation === input.operation);
  if (!surface) {
    return {
      operation: input.operation,
      method: "LOCAL",
      endpoint: "unknown",
      headers: {},
      auth: classifyTransportAuth({ token: input.token }),
      noSpend: true,
      mutatesRemote: false,
      executionGate: "unsupported",
      canExecuteNow: false,
      reasonCodes: ["unsupported_operation"],
    };
  }

  const token = typeof input.token === "string" ? input.token.trim() : "";
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const auth = classifyTransportAuth({ token });
  const endpoint = input.id ? surface.endpoint.replace("[id]", encodeURIComponent(input.id)) : surface.endpoint;
  const executionGate = surface.status === "auth_required" && auth.state !== "ready"
    ? "auth_required"
    : surface.status === "explicit_execute_required"
      ? "explicit_execute_required"
      : surface.status === "unsupported"
        ? "unsupported"
        : "dry_run_only";

  return {
    operation: input.operation,
    method: surface.method,
    endpoint,
    headers: redactSensitiveHeaders(headers),
    auth,
    noSpend: true,
    mutatesRemote: surface.mutatesRemote,
    executionGate,
    canExecuteNow: false,
    reasonCodes: [
      ...(auth.state === "ready" ? [] : auth.reasonCodes),
      executionGate,
      ...(surface.mutatesRemote ? ["mutating_remote_lifecycle_plan_only"] : []),
      ...(input.execute ? ["execute_requested_but_not_implemented_by_consumer_plan"] : []),
    ],
  };
}

export function classifyWebhookEventPayload(payload: unknown): WebhookEventClassification {
  if (!isRecord(payload)) {
    return {
      ok: false,
      untrusted: true,
      event: null,
      hasPayload: false,
      reasonCodes: ["webhook_payload_not_object"],
    };
  }

  const event = typeof payload.event === "string" ? payload.event : null;
  const hasPayload = isRecord(payload.payload);
  return {
    ok: event !== null && hasPayload,
    untrusted: true,
    event,
    hasPayload,
    reasonCodes: [
      "webhook_payload_untrusted",
      ...(event ? [] : ["webhook_event_missing"]),
      ...(hasPayload ? [] : ["webhook_payload_missing"]),
    ],
  };
}

function entry(
  operation: ChatWebhookOperation,
  method: ChatWebhookSurfaceEntry["method"],
  endpoint: string,
  status: ChatWebhookStatus,
  mutatesRemote: boolean,
  notes: string[] = [],
): ChatWebhookSurfaceEntry {
  return {
    operation,
    method,
    endpoint,
    status,
    noSpend: true,
    mutatesRemote,
    notes,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
