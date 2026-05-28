import type { RuntimeActionCapability, RuntimeCapabilityResult } from "./readiness.js";
import { DEFAULT_LIFECYCLE, DEFAULT_REQUIREMENTS } from "./capability-manifest-specs.js";
import type {
  StaticCapabilitySpec,
  ToolkitCapabilityManifestEntry,
  ToolkitCapabilityRequirements,
  ToolkitCapabilityStatus,
} from "./capability-manifest-types.js";

export function materializeCapability(
  spec: StaticCapabilitySpec,
  runtime: RuntimeCapabilityResult,
): ToolkitCapabilityManifestEntry {
  const runtimeFamily = spec.runtimeFamily ? runtime.actionFamilies[spec.runtimeFamily] : undefined;
  const status = statusForSpec(spec, runtime, runtimeFamily);
  const requirements = {
    ...DEFAULT_REQUIREMENTS,
    ...requirementsFromRuntimeFamily(runtimeFamily),
    ...(spec.requirements ?? {}),
  };
  return {
    id: spec.id,
    domain: spec.domain,
    kind: spec.kind,
    methods: [...spec.methods],
    status,
    params: [...(spec.params ?? [])],
    methodParams: Object.fromEntries(
      spec.methods.map((method) => [method, [...(spec.methodParams?.[method] ?? spec.params ?? [])]]),
    ),
    methodRequirements: Object.fromEntries(
      spec.methods.map((method) => [method, mergeRequirements(requirements, spec.methodRequirements?.[method])]),
    ),
    requirements,
    responseDepth: spec.responseDepth,
    proofTier: spec.proofTier,
    lifecycle: {
      writesLifecycleRecord: spec.lifecycle?.writesLifecycleRecord ?? DEFAULT_LIFECYCLE.writesLifecycleRecord,
      readbackSurfaces: [...(spec.lifecycle?.readbackSurfaces ?? DEFAULT_LIFECYCLE.readbackSurfaces)],
      statusVocabulary: [...(spec.lifecycle?.statusVocabulary ?? DEFAULT_LIFECYCLE.statusVocabulary)],
    },
    notes: [
      ...(spec.notes ?? []),
      ...(runtimeFamily?.notes ?? []),
      ...notesForStatus(status, runtime),
    ],
  };
}

function mergeRequirements(
  base: ToolkitCapabilityRequirements,
  override: Partial<ToolkitCapabilityRequirements> | undefined,
): ToolkitCapabilityRequirements {
  return {
    ...base,
    ...(override ?? {}),
    optionalDependencies: [...(override?.optionalDependencies ?? base.optionalDependencies)],
  };
}

function statusForSpec(
  spec: StaticCapabilitySpec,
  runtime: RuntimeCapabilityResult,
  runtimeFamily: RuntimeActionCapability | undefined,
): ToolkitCapabilityStatus {
  const policy = spec.statusPolicy ?? "always-available";
  if (policy === "always-available") return "available";
  if (policy === "always-blocked") return "blocked";
  if (policy === "degraded-read") return "degraded";
  if (policy === "pending-current-recheck") {
    return runtimeFamily?.readiness === "ready" ? "pending" : "blocked";
  }
  if (policy === "supervised-identity") {
    return runtime.authReady ? "supervised" : "blocked";
  }
  if (policy === "manual-recovery" || policy === "advanced-runtime" || policy === "experimental-runtime") {
    return runtime.writeReady ? "advanced" : "blocked";
  }
  if (policy === "wallet-write") {
    return runtime.writeReady ? "available" : "blocked";
  }
  if (policy === "runtime-action") {
    if (!runtimeFamily || runtimeFamily.readiness === "unsupported" || !runtimeFamily.executable) return "unsupported";
    return runtimeFamily.readiness === "ready" ? "available" : "blocked";
  }
  return "unsupported";
}

function requirementsFromRuntimeFamily(
  capability: RuntimeActionCapability | undefined,
): Partial<ToolkitCapabilityRequirements> {
  if (!capability) return {};
  return {
    wallet: capability.requiresWallet,
    auth: capability.requiresWallet,
    write: capability.requiresWallet,
    spend: capability.requiresWallet,
    attestation: capability.requiresAttestation,
    targetPost: capability.requiresTargetPost,
    marketContext: capability.requiresMarketContext,
    explicitExecute: capability.requiresWallet,
  };
}

function notesForStatus(status: ToolkitCapabilityStatus, runtime: RuntimeCapabilityResult): string[] {
  if (status !== "blocked") return [];
  if (runtime.blockers.length === 0) return ["Blocked by capability-specific runtime state."];
  return [`Blocked by runtime readiness: ${runtime.blockers.join(", ")}.`];
}
