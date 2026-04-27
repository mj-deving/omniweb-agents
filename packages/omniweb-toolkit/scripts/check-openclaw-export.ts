#!/usr/bin/env npx tsx

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getStringArg, hasFlag } from "./_shared.js";
import {
  buildOpenClawExport,
  collectTextFiles,
  extractRelativeMarkdownLinks,
  getArchetypeSpec,
  isArchetype,
  OPENCLAW_EXPORT_ROOT,
  parseFrontmatter,
  SUPPORTED_ARCHETYPES,
  type Archetype,
} from "./_openclaw-export.js";

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx scripts/check-openclaw-export.ts [options]

Options:
  --output-dir PATH   Export directory to validate (default: agents/openclaw)
  --archetype NAME    Validate only one archetype
  --help, -h          Show this help

Output: JSON report covering export drift, skill frontmatter, config wiring, and relative-link integrity
Exit codes: 0 = export is valid, 1 = drift or validation failure, 2 = invalid args`);
  process.exit(0);
}

const archetypeArg = getStringArg(args, "--archetype");
const outputDir = resolve(getStringArg(args, "--output-dir") ?? OPENCLAW_EXPORT_ROOT);

if (archetypeArg && !isArchetype(archetypeArg)) {
  console.error(`Error: --archetype must be one of ${SUPPORTED_ARCHETYPES.join(", ")}`);
  process.exit(2);
}

const archetypes: readonly Archetype[] = archetypeArg ? [archetypeArg] : SUPPORTED_ARCHETYPES;
const expectedFiles = buildOpenClawExport(archetypes)
  .filter((file) => !archetypeArg || file.path !== "README.md");
const allowedPrefixes = new Set([
  ...archetypes.map((archetype) => `${archetype}/`),
  ...(archetypeArg ? [] : ["README.md"]),
]);
const actualFiles = collectTextFiles(outputDir)
  .filter((file) => Array.from(allowedPrefixes).some((prefix) => (
    prefix.endsWith("/") ? file.path.startsWith(prefix) : file.path === prefix
  )));
const expectedMap = new Map(expectedFiles.map((file) => [file.path, file.content]));
const actualMap = new Map(actualFiles.map((file) => [file.path, file.content]));

const missingFiles = expectedFiles
  .map((file) => file.path)
  .filter((path) => !actualMap.has(path));
const unexpectedFiles = actualFiles
  .map((file) => file.path)
  .filter((path) => !expectedMap.has(path));
const changedFiles = expectedFiles
  .map((file) => file.path)
  .filter((path) => actualMap.has(path) && actualMap.get(path) !== expectedMap.get(path));

const bundleChecks = archetypes.map((archetype) => {
  const spec = getArchetypeSpec(archetype);
  const bundleRoot = resolve(outputDir, archetype);
  const skillDir = resolve(bundleRoot, "skills", spec.skillName);
  const skillPath = resolve(skillDir, "SKILL.md");
  const frontmatter = existsSync(skillPath)
    ? parseFrontmatter(readFileSync(skillPath, "utf8"))
    : null;
  const skillText = existsSync(skillPath)
    ? readFileSync(skillPath, "utf8")
    : "";
  const skillLinks = existsSync(skillPath)
    ? extractRelativeMarkdownLinks(skillText)
    : [];
  const brokenLinks = skillLinks.filter((link) => !existsSync(resolve(skillDir, link)));
  const configPath = resolve(bundleRoot, "openclaw.json");
  const bundlePackagePath = resolve(bundleRoot, "package.json");
  const config = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, "utf8")) as {
        agents?: { defaults?: { skills?: unknown } };
        skills?: { entries?: Record<string, { enabled?: unknown }> };
      }
    : null;
  const bundlePackage = existsSync(bundlePackagePath)
    ? JSON.parse(readFileSync(bundlePackagePath, "utf8")) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      }
    : null;
  const readmePath = resolve(bundleRoot, "README.md");
  const agentsPath = resolve(bundleRoot, "AGENTS.md");
  const readmeText = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
  const agentsText = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";

  const allowlist = config?.agents?.defaults?.skills;
  const enabledEntry = config?.skills?.entries?.[spec.skillName];
  const bundleScripts = bundlePackage?.scripts ?? {};
  const bundleDependency = bundlePackage?.dependencies?.["omniweb-toolkit"] ?? null;
  const metadata = parseMetadata(frontmatter?.metadata);
  const openclaw = metadata?.openclaw && typeof metadata.openclaw === "object"
    ? metadata.openclaw as Record<string, unknown>
    : null;
  const requires = openclaw?.requires && typeof openclaw.requires === "object"
    ? openclaw.requires as Record<string, unknown>
    : null;
  const bins = Array.isArray(requires?.bins) ? requires.bins : [];
  const env = Array.isArray(requires?.env) ? requires.env : [];
  const os = Array.isArray(openclaw?.os) ? openclaw.os : [];

  return {
    archetype,
    bundleRoot,
    ok: !!frontmatter &&
      frontmatter.name === spec.skillName &&
      typeof frontmatter.description === "string" &&
      openclaw?.primaryEnv === "DEMOS_MNEMONIC" &&
      os.includes("linux") &&
      os.includes("darwin") &&
      openclaw?.spendsRealMoney === true &&
      openclaw?.spendToken === "DEM" &&
      bins.includes("node") &&
      env.includes("DEMOS_MNEMONIC") &&
      env.includes("RPC_URL") &&
      env.includes("SUPERCOLONY_API") &&
      brokenLinks.length === 0 &&
      Array.isArray(allowlist) &&
      allowlist.length === 1 &&
      allowlist[0] === spec.skillName &&
      enabledEntry?.enabled === true &&
      bundleScripts["check:playbook"]?.includes(spec.id) === true &&
      typeof bundleScripts["check:attestation"] === "string" &&
      typeof bundleScripts["check:bundle"] === "string" &&
      bundleDependency === "file:../../.." &&
      !bundlePackage?.peerDependencies &&
      readmeText.includes("## Current Layer Contract") &&
      readmeText.includes("## Runtime Execution Proof") &&
      agentsText.includes("## Local Overlay Boundary") &&
      skillText.includes("## Safety Gates") &&
      skillText.includes("## REQUIRED Stop-And-Ask Gates") &&
      skillText.includes("## Hard Stop Rules") &&
      skillText.includes("## Session Ledger Protocol") &&
      skillText.includes("spend real DEM") &&
      skillText.includes("DEMOS_MNEMONIC") &&
      skillText.includes("REQUIRED: simulate or dry-run before any chain write on mainnet.") &&
      skillText.includes("REQUIRED: signer key must come from env, keyring, or OpenClaw-injected primaryEnv; never from chat or prompt context.") &&
      skillText.includes("REQUIRED: stop and ask the operator before spending DEM if readiness, target network, evidence, or budget is unclear.") &&
      skillText.includes("sessions/<ISO>/result.json"),
    frontmatterName: frontmatter?.name ?? null,
    brokenLinks,
    allowlist,
    enabledEntry: enabledEntry ?? null,
    dependency: bundleDependency,
    peerDependencies: bundlePackage?.peerDependencies ?? null,
    scripts: bundleScripts,
    primaryEnv: openclaw?.primaryEnv ?? null,
    spendsRealMoney: openclaw?.spendsRealMoney ?? null,
    spendToken: openclaw?.spendToken ?? null,
    os,
    bins,
    env,
  };
});

const ok =
  missingFiles.length === 0 &&
  unexpectedFiles.length === 0 &&
  changedFiles.length === 0 &&
  bundleChecks.every((check) => check.ok);

console.log(JSON.stringify({
  ok,
  outputDir,
  archetypes,
  expectedFileCount: expectedFiles.length,
  actualFileCount: actualFiles.length,
  missingFiles,
  unexpectedFiles,
  changedFiles,
  bundleChecks,
}, null, 2));

process.exit(ok ? 0 : 1);

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  return null;
}
