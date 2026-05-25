#!/usr/bin/env npx tsx
/**
 * check-codebase-reachability.ts — Static no-delete inventory for toolkit reachability and ballast.
 *
 * Output: JSON report to stdout, and optionally to --out.
 * Exit codes: 0 = inventory complete, 1 = package export target missing, 2 = invalid args.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { getStringArg, hasFlag, loadPackageExport, PACKAGE_ROOT } from "./_shared.js";

type CodebaseReachabilityReport = {
  summary: { ok: boolean };
  packageExports: unknown[];
};

const buildToolkitCodebaseReachabilityReport = await loadPackageExport<
  (input: { repoRoot: string; packageDir: string }) => CodebaseReachabilityReport
>(
  "../dist/codebase-reachability-inventory.js",
  "../src/codebase-reachability-inventory.js",
  "buildToolkitCodebaseReachabilityReport",
);

const args = process.argv.slice(2);

if (hasFlag(args, "--help", "-h")) {
  console.log(`Usage: npx tsx scripts/check-codebase-reachability.ts [--out PATH]

Options:
  --out PATH  Write the JSON report to a file as well as stdout
  --help, -h  Show this help

Contract:
  - no deletion, no spend, no npm release
  - classifies package exports, source modules, scripts, evals, examples, assets, tests, and package docs
  - records public exported coverage, internal reachability, scripts-only/docs-only/test-only surfaces, and cleanup candidates

Exit codes: 0 = inventory complete, 1 = package export target missing, 2 = invalid args`);
  process.exit(0);
}

const allowedArgsWithValue = new Set(["--out"]);
const allowedFlags = new Set(["--help", "-h"]);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (allowedFlags.has(arg)) continue;
  if (allowedArgsWithValue.has(arg)) {
    index += 1;
    continue;
  }
  console.error(`Error: unsupported argument: ${arg}`);
  process.exit(2);
}

const outPath = getStringArg(args, "--out");
const repoRoot = resolve(PACKAGE_ROOT, "../..");
const report = buildToolkitCodebaseReachabilityReport({
  repoRoot,
  packageDir: PACKAGE_ROOT,
});
const output = JSON.stringify({
  ...report,
  contract: {
    ownerBead: "omniweb-agents-spectrum.2",
    deletesCode: false,
    liveMutation: false,
    spendsDem: false,
    npmRelease: false,
  },
}, null, 2);

if (outPath) {
  const absoluteOut = resolve(process.cwd(), outPath);
  mkdirSync(dirname(absoluteOut), { recursive: true });
  writeFileSync(absoluteOut, `${output}\n`);
}

console.log(output);
process.exit(report.summary.ok ? 0 : 1);
