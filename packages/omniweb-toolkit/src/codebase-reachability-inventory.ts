import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

export type ToolkitCodebaseSurfaceKind =
  | "source"
  | "script"
  | "eval"
  | "example"
  | "asset"
  | "test"
  | "doc"
  | "package_export";

export type ToolkitCodebaseReachabilityClassification =
  | "public_exported_tested"
  | "public_exported_uncovered"
  | "internal_reachable"
  | "scripts_only"
  | "docs_only"
  | "test_only"
  | "duplicate_or_superseded"
  | "stale_dead_orphaned"
  | "blocked";

export interface ToolkitCodebaseSurfaceRecord {
  path: string;
  kind: ToolkitCodebaseSurfaceKind;
  classification: ToolkitCodebaseReachabilityClassification;
  publicEntrypoint: boolean;
  publicReachable: boolean;
  importedBy: string[];
  imports: string[];
  referencedByTests: string[];
  referencedByScripts: string[];
  referencedByDocs: string[];
  notes: string[];
}

export interface ToolkitCodebaseReachabilityReport {
  generatedAt: string;
  source: {
    package: "omniweb-toolkit";
    purpose: "codebase-reachability-inventory";
    deletesCode: false;
    noSpend: true;
    noRelease: true;
  };
  packageExports: {
    exportPath: string;
    sourcePath: string;
    distPath: string;
    sourceExists: boolean;
    coveredByTests: boolean;
    coverageEvidence: string[];
  }[];
  surfaces: ToolkitCodebaseSurfaceRecord[];
  summary: {
    ok: boolean;
    totalSurfaces: number;
    byClassification: Record<ToolkitCodebaseReachabilityClassification, number>;
    publicExportedUncovered: string[];
    staleDeadOrOrphaned: string[];
    scriptsOnly: string[];
    docsOnly: string[];
    testOnly: string[];
    duplicateOrSuperseded: string[];
    blocked: string[];
    nextBeads: string[];
  };
}

export interface BuildToolkitCodebaseReachabilityOptions {
  repoRoot: string;
  packageDir?: string;
  now?: Date;
}

export const TOOLKIT_CODEBASE_REACHABILITY_CLASSIFICATIONS: ToolkitCodebaseReachabilityClassification[] = [
  "public_exported_tested",
  "public_exported_uncovered",
  "internal_reachable",
  "scripts_only",
  "docs_only",
  "test_only",
  "duplicate_or_superseded",
  "stale_dead_orphaned",
  "blocked",
];

export const TOOLKIT_CODEBASE_REACHABILITY_NEXT_BEADS = [
  "omniweb-agents-spectrum.3",
  "omniweb-agents-spectrum.4",
  "omniweb-agents-spectrum.5",
  "omniweb-agents-spectrum.6",
  "omniweb-agents-spectrum.7",
  "omniweb-agents-spectrum.8",
  "omniweb-agents-spectrum.9",
  "omniweb-agents-spectrum.10",
];

export const PACKAGE_EXPORT_COVERAGE_EVIDENCE: Record<string, string[]> = {
  ".": [
    "tests/packages/omniweb-toolkit.test.ts",
    "tests/toolkit/index.test.ts",
    "tests/packages/transport-consumers.test.ts",
    "tests/packages/read-profile-consumers.test.ts",
    "tests/packages/chat-webhook-consumers.test.ts",
    "tests/packages/market-read-consumers.test.ts",
    "tests/packages/market-write-intents.test.ts",
    "packages/omniweb-toolkit/scripts/check-package-consumer.ts",
    "packages/omniweb-toolkit/scripts/check-transport-consumers.ts",
    "packages/omniweb-toolkit/scripts/check-read-profile-consumers.ts",
    "packages/omniweb-toolkit/scripts/check-chat-webhook-consumers.ts",
    "packages/omniweb-toolkit/scripts/check-market-read-consumers.ts",
    "packages/omniweb-toolkit/scripts/check-market-write-intents.ts",
    "packages/omniweb-toolkit/scripts/check-consumer-spectrum-tarball.ts",
    "packages/omniweb-toolkit/examples/read-feed.mjs",
  ],
  "./agent": [
    "tests/packages/toolkit-capability-manifest.test.ts",
    "tests/packages/consumer-spectrum-inventory.test.ts",
    "packages/omniweb-toolkit/scripts/check-colony-operator-official-skill-coverage.ts",
    "packages/omniweb-toolkit/scripts/check-consumer-spectrum-tarball.ts",
  ],
  "./types": [
    "tests/toolkit/types.test.ts",
    "packages/omniweb-toolkit/scripts/check-package-consumer.ts",
    "packages/omniweb-toolkit/scripts/check-consumer-spectrum-tarball.ts",
  ],
  "./runtime": [
    "tests/packages/runtime-balance-truth.test.ts",
    "tests/packages/toolkit-action-admissibility.test.ts",
    "packages/omniweb-toolkit/examples/write-readiness.mjs",
    "packages/omniweb-toolkit/scripts/check-consumer-spectrum-tarball.ts",
  ],
  "./write": [
    "tests/packages/market-write-proof.test.ts",
    "tests/packages/social-write-proof.test.ts",
    "packages/omniweb-toolkit/scripts/check-write-surface-sweep.ts",
  ],
  "./research-agent-minimal": [
    "packages/omniweb-toolkit/scripts/check-research-agent-consumer.ts",
    "packages/omniweb-toolkit/examples/research-agent-minimal.mjs",
    "packages/omniweb-toolkit/references/minimal-consumer-artifact.md",
  ],
};

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const DOC_EXTENSIONS = new Set([".md", ".mdx"]);

export function buildToolkitCodebaseReachabilityReport(
  options: BuildToolkitCodebaseReachabilityOptions,
): ToolkitCodebaseReachabilityReport {
  const repoRoot = resolve(options.repoRoot);
  const packageDir = resolve(options.packageDir ?? join(repoRoot, "packages/omniweb-toolkit"));
  const srcDir = join(packageDir, "src");
  const packageJson = readJson(join(packageDir, "package.json")) as {
    exports?: Record<string, { import?: string; types?: string }>;
  };
  const packageExports = Object.entries(packageJson.exports ?? {}).map(([exportPath, entry]) => {
    const distPath = String(entry.import ?? "");
    const sourcePath = distPathToSourcePath(distPath);
    const absoluteSource = join(packageDir, sourcePath);
    return {
      exportPath,
      sourcePath,
      distPath,
      sourceExists: existsSync(absoluteSource),
      coveredByTests: false,
      coverageEvidence: [],
    };
  });

  const sourceFiles = listFiles(srcDir, SOURCE_EXTENSIONS)
    .map((path) => toRepoPath(repoRoot, path))
    .sort();
  const scriptFiles = listFiles(join(packageDir, "scripts"), SOURCE_EXTENSIONS)
    .map((path) => toRepoPath(repoRoot, path))
    .sort();
  const evalFiles = listFiles(join(packageDir, "evals"), SOURCE_EXTENSIONS)
    .map((path) => toRepoPath(repoRoot, path))
    .sort();
  const exampleFiles = listFiles(join(packageDir, "examples"), SOURCE_EXTENSIONS)
    .map((path) => toRepoPath(repoRoot, path))
    .sort();
  const assetFiles = listFiles(join(packageDir, "assets"), SOURCE_EXTENSIONS)
    .map((path) => toRepoPath(repoRoot, path))
    .sort();
  const testFiles = [
    ...listFiles(join(repoRoot, "tests/packages"), SOURCE_EXTENSIONS),
    ...listFiles(join(repoRoot, "tests/toolkit"), SOURCE_EXTENSIONS),
  ].map((path) => toRepoPath(repoRoot, path)).sort();
  const docFiles = [
    ...listFiles(join(packageDir, "docs"), DOC_EXTENSIONS),
    ...listFiles(join(packageDir, "references"), DOC_EXTENSIONS),
    join(packageDir, "README.md"),
    join(packageDir, "SKILL.md"),
    join(packageDir, "TOOLKIT.md"),
    join(packageDir, "GUIDE.md"),
  ].filter(existsSync).map((path) => toRepoPath(repoRoot, path)).sort();

  const importGraph = buildImportGraph(repoRoot, [
    ...sourceFiles,
    ...scriptFiles,
    ...evalFiles,
    ...assetFiles,
    ...testFiles,
  ]);
  const reverseImports = reverseGraph(importGraph);
  const publicEntrypoints = new Set(
    packageExports
      .filter((entry) => entry.sourceExists)
      .map((entry) => toRepoPath(repoRoot, join(packageDir, entry.sourcePath))),
  );
  const publicReachable = reachableFrom(publicEntrypoints, importGraph);
  const testReferences = buildTextReferences(repoRoot, testFiles, sourceFiles);
  const scriptReferences = buildTextReferences(repoRoot, [...scriptFiles, ...evalFiles, ...exampleFiles, ...assetFiles], sourceFiles);
  const docReferences = buildTextReferences(repoRoot, docFiles, sourceFiles);

  const exportCoverage = packageExports.map((entry) => {
    const coverageEvidence = packageExportCoverageEvidence({
      entry,
      repoRoot,
    });
    return { ...entry, coveredByTests: coverageEvidence.length > 0, coverageEvidence };
  });
  const coveredPublicEntrypoints = new Set(
    exportCoverage
      .filter((entry) => entry.sourceExists && entry.coveredByTests)
      .map((entry) => toRepoPath(repoRoot, join(packageDir, entry.sourcePath))),
  );
  const coveredPublicReachable = reachableFrom(coveredPublicEntrypoints, importGraph);

  const surfaces: ToolkitCodebaseSurfaceRecord[] = [
    ...sourceFiles.map((path) => classifySourceSurface({
      path,
      publicEntrypoints,
      publicReachable,
      coveredPublicReachable,
      importGraph,
      reverseImports,
      testReferences,
      scriptReferences,
      docReferences,
    })),
    ...scriptFiles.map((path) => classifyNonSourceSurface(path, "script", importGraph, reverseImports)),
    ...evalFiles.map((path) => classifyNonSourceSurface(path, "eval", importGraph, reverseImports)),
    ...exampleFiles.map((path) => classifyNonSourceSurface(path, "example", importGraph, reverseImports)),
    ...assetFiles.map((path) => classifyNonSourceSurface(path, "asset", importGraph, reverseImports)),
    ...testFiles.map((path) => classifyNonSourceSurface(path, "test", importGraph, reverseImports)),
    ...docFiles.map((path) => classifyDocSurface(path)),
    ...exportCoverage.map((entry) => ({
      path: entry.exportPath,
      kind: "package_export" as const,
      classification: entry.sourceExists
        ? entry.coveredByTests ? "public_exported_tested" as const : "public_exported_uncovered" as const
        : "blocked" as const,
      publicEntrypoint: true,
      publicReachable: entry.sourceExists,
      importedBy: [],
      imports: entry.sourceExists ? [entry.sourcePath] : [],
      referencedByTests: [],
      referencedByScripts: [],
      referencedByDocs: [],
      notes: entry.sourceExists
        ? [`Package export resolves to ${entry.sourcePath}.`, ...entry.coverageEvidence.map((item) => `Coverage: ${item}.`)]
        : [`Package export target ${entry.distPath} has no source counterpart.`],
    })),
  ].sort((left, right) => left.path.localeCompare(right.path));

  const byClassification = emptyReachabilityCounts();
  for (const surface of surfaces) {
    byClassification[surface.classification] += 1;
  }

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    source: {
      package: "omniweb-toolkit",
      purpose: "codebase-reachability-inventory",
      deletesCode: false,
      noSpend: true,
      noRelease: true,
    },
    packageExports: exportCoverage,
    surfaces,
    summary: {
      ok: surfaces.length > 0 && exportCoverage.every((entry) => entry.sourceExists),
      totalSurfaces: surfaces.length,
      byClassification,
      publicExportedUncovered: surfacesByClassification(surfaces, "public_exported_uncovered"),
      staleDeadOrOrphaned: surfacesByClassification(surfaces, "stale_dead_orphaned"),
      scriptsOnly: surfacesByClassification(surfaces, "scripts_only"),
      docsOnly: surfacesByClassification(surfaces, "docs_only"),
      testOnly: surfacesByClassification(surfaces, "test_only"),
      duplicateOrSuperseded: surfacesByClassification(surfaces, "duplicate_or_superseded"),
      blocked: surfacesByClassification(surfaces, "blocked"),
      nextBeads: [...TOOLKIT_CODEBASE_REACHABILITY_NEXT_BEADS],
    },
  };
}

function classifySourceSurface(input: {
  path: string;
  publicEntrypoints: Set<string>;
  publicReachable: Set<string>;
  coveredPublicReachable: Set<string>;
  importGraph: Map<string, string[]>;
  reverseImports: Map<string, string[]>;
  testReferences: Map<string, string[]>;
  scriptReferences: Map<string, string[]>;
  docReferences: Map<string, string[]>;
}): ToolkitCodebaseSurfaceRecord {
  const importedBy = input.reverseImports.get(input.path) ?? [];
  const imports = input.importGraph.get(input.path) ?? [];
  const referencedByTests = input.testReferences.get(input.path) ?? [];
  const referencedByScripts = input.scriptReferences.get(input.path) ?? [];
  const referencedByDocs = input.docReferences.get(input.path) ?? [];
  const publicEntrypoint = input.publicEntrypoints.has(input.path);
  const publicReachable = input.publicReachable.has(input.path);
  const coveredByPublicEntrypoint = input.coveredPublicReachable.has(input.path);
  const duplicate = looksDuplicateOrSuperseded(input.path);
  const deterministicCoverage = referencedByTests.length > 0 || referencedByScripts.length > 0 || coveredByPublicEntrypoint;
  const classification: ToolkitCodebaseReachabilityClassification = duplicate
    ? "duplicate_or_superseded"
    : publicReachable
      ? deterministicCoverage ? "public_exported_tested" : "public_exported_uncovered"
      : importedBy.length > 0
        ? "internal_reachable"
        : referencedByScripts.length > 0
          ? "scripts_only"
          : referencedByTests.length > 0
            ? "test_only"
            : referencedByDocs.length > 0
              ? "docs_only"
              : "stale_dead_orphaned";

  return {
    path: input.path,
    kind: "source",
    classification,
    publicEntrypoint,
    publicReachable,
    importedBy,
    imports,
    referencedByTests,
    referencedByScripts,
    referencedByDocs,
    notes: buildSourceNotes(classification, publicEntrypoint, publicReachable, coveredByPublicEntrypoint),
  };
}

function classifyNonSourceSurface(
  path: string,
  kind: Exclude<ToolkitCodebaseSurfaceKind, "source" | "doc" | "package_export">,
  importGraph: Map<string, string[]>,
  reverseImports: Map<string, string[]>,
): ToolkitCodebaseSurfaceRecord {
  return {
    path,
    kind,
    classification: kind === "test" ? "test_only" : "scripts_only",
    publicEntrypoint: false,
    publicReachable: false,
    importedBy: reverseImports.get(path) ?? [],
    imports: importGraph.get(path) ?? [],
    referencedByTests: [],
    referencedByScripts: [],
    referencedByDocs: [],
    notes: [kind === "test" ? "Test-only validation surface." : `${kind} surface; not package API.`],
  };
}

function classifyDocSurface(path: string): ToolkitCodebaseSurfaceRecord {
  return {
    path,
    kind: "doc",
    classification: "docs_only",
    publicEntrypoint: false,
    publicReachable: false,
    importedBy: [],
    imports: [],
    referencedByTests: [],
    referencedByScripts: [],
    referencedByDocs: [],
    notes: ["Documentation/reference surface; classify separately from executable code."],
  };
}

function packageExportCoverageEvidence(input: {
  entry: ToolkitCodebaseReachabilityReport["packageExports"][number];
  repoRoot: string;
}): string[] {
  const evidence = new Set<string>();
  for (const ref of PACKAGE_EXPORT_COVERAGE_EVIDENCE[input.entry.exportPath] ?? []) {
    if (existsSync(resolve(input.repoRoot, ref))) evidence.add(ref);
  }
  return Array.from(evidence).sort();
}

function listFiles(root: string, extensions: Set<string>): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const absolute = join(root, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      out.push(...listFiles(absolute, extensions));
    } else if (extensions.has(extname(entry))) {
      out.push(absolute);
    }
  }
  return out;
}

function buildImportGraph(repoRoot: string, files: string[]): Map<string, string[]> {
  const fileSet = new Set(files);
  const graph = new Map<string, string[]>();
  for (const file of files) {
    const absolute = resolve(repoRoot, file);
    const body = readFileSync(absolute, "utf8");
    graph.set(file, Array.from(new Set(extractRelativeImports(body)
      .map((specifier) => resolveImport(repoRoot, file, specifier, fileSet))
      .filter((resolved): resolved is string => Boolean(resolved))))
      .sort());
  }
  return graph;
}

function extractRelativeImports(body: string): string[] {
  const specs: string[] = [];
  const importPattern = /(?:import|export)\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(body)) !== null) {
    const specifier = match[1] ?? match[2];
    if (specifier?.startsWith(".")) specs.push(specifier);
  }
  return specs;
}

function resolveImport(repoRoot: string, importer: string, specifier: string, fileSet: Set<string>): string | null {
  const importerDir = dirname(resolve(repoRoot, importer));
  const base = resolve(importerDir, specifier);
  const candidates = [
    base,
    base.replace(/\.js$/, ".ts"),
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
  ].map((path) => toRepoPath(repoRoot, path));
  return candidates.find((path) => fileSet.has(path)) ?? null;
}

function reverseGraph(graph: Map<string, string[]>): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const [from, imports] of graph.entries()) {
    for (const target of imports) {
      reverse.set(target, [...(reverse.get(target) ?? []), from].sort());
    }
  }
  return reverse;
}

function reachableFrom(roots: Set<string>, graph: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const next of graph.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

function buildTextReferences(repoRoot: string, referenceFiles: string[], targetFiles: string[]): Map<string, string[]> {
  const references = new Map<string, string[]>();
  const bodies = referenceFiles.map((file) => [file, readFileSync(resolve(repoRoot, file), "utf8")] as const);
  for (const target of targetFiles) {
    const stem = basename(target, extname(target));
    const modulePath = target.replace(/^packages\/omniweb-toolkit\/src\//, "").replace(/\.ts$/, "");
    for (const [file, body] of bodies) {
      if (body.includes(target) || body.includes(modulePath) || body.includes(stem)) {
        references.set(target, [...(references.get(target) ?? []), file].sort());
      }
    }
  }
  return references;
}

function distPathToSourcePath(distPath: string): string {
  return distPath.replace(/^\.\//, "").replace(/^dist\//, "src/").replace(/\.js$/, ".ts");
}

function looksDuplicateOrSuperseded(path: string): boolean {
  const name = basename(path, extname(path));
  return /\b(legacy|deprecated|superseded)\b/.test(name);
}

function buildSourceNotes(
  classification: ToolkitCodebaseReachabilityClassification,
  publicEntrypoint: boolean,
  publicReachable: boolean,
  coveredByPublicEntrypoint: boolean,
): string[] {
  if (classification === "public_exported_uncovered") {
    return [publicEntrypoint ? "Package entrypoint lacks a direct test reference." : "Public barrel reachability lacks a direct test reference."];
  }
  if (classification === "stale_dead_orphaned") return ["No import, test, script, or doc reference was found; cleanup bead must verify before deletion."];
  if (classification === "duplicate_or_superseded") return ["Name suggests duplicate/superseded status; cleanup bead must prove before deletion."];
  if (coveredByPublicEntrypoint) return ["Reachable from a package export with deterministic consumer coverage."];
  if (publicReachable) return ["Reachable from a package export."];
  return ["Reachability classified by local static references."];
}

function emptyReachabilityCounts(): Record<ToolkitCodebaseReachabilityClassification, number> {
  return Object.fromEntries(
    TOOLKIT_CODEBASE_REACHABILITY_CLASSIFICATIONS.map((classification) => [classification, 0]),
  ) as Record<ToolkitCodebaseReachabilityClassification, number>;
}

function surfacesByClassification(
  surfaces: ToolkitCodebaseSurfaceRecord[],
  classification: ToolkitCodebaseReachabilityClassification,
): string[] {
  return surfaces.filter((surface) => surface.classification === classification).map((surface) => surface.path);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function toRepoPath(repoRoot: string, path: string): string {
  return relative(repoRoot, resolve(path)).replaceAll("\\", "/");
}
