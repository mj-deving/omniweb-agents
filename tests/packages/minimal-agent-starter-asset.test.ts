import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("minimal-agent starter asset", () => {
  const readStarterAsset = () =>
    readFileSync(new URL("../../packages/omniweb-toolkit/assets/minimal-agent-starter.mjs", import.meta.url), "utf8");

  it("delegates execution to the maintained minimal agent cycle", () => {
    const asset = readStarterAsset();

    expect(asset).toContain('from "omniweb-toolkit/agent"');
    expect(asset).toContain("runMinimalAgentLoop,");
    expect(asset).toContain('getMinimalAgentRuntimeConfig,');
    expect(asset).toContain("getMinimalAgentRuntimeConfig(getDefaultSessionLedgerDir())");
    expect(asset).toContain("export async function observe(ctx)");
    expect(asset).toContain("await runMinimalAgentLoop(observe,");
    expect(asset).toContain("connectOptions: {");
    expect(asset).toContain("urlAllowlist: [COLONY_URL]");
    expect(asset).toContain("const MAX_OBSERVATION_POST_CHARS = 280;");
    expect(asset).toContain("function shortTxHash(value)");
    expect(asset).toContain("text.length > MAX_OBSERVATION_POST_CHARS");
    expect(asset).not.toContain('import { connect, checkWriteReadiness } from "omniweb-toolkit/runtime"');
    expect(asset).not.toContain("omni.colony.publish({");
    expect(asset).not.toContain("../src/");
    expect(asset).not.toContain("DemosTransactions.store");
  });

  it("keeps deterministic observation text under the advertised post limit", () => {
    const asset = readStarterAsset();
    const helperStart = asset.indexOf("const MAX_OBSERVATION_POST_CHARS = 280;");
    const helperEnd = asset.indexOf("function feedAttestUrl()");
    const helperSource = asset.slice(helperStart, helperEnd);
    const buildObservationText = Function(
      `${helperSource}; return buildObservationText;`,
    )() as (facts: string[]) => string;

    const text = buildObservationText([
      "Feed sample size: 10",
      "Top post: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "Top post category: a very long synthetic category name that should not be allowed to make the starter exceed its public post contract",
      "Top post score: 123456789",
    ]);

    expect(text.length).toBeLessThanOrEqual(280);
    expect(text).toContain("0x12345678...");
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
    expect(packageJson.scripts).not.toHaveProperty("check:observation");
    expect(packageJson.scripts).not.toHaveProperty("check:observation:eligibility");
    expect(packageJson.scripts).not.toHaveProperty("check:colony-operator-draft");
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

  it("exposes the same supervised checkpoint entrypoints from the colony-operator workspace bundle", () => {
    const bundlePackageJson = JSON.parse(
      readFileSync(
        new URL("../../packages/omniweb-toolkit/agents/openclaw/colony-operator/package.json", import.meta.url),
        "utf8",
      ),
    );

    expect(bundlePackageJson.scripts["check:supervised-observation"]).toContain(
      "check-supervised-observation.ts",
    );
    expect(bundlePackageJson.scripts["check:supervised-observation-eligibility"]).toContain(
      "check-supervised-observation-eligibility.ts",
    );
    expect(bundlePackageJson.scripts["check:supervised-publish-verdict"]).toContain(
      "check-supervised-publish-verdict.ts",
    );
    expect(bundlePackageJson.scripts["check:pending-verdicts"]).toContain(
      "check-pending-verdicts.ts",
    );
    expect(bundlePackageJson.scripts["record:pending-verdict"]).toContain(
      "record-pending-verdict.ts",
    );
  });
});
