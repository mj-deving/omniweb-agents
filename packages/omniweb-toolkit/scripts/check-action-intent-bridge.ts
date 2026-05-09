#!/usr/bin/env npx tsx

import { loadPackageExport } from "./_shared.js";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: check-action-intent-bridge.ts\n\nValidates that legacy decisions normalize into PolicyActionRequest, generic action intents, and the explicit policy compile/run shell.");
  process.exit(0);
}

interface MinimalDecision {
  kind: "skip" | "publish" | "reply" | "action";
  reason?: string;
  category?: string;
  text?: string;
  attestUrl?: string;
  tags?: string[];
  confidence?: number;
  parentTxHash?: string;
  action?: {
    type?: "publish" | "reply" | "react" | "tip" | "bet";
    category?: string;
    text?: string;
    attestUrl?: string;
    tags?: string[];
    confidence?: number;
    parentTxHash?: string;
  };
  readiness?: {
    requiresWallet?: boolean;
    requiresAttestation?: boolean;
    requiresTargetPost?: boolean;
  };
  facts?: Record<string, unknown>;
}

const normalizeDecisionToPolicyActionRequest = await loadPackageExport<
  (decision: MinimalDecision) => Record<string, unknown>
>("../dist/agent.js", "../src/agent.ts", "normalizeDecisionToPolicyActionRequest");

const normalizeDecisionToActionIntent = await loadPackageExport<
  (decision: MinimalDecision) => MinimalDecision | null
>("../dist/agent.js", "../src/agent.ts", "normalizeDecisionToActionIntent");

const compilePolicyDecision = await loadPackageExport<
  (decision: MinimalDecision, options?: Record<string, unknown>) => {
    request: Record<string, unknown>;
    actionDecision: MinimalDecision | null;
    resolution: Record<string, unknown> | null;
  }
>("../dist/agent.js", "../src/agent.ts", "compilePolicyDecision");

const buildInjectedPolicyRuntimeCapabilities = await loadPackageExport<
  () => Record<string, unknown>
>("../dist/agent.js", "../src/agent.ts", "buildInjectedPolicyRuntimeCapabilities");

const planPolicyExecution = await loadPackageExport<
  (decision: MinimalDecision, options?: Record<string, unknown>) => {
    request: Record<string, unknown>;
    actionDecision: MinimalDecision | null;
    resolution: Record<string, unknown> | null;
    disposition: Record<string, unknown>;
  }
>("../dist/agent.js", "../src/agent.ts", "planPolicyExecution");

const publishDecision: MinimalDecision = {
  kind: "publish",
  category: "OBSERVATION",
  text: "Publish bridge check",
  attestUrl: "https://app.supercolony.ai/api/signals",
  tags: ["bridge", "publish"],
  confidence: 66,
};

const replyDecision: MinimalDecision = {
  kind: "reply",
  parentTxHash: "0xreply-target",
  category: "OBSERVATION",
  text: "Reply bridge check",
  attestUrl: "https://app.supercolony.ai/api/signals",
};

const directActionDecision: MinimalDecision = {
  kind: "action",
  action: {
    type: "publish",
    category: "OBSERVATION",
    text: "Direct action bridge check",
    attestUrl: "https://app.supercolony.ai/api/signals",
    tags: ["bridge", "action"],
    confidence: 71,
  },
  readiness: {
    requiresWallet: true,
    requiresAttestation: true,
  },
};

const skippedDecision: MinimalDecision = {
  kind: "skip",
  reason: "bridge_check_skip",
};

const publishRequest = normalizeDecisionToPolicyActionRequest(publishDecision);
const replyRequest = normalizeDecisionToPolicyActionRequest(replyDecision);
const directRequest = normalizeDecisionToPolicyActionRequest(directActionDecision);
const skippedRequest = normalizeDecisionToPolicyActionRequest(skippedDecision);

const publishAction = normalizeDecisionToActionIntent(publishDecision);
const replyAction = normalizeDecisionToActionIntent(replyDecision);
const directAction = normalizeDecisionToActionIntent(directActionDecision);
const skippedAction = normalizeDecisionToActionIntent(skippedDecision);

const injectedRuntimeCapabilities = buildInjectedPolicyRuntimeCapabilities();
const compiledPublish = compilePolicyDecision(publishDecision, {
  runtimeCapabilities: injectedRuntimeCapabilities,
});
const executePlan = planPolicyExecution(publishDecision, {
  runtimeCapabilities: injectedRuntimeCapabilities,
});
const dryRunPlan = planPolicyExecution(publishDecision, {
  runtimeCapabilities: injectedRuntimeCapabilities,
  dryRun: true,
});
const skippedPlan = planPolicyExecution(skippedDecision, {
  runtimeCapabilities: injectedRuntimeCapabilities,
});

const checks = {
  publishRequestNormalized: publishRequest.actionType === "publish",
  publishRequestCarriesEvidence: (publishRequest.evidenceRequest as { primary?: string } | undefined)?.primary === publishDecision.attestUrl,
  publishRequestCarriesText: (publishRequest.draft as { text?: string } | undefined)?.text === publishDecision.text,
  replyRequestNormalized: replyRequest.actionType === "reply",
  replyRequestCarriesParent: (replyRequest.target as { parentTxHash?: string } | undefined)?.parentTxHash === replyDecision.parentTxHash,
  directRequestNormalized: directRequest.actionType === "publish",
  skipRequestNormalized: skippedRequest.actionType === "skip",
  publishActionNormalized: publishAction?.kind === "action" && publishAction.action?.type === "publish",
  publishActionCarriesText: publishAction?.action?.text === publishDecision.text,
  publishActionCarriesTags: Array.isArray(publishAction?.action?.tags) && publishAction?.action?.tags?.[0] === "bridge",
  publishReadinessWallet: publishAction?.readiness?.requiresWallet === true,
  replyActionNormalized: replyAction?.kind === "action" && replyAction.action?.type === "reply",
  replyActionCarriesParent: replyAction?.action?.parentTxHash === replyDecision.parentTxHash,
  replyReadinessTarget: replyAction?.readiness?.requiresTargetPost === true,
  directActionPassthrough: directAction === directActionDecision,
  skipReturnsNull: skippedAction === null,
  compiledPublishRequestMatches: compiledPublish.request.actionType === publishRequest.actionType,
  compiledPublishResolutionExecutable: compiledPublish.resolution?.status === "executable",
  executePlanReady: executePlan.disposition.kind === "execute",
  dryRunPlanReady: dryRunPlan.disposition.kind === "dry_run",
  skippedPlanReady: skippedPlan.disposition.kind === "skip",
};

const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  samples: {
    publishRequest,
    replyRequest,
    directRequest,
    skippedRequest,
    publishAction,
    replyAction,
    directAction,
    skippedAction,
    compiledPublish,
    executePlan,
    dryRunPlan,
    skippedPlan,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
