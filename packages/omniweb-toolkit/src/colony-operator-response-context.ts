import type { ToolkitCapabilityManifest, ToolkitCapabilityManifestEntry } from "./capability-manifest.js";
import type { ColonyOperatorActionFamily } from "./colony-operator-capability-truth.js";
import type {
  ColonyOperatorObservedContextSummary,
  ColonyOperatorResponseDepthAccess,
  ColonyOperatorResponseDepthPreservationStatus,
  ColonyOperatorResponseDepthSurfaceId,
  MinimalAgentState,
  MinimalCycleRecord,
} from "./colony-operator-entrypoint-types.js";

export function buildColonyOperatorResponseDepthAccess(
  manifest: ToolkitCapabilityManifest,
): ColonyOperatorResponseDepthAccess {
  const surfaces = RESPONSE_DEPTH_SURFACE_REQUIREMENTS.map((requirement) => {
    const capabilities = requirement.capabilityIds
      .map((id) => manifest.capabilities.find((capability) => capability.id === id))
      .filter((capability): capability is ToolkitCapabilityManifestEntry => capability != null);
    const methods = uniqueStrings(capabilities.flatMap((capability) => capability.methods));
    const responseDepths = uniqueStrings(capabilities.map((capability) => capability.responseDepth));
    const proofTiers = uniqueStrings(capabilities.map((capability) => capability.proofTier));
    const readbackSurfaces = uniqueStrings(capabilities.flatMap((capability) => capability.lifecycle.readbackSurfaces));
    const timeParameters = uniqueParameters(capabilities.flatMap((capability) => capability.params.filter(isTimeParameter)));
    const preservationStatus: ColonyOperatorResponseDepthPreservationStatus = capabilities.length === requirement.capabilityIds.length
      && requirement.requiredMethods.every((method) => methods.includes(method))
      && requirement.requiredReadbackSurfaces.every((surface) => readbackSurfaces.includes(surface))
      && capabilities.some((capability) => requirement.acceptableResponseDepths.includes(capability.responseDepth))
      ? "preserved"
      : "partial";

    return {
      id: requirement.id,
      label: requirement.label,
      capabilityIds: capabilities.map((capability) => capability.id),
      methods,
      responseDepths,
      proofTiers,
      readbackSurfaces,
      timeParameters,
      envelopeFields: [...requirement.envelopeFields],
      preservationStatus,
    };
  });

  return {
    manifestField: "toolkitCapabilityManifest",
    preservedFields: ["toolkitCapabilityManifest", "cycle", "lifecyclePlan"],
    surfaces,
    missingSurfaces: surfaces
      .filter((surface) => surface.preservationStatus !== "preserved")
      .map((surface) => surface.id),
  };
}

interface ResponseDepthSurfaceRequirement {
  id: ColonyOperatorResponseDepthSurfaceId;
  label: string;
  capabilityIds: string[];
  requiredMethods: string[];
  requiredReadbackSurfaces: string[];
  acceptableResponseDepths: ToolkitCapabilityManifestEntry["responseDepth"][];
  envelopeFields: string[];
}

const RESPONSE_DEPTH_SURFACE_REQUIREMENTS: ResponseDepthSurfaceRequirement[] = [
  {
    id: "post-detail-thread",
    label: "post detail and parent thread",
    capabilityIds: ["colony.post-detail"],
    requiredMethods: ["omni.colony.getPostDetail"],
    requiredReadbackSurfaces: ["post-detail", "thread"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.outcome.execution.verification", "execution.productReadback"],
  },
  {
    id: "signals-convergence",
    label: "signals, convergence, and reports",
    capabilityIds: ["colony.signals"],
    requiredMethods: ["omni.colony.getSignals", "omni.colony.getConvergence", "omni.colony.getReport"],
    requiredReadbackSurfaces: ["signals", "convergence", "reports"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.observation"],
  },
  {
    id: "price-history",
    label: "oracle prices and price history",
    capabilityIds: ["colony.markets.read"],
    requiredMethods: ["omni.colony.getPriceHistory"],
    requiredReadbackSurfaces: ["price-history"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.observation"],
  },
  {
    id: "pool-state",
    label: "active pool, higher/lower pool, and winners history",
    capabilityIds: ["colony.pools.read"],
    requiredMethods: ["omni.colony.getPool", "omni.colony.getHigherLowerPool"],
    requiredReadbackSurfaces: ["active-pool", "higher-lower-pool", "winners-history"],
    acceptableResponseDepths: ["rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.outcome.execution.verification"],
  },
  {
    id: "reactions-tip-stats",
    label: "reaction summary and tip statistics",
    capabilityIds: ["colony.engagement-reads"],
    requiredMethods: ["omni.colony.getReactions", "omni.colony.getTipStats", "omni.colony.getAgentTipStats"],
    requiredReadbackSurfaces: ["reaction-summary", "post-tip-stats", "agent-tip-stats"],
    acceptableResponseDepths: ["standard", "rich", "full"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "cycle.outcome.execution.verification"],
  },
  {
    id: "identity-link-readbacks",
    label: "identity lookup, linked agents, and post-cleanup readback",
    capabilityIds: ["colony.identity-reads", "colony.identity"],
    requiredMethods: ["omni.colony.lookupIdentity", "omni.colony.getLinkedAgents", "omni.colony.unlinkAgent"],
    requiredReadbackSurfaces: ["identity-lookup", "linked-agents", "post-cleanup-readback"],
    acceptableResponseDepths: ["rich", "proof"],
    envelopeFields: ["toolkitCapabilityManifest.capabilities", "capabilityTruth.actions"],
  },
  {
    id: "lifecycle-proof-packets",
    label: "write lifecycle records and proof packets",
    capabilityIds: [
      "colony.publish",
      "colony.reply",
      "colony.publish-vote",
      "colony.react",
      "colony.tip",
      "colony.bet-fixed",
      "colony.bet-higher-lower",
    ],
    requiredMethods: [
      "omni.colony.publish",
      "omni.colony.reply",
      "omni.colony.publishVote",
      "omni.colony.react",
      "omni.colony.tip",
      "omni.colony.placeBet",
      "omni.colony.placeHL",
    ],
    requiredReadbackSurfaces: [
      "chain",
      "attestation",
      "post-detail",
      "thread",
      "reaction-summary",
      "post-tip-stats",
      "active-pool",
      "higher-lower-pool",
      "resolved-winners",
    ],
    acceptableResponseDepths: ["lifecycle", "proof"],
    envelopeFields: ["lifecyclePlan.recordId", "lifecyclePlan.proofPath", "cycle.outcome.execution", "toolkitCapabilityManifest.capabilities"],
  },
];

function uniqueStrings<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function isTimeParameter(parameter: ToolkitCapabilityManifestEntry["params"][number]): boolean {
  return ["window", "horizon", "periods"].includes(parameter.name);
}

function uniqueParameters(
  parameters: ToolkitCapabilityManifestEntry["params"],
): ToolkitCapabilityManifestEntry["params"] {
  const byName = new Map<string, ToolkitCapabilityManifestEntry["params"][number]>();
  for (const parameter of parameters) {
    if (!byName.has(parameter.name)) byName.set(parameter.name, parameter);
  }
  return Array.from(byName.values());
}

export function buildObservedContextSummary<TState extends MinimalAgentState>(
  cycle: MinimalCycleRecord<TState>,
  selectedFamily: ColonyOperatorActionFamily,
): ColonyOperatorObservedContextSummary {
  const audit = cycle.decision.audit;
  const promptPacket = audit?.promptPacket;
  const observedFacts = arrayOfStrings(recordValue(promptPacket, "observedFacts"));
  const promptObjective = stringValue(recordValue(promptPacket, "objective"));
  const facts = isRecord(cycle.decision.facts) ? cycle.decision.facts : null;
  const actionType = cycle.outcome.resolution?.actionType
    ?? (cycle.decision.kind === "action" ? cycle.decision.action.type : cycle.decision.kind === "skip" ? "skip" : cycle.decision.kind);

  return {
    source: "minimal-agent-cycle",
    cycleId: cycle.cycleId,
    decisionKind: cycle.decision.kind,
    selectedActionFamily: selectedFamily,
    actionType,
    policyId: stringValue(audit?.policyId),
    routeId: stringValue(audit?.routeId),
    matchedConditions: arrayOfStrings(audit?.matchedConditions),
    liveReadSurfaces: inferLiveReadSurfaces(observedFacts, facts),
    facts,
    promptObjective,
    observedFacts,
  };
}

function inferLiveReadSurfaces(observedFacts: string[], facts: Record<string, unknown> | null): string[] {
  const haystack = [
    ...observedFacts,
    ...Object.keys(facts ?? {}),
  ].join(" ").toLowerCase();
  const surfaces: string[] = [];
  if (haystack.includes("signal")) surfaces.push("signals");
  if (haystack.includes("convergence") || haystack.includes("agent")) surfaces.push("convergence");
  if (haystack.includes("feed") || haystack.includes("post") || haystack.includes("thread")) surfaces.push("feed");
  if (haystack.includes("leaderboard")) surfaces.push("leaderboard");
  if (haystack.includes("balance")) surfaces.push("balance");
  return uniqueStrings(surfaces);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function recordValue(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
