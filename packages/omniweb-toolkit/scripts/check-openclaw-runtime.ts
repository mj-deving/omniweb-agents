#!/usr/bin/env npx tsx

import { existsSync, readFileSync } from "node:fs";
import { platform, release } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { getNumberArg, getStringArg, hasFlag } from "./_shared.js";
import {
  getArchetypeSpec,
  isArchetype,
  OPENCLAW_EXPORT_ROOT,
  parseFrontmatter,
  SUPPORTED_ARCHETYPES,
  type Archetype,
} from "./_openclaw-export.js";

type ProbeStatus = "pass" | "fail" | "manual";

interface ProbeResult {
  id: string;
  status: ProbeStatus;
  summary: string;
  command?: string[];
  stdout?: string;
  stderr?: string;
}

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx scripts/check-openclaw-runtime.ts [options]

Options:
  --archetype NAME        Archetype to check (default: research-agent)
  --workspace PATH        OpenClaw workspace directory (default: agents/openclaw/<archetype>)
  --timeout-ms N          Timeout for non-spending OpenClaw CLI probes (default: 15000)
  --run-openclaw-probes   Also run non-spending OpenClaw CLI probes on this host
  --require-openclaw      Run probes and exit nonzero when the OpenClaw CLI is missing
  --help, -h              Show this help

Output: JSON report for the OpenClaw runtime proof contract
Exit codes: 0 = static checks passed and available non-spending probes passed, 1 = validation failure, 2 = invalid args`);
  process.exit(0);
}

const archetypeArg = getStringArg(args, "--archetype") ?? "research-agent";
const timeoutMs = getNumberArg(args, "--timeout-ms") ?? 15_000;
const requireOpenClaw = hasFlag(args, "--require-openclaw");
const runOpenClawProbes = hasFlag(args, "--run-openclaw-probes") || requireOpenClaw;

if (!isArchetype(archetypeArg)) {
  console.error(`Error: --archetype must be one of ${SUPPORTED_ARCHETYPES.join(", ")}`);
  process.exit(2);
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("Error: --timeout-ms must be a positive number");
  process.exit(2);
}

const archetype: Archetype = archetypeArg;
const spec = getArchetypeSpec(archetype);
const workspace = resolve(getStringArg(args, "--workspace") ?? resolve(OPENCLAW_EXPORT_ROOT, archetype));
const skillDir = resolve(workspace, "skills", spec.skillName);
const skillPath = resolve(skillDir, "SKILL.md");
const configPath = resolve(workspace, "openclaw.json");
const packagePath = resolve(workspace, "package.json");

const staticChecks = [
  checkExists("workspace", workspace),
  checkExists("openclaw-config", configPath),
  checkExists("skill", skillPath),
  checkWorkspaceConfig(),
  checkWorkspacePackage(),
  checkSkillFrontmatter(),
  checkSkillBody(),
];

const cliVersion = !runOpenClawProbes
  ? manualProbe("openclaw-version", "OpenClaw CLI probe not run. Pass --run-openclaw-probes on a configured runtime host.")
  : runProbe("openclaw-version", ["openclaw", "--version"], timeoutMs);
const cliProbes = [cliVersion];

if (runOpenClawProbes && cliVersion.status === "pass") {
  cliProbes.push(
    manualProbe(
      "openclaw-skills-info",
      `Run openclaw skills info ${spec.skillName} after workspace activation. This OpenClaw probe is intentionally not run before setup because current CLIs may not accept --workspace on skills info.`,
      ["openclaw", "skills", "info", spec.skillName],
    ),
    runProbe("openclaw-providers-config", ["openclaw", "config", "get", "providers"], timeoutMs),
  );
} else if (runOpenClawProbes) {
  cliProbes.push(
    manualProbe("openclaw-skills-info", "Requires an installed OpenClaw CLI on the runtime host."),
    manualProbe("openclaw-providers-config", "Requires an installed OpenClaw CLI on the runtime host."),
  );
}

const failedStatic = staticChecks.filter((check) => check.status === "fail");
const failedCli = cliProbes.filter((check) => check.status === "fail");
const missingRequiredCli = requireOpenClaw && cliVersion.status !== "pass";
const ok = failedStatic.length === 0 && failedCli.length === 0 && !missingRequiredCli;

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  ok,
  executionProven: false,
  archetype,
  skillName: spec.skillName,
  workspace,
  environment: {
    node: process.version,
    platform: platform(),
    osRelease: release(),
  },
  checks: {
    static: staticChecks,
    openclawCli: cliProbes,
  },
  externalRuntimeHandoff: {
    where: workspace,
    when: "after static checks pass, OpenClaw CLI probes pass on the runtime host, provider auth is configured, and a dry-run smoke turn completes without publish/spend/broadcast output",
    activation: [
      `openclaw onboard --accept-risk --workspace ${workspace}`,
      `openclaw setup --workspace ${workspace}`,
      `openclaw skills info ${spec.skillName}`,
    ],
  },
  remainingLiveProof: [
    {
      id: "workspace-activation",
      status: "manual",
      command: `openclaw onboard --accept-risk --workspace ${workspace}`,
      reason: "May mutate local OpenClaw config; run only on the target runtime host.",
    },
    {
      id: "skill-resolution",
      status: "manual",
      command: `openclaw skills info ${spec.skillName}`,
      reason: "Run after workspace activation; this verifies OpenClaw resolves the local workspace skill.",
    },
    {
      id: "provider-auth",
      status: "manual",
      command: "openclaw config get providers",
      reason: "Can be probed by this script when OpenClaw is installed, but real auth quality is host-specific.",
    },
    {
      id: "dry-run-smoke-turn",
      status: "manual",
      command: `openclaw agent --agent ${archetype} --local --session-id ${archetype}-smoke-$(date +%s) --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."`,
      reason: "Requires live OpenClaw runtime/provider auth. Must remain dry-run only.",
    },
    {
      id: "dry-run-assertions",
      status: "manual",
      command: "grep -qi dry-run smoke.log && ! grep -qiE 'publish|spent DEM|broadcast' smoke.log",
      reason: "Only meaningful after a captured smoke log exists.",
    },
  ],
}, null, 2));

process.exit(ok ? 0 : 1);

function checkExists(id: string, path: string): ProbeResult {
  return existsSync(path)
    ? { id, status: "pass", summary: `${path} exists.` }
    : { id, status: "fail", summary: `${path} is missing.` };
}

function checkWorkspaceConfig(): ProbeResult {
  if (!existsSync(configPath)) {
    return { id: "workspace-config", status: "fail", summary: `${configPath} is missing.` };
  }

  try {
    const config = JSON.parse(readFileSync(configPath, "utf8")) as {
      agents?: { defaults?: { skills?: unknown } };
      skills?: { entries?: Record<string, { enabled?: unknown }> };
    };
    const skills = config.agents?.defaults?.skills;
    const entry = config.skills?.entries?.[spec.skillName];
    const ok = Array.isArray(skills) &&
      skills.length === 1 &&
      skills[0] === spec.skillName &&
      entry?.enabled === true;
    return {
      id: "workspace-config",
      status: ok ? "pass" : "fail",
      summary: ok
        ? `openclaw.json exposes only ${spec.skillName}.`
        : `openclaw.json must expose and enable only ${spec.skillName}.`,
    };
  } catch (error) {
    return {
      id: "workspace-config",
      status: "fail",
      summary: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkWorkspacePackage(): ProbeResult {
  if (!existsSync(packagePath)) {
    return { id: "workspace-package", status: "fail", summary: `${packagePath} is missing.` };
  }

  try {
    const bundlePackage = JSON.parse(readFileSync(packagePath, "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const dependency = bundlePackage.dependencies?.["omniweb-toolkit"];
    const ok = dependency === "file:../../.." &&
      !bundlePackage.peerDependencies &&
      typeof bundlePackage.scripts?.["check:bundle"] === "string";
    return {
      id: "workspace-package",
      status: ok ? "pass" : "fail",
      summary: ok
        ? "package.json keeps the alpha local file dependency and bundle check contract."
        : "package.json must use omniweb-toolkit file:../../.., omit peerDependencies, and expose check:bundle.",
    };
  } catch (error) {
    return {
      id: "workspace-package",
      status: "fail",
      summary: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkSkillFrontmatter(): ProbeResult {
  if (!existsSync(skillPath)) {
    return { id: "skill-frontmatter", status: "fail", summary: `${skillPath} is missing.` };
  }

  try {
    const frontmatter = parseFrontmatter(readFileSync(skillPath, "utf8"));
    const metadata = parseMetadata(frontmatter?.metadata);
    const openclaw = isRecord(metadata?.openclaw) ? metadata.openclaw : null;
    const requires = isRecord(openclaw?.requires) ? openclaw.requires : null;
    const env = Array.isArray(requires?.env) ? requires.env : [];
    const bins = Array.isArray(requires?.bins) ? requires.bins : [];
    const os = Array.isArray(openclaw?.os) ? openclaw.os : [];
    const ok = frontmatter?.name === spec.skillName &&
      openclaw?.skillKey === spec.skillName &&
      openclaw?.primaryEnv === "DEMOS_MNEMONIC" &&
      openclaw?.spendsRealMoney === true &&
      openclaw?.spendToken === "DEM" &&
      bins.includes("node") &&
      env.includes("DEMOS_MNEMONIC") &&
      env.includes("RPC_URL") &&
      env.includes("SUPERCOLONY_API") &&
      os.includes("linux") &&
      os.includes("darwin");

    return {
      id: "skill-frontmatter",
      status: ok ? "pass" : "fail",
      summary: ok
        ? "SKILL.md frontmatter declares OpenClaw key, env, primaryEnv, spend token, and OS metadata."
        : "SKILL.md frontmatter is missing required OpenClaw runtime metadata.",
    };
  } catch (error) {
    return {
      id: "skill-frontmatter",
      status: "fail",
      summary: error instanceof Error
        ? `SKILL.md frontmatter could not be parsed: ${error.message}`
        : `SKILL.md frontmatter could not be parsed: ${String(error)}`,
    };
  }
}

function checkSkillBody(): ProbeResult {
  if (!existsSync(skillPath)) {
    return { id: "skill-body", status: "fail", summary: `${skillPath} is missing.` };
  }

  const text = readFileSync(skillPath, "utf8");
  const requiredPhrases = [
    "## Safety Gates",
    "## REQUIRED Stop-And-Ask Gates",
    "REQUIRED: simulate or dry-run before any chain write on mainnet.",
    "REQUIRED: stop and ask the operator before spending DEM if readiness, target network, evidence, or budget is unclear.",
    "Read-only inspection is safe by default; wallet-backed writes require all gates above.",
  ];
  const missing = requiredPhrases.filter((phrase) => !text.includes(phrase));
  return {
    id: "skill-body",
    status: missing.length === 0 ? "pass" : "fail",
    summary: missing.length === 0
      ? "SKILL.md includes activation-time safety and no-spend dry-run language."
      : `SKILL.md is missing required phrases: ${missing.join("; ")}`,
  };
}

function runProbe(id: string, command: string[], timeoutMsValue: number): ProbeResult {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: workspace,
    encoding: "utf8",
    timeout: timeoutMsValue,
  });

  if (result.error && "code" in result.error && result.error.code === "ENOENT") {
    return manualProbe(id, `${command[0]} is not installed or not on PATH.`, command);
  }

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  const status = result.status === 0 ? "pass" : "fail";
  return {
    id,
    status,
    summary: status === "pass"
      ? "Non-spending OpenClaw CLI probe passed."
      : `Non-spending OpenClaw CLI probe failed with exit code ${result.status ?? 1}.`,
    command,
    stdout,
    stderr,
  };
}

function manualProbe(id: string, summary: string, command?: string[]): ProbeResult {
  return {
    id,
    status: "manual",
    summary,
    command,
  };
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
