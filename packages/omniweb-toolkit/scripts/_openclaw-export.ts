#!/usr/bin/env -S bunx tsx

export {
  buildOpenClawMetadata,
  getArchetypeSpec,
  isArchetype,
  OPENCLAW_EXPORT_ROOT,
  SUPPORTED_ARCHETYPES,
} from "./openclaw-export/specs.js";
export {
  buildOpenClawExport,
  rewriteBundleAgentImport,
  rewriteBundleMinimalStarterImport,
  writeOpenClawExport,
} from "./openclaw-export/builder.js";
export {
  collectTextFiles,
  extractRelativeMarkdownLinks,
  normalizeExportRelativePath,
  normalizePathSeparators,
  parseFrontmatter,
} from "./openclaw-export/collectors.js";
export type {
  Archetype,
  ArchetypeSpec,
  ExportedFile,
  OpenClawMetadata,
} from "./openclaw-export/types.js";
