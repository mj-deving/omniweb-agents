import { describe, expect, it } from "vitest";
import {
  buildToolkitCodebaseReachabilityReport,
  TOOLKIT_CODEBASE_REACHABILITY_CLASSIFICATIONS,
} from "../../packages/omniweb-toolkit/src/codebase-reachability-inventory.js";

describe("codebase reachability inventory", () => {
  it("classifies package code, checks, docs, and exports without deleting code", () => {
    const report = buildToolkitCodebaseReachabilityReport({
      repoRoot: process.cwd(),
      packageDir: "packages/omniweb-toolkit",
      now: new Date("2026-05-18T18:00:00.000Z"),
    });

    expect(report.generatedAt).toBe("2026-05-18T18:00:00.000Z");
    expect(report.source).toMatchObject({
      package: "omniweb-toolkit",
      purpose: "codebase-reachability-inventory",
      deletesCode: false,
      noSpend: true,
      noRelease: true,
    });
    expect(report.summary.ok).toBe(true);
    expect(report.summary.totalSurfaces).toBeGreaterThan(100);
    expect(Object.keys(report.summary.byClassification).sort()).toEqual(
      [...TOOLKIT_CODEBASE_REACHABILITY_CLASSIFICATIONS].sort(),
    );
    expect(report.packageExports.map((entry) => entry.exportPath)).toEqual(expect.arrayContaining([
      ".",
      "./agent",
      "./runtime",
      "./write",
    ]));
    expect(report.packageExports.every((entry) => entry.sourceExists)).toBe(true);
    expect(report.packageExports.every((entry) => entry.coveredByTests)).toBe(true);
    expect(report.packageExports.find((entry) => entry.exportPath === "./research-agent-minimal")?.coverageEvidence).toEqual(
      expect.arrayContaining([
        "packages/omniweb-toolkit/scripts/check-research-agent-consumer.ts",
      ]),
    );
    expect(report.surfaces).toContainEqual(expect.objectContaining({
      path: "packages/omniweb-toolkit/src/index.ts",
      kind: "source",
      publicEntrypoint: true,
      publicReachable: true,
    }));
    expect(report.surfaces).toContainEqual(expect.objectContaining({
      path: "packages/omniweb-toolkit/scripts/check-codebase-reachability.ts",
      kind: "script",
      classification: "scripts_only",
    }));
    expect(report.surfaces).toContainEqual(expect.objectContaining({
      path: "tests/packages/codebase-reachability-inventory.test.ts",
      kind: "test",
      classification: "test_only",
    }));
    expect(report.summary.nextBeads).toEqual(expect.arrayContaining([
      "omniweb-agents-spectrum.3",
      "omniweb-agents-spectrum.10",
    ]));
  });
});
