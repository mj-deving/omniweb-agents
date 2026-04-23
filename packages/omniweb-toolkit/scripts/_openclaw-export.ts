#!/usr/bin/env npx tsx

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { PACKAGE_ROOT } from "./_shared.js";

export const SUPPORTED_ARCHETYPES = [
  "research-agent",
  "market-analyst",
  "engagement-optimizer",
] as const;

export type Archetype = typeof SUPPORTED_ARCHETYPES[number];

export interface ExportedFile {
  path: string;
  content: string;
}

interface ArchetypeSpec {
  id: Archetype;
  displayName: string;
  skillName: string;
  emoji: string;
  theme: string;
  summary: string;
  bundlePackageName: string;
  playbookPath: string;
  starterPath: string;
  starterExportName: string;
  trajectoryScenario: string;
  playbookCheckScript: string;
  runTemplateScript: string;
  starterGoal: string;
  starterCheckNote: string;
  observeFocus: string[];
  actionPriorities: string[];
  references: string[];
}

interface OpenClawMetadata {
  emoji: string;
  skillKey: string;
  homepage: string;
  requires: {
    bins: string[];
    env: string[];
  };
  primaryEnv: string;
  spendsRealMoney: boolean;
  spendToken: string;
  secretFiles: string[];
  writeGuards: string[];
}

const ARCHETYPE_SPECS: Record<Archetype, ArchetypeSpec> = {
  "research-agent": {
    id: "research-agent",
    displayName: "OmniWeb Research Agent",
    skillName: "omniweb-research-agent",
    emoji: "🔬",
    theme: "Evidence-led SuperColony researcher who values depth over speed.",
    summary: "Deep research analyst contributing evidence-backed SuperColony analysis with strong attestation discipline.",
    bundlePackageName: "@omniweb-toolkit/openclaw-research-agent-bundle",
    playbookPath: "playbooks/research-agent.md",
    starterPath: "assets/research-agent-starter.ts",
    starterExportName: "runResearchAgentCycle",
    trajectoryScenario: "research-agent-playbook",
    playbookCheckScript: "check:playbook:research",
    runTemplateScript: "node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template research-agent",
    starterGoal: "coverage-gap detection plus evidence-backed publishing",
    starterCheckNote: "Keep publishes gated by attestation workflow checks before spending DEM.",
    observeFocus: [
      "getFeed({ limit: 30 })",
      "getSignals()",
      "getLeaderboard({ limit: 10 })",
      "getBalance()",
    ],
    actionPriorities: [
      "Publish when a high-confidence signal is under-covered or contradictory.",
      "React or tip when another agent contributes novel evidence worth amplifying.",
      "Skip when there is no fresh gap, when you published within the last hour, or when balance is below the playbook floor.",
    ],
    references: [
      "GUIDE.md",
      "references/attestation-pipeline.md",
      "references/market-analyst-launch-proof-2026-04-17.md",
      "references/publish-proof-protocol.md",
      "references/runtime-topology.md",
      "references/research-agent-launch-proof-2026-04-17.md",
      "references/identity-surface-sweep-2026-04-17.md",
      "references/verification-matrix.md",
      "references/launch-proving-matrix.md",
      "references/market-write-sweep-2026-04-17.md",
      "references/read-surface-sweep.md",
      "references/social-write-sweep-2026-04-17.md",
      "references/write-surface-sweep.md",
      "references/toolkit-guardrails.md",
      "references/categories.md",
    ],
  },
  "market-analyst": {
    id: "market-analyst",
    displayName: "OmniWeb Market Analyst",
    skillName: "omniweb-market-analyst",
    emoji: "📈",
    theme: "Fast SuperColony market analyst focused on divergences, signals, and disciplined conviction.",
    summary: "Signals-driven SuperColony market analyst that publishes divergence analysis and only bets after the publish path is proven.",
    bundlePackageName: "@omniweb-toolkit/openclaw-market-analyst-bundle",
    playbookPath: "playbooks/market-analyst.md",
    starterPath: "assets/market-analyst-starter.ts",
    starterExportName: "runMarketAnalystCycle",
    trajectoryScenario: "market-analyst-playbook",
    playbookCheckScript: "check:playbook:market",
    runTemplateScript: "node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template market-analyst",
    starterGoal: "oracle-divergence detection and publish-first market response",
    starterCheckNote: "Do not enable live bets until the read surface and publish path are stable on the current host.",
    observeFocus: [
      "getSignals()",
      "getOracle({ assets })",
      "getPrices(assets)",
      "getFeed({ limit: 20 })",
      "getBalance()",
    ],
    actionPriorities: [
      "Publish when a fresh oracle divergence clears the configured threshold.",
      "Bet only after the divergence-driven publish path is working and the live pool surface has been probed.",
      "React or tip to reinforce high-quality attested market takes when they add signal rather than noise.",
    ],
    references: [
      "GUIDE.md",
      "references/market-analyst-launch-proof-2026-04-17.md",
      "references/response-shapes.md",
      "references/market-write-sweep-2026-04-17.md",
      "references/toolkit-guardrails.md",
      "references/categories.md",
    ],
  },
  "engagement-optimizer": {
    id: "engagement-optimizer",
    displayName: "OmniWeb Engagement Optimizer",
    skillName: "omniweb-engagement-optimizer",
    emoji: "🤝",
    theme: "Community-focused SuperColony curator who rewards quality and avoids spammy engagement loops.",
    summary: "Community-centric SuperColony agent that curates the feed, reacts selectively, and tips with explicit budget discipline.",
    bundlePackageName: "@omniweb-toolkit/openclaw-engagement-optimizer-bundle",
    playbookPath: "playbooks/engagement-optimizer.md",
    starterPath: "assets/engagement-optimizer-starter.ts",
    starterExportName: "runEngagementOptimizerCycle",
    trajectoryScenario: "engagement-optimizer-playbook",
    playbookCheckScript: "check:playbook:engagement",
    runTemplateScript: "node --import tsx ./node_modules/omniweb-toolkit/evals/score-playbook-run.ts --template engagement-optimizer",
    starterGoal: "under-engaged quality-post detection plus selective reactions and tips",
    starterCheckNote: "Keep tipping selective and attach a concrete reason before spending DEM.",
    observeFocus: [
      "getFeed({ limit: 30 })",
      "getLeaderboard({ limit: 20 })",
      "getBalance()",
      "getReactions(txHash) for the most relevant posts",
    ],
    actionPriorities: [
      "React when a quality post is under-engaged or when a newcomer deserves reinforcement.",
      "Tip only after a budget check and only when the contribution is genuinely useful.",
      "Publish occasionally to synthesize what the colony is learning, not to pad volume.",
    ],
    references: [
      "GUIDE.md",
      "references/scoring-and-leaderboard.md",
      "references/response-shapes.md",
      "references/categories.md",
    ],
  },
};

export const OPENCLAW_EXPORT_ROOT = resolve(PACKAGE_ROOT, "agents", "openclaw");

export function isArchetype(value: string): value is Archetype {
  return (SUPPORTED_ARCHETYPES as readonly string[]).includes(value);
}

export function getArchetypeSpec(archetype: Archetype): ArchetypeSpec {
  return ARCHETYPE_SPECS[archetype];
}

export function buildOpenClawExport(archetypes: readonly Archetype[] = SUPPORTED_ARCHETYPES): ExportedFile[] {
  const files: ExportedFile[] = [
    {
      path: "README.md",
      content: renderRootReadme(archetypes),
    },
  ];

  for (const archetype of archetypes) {
    const spec = getArchetypeSpec(archetype);
    const playbookText = rewritePlaybookLinks(readPackageFile(spec.playbookPath), spec);
    const starterText = rewriteBundleAgentImport(readPackageFile(spec.starterPath));
    const minimalStarterText = readPackageFile("assets/minimal-agent-starter.mjs");
    const strategyText = buildMergedStrategy(playbookText);
    const bundleDir = archetype;
    const skillDir = `${bundleDir}/skills/${spec.skillName}`;

    files.push(
      {
        path: `${bundleDir}/README.md`,
        content: renderBundleReadme(spec),
      },
      {
        path: `${bundleDir}/IDENTITY.md`,
        content: renderIdentity(spec),
      },
      {
        path: `${bundleDir}/openclaw.json`,
        content: renderOpenClawConfig(spec),
      },
      {
        path: `${bundleDir}/package.json`,
        content: renderBundlePackageJson(spec),
      },
      {
        path: `${skillDir}/SKILL.md`,
        content: renderSkill(spec),
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
        path: `${skillDir}/minimal-agent-starter.mjs`,
        content: normalizeText(minimalStarterText),
      },
      {
        path: `${skillDir}/starter.ts`,
        content: normalizeText(starterText),
      },
    );
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function rewriteBundleAgentImport(content: string): string {
  return normalizeText(content.replaceAll('from "../src/agent.js"', 'from "omniweb-toolkit/agent"'));
}

export function buildOpenClawMetadata(spec: ArchetypeSpec): { openclaw: OpenClawMetadata } {
  return {
    openclaw: {
      emoji: spec.emoji,
      skillKey: spec.skillName,
      homepage: "https://github.com/mj-deving/omniweb-agents/tree/main/packages/omniweb-toolkit",
      requires: {
        bins: ["node"],
        env: [
          "DEMOS_MNEMONIC",
          "RPC_URL",
          "SUPERCOLONY_API",
        ],
      },
      primaryEnv: "DEMOS_MNEMONIC",
      spendsRealMoney: true,
      spendToken: "DEM",
      secretFiles: [
        "~/.config/demos/credentials",
        "~/.config/demos/credentials-<agent>",
        "~/.supercolony-auth.json",
      ],
      writeGuards: [
        "npm run check:publish",
        "npm run check:attestation -- --attest-url <primary-url>",
      ],
    },
  };
}

function renderSafetyRules(spec: ArchetypeSpec): string {
  return `
## Safety Gates

1. This skill can spend real DEM through wallet-backed publish, reply, tip, attest, and market-write paths.
2. Treat \`DEMOS_MNEMONIC\` and any credentials files as secrets. Never print them, copy them into artifacts, or write them back into repo files.
3. Before any wallet-backed write, run \`npm run check:publish\`.
4. If the claim depends on external evidence, also run \`npm run check:attestation -- --attest-url <primary-url> [--supporting-url <url> ...]\`.
5. Treat \`attestTlsn()\` as experimental and slower than the maintained DAHR path. Do not choose it unless the task explicitly requires TLSN semantics.

## Hard Stop Rules

1. Stop if credentials are missing, auth is unavailable, or balance is zero or unknown.
2. Stop if the evidence chain is weak, unattested, or operator confidence is lower than the playbook threshold.
3. Stop if the post would be repetitive, spammy, or unsupported by the current archetype playbook.
4. Stop if the publish path reaches chain acceptance without indexed readback and the task requires indexed visibility rather than on-chain acceptance alone.
5. Skip instead of forcing action when the current state does not justify a write.

## Secret And Spend Handling

1. Use per-agent credentials files when available; do not move secrets into tracked workspace files.
2. Do not paste auth tokens, mnemonic material, or wallet addresses into public issue comments, beads, or generated reports unless the address is already intentionally public.
3. When a write succeeds, record the tx hash and the readback status separately. On-chain acceptance is not the same thing as indexed colony visibility.
4. Prefer the smallest action that advances the archetype. For ${spec.id}, read-first behavior is the default and writing is the exception, not the baseline.
`;
}

function renderSessionLedgerProtocol(): string {
  return `
## Session Ledger Protocol

1. REQUIRED: before composing, read the last 3 \`sessions/<ISO>/result.json\` entries in the workspace ledger.
2. REQUIRED: if any recent result contains \`stop_reasons\` including \`env_missing\` or \`network_drift\`, stop and tell the operator before attempting a live write.
3. REQUIRED: after finishing a turn, write a new session record under \`sessions/<ISO>-<slug>/\` with at least \`inputs.json\`, \`decisions.json\`, \`actions/01-<action>.json\`, and \`result.json\`. If a rubric score or observed score exists, also write \`scorecard.json\`.
4. Treat the session ledger as workflow memory, not public output. It is allowed to be gitignored, but if it is disabled you lose the repeat-prevention guard and must rescan manually.
`;
}

export function writeOpenClawExport(
  outputDir: string,
  archetypes: readonly Archetype[] = SUPPORTED_ARCHETYPES,
): ExportedFile[] {
  const files = buildOpenClawExport(archetypes);
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
        path: relative(rootDir, resolve(absolutePath, file.path)),
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

export function extractRelativeMarkdownLinks(text: string): string[] {
  const links = [...text.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#|\/)([^)]+)\)/g)]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  return Array.from(new Set(links));
}

export function parseFrontmatter(text: string): Record<string, unknown> | null {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const parsed = parse(match[1]);
  return isRecord(parsed) ? parsed : null;
}

function buildMergedStrategy(playbookText: string): string {
  const base = parse(readPackageFile("playbooks/strategy-schema.yaml")) as Record<string, unknown>;
  const overrideBlock = extractFirstYamlFence(playbookText);
  const override = parse(overrideBlock) as Record<string, unknown>;
  const merged = deepMerge(base, override);
  return `${stringify(merged).trimEnd()}\n`;
}

function rewritePlaybookLinks(text: string, spec: ArchetypeSpec): string {
  return normalizeText(text
    .replaceAll("../assets/minimal-agent-starter.mjs", "./minimal-agent-starter.mjs")
    .replaceAll(`../assets/${basename(spec.starterPath)}`, "./starter.ts")
    .replaceAll(
      "[assets/research-agent-runtime.ts](../assets/research-agent-runtime.ts)",
      "`packages/omniweb-toolkit/assets/research-agent-runtime.ts` in the source repo (not bundled into this OpenClaw export)",
    )
    .replaceAll("./strategy-schema.yaml", "./strategy.yaml")
    .replace(/\[GUIDE\.md\]\(\.\.\/GUIDE\.md\)/g, "`GUIDE.md` in the installed `omniweb-toolkit` package")
    .replace(/\[assets\/agent-loop-skeleton\.ts\]\(\.\.\/assets\/agent-loop-skeleton\.ts\)/g, "`assets/agent-loop-skeleton.ts` in the installed `omniweb-toolkit` package")
    .replace(/\[references\/([^\]]+)\]\(\.\.\/references\/[^)]+\)/g, "`references/$1` in the installed `omniweb-toolkit` package")
    .replace(/\[evals\/examples\/([^\]]+)\]\(\.\.\/evals\/examples\/[^)]+\)/g, "`evals/examples/$1` in the installed `omniweb-toolkit` package"));
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

function renderRootReadme(archetypes: readonly Archetype[]): string {
  const bullets = archetypes
    .map((archetype) => {
      const spec = getArchetypeSpec(archetype);
      return `- [${archetype}/README.md](./${archetype}/README.md) — ${spec.summary}`;
    })
    .join("\n");

  return normalizeText(`# OpenClaw Bundles

Generated OpenClaw workspace bundles for the shipped \`omniweb-toolkit\` archetypes.

The layout follows the current OpenClaw skill and workspace docs verified on April 16, 2026:

- workspace-local skills live in \`<workspace>/skills\`
- skill visibility is controlled by \`agents.defaults.skills\` in \`openclaw.json\`
- each exported skill folder stays intentionally small: \`SKILL.md\`, \`PLAYBOOK.md\`, \`strategy.yaml\`, \`starter.ts\`, and \`minimal-agent-starter.mjs\`

Available bundles:

${bullets}

Regenerate these files from the package root with:

\`\`\`bash
npm run export:openclaw
\`\`\`

Validate the committed export with:

\`\`\`bash
npm run check:openclaw
\`\`\`
`);
}

function renderBundleReadme(spec: ArchetypeSpec): string {
  return normalizeText(`# ${spec.displayName} OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the \`${spec.id}\` archetype shipped by \`omniweb-toolkit\`.

## What It Includes

- \`openclaw.json\` — workspace config that exposes only \`${spec.skillName}\`
- \`IDENTITY.md\` — human-readable identity scaffold for the workspace's main agent
- \`package.json\` — local workspace package that points \`omniweb-toolkit\` at the checked-out package via \`file:../../..\`
- \`skills/${spec.skillName}/SKILL.md\` — activation router plus validation order
- \`skills/${spec.skillName}/PLAYBOOK.md\` — archetype doctrine and action rules
- \`skills/${spec.skillName}/strategy.yaml\` — merged concrete baseline
- \`skills/${spec.skillName}/starter.ts\` — archetype-specific scaffold
- \`skills/${spec.skillName}/minimal-agent-starter.mjs\` — smallest default loop

## Local Usage

1. From this directory, run \`npm install\`.
2. Start from \`skills/${spec.skillName}/minimal-agent-starter.mjs\` unless you already know you need the full archetype scaffold.
3. Start OpenClaw with this folder as the workspace, or copy \`skills/${spec.skillName}\` into an existing workspace's \`skills/\` directory.
4. Verify the skill is visible with \`openclaw skills list\`.
5. Start a session and prompt the agent with a task that fits this archetype's role and action profile.

The local \`package.json\` assumes this bundle stays inside the checked-out repository. If you copy it elsewhere before the first npm publish, replace the \`file:../../..\` dependency with a reachable package source.

## Validation

- \`npm run check:playbook\` — archetype-specific validation path
- \`npm run check:publish\` — publish readiness gate
- \`npm run check:attestation -- --attest-url <primary-url>\` — source-chain readiness when a write depends on external evidence
- \`npm run score:template\` — print a captured-run template for this archetype
- \`npm run check:bundle\` — verify this exported bundle still matches the package source
`);
}

function renderIdentity(spec: ArchetypeSpec): string {
  return normalizeText(`# Identity

Name: ${spec.displayName}
Emoji: ${spec.emoji}
Theme: ${spec.theme}

Operate as a SuperColony specialist. Prefer evidence-backed actions, keep wallet-backed writes deliberate, and use the exported skill files as the source of truth for this workspace.
`);
}

function renderOpenClawConfig(spec: ArchetypeSpec): string {
  return `${JSON.stringify({
    agents: {
      defaults: {
        skills: [spec.skillName],
      },
    },
    skills: {
      entries: {
        [spec.skillName]: {
          enabled: true,
        },
      },
    },
  }, null, 2)}\n`;
}

function renderBundlePackageJson(spec: ArchetypeSpec): string {
  return `${JSON.stringify({
    name: spec.bundlePackageName,
    private: true,
    type: "module",
    scripts: {
      "check:playbook": `node --import tsx ./node_modules/omniweb-toolkit/scripts/check-playbook-path.ts --archetype ${spec.id}`,
      "check:publish": "node --import tsx ./node_modules/omniweb-toolkit/scripts/check-publish-readiness.ts",
      "check:attestation": "node --import tsx ./node_modules/omniweb-toolkit/scripts/check-attestation-workflow.ts",
      "score:template": spec.runTemplateScript,
      "check:bundle": `node --import tsx ../../../scripts/check-openclaw-export.ts --archetype ${spec.id}`,
    },
    dependencies: {
      "omniweb-toolkit": "file:../../..",
    },
    peerDependencies: {
      "@kynesyslabs/demosdk": ">=2.11.0",
      "better-sqlite3": "*",
    },
  }, null, 2)}\n`;
}

function renderSkill(spec: ArchetypeSpec): string {
  const metadata = JSON.stringify(buildOpenClawMetadata(spec));

  return normalizeText(`---
name: ${spec.skillName}
description: ${spec.summary}
metadata: ${metadata}
---

# ${spec.displayName}

Use this skill when the user wants an OpenClaw-style agent that follows the shipped \`${spec.id}\` playbook from \`omniweb-toolkit\`.

## First Read Order

1. Read \`{baseDir}/PLAYBOOK.md\` for the archetype's intent and action-selection rules.
2. Load \`{baseDir}/strategy.yaml\` as the concrete merged strategy baseline.
3. Start from \`{baseDir}/minimal-agent-starter.mjs\` unless the task clearly needs the full archetype scaffold.
4. Use \`{baseDir}/starter.ts\` when the minimal loop is too small for the current job.

## Default Workflow

1. Start read-first. Gather only the live state needed for the next decision.
2. Prefer the smallest action that advances the archetype's job.
3. Before any wallet-backed write, run \`npm run check:publish\` and then \`npm run check:attestation -- --attest-url <primary-url>\` when the claim depends on external evidence.
4. If the current state does not justify a publish, skip the write and keep the evidence trail explicit.

${renderSafetyRules(spec)}

${renderSessionLedgerProtocol()}

## Validation Order

1. \`npm run check:playbook\`
2. \`npm run check:publish\`
3. \`npm run check:attestation -- --attest-url <primary-url> [--supporting-url <url> ...]\`
4. \`${spec.runTemplateScript}\`

## What To Preserve

- The playbook, not generic vibes, decides what counts as a good action.
- The merged \`strategy.yaml\` is the concrete baseline; do not silently invent thresholds.
- The starter scaffold is intentionally conservative. Extend it only after the packaged checks pass.
- When a publish depends on external evidence, treat \`check-attestation-workflow.ts\` as part of the loop rather than optional polish.

## Workspace Defaults

- This skill assumes the workspace package has already installed \`omniweb-toolkit\` plus its required peers.
- Run commands from the workspace root.
- Treat this directory as the default surface; use the installed package docs under \`node_modules/omniweb-toolkit/\` only when you need deeper detail.
`);
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
