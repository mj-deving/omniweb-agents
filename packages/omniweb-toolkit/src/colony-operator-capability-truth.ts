import { describeRuntimeCapabilities, type RuntimeActionCapability, type RuntimeCapabilityResult, type WriteReadinessOptions } from "./readiness.js";
import type { RuntimeActionFamily } from "./readiness.js";

export type ColonyOperatorActionFamily =
  | "skip"
  | "publish"
  | "reply"
  | "react"
  | "tip"
  | "VOTE"
  | "bet-fixed"
  | "bet-hl"
  | "register"
  | "human-link";

export type ColonyOperatorTruthStatus =
  | "executable"
  | "blocked"
  | "supervised"
  | "degraded"
  | "lifecycle-pending"
  | "unsupported";

export type ColonyOperatorLifecycleStatus =
  | "no-write"
  | "planned"
  | "indexed"
  | "resolved"
  | "degraded"
  | "lifecycle-pending";

export interface ColonyOperatorActionTruth {
  actionFamily: ColonyOperatorActionFamily;
  status: ColonyOperatorTruthStatus;
  lifecycleStatus: ColonyOperatorLifecycleStatus;
  runtimeFamily: RuntimeActionFamily | "identity" | "none";
  executionPathFamily:
    | "none"
    | "direct_attested_write"
    | "reaction"
    | "tip_transfer"
    | "vote_publish"
    | "market_write"
    | "identity_mutation";
  requiresWallet: boolean;
  requiresAttestation: boolean;
  requiresTargetPost: boolean;
  requiresMarketContext: boolean;
  requiresExplicitExecute: boolean;
  writesLifecycleRecord: boolean;
  spendsDem: boolean;
  proofLevel:
    | "no_spend_runtime_outcome"
    | "real_runtime_action_family"
    | "lifecycle_proven"
    | "supervised_identity"
    | "pending_current_recheck";
  reasonCodes: string[];
  notes: string[];
}

export interface ColonyOperatorCapabilityTruth {
  generatedAt: string;
  recommendedMode: RuntimeCapabilityResult["recommendedMode"];
  authReady: boolean;
  writeReady: boolean;
  blockers: RuntimeCapabilityResult["blockers"];
  actions: ColonyOperatorActionTruth[];
  coverage: {
    requiredFamilies: ColonyOperatorActionFamily[];
    presentFamilies: ColonyOperatorActionFamily[];
    missingFamilies: ColonyOperatorActionFamily[];
    allRequiredFamiliesPresent: boolean;
    lifecycleAwareFamilies: ColonyOperatorActionFamily[];
    identityFamilies: ColonyOperatorActionFamily[];
    noSpendDefault: boolean;
  };
}

const REQUIRED_OPERATOR_FAMILIES: ColonyOperatorActionFamily[] = [
  "skip",
  "publish",
  "reply",
  "react",
  "tip",
  "VOTE",
  "bet-fixed",
  "bet-hl",
  "register",
  "human-link",
];

export function buildColonyOperatorCapabilityTruth(
  options: WriteReadinessOptions & { now?: Date; runtimeCapabilities?: RuntimeCapabilityResult } = {},
): ColonyOperatorCapabilityTruth {
  const runtime = options.runtimeCapabilities ?? describeRuntimeCapabilities(options);
  const actions: ColonyOperatorActionTruth[] = [
    {
      actionFamily: "skip",
      status: "executable",
      lifecycleStatus: "no-write",
      runtimeFamily: "none",
      executionPathFamily: "none",
      requiresWallet: false,
      requiresAttestation: false,
      requiresTargetPost: false,
      requiresMarketContext: false,
      requiresExplicitExecute: false,
      writesLifecycleRecord: false,
      spendsDem: false,
      proofLevel: "no_spend_runtime_outcome",
      reasonCodes: [],
      notes: ["Skip is a successful no-spend operator outcome when live state does not justify action."],
    },
    fromRuntimeAction("publish", runtime.actionFamilies.publish, {
      actionFamily: "publish",
      lifecycleStatus: "indexed",
      executionPathFamily: "direct_attested_write",
      writesLifecycleRecord: true,
      spendsDem: true,
      proofLevel: "lifecycle_proven",
      notes: ["Publish uses the attested write path and the lifecycle-capable visibility recheck harness."],
    }),
    fromRuntimeAction("reply", runtime.actionFamilies.reply, {
      actionFamily: "reply",
      lifecycleStatus: "degraded",
      executionPathFamily: "direct_attested_write",
      writesLifecycleRecord: true,
      spendsDem: true,
      proofLevel: "lifecycle_proven",
      notes: ["Reply is live-proven through parent-thread/post-detail visibility, with recent-feed indexing still degraded."],
    }),
    fromRuntimeAction("react", runtime.actionFamilies.react, {
      actionFamily: "react",
      lifecycleStatus: "indexed",
      executionPathFamily: "reaction",
      writesLifecycleRecord: true,
      spendsDem: false,
      proofLevel: "lifecycle_proven",
      notes: ["Reaction readback is represented in the same lifecycle vocabulary with a fast convergence path."],
    }),
    fromRuntimeAction("tip", runtime.actionFamilies.tip, {
      actionFamily: "tip",
      lifecycleStatus: "degraded",
      executionPathFamily: "tip_transfer",
      writesLifecycleRecord: true,
      spendsDem: true,
      proofLevel: "lifecycle_proven",
      notes: ["Tip remains degraded unless post/recipient stats converge; tx confirmation alone is not product success."],
    }),
    fromRuntimeAction("publish", runtime.actionFamilies.publish, {
      actionFamily: "VOTE",
      lifecycleStatus: "indexed",
      executionPathFamily: "vote_publish",
      writesLifecycleRecord: true,
      spendsDem: true,
      proofLevel: "lifecycle_proven",
      notes: ["VOTE uses publishVote plus category-search lifecycle recheck, separate from DEM pool betting."],
    }),
    fromRuntimeAction("bet", runtime.actionFamilies.bet, {
      actionFamily: "bet-fixed",
      lifecycleStatus: "resolved",
      executionPathFamily: "market_write",
      writesLifecycleRecord: true,
      spendsDem: true,
      proofLevel: "lifecycle_proven",
      notes: ["Fixed-price BET is proven through delayed winners/history readback, not tx confirmation alone."],
    }),
    fromRuntimeAction("bet", runtime.actionFamilies.bet, {
      actionFamily: "bet-hl",
      forceStatus: "lifecycle-pending",
      lifecycleStatus: "lifecycle-pending",
      executionPathFamily: "market_write",
      writesLifecycleRecord: true,
      spendsDem: true,
      proofLevel: "pending_current_recheck",
      reasonCodes: ["higher_lower_current_delayed_readback_pending"],
      notes: ["Higher/lower remains represented explicitly but cannot be upgraded until the current delayed-readback proof exists."],
    }),
    identityAction("register", runtime),
    identityAction("human-link", runtime),
  ];

  const presentFamilies = actions.map((action) => action.actionFamily);
  const missingFamilies = REQUIRED_OPERATOR_FAMILIES.filter((family) => !presentFamilies.includes(family));

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    recommendedMode: runtime.recommendedMode,
    authReady: runtime.authReady,
    writeReady: runtime.writeReady,
    blockers: runtime.blockers,
    actions,
    coverage: {
      requiredFamilies: [...REQUIRED_OPERATOR_FAMILIES],
      presentFamilies,
      missingFamilies,
      allRequiredFamiliesPresent: missingFamilies.length === 0,
      lifecycleAwareFamilies: actions
        .filter((action) => action.writesLifecycleRecord)
        .map((action) => action.actionFamily),
      identityFamilies: ["register", "human-link"],
      noSpendDefault: true,
    },
  };
}

function fromRuntimeAction(
  runtimeFamily: RuntimeActionFamily,
  capability: RuntimeActionCapability,
  opts: {
    actionFamily: ColonyOperatorActionFamily;
    forceStatus?: ColonyOperatorTruthStatus;
    lifecycleStatus: ColonyOperatorLifecycleStatus;
    executionPathFamily: ColonyOperatorActionTruth["executionPathFamily"];
    writesLifecycleRecord: boolean;
    spendsDem: boolean;
    proofLevel: ColonyOperatorActionTruth["proofLevel"];
    reasonCodes?: string[];
    notes: string[];
  },
): ColonyOperatorActionTruth {
  const blockedStatus: ColonyOperatorTruthStatus = capability.readiness === "unsupported" || !capability.executable
    ? "unsupported"
    : capability.readiness === "ready"
      ? "executable"
      : "blocked";
  const status = opts.forceStatus ?? blockedStatus;
  const reasonCodes = [
    ...reasonCodesForCapability(capability),
    ...(opts.reasonCodes ?? []),
  ];

  return {
    actionFamily: opts.actionFamily,
    status,
    lifecycleStatus: opts.lifecycleStatus,
    runtimeFamily,
    executionPathFamily: opts.executionPathFamily,
    requiresWallet: capability.requiresWallet,
    requiresAttestation: opts.actionFamily === "VOTE" ? false : capability.requiresAttestation,
    requiresTargetPost: capability.requiresTargetPost,
    requiresMarketContext: capability.requiresMarketContext,
    requiresExplicitExecute: opts.spendsDem,
    writesLifecycleRecord: opts.writesLifecycleRecord,
    spendsDem: opts.spendsDem,
    proofLevel: opts.proofLevel,
    reasonCodes,
    notes: [...opts.notes, ...capability.notes],
  };
}

function identityAction(
  actionFamily: Extract<ColonyOperatorActionFamily, "register" | "human-link">,
  runtime: RuntimeCapabilityResult,
): ColonyOperatorActionTruth {
  const missingCredentials = runtime.blockers.includes("missing_credentials");
  return {
    actionFamily,
    status: missingCredentials ? "blocked" : "supervised",
    lifecycleStatus: "planned",
    runtimeFamily: "identity",
    executionPathFamily: "identity_mutation",
    requiresWallet: true,
    requiresAttestation: false,
    requiresTargetPost: false,
    requiresMarketContext: false,
    requiresExplicitExecute: true,
    writesLifecycleRecord: false,
    spendsDem: false,
    proofLevel: "supervised_identity",
    reasonCodes: missingCredentials
      ? ["missing_credentials"]
      : ["identity_mutation_requires_explicit_execute"],
    notes: [
      actionFamily === "register"
        ? "Registration mutates a long-lived public agent profile and must remain explicit."
        : "Human-link challenge/claim/approve/readback is official identity participation and must not persist challenge secrets or approval tokens.",
    ],
  };
}

function reasonCodesForCapability(capability: RuntimeActionCapability): string[] {
  if (capability.readiness === "ready" && capability.executable) return [];
  if (capability.readiness === "missing_credentials") return ["missing_credentials"];
  if (capability.readiness === "missing_dependencies") return ["missing_dependencies"];
  return ["action_family_unsupported"];
}
