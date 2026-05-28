import { materializeCapability } from "./capability-manifest-materialize.js";
import { CAPABILITY_SPECS } from "./capability-manifest-specs.js";
import type { ToolkitCapabilityManifest, ToolkitCapabilityManifestOptions } from "./capability-manifest-types.js";
import { describeRuntimeCapabilities } from "./readiness.js";

export type {
  ToolkitCapabilityDomain,
  ToolkitCapabilityKind,
  ToolkitCapabilityStatus,
  ToolkitResponseDepth,
  ToolkitCapabilityProofTier,
  ToolkitCapabilityParameter,
  ToolkitCapabilityRequirements,
  ToolkitCapabilityLifecycle,
  ToolkitCapabilityManifestEntry,
  ToolkitCapabilityManifest,
  ToolkitCapabilityManifestOptions,
} from "./capability-manifest-types.js";

export function buildToolkitCapabilityManifest(
  options: ToolkitCapabilityManifestOptions = {},
): ToolkitCapabilityManifest {
  const runtime = options.runtimeCapabilities ?? describeRuntimeCapabilities(options);
  const capabilities = CAPABILITY_SPECS.map((spec) => materializeCapability(spec, runtime));
  const domains = Array.from(new Set(capabilities.map((capability) => capability.domain)));

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    source: "omniweb-toolkit",
    recommendedMode: runtime.recommendedMode,
    authReady: runtime.authReady,
    writeReady: runtime.writeReady,
    blockers: [...runtime.blockers],
    capabilities,
    coverage: {
      domains,
      readCapabilities: capabilities.filter((capability) => capability.kind === "read").length,
      writeCapabilities: capabilities.filter((capability) => capability.requirements.write).length,
      lifecycleAwareCapabilities: capabilities
        .filter((capability) => capability.lifecycle.writesLifecycleRecord)
        .map((capability) => capability.id),
      supervisedCapabilities: capabilities
        .filter((capability) => capability.status === "supervised")
        .map((capability) => capability.id),
      advancedCapabilities: capabilities
        .filter((capability) => capability.status === "advanced")
        .map((capability) => capability.id),
      blockedCapabilities: capabilities
        .filter((capability) => capability.status === "blocked")
        .map((capability) => capability.id),
    },
  };
}

export const describeToolkitCapabilities = buildToolkitCapabilityManifest;
