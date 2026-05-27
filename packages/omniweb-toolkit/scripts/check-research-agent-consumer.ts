#!/usr/bin/env -S bunx tsx

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
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-research-agent-consumer.ts [options]

Build, pack, and install omniweb-toolkit into a clean temporary consumer workspace,
then run the smallest research-agent-facing package entrypoint by package name.

Options:
  --skip-build       Do not run bun run build before packing
  --skip-live-read   Prove dry-run/readiness only; skip live SuperColony read
  --keep-temp        Keep the temporary consumer workspace for debugging
  --help, -h         Show this help

Output: JSON research-agent consumer proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const tempRoot = mkdtempSync(join(tmpdir(), "omniweb-research-agent-consumer-"));
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
      throw new Error("package build failed before research-agent consumer proof");
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
    throw new Error("npm pack failed before research-agent consumer proof");
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
    consumerRoot: tempRoot,
  }));

  consumerResult = runCommand(["node", "consumer-proof.mjs"], tempRoot);
  if (consumerResult.exitCode !== 0) {
    throw new Error("research-agent consumer proof script failed");
  }

  consumerSummary = JSON.parse(consumerResult.stdout);
  assertConsumerSummary(consumerSummary, { skipLiveRead });
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
      researchAgentEntryPointByPackageName: ok,
      spendsDem: false,
      reportsMissingWalletEnv: hasExpectedMissingEnv(consumerSummary),
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
  const capabilities = (summary as { runtimeCapabilities?: { readiness?: { missingEnv?: unknown } } }).runtimeCapabilities;
  return Array.isArray(capabilities?.readiness?.missingEnv) && capabilities.readiness.missingEnv.includes("DEMOS_MNEMONIC");
}

function assertConsumerSummary(summary: unknown, options: { skipLiveRead: boolean }): void {
  if (!summary || typeof summary !== "object") {
    throw new Error("consumer proof did not return a JSON object");
  }

  const record = summary as {
    dryRun?: { spendsDem?: boolean; promptLength?: number };
    runtimeCapabilities?: {
      canRead?: boolean;
      writeReady?: boolean;
      recommendedMode?: unknown;
      blockers?: unknown;
      readiness?: { missingEnv?: unknown };
    };
    sourcePack?: { sourceCount?: number };
    liveRead?: unknown;
  };

  if (record.dryRun?.spendsDem !== false) {
    throw new Error("research-agent minimal entrypoint did not stay no-spend");
  }
  if ((record.dryRun?.promptLength ?? 0) <= 0) {
    throw new Error("research-agent minimal entrypoint did not build a prompt");
  }
  if (record.runtimeCapabilities?.canRead !== true) {
    throw new Error("runtime capabilities unexpectedly report read path unavailable");
  }
  if (record.runtimeCapabilities?.writeReady === true) {
    throw new Error("runtime capabilities unexpectedly report write path available without credentials");
  }
  if (record.runtimeCapabilities?.recommendedMode !== "read-only") {
    throw new Error("runtime capabilities did not recommend read-only mode for no-credential consumer");
  }
  if (!Array.isArray(record.runtimeCapabilities?.blockers) || !record.runtimeCapabilities.blockers.includes("missing_credentials")) {
    throw new Error("runtime capabilities did not report missing credential blocker");
  }
  if (!Array.isArray(record.runtimeCapabilities?.readiness?.missingEnv) || !record.runtimeCapabilities.readiness.missingEnv.includes("DEMOS_MNEMONIC")) {
    throw new Error("runtime capability readiness did not report missing DEMOS_MNEMONIC");
  }
  if ((record.sourcePack?.sourceCount ?? 0) <= 0) {
    throw new Error("research-agent starter source pack was empty");
  }
  if (!options.skipLiveRead && !record.liveRead) {
    throw new Error("research-agent minimal entrypoint did not perform live read");
  }
}

function renderConsumerProofScript(options: {
  skipLiveRead: boolean;
  consumerRoot: string;
}): string {
  return `const { runResearchAgentMinimal } = await import("omniweb-toolkit/research-agent-minimal");
await import("omniweb-toolkit/types");

const summary = await runResearchAgentMinimal({
  cwd: ${JSON.stringify(options.consumerRoot)},
  homeDir: ${JSON.stringify(options.consumerRoot)},
  env: {},
  skipLiveRead: ${JSON.stringify(options.skipLiveRead)},
});

console.log(JSON.stringify(summary, null, 2));
`;
}
