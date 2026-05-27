#!/usr/bin/env -S bunx tsx

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
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
const keepTemp = hasFlag(args, "--keep-temp");

const allowedArgs = new Set([
  "--skip-build",
  "--keep-temp",
  "--help",
  "-h",
]);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bunx tsx packages/omniweb-toolkit/scripts/check-colony-operator-consumer.ts [options]

Pack omniweb-toolkit, copy the exported colony-operator OpenClaw bundle into a clean
workspace, install the packed package, and run the maintained bundle + dry-run checks.

Options:
  --skip-build   Do not run bun run build before packing
  --keep-temp    Keep the temporary copied bundle workspace for debugging
  --help, -h     Show this help

Output: JSON colony-operator copied-bundle consumer proof
Exit codes: 0 = proof passed, 1 = proof failed, 2 = invalid args`);
  process.exit(0);
}

const unsupportedArgs = args.filter((arg) => !allowedArgs.has(arg));
if (unsupportedArgs.length > 0) {
  console.error(`Error: unsupported arguments: ${unsupportedArgs.join(" ")}`);
  process.exit(2);
}

const tempRoot = mkdtempSync(join(tmpdir(), "omniweb-colony-operator-consumer-"));
const sourceBundleRoot = resolve(PACKAGE_ROOT, "agents/openclaw/colony-operator");
const bundleRoot = join(tempRoot, "colony-operator");

let ok = false;
let buildResult: CommandResult | null = null;
let packResult: CommandResult | null = null;
let installResult: CommandResult | null = null;
let bundleCheckResult: CommandResult | null = null;
let playbookCheckResult: CommandResult | null = null;
let packEntry: PackSummary | null = null;
let summary: unknown = null;

try {
  if (!skipBuild) {
    buildResult = runCommand(["npm", "run", "build"], PACKAGE_ROOT);
    if (buildResult.exitCode !== 0) {
      throw new Error("package build failed before colony-operator consumer proof");
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
    throw new Error("npm pack failed before colony-operator consumer proof");
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
  cpSync(sourceBundleRoot, bundleRoot, { recursive: true });

  const packageJsonPath = join(bundleRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
  packageJson.dependencies = {
    ...(packageJson.dependencies ?? {}),
    "omniweb-toolkit": `file:${tarballPath}`,
  };
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  installResult = runCommand([
    "npm",
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--fund=false",
    "--package-lock=false",
  ], bundleRoot);
  if (installResult.exitCode !== 0) {
    throw new Error("copied colony-operator bundle npm install failed");
  }

  bundleCheckResult = runCommand(["npm", "run", "check:bundle"], bundleRoot);
  if (bundleCheckResult.exitCode !== 0) {
    throw new Error("copied colony-operator bundle contract check failed");
  }

  playbookCheckResult = runCommand(["npm", "run", "check:playbook"], bundleRoot);
  if (playbookCheckResult.exitCode !== 0) {
    throw new Error("copied colony-operator bundle dry-run check failed");
  }

  const bundleSummary = extractLastJsonObject(bundleCheckResult.stdout);
  const playbookSummary = extractLastJsonObject(playbookCheckResult.stdout);
  assertBundleSummary(bundleSummary);
  assertPlaybookSummary(playbookSummary);

  summary = {
    bundleCopied: true,
    bundleRoot,
    bundle: bundleSummary,
    playbook: playbookSummary,
  };
  ok = true;
} catch (error) {
  summary = {
    error: error instanceof Error ? error.message : String(error),
  };
} finally {
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    ok,
    packageRoot: PACKAGE_ROOT,
    sourceBundleRoot,
    tempRoot: keepTemp ? tempRoot : null,
    keptTemp: keepTemp,
    skipped: {
      build: skipBuild,
    },
    pack: packEntry,
    commands: {
      build: summarizeCommand(buildResult),
      pack: summarizeCommand(packResult),
      install: summarizeCommand(installResult),
      bundle: summarizeCommand(bundleCheckResult),
      playbook: summarizeCommand(playbookCheckResult),
    },
    consumer: summary,
    contract: {
      copiedBundleInstallsAgainstPackedPackage: ok,
      skillSurfaceResolves: hasNestedOk(summary, ["bundle", "ok"]),
      dryRunJourneyProven: hasNestedOk(summary, ["playbook", "ok"]),
      spendsDem: false,
      liveWriteProven: false,
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
    stdout: result.stdout.trim().slice(0, 1600),
    stderr: result.stderr.trim().slice(0, 1200),
  };
}

function extractLastJsonObject(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;

  const start = trimmed.lastIndexOf("\n{");
  const candidate = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
}

function assertBundleSummary(summary: unknown): void {
  if (!summary || typeof summary !== "object") {
    throw new Error("bundle check did not return a JSON object");
  }

  const record = summary as {
    ok?: boolean;
    archetype?: unknown;
    checks?: { static?: Array<{ status?: string }> };
  };

  if (record.ok !== true) {
    throw new Error("bundle runtime contract did not pass");
  }
  if (record.archetype !== "colony-operator") {
    throw new Error("bundle runtime contract reported the wrong archetype");
  }
  if (!Array.isArray(record.checks?.static) || record.checks.static.some((item) => item.status !== "pass")) {
    throw new Error("bundle runtime contract did not keep all static checks green");
  }
}

function assertPlaybookSummary(summary: unknown): void {
  if (!summary || typeof summary !== "object") {
    throw new Error("playbook check did not return a JSON object");
  }

  const record = summary as {
    ok?: boolean;
    contract?: { colonyOperatorBaselineProof?: boolean; colonyOperatorMvpProof?: boolean; spendsDem?: boolean; liveWriteProven?: boolean };
    result?: { outcomeStatus?: unknown };
  };

  if (record.ok !== true) {
    throw new Error("copied bundle dry-run proof did not pass");
  }
  if (record.contract?.colonyOperatorBaselineProof !== true) {
    throw new Error("copied bundle dry-run proof did not report baseline proof success");
  }
  if (record.contract?.colonyOperatorMvpProof !== false) {
    throw new Error("copied bundle dry-run proof should not claim full MVP proof");
  }
  if (record.contract?.spendsDem !== false) {
    throw new Error("copied bundle dry-run proof unexpectedly spent DEM");
  }
  if (record.contract?.liveWriteProven !== false) {
    throw new Error("copied bundle dry-run proof claimed live-write proof unexpectedly");
  }
  if (record.result?.outcomeStatus !== "dry_run" && record.result?.outcomeStatus !== "skipped") {
    throw new Error("copied bundle dry-run proof did not stay in a safe outcome state");
  }
}

function hasNestedOk(summary: unknown, path: string[]): boolean {
  let current: any = summary;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return false;
    current = current[key];
  }
  return current === true;
}
