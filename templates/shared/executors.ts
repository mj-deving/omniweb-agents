import type { AgentRuntime } from "../../src/toolkit/agent-runtime.js";
import type { ObserveFn, LightExecutor, HeavyExecutor } from "../../src/toolkit/agent-loop.js";
import { learnFirstObserve } from "../../src/toolkit/observe/learn-first-observe.js";
import type { SourceDeps } from "../../src/toolkit/observe/observe-router.js";
import type { StrategyAction } from "../../src/toolkit/strategy/types.js";
import { buildInjectedRuntimeCapabilities } from "../../packages/omniweb-toolkit/src/injected-runtime-capabilities.js";
import { executeResolvedIntent } from "../../packages/omniweb-toolkit/src/action-executor.js";
import { createHiveAPI } from "../../packages/omniweb-toolkit/src/hive.js";
import type { OmniWeb } from "../../packages/omniweb-toolkit/src/colony.js";
import { resolveActionRequest } from "../../packages/omniweb-toolkit/src/minimal-agent-resolver.js";
import type { MinimalActionType, PolicyActionRequest } from "../../packages/omniweb-toolkit/src/intent-types.js";
import type { PublishVoteOptions } from "../../src/toolkit/types.js";
import type { AgentSourceView } from "../../src/toolkit/sources/catalog.js";

const DEFAULT_VERIFICATION = {
  timeoutMs: 45_000,
  pollMs: 5_000,
  limit: 50,
};

export function createTemplateExecutors(
  label: string,
  _agentConfig: unknown,
  sourceView: AgentSourceView,
  _dryRun: boolean,
  _tipMemo = "Template tip",
) {
  const executeLightActions: LightExecutor = async (actions, runtime) => {
    return executeTemplateActions(label, actions, runtime, sourceView, _dryRun);
  };

  const executeHeavyActions: HeavyExecutor = async (actions, runtime) => {
    return executeTemplateActions(label, actions, runtime, sourceView, _dryRun);
  };

  return { executeLightActions, executeHeavyActions };
}

async function executeTemplateActions(
  label: string,
  actions: StrategyAction[],
  runtime: AgentRuntime,
  sourceView: AgentSourceView,
  dryRun: boolean,
) {
  const omni = buildInjectedOmni(runtime);
  const executed: Array<{ action: StrategyAction; success: boolean }> = [];
  const skipped: Array<{ action: StrategyAction; reason: string }> = [];

  for (const action of actions) {
    if (action.type === "VOTE") {
      const result = await executeVoteAction(omni, action, sourceView, dryRun);
      if (result.success) {
        executed.push({ action, success: true });
      } else {
        skipped.push({ action, reason: result.reason });
      }
      continue;
    }

    const request = await policyRequestForStrategyAction(action, runtime, sourceView);
    if (!request) {
      skipped.push({ action, reason: "unsupported_template_action" });
      continue;
    }

    const resolution = resolveActionRequest(request, {
      runtimeCapabilities: buildInjectedRuntimeCapabilities(),
    });
    if (!resolution) {
      skipped.push({ action, reason: "unresolved_template_action" });
      continue;
    }

    const envelope = await executeResolvedIntent({
      omni,
      resolution,
      verification: DEFAULT_VERIFICATION,
      dryRun,
    });
    const success = envelope.execution.status === "executed" || envelope.execution.status === "dry_run";
    executed.push({ action, success });
    if (!success) {
      skipped.push({
        action,
        reason: envelope.execution.errorMessage ?? envelope.execution.error?.message ?? "template_action_failed",
      });
    }
  }

  if (actions.length > 0) {
    console.log(`[${label}] template actions routed through package action executor`);
  }

  return { executed, skipped };
}

async function executeVoteAction(
  omni: OmniWeb,
  action: StrategyAction,
  sourceView: AgentSourceView,
  dryRun: boolean,
): Promise<{ success: true } | { success: false; reason: string }> {
  const vote = voteOptionsForStrategyAction(action, sourceView);
  if (!vote) return { success: false, reason: "missing_vote_draft" };
  if (dryRun) return { success: true };

  const result = await omni.colony.publishVote(vote);
  if (result.ok) return { success: true };
  return {
    success: false,
    reason: result.error?.message ?? "vote_publish_failed",
  };
}

function buildInjectedOmni(runtime: AgentRuntime): OmniWeb {
  const colony = createHiveAPI(runtime, {});

  return {
    colony,
    hive: colony,
    toolkit: runtime.toolkit,
    runtime,
    address: runtime.address,
    identity: {} as OmniWeb["identity"],
    escrow: {} as OmniWeb["escrow"],
    storage: {} as OmniWeb["storage"],
    ipfs: {} as OmniWeb["ipfs"],
    chain: {} as OmniWeb["chain"],
  };
}

async function policyRequestForStrategyAction(
  action: StrategyAction,
  runtime: AgentRuntime,
  sourceView: AgentSourceView,
): Promise<PolicyActionRequest | null> {
  switch (action.type) {
    case "ENGAGE":
      {
        const targetPostTxHash = action.targetType === "agent"
          ? await resolveAgentToRecentPost(runtime, action.target)
          : action.target;
        if (!targetPostTxHash) return null;
        return {
          actionType: "react",
          target: { postTxHash: targetPostTxHash },
          draft: { reaction: readReaction(action.metadata) },
          audit: auditForStrategyAction(action),
        };
      }
    case "TIP":
      {
        if (action.metadata?.hasAttestation !== true) return null;
        const targetPostTxHash = action.targetType === "agent"
          ? await resolveAgentToRecentPost(runtime, action.target)
          : action.target;
        if (!targetPostTxHash) return null;
        return {
          actionType: "tip",
          target: { postTxHash: targetPostTxHash },
          draft: { amount: readPositiveNumber(action.metadata?.amount) ?? 1 },
          audit: auditForStrategyAction(action),
        };
      }
    case "PUBLISH":
      return writeRequest("publish", action, sourceView);
    case "REPLY":
      return writeRequest("reply", action, sourceView);
    case "BET":
      return betRequest(action);
    case "VOTE":
      return null;
  }
}

async function resolveAgentToRecentPost(runtime: AgentRuntime, address?: string): Promise<string | undefined> {
  if (!address) return undefined;
  const feed = await runtime.toolkit.feed.getRecent({ author: address, limit: 10 } as never);
  if (feed?.ok !== true) return undefined;
  const posts = Array.isArray(feed.data?.posts) ? feed.data.posts : [];
  const post = posts.find((entry: { txHash?: unknown }) => typeof entry.txHash === "string" && entry.txHash.length > 0);
  return post?.txHash;
}

function writeRequest(
  actionType: Extract<MinimalActionType, "publish" | "reply">,
  action: StrategyAction,
  sourceView: AgentSourceView,
): PolicyActionRequest | null {
  const text = readLongDraftText(action.metadata?.text) ?? buildTemplateDraftText(action);
  const attestUrl = readEvidenceUrl(action, sourceView);
  if (!text || !attestUrl) return null;
  return {
    actionType,
    target: actionType === "reply" ? { parentTxHash: action.target } : undefined,
    draft: {
      category: readString(action.metadata?.category) ?? "OBSERVATION",
      text,
      tags: readStringArray(action.metadata?.tags),
      confidence: readPositiveNumber(action.metadata?.confidence),
    },
    evidenceRequest: {
      primary: attestUrl,
      strength: "inherit",
    },
    audit: auditForStrategyAction(action),
  };
}

function voteOptionsForStrategyAction(action: StrategyAction, sourceView: AgentSourceView): PublishVoteOptions | null {
  const asset = readString(action.metadata?.asset) ?? readString(action.target);
  const predictedPrice = readPositiveNumber(action.metadata?.predictedPrice);
  const referencePrice = readPositiveNumber(action.metadata?.referencePrice);
  if (!asset || predictedPrice == null || referencePrice == null) return null;
  return {
    asset,
    predictedPrice,
    referencePrice,
    confidence: readPositiveNumber(action.metadata?.confidence),
    horizon: readString(action.metadata?.horizon) ?? "30m",
    text: readLongDraftText(action.metadata?.text) ?? buildTemplateDraftText(action),
    tags: readStringArray(action.metadata?.tags),
    attestUrl: readEvidenceUrl(action, sourceView),
  };
}

function buildTemplateDraftText(action: StrategyAction): string {
  const evidence = action.evidence?.length ? action.evidence.join("; ") : "No explicit evidence references were attached.";
  const target = action.target ? `Target: ${action.target}.` : "Target: colony surface.";
  const topic = readString(action.metadata?.topic) ?? readString(action.metadata?.asset) ?? "current colony surface";
  return [
    `Template agent observation for ${topic}.`,
    action.reason,
    target,
    `Evidence references: ${evidence}.`,
    "This draft is routed through the package action executor and should be treated as a compact operational observation, not a manually curated report.",
  ].join(" ");
}

function betRequest(action: StrategyAction): PolicyActionRequest {
  const direction = action.metadata?.direction === "higher" || action.metadata?.direction === "lower"
    ? action.metadata.direction
    : undefined;
  const marketKind = direction ? "higher_lower" : "fixed_price";
  return {
    actionType: "bet",
    target: {
      asset: readString(action.metadata?.asset) ?? readString(action.target),
    },
    draft: {
      marketKind,
      horizon: readString(action.metadata?.horizon) ?? "24h",
      amount: 5,
      predictedPrice: readPositiveNumber(action.metadata?.predictedPrice),
      direction,
    },
    audit: auditForStrategyAction(action),
  };
}

function auditForStrategyAction(action: StrategyAction) {
  return {
    routeId: "legacy-template-compat",
    matchedConditions: [action.reason],
    observedInputs: action.evidence,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readLongDraftText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length >= 200 ? value : undefined;
}

function readEvidenceUrl(action: StrategyAction, sourceView: AgentSourceView): string | undefined {
  const explicit = readString(action.metadata?.attestUrl);
  if (explicit && isHttpsUrl(explicit)) return explicit;
  const evidenceUrl = action.evidence?.find(isHttpsUrl);
  if (evidenceUrl) return evidenceUrl;
  for (const evidenceId of action.evidence ?? []) {
    const source = sourceView.sources.find((entry) => entry.id === evidenceId || entry.name === evidenceId);
    if (source && isHttpsUrl(source.url)) return source.url;
  }
  return undefined;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function readStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;
}

function readPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function readReaction(metadata: StrategyAction["metadata"]) {
  if (metadata?.reaction === "agree" || metadata?.reaction === "disagree" || metadata?.reaction === "flag") {
    return metadata.reaction;
  }
  return "agree";
}

export async function syncColonyAtStartup(
  runtime: { colonyDb?: unknown },
  _label: string,
): Promise<void> {
  if (!runtime.colonyDb) return;
}

export function wireSourceDeps(
  runtime: { colonyDb?: unknown },
  sourceView: { sources: unknown[] },
  label: string,
  strategyPath: string,
): ObserveFn {
  if (runtime.colonyDb && sourceView.sources.length > 0) {
    console.log(`[${label}] Source pipeline wired (${sourceView.sources.length} sources)`);
    return (toolkit, address) =>
      learnFirstObserve(toolkit, address, strategyPath, {
        db: runtime.colonyDb,
        sourceView,
        observe: (type, msg) => console.log(`[${label}:sources] ${type}: ${msg}`),
      } as SourceDeps);
  }
  return (toolkit, address) => learnFirstObserve(toolkit, address, strategyPath);
}
