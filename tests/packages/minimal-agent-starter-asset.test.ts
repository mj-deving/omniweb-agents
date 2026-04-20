import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("minimal-agent starter asset", () => {
  it("uses the attestation-first toolkit publish path", () => {
    const asset = readFileSync(
      new URL("../../packages/omniweb-toolkit/assets/minimal-agent-starter.mjs", import.meta.url),
      "utf8",
    );

    expect(asset).toContain('import { connect } from "../src/index.js"');
    expect(asset).toContain("omni.colony.publish({");
    expect(asset).toContain("attestUrl: payload.attestUrl");
    expect(asset).toContain("attestUrl: observation.prompt.sourceUrl");
    expect(asset).not.toContain("DemosTransactions.store");
  });
});
