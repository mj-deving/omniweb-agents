import type { ToolkitCapabilityManifest, ToolkitCapabilityManifestEntry } from "./capability-manifest.js";
import type {
  ColonyOperatorCapabilityDiscovery,
  ColonyOperatorCapabilitySummary,
  ColonyOperatorToolkitHelp,
  ColonyOperatorToolkitHelpCommand,
} from "./colony-operator-entrypoint-types.js";
import { buildColonyOperatorResponseDepthAccess } from "./colony-operator-response-context.js";
import { uniqueStrings } from "./unique-strings.js";

export function buildColonyOperatorCapabilityDiscovery(
  manifest: ToolkitCapabilityManifest,
  capabilitySummary?: ColonyOperatorCapabilitySummary,
): ColonyOperatorCapabilityDiscovery {
  return {
    generatedAt: manifest.generatedAt,
    source: manifest.source,
    recommendedMode: manifest.recommendedMode,
    authReady: manifest.authReady,
    writeReady: manifest.writeReady,
    blockers: manifest.blockers,
    compact: {
      totalCapabilities: manifest.capabilities.length,
      domains: manifest.coverage.domains,
      readCapabilities: manifest.coverage.readCapabilities,
      writeCapabilities: manifest.coverage.writeCapabilities,
      availableReadCapabilities: capabilityIdsWith(manifest.capabilities, {
        kind: "read",
        statuses: ["available", "degraded"],
      }),
      availableWriteCapabilities: capabilityIdsWith(manifest.capabilities, {
        kind: "write",
        statuses: ["available", "pending"],
      }),
      supervisedCapabilities: manifest.coverage.supervisedCapabilities,
      advancedCapabilities: manifest.coverage.advancedCapabilities,
      blockedCapabilities: manifest.coverage.blockedCapabilities,
      lifecycleAwareCapabilities: manifest.coverage.lifecycleAwareCapabilities,
      richResponseCapabilities: manifest.capabilities
        .filter((capability) => capability.responseDepth === "rich" || capability.responseDepth === "full")
        .map((capability) => capability.id),
      proofResponseCapabilities: manifest.capabilities
        .filter((capability) => capability.responseDepth === "proof" || capability.responseDepth === "lifecycle")
        .map((capability) => capability.id),
      defaultBoundaries: {
        noSpendDefault: capabilitySummary?.noSpendDefault ?? true,
        liveExecutionRequiresExplicitExecute: manifest.capabilities
          .some((capability) => capability.requirements.write && capability.requirements.explicitExecute),
        strategyLayer: "skill/playbook",
        protocolLayer: "toolkit/runtime",
      },
    },
    operatorActionFamilies: {
      executableFamilies: capabilitySummary?.executableFamilies ?? [],
      supervisedFamilies: capabilitySummary?.supervisedFamilies ?? [],
      blockedFamilies: capabilitySummary?.blockedFamilies ?? [],
      lifecyclePendingFamilies: capabilitySummary?.lifecyclePendingFamilies ?? [],
      explicitExecuteFamilies: capabilitySummary?.explicitExecuteFamilies ?? [],
      spendFamilies: capabilitySummary?.spendFamilies ?? [],
    },
    fullDetailAccess: {
      manifestField: "toolkitCapabilityManifest",
      capabilityIds: manifest.capabilities.map((capability) => capability.id),
      includes: [
        "methods",
        "params",
        "methodParams",
        "requirements",
        "methodRequirements",
        "responseDepth",
        "proofTier",
        "lifecycle",
        "status",
      ],
    },
    operatorHelp: buildColonyOperatorToolkitHelp(manifest),
    responseDepthAccess: buildColonyOperatorResponseDepthAccess(manifest),
  };
}

export function buildColonyOperatorToolkitHelp(
  manifest: ToolkitCapabilityManifest,
): ColonyOperatorToolkitHelp {
  const commands = manifest.capabilities.flatMap((capability) => (
    capability.methods.map((method) => buildHelpCommand(capability, method))
  ));
  const readCommands = commands.filter((command) => !command.requirements.write);
  const writeCommands = commands.filter((command) => command.requirements.write);

  return {
    format: "toolkit-help.v1",
    manifestField: "toolkitCapabilityManifest",
    intent: "discover_toolkit_surface",
    defaultMode: "read-first-no-spend",
    filters: {
      domains: uniqueStrings(commands.map((command) => command.domain)),
      kinds: uniqueStrings(commands.map((command) => command.kind)),
      statuses: uniqueStrings(commands.map((command) => command.status)),
      responseDepths: uniqueStrings(commands.map((command) => command.responseDepth)),
      proofTiers: uniqueStrings(commands.map((command) => command.proofTier)),
    },
    commands,
    readCommands,
    writeCommands,
    commandCount: commands.length,
    readCommandCount: readCommands.length,
    writeCommandCount: writeCommands.length,
  };
}


function capabilityIdsWith(
  capabilities: ToolkitCapabilityManifestEntry[],
  filters: {
    kind: ToolkitCapabilityManifestEntry["kind"];
    statuses: ToolkitCapabilityManifestEntry["status"][];
  },
): string[] {
  return capabilities
    .filter((capability) => capability.kind === filters.kind && filters.statuses.includes(capability.status))
    .map((capability) => capability.id);
}

function buildHelpCommand(
  capability: ToolkitCapabilityManifestEntry,
  method: string,
): ColonyOperatorToolkitHelpCommand {
  const params = capability.methodParams[method] ?? capability.params;
  const requirements = capability.methodRequirements[method] ?? capability.requirements;
  return {
    command: method,
    capabilityId: capability.id,
    domain: capability.domain,
    kind: capability.kind,
    status: capability.status,
    params: params.map((parameter) => ({ ...parameter })),
    requirements: { ...requirements, optionalDependencies: [...requirements.optionalDependencies] },
    responseDepth: capability.responseDepth,
    proofTier: capability.proofTier,
    readbackSurfaces: [...capability.lifecycle.readbackSurfaces],
    writesLifecycleRecord: capability.lifecycle.writesLifecycleRecord,
    noSpend: !requirements.spend,
    noMutation: !requirements.write,
    requiresExplicitExecute: requirements.explicitExecute,
    usage: usageFor(method, params),
    notes: [...capability.notes],
  };
}

function usageFor(method: string, params: ToolkitCapabilityManifestEntry["params"]): string {
  const renderedParams = params.map((parameter) => {
    const rendered = `--${parameter.name} <${parameter.type}>`;
    return parameter.required ? rendered : `[${rendered}]`;
  });
  return [method, ...renderedParams].join(" ");
}
