#!/usr/bin/env -S bunx tsx
/**
 * check-public-export-coverage.ts — Ensure package exports have deterministic consumer coverage.
 */

import { resolve } from "node:path";
import { hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

type CodebaseReachabilityReport = {
  packageExports: Array<{ coveredByTests: boolean; exportPath: string }>;
};

const args = process.argv.slice(2);
if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: bun ./scripts/check-public-export-coverage.ts

Ensure package exports have deterministic consumer coverage.

Options:
  --help, -h  Show this help`);
  process.exit(0);
}
if (args.length > 0) {
  console.error(`Error: unsupported arguments: ${args.join(" ")}`);
  process.exit(2);
}

const buildToolkitCodebaseReachabilityReport = await loadPackageExport<
  (input: { repoRoot: string; packageDir: string }) => CodebaseReachabilityReport
>(
  "../dist/codebase-reachability-inventory.js",
  "../src/codebase-reachability-inventory.js",
  "buildToolkitCodebaseReachabilityReport",
);

const repoRoot = resolve(PACKAGE_ROOT, "../..");
const report = buildToolkitCodebaseReachabilityReport({
  repoRoot,
  packageDir: PACKAGE_ROOT,
});
const uncovered = report.packageExports.filter((entry) => !entry.coveredByTests);
const output = {
  checkedAt: new Date().toISOString(),
  ok: uncovered.length === 0,
  packageExports: report.packageExports,
  uncovered: uncovered.map((entry) => entry.exportPath),
  contract: {
    ownerBead: "omniweb-agents-spectrum.4",
    noRelease: true,
    publicRegistryProof: false,
  },
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 1);
