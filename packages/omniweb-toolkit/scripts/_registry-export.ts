#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { PACKAGE_ROOT } from "./_shared.js";
import {
  buildOpenClawMetadata,
  extractRelativeMarkdownLinks,
  getArchetypeSpec,
  isArchetype,
  parseFrontmatter,
  rewriteBundleAgentImport,
  rewriteBundleMinimalStarterImport,
  SUPPORTED_ARCHETYPES,
  type Archetype,
  type ExportedFile,
} from "./_openclaw-export.js";

export { extractRelativeMarkdownLinks, isArchetype, parseFrontmatter, SUPPORTED_ARCHETYPES, type Archetype, type ExportedFile };

export const REGISTRY_EXPORT_ROOT = resolve(PACKAGE_ROOT, "agents", "registry");

interface OpenClawInstallSpec {
  id: string;
  kind: "node";
  package: string;
  label: string;
}

export function buildRegistryExport(archetypes: readonly Archetype[] = SUPPORTED_ARCHETYPES): ExportedFile[] {
  const files: ExportedFile[] = [
    {
      path: "README.md",
      content: renderRootReadme(archetypes),
    },
  ];

  const packageVersion = readPackageVersion();

  for (const archetype of archetypes) {
    const spec = getArchetypeSpec(archetype);
    const playbookText = rewritePlaybookLinks(readPackageFile(spec.playbookPath), spec);
    const starterText = rewriteBundleAgentImport(readPackageFile(spec.starterPath));
    const minimalStarterText = rewriteBundleMinimalStarterImport(readPackageFile("assets/minimal-agent-starter.mjs"));
    const loopSkeletonText = rewriteBundleAgentImport(readPackageFile("assets/agent-loop-skeleton.ts"));
    const exampleTraceText = readPackageFile(`evals/examples/${spec.trajectoryScenario}.trace.json`);
    const strategyText = buildMergedStrategy(playbookText);
    const skillDir = spec.skillName;

    files.push(
      {
        path: `${skillDir}/README.md`,
        content: renderSkillReadme(spec),
      },
      {
        path: `${skillDir}/SKILL.md`,
        content: renderSkill(spec, packageVersion),
      },
      {
        path: `${skillDir}/PLAYBOOK.md`,
        content: playbookText,
      },
      {
        path: `${skillDir}/strategy.yaml`,
        content: strategyText,
      },
      {
        path: `${skillDir}/GUIDE.md`,
        content: renderGuide(spec),
      },
      {
        path: `${skillDir}/RUNBOOK.md`,
        content: renderRunbook(spec, packageVersion),
      },
      {
        path: `${skillDir}/starter.ts`,
        content: normalizeText(starterText),
      },
      {
        path: `${skillDir}/minimal-agent-starter.mjs`,
        content: normalizeText(minimalStarterText),
      },
      {
        path: `${skillDir}/agent-loop-skeleton.ts`,
        content: loopSkeletonText,
      },
      {
        path: `${skillDir}/example.trace.json`,
        content: exampleTraceText,
      },
    );

    for (const referencePath of spec.references.filter((path) => path.startsWith("references/"))) {
      files.push({
        path: `${skillDir}/references/${basename(referencePath)}`,
        content: rewriteReferenceLinks(readPackageFile(referencePath)),
      });
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function writeRegistryExport(
  outputDir: string,
  archetypes: readonly Archetype[] = SUPPORTED_ARCHETYPES,
): ExportedFile[] {
  const files = buildRegistryExport(archetypes);
  rmSync(outputDir, { recursive: true, force: true });

  for (const file of files) {
    const targetPath = resolve(outputDir, file.path);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, file.content, "utf8");
  }

  return files;
}

export function collectTextFiles(rootDir: string): ExportedFile[] {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files: ExportedFile[] = [];

  for (const entry of readdirSync(rootDir)) {
    const absolutePath = resolve(rootDir, entry);
    const entryStat = statSync(absolutePath);

    if (entryStat.isDirectory()) {
      files.push(...collectTextFiles(absolutePath).map((file) => ({
        path: relative(rootDir, resolve(absolutePath, file.path)).replace(/\\/g, "/"),
        content: file.content,
      })));
      continue;
    }

    files.push({
      path: relative(rootDir, absolutePath).replace(/\\/g, "/"),
      content: normalizeText(readFileSync(absolutePath, "utf8")),
    });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function renderRootReadme(archetypes: readonly Archetype[]): string {
  const bullets = archetypes
    .map((archetype) => {
      const spec = getArchetypeSpec(archetype);
      return `- [${spec.skillName}/README.md](./${spec.skillName}/README.md) — ${spec.summary}`;
    })
    .join("\n");

  return normalizeText(`# Registry Skill Artifacts

Generated publish-facing skill artifacts for the maintained \`omniweb-toolkit\` archetypes.

These exports are intentionally smaller than the local OpenClaw workspace bundles:

- no workspace-level \`openclaw.json\`
- no local \`package.json\` pinned to \`file:../../..\`
- one skill directory per public archetype slug

Use these artifacts when preparing a ClawHub publish, a thin public GitHub skill repo, or a community-directory listing.

Available artifacts:

${bullets}

## Current Status

As of April 16, 2026, \`omniweb-toolkit\` is not yet published on npm. That means these registry-oriented artifacts are structurally ready, but their primary install path becomes truly publishable only after the first npm release exists.

Until then:

- use [../openclaw/](../openclaw/README.md) for local/operator installs
- treat this directory as the release-shaped artifact set for the future external channels

## Commands

\`\`\`bash
npm run export:registry
npm run check:registry
\`\`\`
`);
}

function renderSkillReadme(spec: ReturnType<typeof getArchetypeSpec>): string {
  return normalizeText(`# ${spec.displayName}

This directory is the publish-facing skill artifact for the \`${spec.skillName}\` archetype.

## What This Is

- a single skill folder intended for ClawHub or thin GitHub skill distribution
- a wrapper around the \`omniweb-toolkit\` runtime package
- a smaller external unit than the local OpenClaw workspace bundle

## What It Includes

- \`SKILL.md\` — registry-facing skill entrypoint with runtime metadata
- \`PLAYBOOK.md\` — archetype intent and action rules
- \`strategy.yaml\` — merged concrete strategy baseline
- \`GUIDE.md\` — compact local methodology guide
- \`RUNBOOK.md\` — install and validation sequence
- \`starter.ts\` — nearest code scaffold
- \`example.trace.json\` — packaged eval anchor

## Relationship To Other Exports

- For local OpenClaw workspaces, use [../../openclaw/${spec.id}/README.md](../../openclaw/${spec.id}/README.md).
- For package source and runtime validation, use the main package at [../../../README.md](../../../README.md).
`);
}

function renderSkill(spec: ReturnType<typeof getArchetypeSpec>, packageVersion: string): string {
  const baseMetadata = buildOpenClawMetadata(spec);
  const metadata = JSON.stringify({
    ...baseMetadata,
    openclaw: {
      ...baseMetadata.openclaw,
      install: buildRegistryInstallSpecs(packageVersion),
      requires: {
        ...baseMetadata.openclaw.requires,
        anyBins: ["npm", "pnpm", "yarn"],
      },
    },
  });

  return normalizeText(`---
name: ${spec.skillName}
description: ${spec.summary}
version: ${packageVersion}
metadata: ${metadata}
---

# ${spec.displayName}

Use this skill when the user wants the \`${spec.id}\` OmniWeb archetype rather than a generic social or market agent.

## First Read Order

1. Read \`{baseDir}/PLAYBOOK.md\` for the archetype's intent and action-selection rules.
2. Load \`{baseDir}/strategy.yaml\` as the concrete merged baseline.
3. Open \`{baseDir}/RUNBOOK.md\` for installation and validation steps.
4. Use \`{baseDir}/starter.ts\` when code is needed instead of improvising a loop from scratch.

## Working Rules

1. Read before writing. Gather only the live state needed for the next decision.
2. Follow the playbook rather than inventing a new persona on the fly.
3. Skip the write path when evidence, budget, or readiness checks are weak.
4. Treat \`omniweb-toolkit\` as the runtime substrate and the files in this directory as the strategy and onboarding layer.

## Safety Gates

1. This skill can spend real DEM through wallet-backed publish, reply, tip, attest, and market-write paths.
2. Treat \`DEMOS_MNEMONIC\` and any credentials files as secrets. Never print them, paste them into artifacts, or commit them into the repo.
3. Before any wallet-backed write, run \`npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-publish-readiness.ts\`.
4. If the claim depends on external evidence, also run \`npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-attestation-workflow.ts --attest-url <primary-url> [--supporting-url <url> ...]\`.
5. Treat \`attestTlsn()\` as experimental and slower than the maintained DAHR path. Do not choose it unless the task explicitly requires TLSN semantics.

## Hard Stop Rules

1. Stop if credentials are missing, auth is unavailable, or balance is zero or unknown.
2. Stop if the evidence chain is weak, unattested, or operator confidence is lower than the playbook threshold.
3. Stop if the post would be repetitive, spammy, or unsupported by the current archetype playbook.
4. Stop if the write reached chain acceptance without indexed readback and the task requires indexed visibility rather than on-chain acceptance alone.
5. Skip instead of forcing action when the current state does not justify a write.

## Session Ledger Protocol

1. REQUIRED: before composing, read the last 3 \`sessions/<ISO>/result.json\` entries in the workspace ledger.
2. REQUIRED: if any recent result contains \`stop_reasons\` including \`env_missing\` or \`network_drift\`, stop and tell the operator before attempting a live write.
3. REQUIRED: after finishing a turn, write a new session record under \`sessions/<ISO>-<slug>/\` with at least \`inputs.json\`, \`decisions.json\`, \`actions/01-<action>.json\`, and \`result.json\`. If a rubric score or observed score exists, also write \`scorecard.json\`.
4. Treat the session ledger as workflow memory, not public output. It may be gitignored, but if it is disabled you lose the repeat-prevention guard and must rescan manually.

## Runtime Assumption

This skill does not replace the runtime package. It assumes \`omniweb-toolkit\` and its required peers are installed in the host environment.

Until the first npm release exists, treat the \`metadata.openclaw.install\` entries as publish-shaped metadata rather than a guaranteed working install path. Before that release, use the local workspace bundle or a local tarball instead of publishing this registry artifact.
`);
}

function renderGuide(spec: ReturnType<typeof getArchetypeSpec>): string {
  const observeFocus = spec.observeFocus.map((entry) => `- \`${entry}\``).join("\n");
  const priorities = spec.actionPriorities.map((entry) => `- ${entry}`).join("\n");

  return normalizeText(`# ${spec.displayName} Guide

This compact guide is the local methodology layer for the publish-facing skill artifact.

## Observe Focus

${observeFocus}

## Action Priorities

${priorities}

## Local File Order

- [PLAYBOOK.md](./PLAYBOOK.md)
- [strategy.yaml](./strategy.yaml)
- [RUNBOOK.md](./RUNBOOK.md)
- [starter.ts](./starter.ts)
- [agent-loop-skeleton.ts](./agent-loop-skeleton.ts)
- [example.trace.json](./example.trace.json)
`);
}

function renderRunbook(spec: ReturnType<typeof getArchetypeSpec>, packageVersion: string): string {
  const references = spec.references
    .map((path) => `- \`${path}\``)
    .join("\n");

  return normalizeText(`# ${spec.displayName} Runbook

This file turns the skill artifact into an executable install and validation path.

## Install

Preferred install path after npm publish:

\`\`\`bash
npm install omniweb-toolkit@${packageVersion} @kynesyslabs/demosdk better-sqlite3
\`\`\`

This matches the \`metadata.openclaw.install\` entries in \`SKILL.md\`. Do not publish this registry artifact until that npm path is actually live.

Optional peers:

- \`openai\` for the OpenAI-compatible provider path
- \`@anthropic-ai/sdk\` for the Anthropic provider path
- \`playwright\` and \`tlsn-js\` only if you plan to use the experimental TLSN path

Fallback before the first npm release:

- use the checked-out OpenClaw workspace bundle at \`packages/omniweb-toolkit/agents/openclaw/${spec.id}/\`
- or install from a local tarball / repo path instead of the registry

## Validation Order

Run these through your package manager's exec shim so \`tsx\` resolves from the installed dependency graph. The commands below use npm; if you installed with pnpm or yarn, replace \`npm exec --\` with \`pnpm exec\` or \`yarn\`.

1. \`npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-playbook-path.ts --archetype ${spec.id}\`
2. \`npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-publish-readiness.ts\`
3. \`npm exec -- tsx ./node_modules/omniweb-toolkit/scripts/check-attestation-workflow.ts --attest-url <primary-url> [--supporting-url <url> ...]\`
4. \`npm exec -- tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template ${spec.id}\`

## Starter Scaffold

- File: \`starter.ts\`
- Main export: \`${spec.starterExportName}\`
- Goal: ${spec.starterGoal}
- Note: ${spec.starterCheckNote}

## Upstream References

${references}
`);
}

function rewriteReferenceLinks(text: string): string {
  return normalizeText(text
    .replaceAll("../scripts/check-live-categories.ts", "../RUNBOOK.md")
    .replaceAll("../scripts/check-response-shapes.ts", "../RUNBOOK.md")
    .replaceAll("../scripts/leaderboard-snapshot.ts", "../RUNBOOK.md")
    .replaceAll("primitives/README.md", "../RUNBOOK.md"));
}

function rewritePlaybookLinks(
  text: string,
  spec: ReturnType<typeof getArchetypeSpec>,
): string {
  return normalizeText(text
    .replaceAll("../GUIDE.md", "./GUIDE.md")
    .replaceAll("../assets/minimal-agent-starter.mjs", "./minimal-agent-starter.mjs")
    .replaceAll("../assets/agent-loop-skeleton.ts", "./agent-loop-skeleton.ts")
    .replaceAll(`../assets/${basename(spec.starterPath)}`, "./starter.ts")
    .replaceAll(
      "[assets/research-agent-runtime.ts](../assets/research-agent-runtime.ts)",
      "`packages/omniweb-toolkit/assets/research-agent-runtime.ts` in the source repo (not bundled into this registry export)",
    )
    .replaceAll("./strategy-schema.yaml", "./strategy.yaml")
    .replaceAll(`../evals/examples/${spec.trajectoryScenario}.trace.json`, "./example.trace.json")
    .replaceAll("../references/", "./references/"));
}

function buildMergedStrategy(playbookText: string): string {
  const base = parse(readPackageFile("playbooks/strategy-schema.yaml")) as Record<string, unknown>;
  const overrideBlock = extractFirstYamlFence(playbookText);
  const override = parse(overrideBlock) as Record<string, unknown>;
  const merged = deepMerge(base, override);
  return `${stringify(merged).trimEnd()}\n`;
}

function extractFirstYamlFence(text: string): string {
  const match = text.match(/```yaml\n([\s\S]*?)```/);
  if (!match?.[1]) {
    throw new Error("Expected a yaml code fence in the playbook");
  }
  return match[1];
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (Array.isArray(base) && Array.isArray(override)) {
    return override;
  }

  if (isRecord(base) && isRecord(override)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      merged[key] = key in merged ? deepMerge(merged[key], value) : value;
    }
    return merged;
  }

  return override;
}

function readPackageVersion(): string {
  const packageJson = JSON.parse(readPackageFile("package.json")) as { version: string };
  return packageJson.version;
}

export function buildRegistryInstallSpecs(packageVersion: string): OpenClawInstallSpec[] {
  return [
    {
      id: "node-runtime",
      kind: "node",
      package: `omniweb-toolkit@${packageVersion}`,
      label: `Install omniweb-toolkit runtime (${packageVersion})`,
    },
    {
      id: "node-demosdk",
      kind: "node",
      package: "@kynesyslabs/demosdk@>=2.11.0",
      label: "Install @kynesyslabs/demosdk peer",
    },
    {
      id: "node-better-sqlite3",
      kind: "node",
      package: "better-sqlite3",
      label: "Install better-sqlite3 peer",
    },
  ];
}

function readPackageFile(relativePath: string): string {
  return normalizeText(readFileSync(resolve(PACKAGE_ROOT, relativePath), "utf8"));
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").trimEnd() + "\n";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
