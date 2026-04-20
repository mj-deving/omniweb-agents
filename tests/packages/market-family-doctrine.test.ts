import { describe, expect, it } from "vitest";
import {
  clearMarketFamilyDoctrineCacheForTests,
  loadOracleDivergenceDoctrine,
} from "../../packages/omniweb-toolkit/src/market-family-doctrine.js";
import { ORACLE_DIVERGENCE_CONTRACT } from "../../packages/omniweb-toolkit/src/market-family-contracts.js";

describe("market family doctrine", () => {
  it("loads oracle divergence doctrine from yaml", () => {
    clearMarketFamilyDoctrineCacheForTests();

    const doctrine = loadOracleDivergenceDoctrine();

    expect(doctrine.family).toBe("oracle-divergence");
    expect(doctrine.baseline[0]).toContain("descriptive, not predictive");
    expect(doctrine.blocked).toContain("Do not describe the divergence as an edge or recommendation.");
    expect(doctrine.requiresExtra).toEqual([
      {
        claim: "Independent agreement strength",
        requiredMetrics: ["modelDiversityScore"],
        reason: "Agent count alone does not show independent consensus.",
      },
      {
        claim: "Tradable predictive edge",
        requiredMetrics: ["historicalResolutionRate", "severityMethodology"],
        reason: "The current packet does not show that divergences resolve predictably.",
      },
    ]);
    expect(doctrine.metricSemantics.severity?.doesNotMean).toContain("calibrated probability");
  });

  it("hydrates the oracle divergence contract from loaded doctrine", () => {
    expect(ORACLE_DIVERGENCE_CONTRACT.promptDoctrine.baseline[0]).toContain("descriptive, not predictive");
    expect(ORACLE_DIVERGENCE_CONTRACT.claimBounds.blocked).toContain(
      "Do not claim the agents are right and the market is wrong.",
    );
    expect(ORACLE_DIVERGENCE_CONTRACT.metricSemantics.agentDirection?.doesNotMean).toContain(
      "Ground truth",
    );
  });
});
