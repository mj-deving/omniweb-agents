#!/usr/bin/env npx tsx

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PACKAGE_ROOT, hasFlag } from "./_shared.js";

interface CommandResult {
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface RawPackEntry {
  filename: string;
  size?: number;
  packageSize?: number;
  unpackedSize?: number;
  entryCount?: number;
  files?: unknown[];
}

interface PackSummary {
  filename: string;
  packageSize?: number;
  unpackedSize?: number;
  entryCount?: number;
}

const args = process.argv.slice(2);
const skipBuild = hasFlag(args, "--skip-build");
const skipLiveRead = hasFlag(args, "--skip-live-read");
const keepTemp = hasFlag(args, "--keep-temp");

const allowedArgs = new Set([
  "--skip-build",
  "--skip-live-read",
  "--keep-temp",
  "--help",
  "-h",
]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx packages/omniweb-toolkit/scripts/check-package-consumer.ts [options]

Build, pack, and install omniweb-toolkit into a clean temporary consumer workspace.

Options:
  --skip-build       Do not run npm run build before packing
  --skip-live-read   Prove imports and write readiness only; skip live SuperColony read
  --keep-temp        Keep the temporary consumer workspace for debugging
  --help, -h         Show this help

Output: JSON package-first consumer proof
Exit codes: 0 = consumer proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const tempRoot = mkdtempSync(join(tmpdir(), "omniweb-package-consumer-"));
let ok = false;
let buildResult: CommandResult | null = null;
let packResult: CommandResult | null = null;
let installResult: CommandResult | null = null;
let consumerResult: CommandResult | null = null;
let packEntry: PackSummary | null = null;
let consumerSummary: unknown = null;

try {
  if (!skipBuild) {
    buildResult = runCommand(["npm", "run", "build"], PACKAGE_ROOT);
    if (buildResult.exitCode !== 0) {
      throw new Error("package build failed before consumer proof");
    }
  }

  packResult = runCommand([
    "npm",
    "pack",
    "--json",
    "--pack-destination",
    tempRoot,
  ], PACKAGE_ROOT);
  if (packResult.exitCode !== 0) {
    throw new Error("npm pack failed before consumer proof");
  }

  const parsedPack = JSON.parse(packResult.stdout) as RawPackEntry[];
  const rawPackEntry = parsedPack[0] ?? null;
  if (!rawPackEntry?.filename) {
    throw new Error("npm pack did not report a tarball filename");
  }
  packEntry = {
    filename: rawPackEntry.filename,
    packageSize: rawPackEntry.packageSize ?? rawPackEntry.size,
    unpackedSize: rawPackEntry.unpackedSize,
    entryCount: rawPackEntry.entryCount ?? rawPackEntry.files?.length,
  };

  const tarballPath = resolve(tempRoot, basename(rawPackEntry.filename));
  const consumerRoot = join(tempRoot, "consumer");
  writeFileSync(join(tempRoot, "package.json"), JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      "omniweb-toolkit": `file:${tarballPath}`,
    },
  }, null, 2));

  installResult = runCommand([
    "npm",
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--fund=false",
    "--package-lock=false",
  ], tempRoot);
  if (installResult.exitCode !== 0) {
    throw new Error("clean consumer npm install failed");
  }

  writeFileSync(join(tempRoot, "consumer-proof.mjs"), renderConsumerProofScript({
    skipLiveRead,
    consumerRoot,
  }));

  consumerResult = runCommand(["node", "consumer-proof.mjs"], tempRoot);
  if (consumerResult.exitCode !== 0) {
    throw new Error("clean consumer proof script failed");
  }

  consumerSummary = JSON.parse(consumerResult.stdout);
  ok = true;
} catch (error) {
  consumerSummary = {
    error: error instanceof Error ? error.message : String(error),
  };
} finally {
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    ok,
    packageRoot: PACKAGE_ROOT,
    tempRoot: keepTemp ? tempRoot : null,
    keptTemp: keepTemp,
    skipped: {
      build: skipBuild,
      liveRead: skipLiveRead,
    },
    pack: packEntry,
    commands: {
      build: summarizeCommand(buildResult),
      pack: summarizeCommand(packResult),
      install: summarizeCommand(installResult),
      consumer: summarizeCommand(consumerResult),
    },
    consumer: consumerSummary,
    contract: {
      importByPackageName: ok,
      readOnlyPathDoesNotRequireWalletPeers: ok,
      writeReadinessReportsMissingEnv: hasExpectedMissingEnv(consumerSummary),
      spendsDem: false,
      openclawExecutionProven: false,
    },
  }, null, 2));

  if (!keepTemp) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

process.exit(ok ? 0 : 1);

function runCommand(command: string[], cwd: string): CommandResult {
  const started = Date.now();
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
  });

  return {
    command,
    cwd,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    durationMs: Date.now() - started,
  };
}

function summarizeCommand(result: CommandResult | null): unknown {
  if (!result) return null;
  return {
    command: result.command,
    cwd: result.cwd,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    stdout: result.stdout.trim().slice(0, 1200),
    stderr: result.stderr.trim().slice(0, 1200),
  };
}

function hasExpectedMissingEnv(summary: unknown): boolean {
  if (!summary || typeof summary !== "object") return false;
  const readiness = (summary as { readiness?: { missingEnv?: unknown } }).readiness;
  return Array.isArray(readiness?.missingEnv) && readiness.missingEnv.includes("DEMOS_MNEMONIC");
}

function renderConsumerProofScript(options: {
  skipLiveRead: boolean;
  consumerRoot: string;
}): string {
  return `const mainEntry = await import("omniweb-" + "toolkit");
const runtimeEntry = await import("omniweb-" + "toolkit/runtime");
const agentEntry = await import("omniweb-" + "toolkit/agent");
await import("omniweb-" + "toolkit/types");

const { createClient } = mainEntry;
const {
  buildToolkitCapabilityManifest,
  checkWriteReadiness,
  describeRuntimeCapabilities,
} = runtimeEntry;
const {
  buildColonyOperatorCapabilityDiscovery,
  buildColonyOperatorResponseDepthAccess,
  buildLeaderboardPatternPrompt,
  getStarterSourcePack,
} = agentEntry;

const readiness = checkWriteReadiness({
  cwd: ${JSON.stringify(options.consumerRoot)},
  homeDir: ${JSON.stringify(options.consumerRoot)},
  env: {},
});
const capabilities = describeRuntimeCapabilities({
  cwd: ${JSON.stringify(options.consumerRoot)},
  homeDir: ${JSON.stringify(options.consumerRoot)},
  env: {},
});
const toolkitManifest = buildToolkitCapabilityManifest({
  runtimeCapabilities: capabilities,
  now: new Date("2026-05-18T00:00:00.000Z"),
});
const colonyOperatorDiscovery = buildColonyOperatorCapabilityDiscovery(toolkitManifest);
const responseDepthAccess = buildColonyOperatorResponseDepthAccess(toolkitManifest);

if (!readiness.canRead) {
  throw new Error("readiness unexpectedly reports read path unavailable");
}
if (readiness.canWrite) {
  throw new Error("readiness unexpectedly reports write path available without credentials");
}
if (!readiness.missingEnv.includes("DEMOS_MNEMONIC")) {
  throw new Error("readiness did not report missing DEMOS_MNEMONIC");
}
if (toolkitManifest.source !== "omniweb-toolkit") {
  throw new Error("toolkit manifest did not report package source");
}
if (!toolkitManifest.capabilities.some((capability) => capability.id === "colony.publish" && capability.status === "blocked")) {
  throw new Error("toolkit manifest did not expose blocked publish capability without credentials");
}
if (!toolkitManifest.capabilities.some((capability) => capability.id === "colony.feed" && capability.status === "available")) {
  throw new Error("toolkit manifest did not keep read-only feed capability available");
}
if (JSON.stringify(toolkitManifest).match(/mnemonic|seed phrase|approvalToken|challengeSecret/i)) {
  throw new Error("toolkit manifest leaked sensitive credential field names");
}
if (colonyOperatorDiscovery.fullDetailAccess.manifestField !== "toolkitCapabilityManifest") {
  throw new Error("colony operator discovery did not point to manifest detail access");
}
if (!colonyOperatorDiscovery.compact.availableReadCapabilities.includes("colony.feed")) {
  throw new Error("colony operator discovery did not expose compact read capability access");
}
if (colonyOperatorDiscovery.compact.defaultBoundaries.protocolLayer !== "toolkit/runtime") {
  throw new Error("colony operator discovery did not preserve toolkit/runtime authority");
}
if (responseDepthAccess.missingSurfaces.length !== 0) {
  throw new Error("colony operator response-depth access did not preserve all required surfaces");
}
if (!responseDepthAccess.surfaces.some((surface) => surface.id === "price-history" && surface.methods.includes("omni.colony.getPriceHistory"))) {
  throw new Error("colony operator response-depth access did not preserve price history");
}
if (!responseDepthAccess.surfaces.some((surface) => surface.id === "lifecycle-proof-packets" && surface.envelopeFields.includes("lifecyclePlan.proofPath"))) {
  throw new Error("colony operator response-depth access did not preserve lifecycle proof packet pointers");
}

const sourcePack = getStarterSourcePack("research");
if (!sourcePack?.entries?.length) {
  throw new Error("agent subpath did not return a starter source pack");
}
const firstSource = sourcePack.entries[0];
const promptText = buildLeaderboardPatternPrompt({
  role: "a package-consumer smoke tester",
  sourceName: firstSource.label,
  sourceUrl: "https://example.test/source.json",
  observedFacts: [firstSource.why],
  objective: "Return a dry-run plan only. Do not publish or spend DEM.",
  domainRules: ["Do not publish.", "Do not spend DEM."],
  outputRules: ["Return one compact plan."],
});
if (!promptText.includes("Do not publish")) {
  throw new Error("dry-run prompt did not preserve no-publish rule");
}

let liveRead = null;
if (!${JSON.stringify(options.skipLiveRead)}) {
  const client = createClient({ timeoutMs: 20000 });
  const feed = await client.getFeed({ limit: 1 });
  liveRead = {
    feedCount: feed.posts?.length ?? 0,
    firstCategory: feed.posts?.[0]?.payload?.cat ?? null,
  };
}

  console.log(JSON.stringify({
  imports: {
    main: ["createClient"],
    runtime: ["buildToolkitCapabilityManifest", "checkWriteReadiness", "describeRuntimeCapabilities"],
    agent: ["buildColonyOperatorCapabilityDiscovery", "buildColonyOperatorResponseDepthAccess", "buildLeaderboardPatternPrompt", "getStarterSourcePack"],
    types: "side-effect import ok",
  },
  dryRun: {
    action: "plan_only",
    spendsDem: false,
    sourceId: firstSource.sourceId,
    promptLength: promptText.length,
  },
  readiness,
  capabilities,
  toolkitManifest: {
    source: toolkitManifest.source,
    recommendedMode: toolkitManifest.recommendedMode,
    capabilityCount: toolkitManifest.capabilities.length,
    readCapabilities: toolkitManifest.coverage.readCapabilities,
    writeCapabilities: toolkitManifest.coverage.writeCapabilities,
    blockedCapabilities: toolkitManifest.coverage.blockedCapabilities,
  },
  colonyOperatorDiscovery: {
    source: colonyOperatorDiscovery.source,
    recommendedMode: colonyOperatorDiscovery.recommendedMode,
    availableReadCapabilities: colonyOperatorDiscovery.compact.availableReadCapabilities,
    fullDetailAccess: colonyOperatorDiscovery.fullDetailAccess,
    responseDepthAccess: {
      surfaceIds: responseDepthAccess.surfaces.map((surface) => surface.id),
      missingSurfaces: responseDepthAccess.missingSurfaces,
    },
    defaultBoundaries: colonyOperatorDiscovery.compact.defaultBoundaries,
  },
  sourcePack: {
    archetype: sourcePack.archetype,
    sourceCount: sourcePack.entries.length,
  },
  liveRead,
}, null, 2));
`;
}
