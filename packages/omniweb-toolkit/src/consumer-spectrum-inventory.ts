import type { ToolkitCapabilityManifest } from "./capability-manifest.js";
import type {
  OfficialSkillCoverageClassification,
  OfficialSkillCoverageEntry,
  OfficialSkillCoverageReport,
  OfficialSkillSurfaceArea,
} from "./official-skill-coverage.js";

export type ConsumerSpectrumClassification =
  | "covered"
  | "partial"
  | "advertised_but_404"
  | "advertised_but_missing_locally"
  | "live_but_not_advertised"
  | "locally_mapped_but_live_shape_drifted"
  | "local_manifest_overclaims"
  | "local_manifest_underclaims"
  | "blocked_auth_needed"
  | "blocked_external_or_mutating"
  | "dead_or_orphaned_local_code"
  | "duplicate_or_superseded_local_code"
  | "public_export_uncovered"
  | "test_only_or_script_only";

export type ConsumerSpectrumResourceKind =
  | "docs"
  | "discovery"
  | "openapi"
  | "agent-card"
  | "plugin-card"
  | "advertised-resource";

export type ConsumerSpectrumEndpointExpectation =
  | "ok"
  | "not_found"
  | "auth_required"
  | "streaming"
  | "external_or_mutating";

export interface ConsumerSpectrumDiscoveryResource {
  id: string;
  path: string;
  kind: ConsumerSpectrumResourceKind;
  expected: ConsumerSpectrumEndpointExpectation;
  advertisedBy: string[];
  requiredForInventory: boolean;
  notes: string[];
}

export interface ConsumerSpectrumEndpointProbe {
  id: string;
  path: string;
  method: "GET" | "POST";
  expected: ConsumerSpectrumEndpointExpectation;
  source: "openapi" | "official-skill" | "agent-card" | "ai-plugin" | "llms" | "roadmap";
  advertisedBy: string[];
  mutating: boolean;
  notes: string[];
}

export interface ConsumerSpectrumShapeObservation {
  topLevelType: "object" | "array" | "string" | "number" | "boolean" | "null" | "unknown";
  topLevelKeys: string[];
  sampleItemKeys: string[];
  parseStatus: "json" | "text" | "empty" | "parse_error" | "not_fetched";
  truncatedSample?: string;
}

export interface ConsumerSpectrumLiveProbeResult {
  id: string;
  path: string;
  method: string;
  expected: ConsumerSpectrumEndpointExpectation;
  actual: "ok" | "not_found" | "auth_required" | "redirect" | "unexpected_status" | "network_error" | "not_fetched";
  httpStatus: number;
  contentType: string | null;
  classification: ConsumerSpectrumClassification;
  advertisedBy: string[];
  shape: ConsumerSpectrumShapeObservation;
  error?: string;
  notes: string[];
}

export interface ConsumerSpectrumOpenApiSummary {
  available: boolean;
  pathCount: number;
  paths: string[];
}

export interface ConsumerSpectrumOfficialAreaAssessment {
  id: string;
  label: string;
  sourceSection: string;
  officialClassification: OfficialSkillCoverageClassification;
  inventoryClassification: ConsumerSpectrumClassification;
  capabilityIds: string[];
  missingCapabilityIds: string[];
  advertisedEndpoints: string[];
  notes: string[];
}

export interface ConsumerSpectrumLocalToolkitSummary {
  capabilityCount: number;
  readCapabilities: number;
  writeCapabilities: number;
  lifecycleAwareCapabilities: string[];
  advancedCapabilities: string[];
  supervisedCapabilities: string[];
  blockedCapabilities: string[];
  packageSurfaces: string[];
  existingChecks: string[];
}

export interface ConsumerSpectrumInventoryReport {
  generatedAt: string;
  source: {
    package: "omniweb-toolkit";
    purpose: "consumer-spectrum-inventory";
    noSpend: true;
    noRelease: true;
  };
  classificationVocabulary: ConsumerSpectrumClassification[];
  officialDiscovery: ConsumerSpectrumDiscoveryResource[];
  openapi: ConsumerSpectrumOpenApiSummary;
  liveEndpointShapes: ConsumerSpectrumLiveProbeResult[];
  officialSurfaceAssessments: ConsumerSpectrumOfficialAreaAssessment[];
  localToolkit: ConsumerSpectrumLocalToolkitSummary;
  summary: {
    ok: boolean;
    totalOfficialAreas: number;
    totalLiveProbes: number;
    byClassification: Record<ConsumerSpectrumClassification, number>;
    advertisedBut404: string[];
    advertisedButMissingLocally: string[];
    liveButNotAdvertised: string[];
    partialAreas: string[];
    blockedAreas: string[];
    nextBeads: string[];
  };
}

export interface ConsumerSpectrumInventoryInput {
  manifest: ToolkitCapabilityManifest;
  officialCoverage: OfficialSkillCoverageReport;
  officialAreas: OfficialSkillSurfaceArea[];
  liveProbeResults: ConsumerSpectrumLiveProbeResult[];
  openapiPaths?: string[];
  now?: Date;
  packageSurfaces?: string[];
  existingChecks?: string[];
}

export const CONSUMER_SPECTRUM_CLASSIFICATIONS: ConsumerSpectrumClassification[] = [
  "covered",
  "partial",
  "advertised_but_404",
  "advertised_but_missing_locally",
  "live_but_not_advertised",
  "locally_mapped_but_live_shape_drifted",
  "local_manifest_overclaims",
  "local_manifest_underclaims",
  "blocked_auth_needed",
  "blocked_external_or_mutating",
  "dead_or_orphaned_local_code",
  "duplicate_or_superseded_local_code",
  "public_export_uncovered",
  "test_only_or_script_only",
];

export const CONSUMER_SPECTRUM_DISCOVERY_RESOURCES: ConsumerSpectrumDiscoveryResource[] = [
  discovery("llms", "/llms.txt", "docs", "ok", ["roadmap", "llms"], true),
  discovery("llms-full", "/llms-full.txt", "docs", "ok", ["roadmap", "llms"], true),
  discovery("official-skill-markdown", "/supercolony-skill.md", "docs", "ok", ["supercolony-skill"], true),
  discovery("openapi", "/openapi.json", "openapi", "ok", ["openapi"], true),
  discovery("a2a-agent-card", "/.well-known/agent.json", "agent-card", "ok", ["agent-card"], true),
  discovery("a2a-agents-card", "/.well-known/agents.json", "agent-card", "ok", ["agent-card"], true),
  discovery("ai-plugin", "/.well-known/ai-plugin.json", "plugin-card", "ok", ["ai-plugin"], true),
  discovery("mcp-resource", "/.well-known/mcp.json", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("mcp-tools", "/api/mcp/tools", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("capabilities", "/api/capabilities", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("schema", "/api/schema", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("errors", "/api/errors", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("rate-limits", "/api/rate-limits", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("stream-spec", "/api/stream-spec", "advertised-resource", "not_found", ["llms.txt"], false),
  discovery("changelog", "/api/changelog", "advertised-resource", "not_found", ["llms.txt"], false),
];

export const CONSUMER_SPECTRUM_ENDPOINT_PROBES: ConsumerSpectrumEndpointProbe[] = [
  probe("feed", "/api/feed?limit=1", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("feed-search", "/api/feed/search?limit=1", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("feed-rss", "/api/feed/rss", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("signals", "/api/signals", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("predictions", "/api/predictions", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("agents", "/api/agents", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("oracle", "/api/oracle", "ok", "official-skill", ["supercolony-skill", "llms-full"]),
  probe("prices", "/api/prices?assets=BTC", "ok", "official-skill", ["supercolony-skill", "llms-full"]),
  probe("scores-agents", "/api/scores/agents?limit=1", "ok", "openapi", ["openapi", "supercolony-skill"]),
  probe("stats", "/api/stats", "ok", "official-skill", ["supercolony-skill"]),
  probe("health", "/api/health", "ok", "official-skill", ["supercolony-skill"]),
  probe("report", "/api/report", "ok", "official-skill", ["supercolony-skill"]),
  probe("convergence", "/api/convergence", "ok", "official-skill", ["supercolony-skill"]),
  probe("fixed-bet-pool", "/api/bets/pool?asset=BTC&horizon=30m", "ok", "official-skill", ["supercolony-skill"]),
  probe("higher-lower-pool", "/api/bets/higher-lower/pool?asset=BTC&horizon=30m", "ok", "official-skill", ["supercolony-skill"]),
  probe("binary-pools", "/api/bets/binary/pools", "ok", "official-skill", ["supercolony-skill"]),
  probe("eth-pool", "/api/bets/eth/pool?asset=BTC&horizon=30m", "ok", "official-skill", ["supercolony-skill"]),
  probe("sports-markets", "/api/bets/sports/markets?status=upcoming", "ok", "official-skill", ["supercolony-skill"]),
  probe("commodity-pool", "/api/bets/commodity/pool?asset=XAU&horizon=30m", "ok", "official-skill", ["supercolony-skill"]),
  probe("chat-rooms", "/api/chat/rooms", "not_found", "official-skill", ["supercolony-skill"]),
  probe("webhooks", "/api/webhooks", "auth_required", "openapi", ["openapi", "supercolony-skill"]),
  probe("feed-stream", "/api/feed/stream", "streaming", "openapi", ["openapi", "supercolony-skill"], {
    notes: ["Streaming transport is inventoried but not opened by the default no-spend check."],
  }),
  probe("agents-register", "/api/agents/register", "external_or_mutating", "openapi", ["openapi", "supercolony-skill"], {
    method: "POST",
    mutating: true,
    notes: ["Identity mutation remains supervised and is not called by the inventory gate."],
  }),
  probe("tip", "/api/tip", "external_or_mutating", "openapi", ["openapi", "supercolony-skill"], {
    method: "POST",
    mutating: true,
    notes: ["Tip execution spends DEM and is not called by the inventory gate."],
  }),
];

export const CONSUMER_SPECTRUM_NEXT_BEADS = [
  "omniweb-agents-spectrum.2",
  "omniweb-agents-spectrum.3",
  "omniweb-agents-spectrum.4",
  "omniweb-agents-spectrum.5",
  "omniweb-agents-spectrum.6",
  "omniweb-agents-spectrum.7",
  "omniweb-agents-spectrum.8",
  "omniweb-agents-spectrum.9",
  "omniweb-agents-spectrum.10",
];

export function buildConsumerSpectrumInventoryReport(
  input: ConsumerSpectrumInventoryInput,
): ConsumerSpectrumInventoryReport {
  const officialSurfaceAssessments = input.officialCoverage.entries.map((entry) => {
    const area = input.officialAreas.find((candidate) => candidate.id === entry.id);
    return assessOfficialArea(entry, area);
  });

  const byClassification = emptyClassificationCounts();
  for (const result of input.liveProbeResults) {
    byClassification[result.classification] += 1;
  }
  for (const area of officialSurfaceAssessments) {
    byClassification[area.inventoryClassification] += 1;
  }

  const requiredDiscoveryOk = requiredDiscoveryResourcesOk(input.liveProbeResults);
  const advertisedResourcesAccountedFor = advertisedResourcesAccountedForByLiveProbe(input.liveProbeResults);
  const hasLocalMapping = input.manifest.capabilities.length > 0
    && input.officialCoverage.entries.length > 0
    && input.officialCoverage.summary.missingCapabilityIds.length === 0;
  const ok = requiredDiscoveryOk && advertisedResourcesAccountedFor && hasLocalMapping;

  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    source: {
      package: "omniweb-toolkit",
      purpose: "consumer-spectrum-inventory",
      noSpend: true,
      noRelease: true,
    },
    classificationVocabulary: [...CONSUMER_SPECTRUM_CLASSIFICATIONS],
    officialDiscovery: cloneDiscoveryResources(),
    openapi: {
      available: (input.openapiPaths?.length ?? 0) > 0,
      pathCount: input.openapiPaths?.length ?? 0,
      paths: [...(input.openapiPaths ?? [])].sort(),
    },
    liveEndpointShapes: input.liveProbeResults.map(cloneLiveProbeResult),
    officialSurfaceAssessments,
    localToolkit: {
      capabilityCount: input.manifest.capabilities.length,
      readCapabilities: input.manifest.coverage.readCapabilities,
      writeCapabilities: input.manifest.coverage.writeCapabilities,
      lifecycleAwareCapabilities: [...input.manifest.coverage.lifecycleAwareCapabilities],
      advancedCapabilities: [...input.manifest.coverage.advancedCapabilities],
      supervisedCapabilities: [...input.manifest.coverage.supervisedCapabilities],
      blockedCapabilities: [...input.manifest.coverage.blockedCapabilities],
      packageSurfaces: [...(input.packageSurfaces ?? ["main", "agent", "runtime", "write", "types"])],
      existingChecks: [...(input.existingChecks ?? [])],
    },
    summary: {
      ok,
      totalOfficialAreas: officialSurfaceAssessments.length,
      totalLiveProbes: input.liveProbeResults.length,
      byClassification,
      advertisedBut404: input.liveProbeResults
        .filter((result) => result.classification === "advertised_but_404")
        .map((result) => result.path),
      advertisedButMissingLocally: officialSurfaceAssessments
        .filter((area) => area.inventoryClassification === "advertised_but_missing_locally")
        .map((area) => area.id),
      liveButNotAdvertised: input.liveProbeResults
        .filter((result) => result.classification === "live_but_not_advertised")
        .map((result) => result.path),
      partialAreas: officialSurfaceAssessments
        .filter((area) => area.inventoryClassification === "partial")
        .map((area) => area.id),
      blockedAreas: officialSurfaceAssessments
        .filter((area) => area.inventoryClassification === "blocked_external_or_mutating")
        .map((area) => area.id),
      nextBeads: [...CONSUMER_SPECTRUM_NEXT_BEADS],
    },
  };
}

export function classifyConsumerSpectrumProbe(input: {
  probe: ConsumerSpectrumEndpointProbe | ConsumerSpectrumDiscoveryResource;
  httpStatus: number;
  openapiPaths?: string[];
  error?: string;
}): ConsumerSpectrumClassification {
  if (input.error || input.httpStatus === 0) return "locally_mapped_but_live_shape_drifted";
  if (input.probe.expected === "external_or_mutating" || input.probe.expected === "streaming") {
    return "blocked_external_or_mutating";
  }
  if (input.httpStatus === 401 || input.httpStatus === 403) return "blocked_auth_needed";
  if (input.httpStatus === 404) return "advertised_but_404";
  if (input.httpStatus >= 200 && input.httpStatus < 300) {
    const normalizedPath = stripQuery(input.probe.path);
    if (
      "source" in input.probe
      && input.probe.source !== "openapi"
      && input.openapiPaths
      && !input.openapiPaths.includes(normalizedPath)
    ) {
      return "live_but_not_advertised";
    }
    return "covered";
  }
  return "locally_mapped_but_live_shape_drifted";
}

export function summarizeConsumerSpectrumBodyShape(body: string, fetched = true): ConsumerSpectrumShapeObservation {
  if (!fetched) {
    return {
      topLevelType: "unknown",
      topLevelKeys: [],
      sampleItemKeys: [],
      parseStatus: "not_fetched",
    };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return {
      topLevelType: "unknown",
      topLevelKeys: [],
      sampleItemKeys: [],
      parseStatus: "empty",
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return summarizeJsonValue(parsed);
  } catch {
    return {
      topLevelType: "string",
      topLevelKeys: [],
      sampleItemKeys: [],
      parseStatus: "text",
      truncatedSample: trimmed.slice(0, 160),
    };
  }
}

export function extractOpenApiPaths(value: unknown): string[] {
  if (!isPlainObject(value) || !isPlainObject(value.paths)) return [];
  return Object.keys(value.paths).sort();
}

function assessOfficialArea(
  entry: OfficialSkillCoverageEntry,
  area?: OfficialSkillSurfaceArea,
): ConsumerSpectrumOfficialAreaAssessment {
  const inventoryClassification = classifyOfficialCoverageEntry(entry);
  return {
    id: entry.id,
    label: area?.label ?? entry.id,
    sourceSection: entry.sourceSection,
    officialClassification: entry.classification,
    inventoryClassification,
    capabilityIds: [...entry.capabilityIds],
    missingCapabilityIds: [...entry.missingCapabilityIds],
    advertisedEndpoints: (area?.officialSurface ?? entry.officialSurface)
      .filter((item) => item.startsWith("/api/") || item.startsWith("/.well-known/")),
    notes: [...entry.notes],
  };
}

function classifyOfficialCoverageEntry(entry: OfficialSkillCoverageEntry): ConsumerSpectrumClassification {
  if (entry.missingCapabilityIds.length > 0) return "advertised_but_missing_locally";
  if (entry.capabilityIds.length === 0 && entry.classification === "pending") return "advertised_but_missing_locally";
  if (entry.classification === "covered") return "covered";
  if (entry.classification === "partial" || entry.classification === "pending" || entry.classification === "degraded") {
    return "partial";
  }
  if (entry.classification === "supervised" || entry.classification === "advanced") {
    return "blocked_external_or_mutating";
  }
  return "blocked_external_or_mutating";
}

function requiredDiscoveryResourcesOk(results: ConsumerSpectrumLiveProbeResult[]): boolean {
  const required = new Set(
    CONSUMER_SPECTRUM_DISCOVERY_RESOURCES
      .filter((resource) => resource.requiredForInventory)
      .map((resource) => resource.id),
  );

  for (const result of results) {
    if (required.has(result.id) && result.classification === "covered") {
      required.delete(result.id);
    }
  }

  return required.size === 0;
}

function advertisedResourcesAccountedForByLiveProbe(results: ConsumerSpectrumLiveProbeResult[]): boolean {
  const advertisedResourceIds = new Set(
    CONSUMER_SPECTRUM_DISCOVERY_RESOURCES
      .filter((resource) => !resource.requiredForInventory && resource.expected === "not_found")
      .map((resource) => resource.id),
  );
  const accountedFor = new Set<string>();

  for (const result of results) {
    if (!advertisedResourceIds.has(result.id)) continue;
    if (result.classification !== "advertised_but_404" && result.classification !== "covered") return false;
    accountedFor.add(result.id);
  }

  return advertisedResourceIds.size === accountedFor.size;
}

function summarizeJsonValue(value: unknown): ConsumerSpectrumShapeObservation {
  if (Array.isArray(value)) {
    return {
      topLevelType: "array",
      topLevelKeys: [],
      sampleItemKeys: objectKeys(value.find(isPlainObject)),
      parseStatus: "json",
    };
  }

  if (isPlainObject(value)) {
    const firstArray = Object.values(value).find(Array.isArray) as unknown[] | undefined;
    const firstObjectItem = firstArray?.find(isPlainObject);
    return {
      topLevelType: "object",
      topLevelKeys: objectKeys(value),
      sampleItemKeys: objectKeys(firstObjectItem),
      parseStatus: "json",
    };
  }

  if (value === null) {
    return {
      topLevelType: "null",
      topLevelKeys: [],
      sampleItemKeys: [],
      parseStatus: "json",
    };
  }

  return {
    topLevelType: typeof value as "string" | "number" | "boolean",
    topLevelKeys: [],
    sampleItemKeys: [],
    parseStatus: "json",
  };
}

function emptyClassificationCounts(): Record<ConsumerSpectrumClassification, number> {
  return Object.fromEntries(
    CONSUMER_SPECTRUM_CLASSIFICATIONS.map((classification) => [classification, 0]),
  ) as Record<ConsumerSpectrumClassification, number>;
}

function discovery(
  id: string,
  path: string,
  kind: ConsumerSpectrumResourceKind,
  expected: ConsumerSpectrumEndpointExpectation,
  advertisedBy: string[],
  requiredForInventory: boolean,
  notes: string[] = [],
): ConsumerSpectrumDiscoveryResource {
  return { id, path, kind, expected, advertisedBy, requiredForInventory, notes };
}

function probe(
  id: string,
  path: string,
  expected: ConsumerSpectrumEndpointExpectation,
  source: ConsumerSpectrumEndpointProbe["source"],
  advertisedBy: string[],
  options: {
    method?: "GET" | "POST";
    mutating?: boolean;
    notes?: string[];
  } = {},
): ConsumerSpectrumEndpointProbe {
  return {
    id,
    path,
    method: options.method ?? "GET",
    expected,
    source,
    advertisedBy,
    mutating: options.mutating ?? false,
    notes: options.notes ?? [],
  };
}

function stripQuery(path: string): string {
  return path.split("?")[0] ?? path;
}

function cloneDiscoveryResources(): ConsumerSpectrumDiscoveryResource[] {
  return CONSUMER_SPECTRUM_DISCOVERY_RESOURCES.map((resource) => ({
    ...resource,
    advertisedBy: [...resource.advertisedBy],
    notes: [...resource.notes],
  }));
}

function cloneLiveProbeResult(result: ConsumerSpectrumLiveProbeResult): ConsumerSpectrumLiveProbeResult {
  return {
    ...result,
    advertisedBy: [...result.advertisedBy],
    notes: [...result.notes],
    shape: {
      ...result.shape,
      topLevelKeys: [...result.shape.topLevelKeys],
      sampleItemKeys: [...result.shape.sampleItemKeys],
    },
  };
}

function objectKeys(value: unknown): string[] {
  return isPlainObject(value) ? Object.keys(value).sort() : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
