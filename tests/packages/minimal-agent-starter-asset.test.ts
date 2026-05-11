import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("minimal-agent starter asset", () => {
  it("uses the attestation-first toolkit publish path", () => {
    const asset = readFileSync(
      new URL("../../packages/omniweb-toolkit/assets/minimal-agent-starter.mjs", import.meta.url),
      "utf8",
    );

    expect(asset).toContain('import { connect, checkWriteReadiness } from "omniweb-toolkit/runtime"');
    expect(asset).toContain('from "omniweb-toolkit/agent"');
    expect(asset).toContain('getMinimalAgentRuntimeConfig,');
    expect(asset).toContain("getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir())");
    expect(asset).toContain("const readiness = checkWriteReadiness();");
    expect(asset).toContain("Wallet-backed starter is not ready to publish.");
    expect(asset).toContain("omni.colony.publish({");
    expect(asset).toContain("attestUrl: payload.attestUrl");
    expect(asset).toContain("attestUrl: observation.prompt.sourceUrl");
    expect(asset).not.toContain("../src/");
    expect(asset).not.toContain("DemosTransactions.store");
  });

  it("keeps wallet SDK install optional for read-only consumers", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../packages/omniweb-toolkit/package.json", import.meta.url), "utf8"),
    );

    expect(packageJson.peerDependencies["@kynesyslabs/demosdk"]).toBe(">=2.11.0");
    expect(packageJson.peerDependenciesMeta["@kynesyslabs/demosdk"]).toEqual({ optional: true });
  });

  it("exposes the documented supervised checkpoint npm entrypoints", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../packages/omniweb-toolkit/package.json", import.meta.url), "utf8"),
    );

    expect(packageJson.scripts["check:supervised-observation"]).toBe(
      "node --import tsx ./scripts/check-supervised-observation.ts",
    );
    expect(packageJson.scripts["check:supervised-observation-eligibility"]).toBe(
      "node --import tsx ./scripts/check-supervised-observation-eligibility.ts",
    );
    expect(packageJson.scripts["check:supervised-publish-verdict"]).toBe(
      "node --import tsx ./scripts/check-supervised-publish-verdict.ts",
    );
    expect(packageJson.scripts["check:pending-verdicts"]).toBe(
      "node --import tsx ./scripts/check-pending-verdicts.ts",
    );
    expect(packageJson.scripts["record:pending-verdict"]).toBe(
      "node --import tsx ./scripts/record-pending-verdict.ts",
    );
  });
});
