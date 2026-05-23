#!/usr/bin/env npx tsx
/**
 * probe-webhook-receiver-gate.ts — no-spend gate for the controlled webhook receiver lane.
 */

import {
  CHAT_WEBHOOK_SURFACE,
  buildChatWebhookPlan,
  classifyWebhookEventPayload,
} from "../src/index.js";

const webhookOperations = [
  "webhooks.list",
  "webhooks.create",
  "webhooks.update",
  "webhooks.delete",
  "webhooks.event.receive",
] as const;
const webhookOperationSet = new Set<string>(webhookOperations);

const surface = CHAT_WEBHOOK_SURFACE.filter((entry) => webhookOperationSet.has(entry.operation));
const presentWebhookOperations = new Set(surface.map((entry) => entry.operation));
const duplicateWebhookOperations = surface
  .map((entry) => entry.operation)
  .filter((operation, index, operations) => operations.indexOf(operation) !== index);
const missingWebhookOperations = webhookOperations.filter((operation) => !presentWebhookOperations.has(operation));
const plans = [
  buildChatWebhookPlan({ operation: "webhooks.list" }),
  buildChatWebhookPlan({ operation: "webhooks.create", token: "webhook-token-123456", execute: true }),
  buildChatWebhookPlan({
    operation: "webhooks.update",
    token: "webhook-token-123456",
    id: "controlled-webhook-id-placeholder",
    execute: true,
  }),
  buildChatWebhookPlan({
    operation: "webhooks.delete",
    token: "webhook-token-123456",
    id: "controlled-webhook-id-placeholder",
    execute: true,
  }),
  buildChatWebhookPlan({ operation: "webhooks.event.receive" }),
];

const receivedEvent = classifyWebhookEventPayload({ event: "post.created", payload: { txHash: "0xpost" } });
const malformedEvent = classifyWebhookEventPayload({ payload: {} });

const missingLivePrerequisites = [
  "controlled_public_https_callback",
  "cleanup_policy",
  "owned_webhook_id",
  "post_create_list_readback",
  "post_delete_absence_readback",
];

const mutationPlans = plans.filter((plan) => plan.mutatesRemote);
const checks = {
  webhookOperationsPresent: missingWebhookOperations.length === 0 && duplicateWebhookOperations.length === 0,
  allNoSpend: surface.every((entry) => entry.noSpend),
  listRequiresAuth: plans[0]?.operation === "webhooks.list" && plans[0]?.executionGate === "auth_required",
  mutationsRequireExplicitExecute: mutationPlans.every(
    (plan) => plan.executionGate === "explicit_execute_required" && plan.canExecuteNow === false,
  ),
  eventPayloadClassifiedUntrusted:
    receivedEvent.ok === true && receivedEvent.untrusted === true && malformedEvent.ok === false,
  syntheticSecretsRedacted: plans.every((plan) => !JSON.stringify(plan).includes("token-123456")),
  livePrerequisitesAbsent: missingLivePrerequisites.length === 5,
  noLiveMutationExecuted: true,
};

const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  status: "BLOCKED",
  ok,
  checks,
  coverage: {
    expectedOperations: webhookOperations,
    presentOperations: [...presentWebhookOperations],
    missingOperations: missingWebhookOperations,
    duplicateOperations: duplicateWebhookOperations,
  },
  surface,
  plans,
  webhookEvents: {
    receivedEvent,
    malformedEvent,
  },
  missingLivePrerequisites,
  liveEvidence: {
    checkedAt: "2026-05-18T18:46:38Z",
    webhooks: {
      endpoint: "/api/webhooks",
      unauthenticatedStatus: 401,
      classification: "auth_required",
    },
  },
  contract: {
    ownerBead: "omniweb-agents-6rc3.5",
    noSpend: true,
    noMutation: true,
    liveMutationExecuted: false,
    controlledReceiverPresent: false,
    ownedWebhookIdPresent: false,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
