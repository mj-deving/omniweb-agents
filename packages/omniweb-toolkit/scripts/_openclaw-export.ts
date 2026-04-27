#!/usr/bin/env npx tsx

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
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

const SKIPPED_EXPORT_ENTRIES = new Set([
  ".git",
  "node_modules",
]);

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
  os: string[];
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
    const minimalStarterText = rewriteBundleMinimalStarterImport(readPackageFile("assets/minimal-agent-starter.mjs"));
    const strategyText = buildMergedStrategy(playbookText);
    const bundleDir = archetype;
    const skillDir = `${bundleDir}/skills/${spec.skillName}`;

    files.push(
      {
        path: `${bundleDir}/README.md`,
        content: renderBundleReadme(spec),
      },
      {
        path: `${bundleDir}/AGENTS.md`,
        content: renderWorkspaceAgents(spec),
      },
      {
        path: `${bundleDir}/BOOTSTRAP.md`,
        content: renderWorkspaceBootstrap(spec),
      },
      {
        path: `${bundleDir}/IDENTITY.md`,
        content: renderIdentity(spec),
      },
      {
        path: `${bundleDir}/MEMORY.md`,
        content: renderWorkspaceMemory(),
      },
      {
        path: `${bundleDir}/SOUL.md`,
        content: renderWorkspaceSoul(),
      },
      {
        path: `${bundleDir}/TOOLS.md`,
        content: renderWorkspaceTools(),
      },
      {
        path: `${bundleDir}/USER.md`,
        content: renderWorkspaceUser(),
      },
      {
        path: `${bundleDir}/HEARTBEAT.md`,
        content: renderWorkspaceHeartbeat(),
      },
      {
        path: `${bundleDir}/memory/README.md`,
        content: renderWorkspaceMemoryReadme(),
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

export function rewriteBundleMinimalStarterImport(content: string): string {
  return normalizeText(content
    .replaceAll('from "../src/index.js"', 'from "omniweb-toolkit"')
    .replaceAll('from "../src/agent.js"', 'from "omniweb-toolkit/agent"'));
}

export function normalizePathSeparators(path: string): string {
  return path.replace(/\\/g, "/");
}

export function normalizeExportRelativePath(rootDir: string, targetPath: string): string {
  return normalizePathSeparators(relative(rootDir, targetPath));
}

export function buildOpenClawMetadata(spec: ArchetypeSpec): { openclaw: OpenClawMetadata } {
  return {
    openclaw: {
      emoji: spec.emoji,
      skillKey: spec.skillName,
      homepage: "https://github.com/mj-deving/omniweb-agents/tree/main/packages/omniweb-toolkit",
      os: ["linux", "darwin"],
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

## REQUIRED Stop-And-Ask Gates

1. REQUIRED: simulate or dry-run before any chain write on mainnet.
2. REQUIRED: signer key must come from env, keyring, or OpenClaw-injected primaryEnv; never from chat or prompt context.
3. REQUIRED: refuse to proceed if target network, chain id, or RPC endpoint cannot be confirmed for the expected Demos/SuperColony environment.
4. REQUIRED: never paste mnemonic, private keys, auth tokens, session tokens, or credential-file contents into colony posts, logs, chat, generated artifacts, or repo files.
5. REQUIRED: stop and ask the operator before spending DEM if readiness, target network, evidence, or budget is unclear.
6. Do not continue outside these gates. Read-only inspection is safe by default; wallet-backed writes require all gates above.

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
    if (SKIPPED_EXPORT_ENTRIES.has(entry)) {
      continue;
    }

    const absolutePath = resolve(rootDir, entry);
    const entryStat = lstatSync(absolutePath);

    if (entryStat.isSymbolicLink()) {
      continue;
    }

    if (entryStat.isDirectory()) {
      files.push(...collectTextFiles(absolutePath).map((file) => ({
        path: normalizeExportRelativePath(rootDir, resolve(absolutePath, file.path)),
        content: file.content,
      })));
      continue;
    }

    files.push({
      path: normalizeExportRelativePath(rootDir, absolutePath),
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

## Local Onboarding Truth

Today the supported onboarding path is local and bundle-based:

1. clone this repository
2. point OpenClaw at one of these bundle directories as the workspace
3. run \`npm install\` only when you need package-backed validation or runtime scripts

For a first-time local setup on a host, use:

\`\`\`bash
openclaw onboard --accept-risk --workspace <bundle-dir>
\`\`\`

For an existing configured profile, use:

\`\`\`bash
openclaw setup --workspace <bundle-dir>
# or
openclaw config set agents.defaults.workspace <bundle-dir>
\`\`\`

Verify local skill resolution with:

\`\`\`bash
openclaw skills info <skill-slug>
\`\`\`

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
  return renderAlphaBundleReadme(spec);
}

function renderAlphaBundleReadme(spec: ArchetypeSpec): string {
  return normalizeText(`# ${spec.displayName} OpenClaw Bundle

This directory is an OpenClaw workspace bundle for the \`${spec.id}\` archetype shipped by \`omniweb-toolkit\`.

This \`${spec.id}\` bundle is currently an alpha portable bundle. It is portable enough to inspect and wire as an OpenClaw workspace, but it is not yet clone-and-go or public / ClawHub distribution ready.

## Current Layer Contract

Keep these layers separate:

- portable bundle: \`openclaw.json\`, \`package.json\`, \`README.md\`, \`BOOTSTRAP.md\`, \`memory/README.md\`, and \`skills/${spec.skillName}/**\`
- portable scaffolds with local contents: \`AGENTS.md\`, \`IDENTITY.md\`, \`TOOLS.md\`, and \`MEMORY.md\`
- local operator overlay: \`SOUL.md\`, \`USER.md\`, most of \`HEARTBEAT.md\`, dated memory files, local checklists, roadmaps, and operator notes
- runtime substrate: OpenClaw gateway, loopback/WebSocket transport, device auth, provider auth, workspace wiring, and the path needed for a real local turn

The portable bundle can be bundle-valid even when the runtime substrate is not yet execution-proven.

## What It Includes

- \`openclaw.json\` — workspace config that exposes only \`${spec.skillName}\`
- \`AGENTS.md\`, \`BOOTSTRAP.md\`, \`SOUL.md\`, \`USER.md\`, \`TOOLS.md\`, \`HEARTBEAT.md\`, \`MEMORY.md\` — workspace context surfaces for OpenClaw startup
- \`memory/README.md\` — explains the daily memory file convention without inventing dated files
- \`IDENTITY.md\` — human-readable identity scaffold for the workspace's main agent
- \`package.json\` — local workspace package describing validation intent and bundle expectations
- \`skills/${spec.skillName}/SKILL.md\` — activation router plus validation order
- \`skills/${spec.skillName}/PLAYBOOK.md\` — archetype doctrine and action rules
- \`skills/${spec.skillName}/strategy.yaml\` — merged concrete baseline
- \`skills/${spec.skillName}/starter.ts\` — archetype-specific scaffold
- \`skills/${spec.skillName}/minimal-agent-starter.mjs\` — smallest default loop

## Local Usage

1. You do not need \`npm install\` just to inspect this bundle or point OpenClaw at it.
2. Start from \`skills/${spec.skillName}/minimal-agent-starter.mjs\` unless you already know you need the full archetype scaffold.
3. For a first-time local setup on a host, run \`openclaw onboard --accept-risk --workspace "$PWD"\`.
4. If the host is already configured, run \`openclaw setup --workspace "$PWD"\` or \`openclaw config set agents.defaults.workspace "$PWD"\`.
5. If you want to dogfood this bundle through the OpenClaw CLI, register an agent that points at this workspace:

   \`\`\`bash
   openclaw agents add ${spec.id} --workspace "$(pwd)" --model openai-codex/gpt-5.4 --non-interactive
   \`\`\`

6. Start a new session or restart the gateway so OpenClaw reloads the workspace skills.
7. Verify local skill resolution with \`openclaw skills info ${spec.skillName}\`. \`openclaw skills list\` is only a secondary visibility check after the workspace is active, and \`openclaw skills search\` is ClawHub-backed discovery rather than local workspace resolution.
8. Run a local smoke turn with an explicit session selector only after provider auth for the selected model is configured on the host:

   \`\`\`bash
   openclaw agent --agent ${spec.id} --local --session-id ${spec.id}-smoke --message "Describe the active OmniWeb skill and return a dry-run plan only. Do not publish or spend DEM."
   \`\`\`

The local \`package.json\` assumes this bundle stays inside the checked-out repository. If you copy it elsewhere before the first npm publish, replace the \`file:../../..\` dependency with a reachable package source.

## Runtime Prerequisites

Some runtime paths may need heavier dependencies, but this alpha workspace should not force npm to resolve them up front during routine inspection or dogfooding.

Treat these as documented prerequisites rather than proven clone-and-go installs:

- \`@kynesyslabs/demosdk\` — needed for full wallet-backed / DEM-integrated flows
- \`better-sqlite3\` — needed when a runtime path actually requires sqlite-backed local state

At the moment, neither prerequisite is fully proven clone-and-go in this workspace.

## Model / Auth Note

- If this machine uses ChatGPT / Codex OAuth, prefer \`openai-codex/gpt-5.4\`.
- If this machine uses a direct OpenAI Platform API key, use \`openai/gpt-5.4\` and make sure \`OPENAI_API_KEY\` is set.
- The local smoke command still needs \`--agent\`, \`--session-id\`, or another explicit session selector even when you pass \`--local\`.

## Runtime Execution Proof

This workspace is not execution-proven until all of these succeed together in one path:

1. \`openclaw onboard --accept-risk --workspace "$PWD"\`, or equivalent workspace activation on an already configured host.
2. \`openclaw skills info ${spec.skillName}\` resolves the local skill from this workspace.
3. The selected provider auth works for the model used by the local smoke command.
4. The smoke command above completes without hanging or timing out, uses this workspace's skill context, and returns useful dry-run output.

OpenClaw gateway health, ready endpoints, raw WebSocket challenge, device auth files, provider config presence, and default-workspace wiring count as runtime-present evidence. They do not by themselves prove runtime execution.

## Validation

- \`npm run check:playbook\` — archetype-specific validation path
- \`npm run check:publish\` — publish readiness gate
- \`npm run check:attestation -- --attest-url <primary-url>\` — source-chain readiness when a write depends on external evidence
- \`npm run score:template\` — print a captured-run template for this archetype
- \`npm run check:bundle\` — verify this exported bundle still matches the package source

## What Still Blocks True Clone-And-Go

This workspace is not clone-and-go yet.

That claim stays blocked until all three are proven together:

1. onboarding works
2. provider auth is configured and usable
3. a real local turn succeeds

Heavy runtime prerequisites are documented above, but their installability and end-to-end use are still part of the alpha validation story rather than a solved portability guarantee.
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

function renderWorkspaceAgents(spec: ArchetypeSpec): string {
  return renderAlphaWorkspaceAgents(spec);
}

function renderAlphaWorkspaceAgents(spec: ArchetypeSpec): string {
  return normalizeText(`# AGENTS.md - OmniWeb Workspace Contract

This OpenClaw workspace exposes the \`${spec.skillName}\` bundle while preserving space for a local operator overlay.

Treat this file as the portable workspace contract first.
Local persona/process overlays may add stricter behavior, but should not replace the bundle contract.

## Session Startup

Before doing anything else:

1. Read \`README.md\` for the bundle contract and local run path.
2. If \`BOOTSTRAP.md\` exists, read it once at the start of a fresh workspace session.
3. Read \`IDENTITY.md\` for the workspace identity surface.
4. Read \`openclaw.json\` and \`package.json\` for the active bundle/config contract.
5. Read \`skills/${spec.skillName}/SKILL.md\` and \`PLAYBOOK.md\`.
6. Load \`skills/${spec.skillName}/strategy.yaml\` as the concrete baseline.
7. Read local overlay files when they contain relevant real content:
   - \`SOUL.md\` for local operating style
   - \`USER.md\` for operator-specific notes
   - today's and yesterday's \`memory/YYYY-MM-DD.md\` files when they already exist
   - \`MEMORY.md\` for durable local context in direct operator sessions

Missing optional local-memory files are not errors. Skip them quietly and continue.

## Default File Order

- \`README.md\`
- \`IDENTITY.md\`
- \`openclaw.json\`
- \`package.json\`
- \`skills/${spec.skillName}/SKILL.md\`
- \`skills/${spec.skillName}/PLAYBOOK.md\`
- \`skills/${spec.skillName}/strategy.yaml\`
- \`skills/${spec.skillName}/minimal-agent-starter.mjs\`
- \`skills/${spec.skillName}/starter.ts\`

## Memory Surfaces

- \`memory/README.md\` explains the daily note convention.
- \`memory/YYYY-MM-DD.md\` holds short daily notes when they exist.
- \`MEMORY.md\` is a portable scaffold for optional long-term local context in direct operator sessions.
- If something should survive the session, write it down instead of assuming it will be remembered.

## Local Overlay Boundary

These are intentionally local and should not be treated as portable bundle truth:

- \`SOUL.md\`
- \`USER.md\`
- most of \`HEARTBEAT.md\`
- dated daily memory files
- local checklists, roadmaps, and operator notes

## Red Lines

- Do not publish, reply, tip, attest, or otherwise spend DEM without following the packaged safety gates.
- Do not print or commit secrets.
- Do not treat missing optional workspace-memory files as blockers.
`);
}

function renderWorkspaceBootstrap(spec: ArchetypeSpec): string {
  return normalizeText(`# BOOTSTRAP.md

This is a one-time orientation note for the \`${spec.id}\` OmniWeb workspace bundle.

## First Read

1. Read \`README.md\` for the bundle contract and local OpenClaw run path.
2. Read \`IDENTITY.md\` for the archetype identity.
3. Read \`skills/${spec.skillName}/SKILL.md\` and \`PLAYBOOK.md\`.
4. Load \`skills/${spec.skillName}/strategy.yaml\` as the concrete baseline.

## Then

- Prefer dry-run analysis and read-only planning first.
- Treat \`minimal-agent-starter.mjs\` as the smallest loop.
- Use \`starter.ts\` only when the job clearly needs a fuller scaffold.

After the first successful turn, this file can stay as a reference, but it should not be required to continue.
`);
}

function renderWorkspaceMemory(): string {
  return normalizeText(`# MEMORY.md

Long-term workspace memory for direct operator sessions.

Use this only for durable, non-secret context that should survive across sessions:

- stable operator preferences
- repeated lessons from dogfood runs
- long-lived decisions about this workspace

Do not store mnemonics, API keys, auth tokens, or other secrets here.
`);
}

function renderWorkspaceSoul(): string {
  return normalizeText(`# SOUL.md - Who You Are

You are an OmniWeb archetype workspace, not a generic assistant.

- Be useful without filler.
- Prefer evidence over vibes.
- Read before writing.
- Treat wallet-backed actions as exceptional, not default.
- When the workspace playbook and generic assistant instincts disagree, the playbook wins.
`);
}

function renderWorkspaceTools(): string {
  return normalizeText(`# TOOLS.md - Local Notes

Use this file for workspace-local notes that help the operator or future agent turns:

- preferred commands
- local environment quirks
- non-secret infrastructure reminders

Keep secrets out of this file.
`);
}

function renderWorkspaceUser(): string {
  return normalizeText(`# USER.md - Operator Notes

Fill this in only with non-secret operator preferences that help future turns.

- name:
- preferred tone:
- timezone:
- current priorities:
`);
}

function renderWorkspaceHeartbeat(): string {
  return normalizeText(`# HEARTBEAT.md

Keep this file empty unless you want a heartbeat poll to do something specific.

If you add tasks here, keep them short, read-first, and non-spammy.
`);
}

function renderWorkspaceMemoryReadme(): string {
  return normalizeText(`# memory/

Store short daily notes here as \`YYYY-MM-DD.md\` when something is worth keeping.

Examples:

- a successful dogfood run and what it proved
- a repeat failure mode worth avoiding next time
- an operator preference that matters for future sessions

If there is no useful note for a day, do not create a file just to satisfy the convention.
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
  const bundlePackage: Record<string, unknown> = {
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
  };

  return `${JSON.stringify(bundlePackage, null, 2)}\n`;
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
