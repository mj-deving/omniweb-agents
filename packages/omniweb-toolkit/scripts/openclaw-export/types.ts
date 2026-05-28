export type Archetype = "research-agent" | "market-analyst" | "engagement-optimizer";

export interface ExportedFile {
  path: string;
  content: string;
}

export interface ArchetypeSpec {
  id: Archetype;
  displayName: string;
  skillName: string;
  emoji: string;
  theme: string;
  summary: string;
  legacySummary: string;
  legacyBundleNote: string;
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
  checkedInBundleFiles?: string[];
}

export interface OpenClawMetadata {
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
