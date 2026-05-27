#!/usr/bin/env -S bunx tsx
/**
 * check-consumer-spectrum-inventory.ts — Build the no-spend consumer-spectrum inventory gate.
 *
 * Output: JSON report to stdout, and optionally to --out.
 * Exit codes: 0 = inventory contract complete, 1 = required inventory evidence missing, 2 = invalid args.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  DEFAULT_BASE_URL,
  fetchText,
  getNumberArg,
  getStringArg,
  hasFlag,
  loadPackageModule,
  PACKAGE_ROOT,
} from "./_shared.js";

type ConsumerSpectrumActualStatus =
  | "network_error"
  | "ok"
  | "redirect"
  | "auth_required"
  | "not_found"
  | "unexpected_status"
  | "not_fetched";
interface ConsumerSpectrumProbe {
  id: string;
  path: string;
  method: "GET" | "POST";
  expected: string;
  advertisedBy: string[];
  notes: string[];
}
interface ConsumerSpectrumLiveProbeResult extends ConsumerSpectrumProbe {
  actual: ConsumerSpectrumActualStatus;
  httpStatus: number;
  contentType: string | null;
  classification: string;
  shape: unknown;
  error?: string;
}
interface DiscoveryProbeResult extends ConsumerSpectrumLiveProbeResult {
  rawBodyForOpenApi?: string;
}
type AgentModule = {
  buildConsumerSpectrumInventoryReport(input: Record<string, unknown>): { summary: { ok: boolean } };
  buildOfficialSkillCoverageReport(manifest: unknown, input: Record<string, unknown>): unknown;
  buildToolkitCapabilityManifest(input: Record<string, unknown>): unknown;
  classifyConsumerSpectrumProbe(input: Record<string, unknown>): string;
  CONSUMER_SPECTRUM_DISCOVERY_RESOURCES: ConsumerSpectrumProbe[];
  CONSUMER_SPECTRUM_ENDPOINT_PROBES: ConsumerSpectrumProbe[];
  extractOpenApiPaths(input: unknown): string[];
  getOfficialSkillSurfaceAreas(): unknown;
  summarizeConsumerSpectrumBodyShape(body: string, parseJson?: boolean): unknown;
};
type RuntimeModule = {
  describeRuntimeCapabilities(input: Record<string, unknown>): unknown;
};

const {
  buildConsumerSpectrumInventoryReport,
  buildOfficialSkillCoverageReport,
  buildToolkitCapabilityManifest,
  classifyConsumerSpectrumProbe,
  CONSUMER_SPECTRUM_DISCOVERY_RESOURCES,
  CONSUMER_SPECTRUM_ENDPOINT_PROBES,
  extractOpenApiPaths,
  getOfficialSkillSurfaceAreas,
  summarizeConsumerSpectrumBodyShape,
} = await loadPackageModule<AgentModule>("../dist/agent.js", "../src/agent.js");
const { describeRuntimeCapabilities } = await loadPackageModule<RuntimeModule>(
  "../dist/runtime.js",
  "../src/runtime.js",
);

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx scripts/check-consumer-spectrum-inventory.ts [--base-url URL] [--timeout-ms N] [--out PATH]

Options:
  --base-url URL   SuperColony base URL (default: ${DEFAULT_BASE_URL})
  --timeout-ms N   Request timeout in milliseconds (default: 15000)
  --out PATH       Write the JSON report to a file as well as stdout
  --help, -h       Show this help

Contract:
  - no spend, no mutation, no npm release
  - compares official discovery/docs, safe live endpoint shapes, OpenAPI paths, and local toolkit capability truth
  - records advertised-but-404 resources honestly instead of failing the inventory

Exit codes: 0 = inventory contract complete, 1 = required evidence missing, 2 = invalid args`);
  process.exit(0);
}

const allowedArgsWithValue = new Set(["--base-url", "--timeout-ms", "--out"]);
const allowedFlags = new Set(["--help", "-h"]);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (allowedFlags.has(arg)) continue;
  if (allowedArgsWithValue.has(arg)) {
    index += 1;
    continue;
  }
  console.error(`Error: unsupported argument: ${arg}`);
  process.exit(2);
}

const baseUrl = getStringArg(args, "--base-url") ?? DEFAULT_BASE_URL;
const timeoutMs = getNumberArg(args, "--timeout-ms") ?? 15_000;
const outPath = getStringArg(args, "--out");

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("Error: --timeout-ms must be a positive number");
  process.exit(2);
}

void main();

async function main(): Promise<void> {
  const runtimeCapabilities = describeRuntimeCapabilities({ cwd: PACKAGE_ROOT });
  const manifest = buildToolkitCapabilityManifest({
    now: new Date("2026-05-18T17:40:00.000Z"),
    runtimeCapabilities,
  });
  const officialCoverage = buildOfficialSkillCoverageReport(manifest, {
    now: new Date("2026-05-18T17:41:00.000Z"),
  });
  const officialAreas = getOfficialSkillSurfaceAreas();

  const discoveryResults = await Promise.all(
    CONSUMER_SPECTRUM_DISCOVERY_RESOURCES.map((resource) => fetchDiscoveryResource(resource, baseUrl, timeoutMs)),
  );
  const openapiResult = discoveryResults.find((result) => result.id === "openapi");
  const openapiPaths = extractOpenApiPaths(parseJson(
    openapiResult?.shape.parseStatus === "json" ? openapiResult.rawBodyForOpenApi : undefined,
  ));
  const endpointResults = await Promise.all(
    CONSUMER_SPECTRUM_ENDPOINT_PROBES.map((probe) => fetchEndpointProbe(probe, baseUrl, timeoutMs, openapiPaths)),
  );

  const report = buildConsumerSpectrumInventoryReport({
    manifest,
    officialCoverage,
    officialAreas,
    liveProbeResults: [
      ...discoveryResults.map(stripRawOpenApiBody),
      ...endpointResults,
    ],
    openapiPaths,
    packageSurfaces: readPackageSurfaces(),
    existingChecks: readExistingChecks(),
    now: new Date(),
  });

  const output = JSON.stringify({
    ...report,
    contract: {
      ownerBead: "omniweb-agents-spectrum.1",
      goalModeScaffold: [
        "docs/CONSUMER_SPECTRUM_GOAL_BRIEF.md",
        "docs/CONSUMER_SPECTRUM_MASTER_PRD.md",
        "docs/CONSUMER_SPECTRUM_GOAL_LAUNCH.md",
      ],
      liveMutation: false,
      spendsDem: false,
      npmRelease: false,
    },
  }, null, 2);

  if (outPath) {
    const absoluteOut = resolve(process.cwd(), outPath);
    mkdirSync(dirname(absoluteOut), { recursive: true });
    writeFileSync(absoluteOut, `${output}\n`);
  }

  console.log(output);
  process.exit(report.summary.ok ? 0 : 1);
}

async function fetchDiscoveryResource(
  resource: ConsumerSpectrumProbe,
  baseUrl: string,
  timeoutMs: number,
): Promise<DiscoveryProbeResult> {
  const response = await fetchText(resource.path, {
    baseUrl,
    timeoutMs,
    accept: resource.path.endsWith(".json") ? "application/json" : "*/*",
  });

  return {
    id: resource.id,
    path: resource.path,
    method: "GET",
    expected: resource.expected,
    actual: classifyActualStatus(response.status),
    httpStatus: response.status,
    contentType: response.contentType ?? null,
    classification: classifyConsumerSpectrumProbe({
      probe: resource,
      httpStatus: response.status,
      error: response.error,
    }),
    advertisedBy: [...resource.advertisedBy],
    shape: summarizeConsumerSpectrumBodyShape(response.body),
    rawBodyForOpenApi: resource.id === "openapi" ? response.body : undefined,
    error: response.error,
    notes: [...resource.notes],
  };
}

async function fetchEndpointProbe(
  probe: ConsumerSpectrumProbe,
  baseUrl: string,
  timeoutMs: number,
  openapiPaths: string[],
): Promise<ConsumerSpectrumLiveProbeResult> {
  if (probe.expected === "external_or_mutating" || probe.expected === "streaming") {
    return {
      id: probe.id,
      path: probe.path,
      method: probe.method,
      expected: probe.expected,
      actual: "not_fetched",
      httpStatus: 0,
      contentType: null,
      classification: "blocked_external_or_mutating",
      advertisedBy: [...probe.advertisedBy],
      shape: summarizeConsumerSpectrumBodyShape("", false),
      notes: [...probe.notes, "Not fetched by default because the inventory gate is no-spend/no-mutation."],
    };
  }

  const response = await fetchText(probe.path, {
    baseUrl,
    timeoutMs,
    accept: probe.path.endsWith("/rss") ? "application/atom+xml,text/xml,*/*" : "application/json,*/*",
    method: probe.method,
  });

  return {
    id: probe.id,
    path: probe.path,
    method: probe.method,
    expected: probe.expected,
    actual: classifyActualStatus(response.status),
    httpStatus: response.status,
    contentType: response.contentType ?? null,
    classification: classifyConsumerSpectrumProbe({
      probe,
      httpStatus: response.status,
      openapiPaths,
      error: response.error,
    }),
    advertisedBy: [...probe.advertisedBy],
    shape: summarizeConsumerSpectrumBodyShape(response.body),
    error: response.error,
    notes: [...probe.notes],
  };
}

function stripRawOpenApiBody(result: DiscoveryProbeResult): ConsumerSpectrumLiveProbeResult {
  const { rawBodyForOpenApi: _rawBodyForOpenApi, ...rest } = result;
  return rest;
}

function classifyActualStatus(status: number): ConsumerSpectrumActualStatus {
  if (status === 0) return "network_error";
  if (status >= 200 && status < 300) return "ok";
  if (status === 301 || status === 302 || status === 307 || status === 308) return "redirect";
  if (status === 401 || status === 403) return "auth_required";
  if (status === 404) return "not_found";
  return "unexpected_status";
}

function parseJson(body: string | undefined): unknown {
  if (!body) return undefined;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

function readPackageSurfaces(): string[] {
  const packageJson = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as {
    exports?: Record<string, unknown>;
  };
  return Object.keys(packageJson.exports ?? {}).sort();
}

function readExistingChecks(): string[] {
  const packageJson = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  return Object.keys(packageJson.scripts ?? {})
    .filter((script) => script.startsWith("check:"))
    .sort();
}
