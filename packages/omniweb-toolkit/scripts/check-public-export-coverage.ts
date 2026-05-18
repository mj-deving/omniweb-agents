#!/usr/bin/env npx tsx
/**
 * check-public-export-coverage.ts — Ensure package exports have deterministic consumer coverage.
 */

import { resolve } from "node:path";
import { buildToolkitCodebaseReachabilityReport } from "../src/codebase-reachability-inventory.js";
import { PACKAGE_ROOT } from "./_shared.js";

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
