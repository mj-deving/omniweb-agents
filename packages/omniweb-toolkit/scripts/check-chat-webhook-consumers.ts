#!/usr/bin/env -S bunx tsx
/**
 * check-chat-webhook-consumers.ts — No-spend proof for auth-gated chat and webhook lifecycle consumers.
 */

import {
  hasFlag,
  loadPackageExport,
} from "./_shared.js";

type ChatWebhookSurfaceEntry = { operation: string; noSpend: boolean };
type ChatWebhookPlan = {
  operation?: string;
  mutatesRemote: boolean;
  executionGate: string;
  canExecuteNow: boolean;
};
type WebhookEventClassification = { ok: boolean; untrusted?: boolean };

const args = process.argv.slice(2);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bun ./scripts/check-chat-webhook-consumers.ts

No-spend proof for auth-gated chat and webhook lifecycle consumers.

Options:
  --help, -h  Show this help`);
  process.exit(0);
}
if (args.length > 0) {
  console.error(`Error: unsupported arguments: ${args.join(" ")}`);
  process.exit(2);
}

const CHAT_WEBHOOK_SURFACE = await loadPackageExport<ChatWebhookSurfaceEntry[]>(
  "../dist/index.js",
  "../src/index.js",
  "CHAT_WEBHOOK_SURFACE",
);
const buildChatWebhookPlan = await loadPackageExport<(input: Record<string, unknown>) => ChatWebhookPlan>(
  "../dist/index.js",
  "../src/index.js",
  "buildChatWebhookPlan",
);
const classifyWebhookEventPayload = await loadPackageExport<
  (input: Record<string, unknown>) => WebhookEventClassification
>(
  "../dist/index.js",
  "../src/index.js",
  "classifyWebhookEventPayload",
);

const plans = [
  buildChatWebhookPlan({ operation: "chat.rooms.list" }),
  buildChatWebhookPlan({ operation: "chat.messages.list", token: "chat-token-123456" }),
  buildChatWebhookPlan({ operation: "chat.message.send", token: "chat-token-123456", execute: true }),
  buildChatWebhookPlan({ operation: "webhooks.list" }),
  buildChatWebhookPlan({ operation: "webhooks.create", token: "webhook-token-123456", execute: true }),
  buildChatWebhookPlan({ operation: "webhooks.update", token: "webhook-token-123456", id: "hook-1", execute: true }),
  buildChatWebhookPlan({ operation: "webhooks.delete", token: "webhook-token-123456", id: "hook-1", execute: true }),
  buildChatWebhookPlan({ operation: "webhooks.event.receive" }),
];
const validEvent = classifyWebhookEventPayload({ event: "post.created", payload: { txHash: "0xpost" } });
const invalidEvent = classifyWebhookEventPayload({ payload: {} });

const checks = {
  allOperationsPresent: CHAT_WEBHOOK_SURFACE.length === 8,
  allNoSpend: CHAT_WEBHOOK_SURFACE.every((entry) => entry.noSpend),
  unauthenticatedReadsGateAuth: plans[0]?.executionGate === "auth_required" && plans[3]?.executionGate === "auth_required",
  remoteMutationsDoNotExecute: plans
    .filter((plan) => plan.mutatesRemote)
    .every((plan) => plan.executionGate === "explicit_execute_required" && plan.canExecuteNow === false),
  secretsRedacted: plans.every((plan) => !JSON.stringify(plan).includes("token-123456")),
  webhookEventClassified: validEvent.ok === true && invalidEvent.ok === false && invalidEvent.untrusted === true,
};
const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  surface: CHAT_WEBHOOK_SURFACE,
  plans,
  webhookEvents: {
    validEvent,
    invalidEvent,
  },
  liveEvidence: {
    checkedAt: "2026-05-18T18:46:38Z",
    chatRooms: {
      endpoint: "/api/chat/rooms",
      unauthenticatedStatus: 401,
      classification: "auth_required",
    },
    webhooks: {
      endpoint: "/api/webhooks",
      unauthenticatedStatus: 401,
      classification: "auth_required",
    },
  },
  contract: {
    ownerBead: "omniweb-agents-0ctx.7",
    noSpend: true,
    noMutation: true,
    liveMutationExecuted: false,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
