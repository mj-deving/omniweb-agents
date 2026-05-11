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
    amount?: number;
    parentTxHash?: string;
    targetTxHash?: string;
    reaction?: "agree" | "disagree" | "flag";
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

const buildInjectedRuntimeCapabilities = await loadPackageExport<
  () => Record<string, unknown>
>("../dist/agent.js", "../src/agent.ts", "buildInjectedRuntimeCapabilities");

const planPolicyExecution = await loadPackageExport<
  (decision: MinimalDecision, options?: Record<string, unknown>) => {
    request: Record<string, unknown>;
    actionDecision: MinimalDecision | null;
    resolution: Record<string, unknown> | null;
    disposition: Record<string, unknown>;
  }
>("../dist/agent.js", "../src/agent.ts", "planPolicyExecution");

const executeResolvedIntent = await loadPackageExport<
  (options: Record<string, unknown>) => Promise<Record<string, unknown>>
>("../dist/agent.js", "../src/agent.ts", "executeResolvedIntent");

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
};

const reactDecision: MinimalDecision = {
  kind: "action",
  action: {
    type: "react",
    targetTxHash: "0xreact-target",
    reaction: "agree",
  },
};

const tipDecision: MinimalDecision = {
  kind: "action",
  action: {
    type: "tip",
    targetTxHash: "0xtip-target",
    amount: 3,
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

const injectedRuntimeCapabilities = buildInjectedRuntimeCapabilities();
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
const compiledReact = compilePolicyDecision(reactDecision, {
  runtimeCapabilities: injectedRuntimeCapabilities,
});
const compiledTip = compilePolicyDecision(tipDecision, {
  runtimeCapabilities: injectedRuntimeCapabilities,
});

const publishEnvelope = await executeResolvedIntent({
  omni: {
    colony: {
      publish: async () => ({
        ok: true,
        data: { txHash: "0xpublish-envelope" },
        provenance: {
          path: "local",
          attestation: {
            txHash: "0xpublish-attest-envelope",
            responseHash: "0xpublish-response-envelope",
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [
            {
              txHash: "0xpublish-envelope",
              payload: { cat: "OBSERVATION", text: "Publish bridge check" },
              score: 80,
            },
          ],
          meta: { lastBlock: 123 },
        },
      }),
    },
  },
  resolution: compiledPublish.resolution,
  verification: {
    timeoutMs: 45_000,
    pollMs: 5_000,
    limit: 50,
  },
});

const replyEnvelope = await executeResolvedIntent({
  omni: {
    colony: {
      reply: async () => ({
        ok: true,
        data: { txHash: "0xreply-envelope" },
        provenance: {
          path: "local",
          attestation: {
            txHash: "0xreply-attest-envelope",
            responseHash: "0xreply-response-envelope",
          },
        },
      }),
      getFeed: async () => ({
        ok: true,
        data: {
          posts: [
            {
              txHash: "0xreply-envelope",
              payload: { cat: "OBSERVATION", text: "Reply bridge check" },
              score: 79,
            },
          ],
          meta: { lastBlock: 124 },
        },
      }),
    },
  },
  resolution: compilePolicyDecision(replyDecision, {
    runtimeCapabilities: injectedRuntimeCapabilities,
  }).resolution,
  verification: {
    timeoutMs: 45_000,
    pollMs: 5_000,
    limit: 50,
  },
});

const reactEnvelope = await executeResolvedIntent({
  omni: {
    colony: {
      react: async () => ({ ok: true }),
      getReactions: (() => {
        let call = 0;
        return async () => {
          call += 1;
          return {
            ok: true,
            data: call === 1
              ? { agree: 0, disagree: 0, flag: 0 }
              : { agree: 1, disagree: 0, flag: 0 },
          };
        };
      })(),
    },
  },
  resolution: compiledReact.resolution,
  verification: {
    timeoutMs: 45_000,
    pollMs: 5_000,
    limit: 50,
  },
});

const tipEnvelope = await executeResolvedIntent({
  omni: {
    colony: {
      tip: async () => ({ ok: true, data: { txHash: "0xtip-envelope", validated: true } }),
      getTipStats: (() => {
        let call = 0;
        return async () => {
          call += 1;
          return {
            ok: true,
            data: call === 1
              ? { totalTips: 0, totalDem: 0, myTip: 0 }
              : { totalTips: 1, totalDem: 3, myTip: 3 },
          };
        };
      })(),
      getAgentTipStats: (() => {
        let call = 0;
        return async () => {
          call += 1;
          return {
            ok: true,
            data: call === 1
              ? { tipsGiven: { count: 0, totalDem: 0 }, tipsReceived: { count: 0, totalDem: 0 } }
              : { tipsGiven: { count: 0, totalDem: 0 }, tipsReceived: { count: 1, totalDem: 3 } },
          };
        };
      })(),
      getBalance: (() => {
        let call = 0;
        return async () => ({ ok: true, data: { balance: call++ === 0 ? 10 : 7 } });
      })(),
      getPostDetail: async () => ({
        ok: true,
        data: {
          post: { txHash: "0xtip-target", author: "0xrecipient", timestamp: 1, payload: {} },
          replies: [],
        },
      }),
    },
  },
  resolution: compiledTip.resolution,
  verification: {
    timeoutMs: 1,
    pollMs: 1,
    limit: 50,
  },
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
  publishActionOmitsPolicyReadiness: !("readiness" in (publishAction ?? {})),
  replyActionNormalized: replyAction?.kind === "action" && replyAction.action?.type === "reply",
  replyActionCarriesParent: replyAction?.action?.parentTxHash === replyDecision.parentTxHash,
  replyActionOmitsPolicyReadiness: !("readiness" in (replyAction ?? {})),
  directActionPassthrough: directAction === directActionDecision,
  skipReturnsNull: skippedAction === null,
  compiledPublishRequestMatches: compiledPublish.request.actionType === publishRequest.actionType,
  compiledPublishResolutionExecutable: compiledPublish.resolution?.status === "executable",
  executePlanReady: executePlan.disposition.kind === "execute",
  dryRunPlanReady: dryRunPlan.disposition.kind === "dry_run",
  skippedPlanReady: skippedPlan.disposition.kind === "skip",
  canonicalPublishEnvelopeReady: publishEnvelope.execution?.status === "executed"
    && publishEnvelope.execution?.actionType === "publish"
    && publishEnvelope.execution?.indexedVisible === true,
  canonicalReplyEnvelopeReady: replyEnvelope.execution?.status === "executed"
    && replyEnvelope.execution?.actionType === "reply"
    && replyEnvelope.execution?.indexedVisible === true,
  canonicalReactEnvelopeReady: reactEnvelope.execution?.status === "executed"
    && reactEnvelope.execution?.actionType === "react"
    && reactEnvelope.execution?.verificationPath === "reaction_counts",
  compiledTipResolutionExecutable: compiledTip.resolution?.status === "executable",
  canonicalTipEnvelopeReady: tipEnvelope.execution?.status === "executed"
    && tipEnvelope.execution?.actionType === "tip"
    && tipEnvelope.execution?.verificationPath === "post_tip_stats"
    && tipEnvelope.execution?.indexedVisible === true,
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
    compiledReact,
    compiledTip,
    publishEnvelope,
    replyEnvelope,
    reactEnvelope,
    tipEnvelope,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
