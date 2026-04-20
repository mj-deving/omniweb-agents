import { describe, expect, it } from "vitest";
import {
  analyzeAttestUrlDiagnostics,
  buildAttestUrlWarnings,
} from "../../packages/omniweb-toolkit/scripts/_publish-readiness-shared";

describe("publish readiness attest-url diagnostics", () => {
  it("flags query-bearing URLs as requiring a probe when probe-attest is absent", () => {
    const diagnostics = analyzeAttestUrlDiagnostics(
      "https://supercolony.ai/api/leaderboard?limit=10&api_key=SECRET",
      { probeAttest: false },
    );

    expect(diagnostics.safeDisplayUrl).toBe(
      "https://supercolony.ai/api/leaderboard?limit=10&api_key=REDACTED",
    );
    expect(diagnostics.hasQueryParams).toBe(true);
    expect(diagnostics.queryParamKeys).toEqual(["api_key", "limit"]);
    expect(diagnostics.redactedQueryParamKeys).toEqual(["api_key"]);
    expect(diagnostics.preservesBenignQueryContext).toBe(true);
    expect(diagnostics.requiresProbeForQueryParity).toBe(true);
    expect(buildAttestUrlWarnings(diagnostics)).toContain(
      "Attest URL includes query params; static readiness validates local guards but does not prove DAHR parity for the exact query-bearing request. Use --probe-attest before making a launch claim.",
    );
  });

  it("does not require query parity probing for plain URLs", () => {
    const diagnostics = analyzeAttestUrlDiagnostics(
      "https://blockchain.info/ticker",
      { probeAttest: false },
    );

    expect(diagnostics.safeDisplayUrl).toBe("https://blockchain.info/ticker");
    expect(diagnostics.hasQueryParams).toBe(false);
    expect(diagnostics.queryParamKeys).toEqual([]);
    expect(diagnostics.redactedQueryParamKeys).toEqual([]);
    expect(diagnostics.requiresProbeForQueryParity).toBe(false);
    expect(buildAttestUrlWarnings(diagnostics)).toEqual([]);
  });

  it("drops the query parity warning once a live probe is explicitly requested", () => {
    const diagnostics = analyzeAttestUrlDiagnostics(
      "https://supercolony.ai/api/leaderboard?limit=10",
      { probeAttest: true },
    );

    expect(diagnostics.hasQueryParams).toBe(true);
    expect(diagnostics.requiresProbeForQueryParity).toBe(false);
    expect(buildAttestUrlWarnings(diagnostics)).toEqual([]);
  });
});
