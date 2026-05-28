import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getArchetypeSpec, SUPPORTED_ARCHETYPES } from "./specs.js";
import type { Archetype, ExportedFile } from "./types.js";
import { normalizeText, readPackageFile } from "./text.js";
import {
  buildMergedStrategy,
  renderBundlePackageJson,
  renderBundleReadme,
  renderIdentity,
  renderOpenClawConfig,
  renderRootReadme,
  renderSkill,
  renderWorkspaceAgents,
  renderWorkspaceBootstrap,
  renderWorkspaceHeartbeat,
  renderWorkspaceMemory,
  renderWorkspaceMemoryReadme,
  renderWorkspaceSoul,
  renderWorkspaceTools,
  renderWorkspaceUser,
  rewritePlaybookLinks,
} from "./renderers.js";

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
    const checkedInBundleFiles = new Set(spec.checkedInBundleFiles ?? []);
    const bundleFileContent = (relativePath: string): string =>
      readPackageFile(`agents/openclaw/${bundleDir}/${relativePath}`);
    const handledBundleFiles = new Set([
      "AGENTS.md",
      "README.md",
      "package.json",
      `skills/${spec.skillName}/SKILL.md`,
      `skills/${spec.skillName}/PLAYBOOK.md`,
      `skills/${spec.skillName}/minimal-agent-starter.mjs`,
      `skills/${spec.skillName}/starter.ts`,
    ]);

    files.push(
      {
        path: `${bundleDir}/README.md`,
        content: checkedInBundleFiles.has("README.md") ? bundleFileContent("README.md") : renderBundleReadme(spec),
      },
      {
        path: `${bundleDir}/AGENTS.md`,
        content: checkedInBundleFiles.has("AGENTS.md") ? bundleFileContent("AGENTS.md") : renderWorkspaceAgents(spec),
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
        content: checkedInBundleFiles.has("package.json") ? bundleFileContent("package.json") : renderBundlePackageJson(spec),
      },
      {
        path: `${skillDir}/SKILL.md`,
        content: checkedInBundleFiles.has(`skills/${spec.skillName}/SKILL.md`) ? bundleFileContent(`skills/${spec.skillName}/SKILL.md`) : renderSkill(spec),
      },
      {
        path: `${skillDir}/PLAYBOOK.md`,
        content: checkedInBundleFiles.has(`skills/${spec.skillName}/PLAYBOOK.md`) ? bundleFileContent(`skills/${spec.skillName}/PLAYBOOK.md`) : playbookText,
      },
      {
        path: `${skillDir}/strategy.yaml`,
        content: strategyText,
      },
      {
        path: `${skillDir}/minimal-agent-starter.mjs`,
        content: checkedInBundleFiles.has(`skills/${spec.skillName}/minimal-agent-starter.mjs`) ? bundleFileContent(`skills/${spec.skillName}/minimal-agent-starter.mjs`) : normalizeText(minimalStarterText),
      },
      {
        path: `${skillDir}/starter.ts`,
        content: checkedInBundleFiles.has(`skills/${spec.skillName}/starter.ts`) ? bundleFileContent(`skills/${spec.skillName}/starter.ts`) : normalizeText(starterText),
      },
    );

    for (const relativePath of checkedInBundleFiles) {
      if (handledBundleFiles.has(relativePath)) continue;
      files.push({
        path: `${bundleDir}/${relativePath}`,
        content: bundleFileContent(relativePath),
      });
    }
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
export function writeOpenClawExport(
  outputDir: string,
  archetypes: readonly Archetype[] = SUPPORTED_ARCHETYPES,
): ExportedFile[] {
  const files = buildOpenClawExport(archetypes);

  mkdirSync(outputDir, { recursive: true });
  rmSync(resolve(outputDir, "README.md"), { force: true });
  for (const archetype of archetypes) {
    rmSync(resolve(outputDir, archetype), { recursive: true, force: true });
  }

  for (const file of files) {
    const targetPath = resolve(outputDir, file.path);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, file.content, "utf8");
  }

  return files;
}
