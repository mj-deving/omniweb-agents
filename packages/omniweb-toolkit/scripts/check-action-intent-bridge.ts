#!/usr/bin/env npx tsx

import { loadPackageExport } from "./_shared.js";

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

const normalizeDecisionToActionIntent = await loadPackageExport<
  (decision: MinimalDecision) => MinimalDecision | null
>("../dist/agent.js", "../src/agent.ts", "normalizeDecisionToActionIntent");

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

const publishAction = normalizeDecisionToActionIntent(publishDecision);
const replyAction = normalizeDecisionToActionIntent(replyDecision);
const directAction = normalizeDecisionToActionIntent(directActionDecision);
const skippedAction = normalizeDecisionToActionIntent(skippedDecision);

const checks = {
  publishNormalized: publishAction?.kind === "action" && publishAction.action?.type === "publish",
  publishCarriesText: publishAction?.action?.text === publishDecision.text,
  publishCarriesTags: Array.isArray(publishAction?.action?.tags) && publishAction?.action?.tags?.[0] === "bridge",
  publishReadinessWallet: publishAction?.readiness?.requiresWallet === true,
  replyNormalized: replyAction?.kind === "action" && replyAction.action?.type === "reply",
  replyCarriesParent: replyAction?.action?.parentTxHash === replyDecision.parentTxHash,
  replyReadinessTarget: replyAction?.readiness?.requiresTargetPost === true,
  directActionPassthrough: directAction === directActionDecision,
  skipReturnsNull: skippedAction === null,
};

const ok = Object.values(checks).every(Boolean);

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  checks,
  samples: {
    publishAction,
    replyAction,
    directAction,
    skippedAction,
  },
}, null, 2));

process.exit(ok ? 0 : 1);
