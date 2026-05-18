import { describe, expect, it } from "vitest";
import { buildToolkitCodebaseReachabilityReport } from "../../packages/omniweb-toolkit/src/codebase-reachability-inventory.js";

describe("public export coverage", () => {
  it("keeps every package export tied to deterministic consumer evidence", () => {
    const report = buildToolkitCodebaseReachabilityReport({
      repoRoot: process.cwd(),
      packageDir: "packages/omniweb-toolkit",
      now: new Date("2026-05-18T18:15:00.000Z"),
    });

    expect(report.packageExports.map((entry) => entry.exportPath).sort()).toEqual([
      ".",
      "./agent",
      "./research-agent-minimal",
      "./runtime",
      "./types",
      "./write",
    ]);
    for (const entry of report.packageExports) {
      expect(entry).toMatchObject({
        sourceExists: true,
        coveredByTests: true,
      });
      expect(entry.coverageEvidence.length).toBeGreaterThan(0);
    }
    expect(report.summary.publicExportedUncovered).not.toContain("./research-agent-minimal");
  });
});
