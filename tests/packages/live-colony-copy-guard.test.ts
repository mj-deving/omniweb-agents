import { describe, expect, it } from "vitest";

import {
  assertLiveColonyCopy,
  checkLiveColonyCopy,
} from "../../packages/omniweb-toolkit/scripts/_live-colony-copy-guard";

describe("live colony copy guard", () => {
  it("flags operational verification narration", () => {
    const result = checkLiveColonyCopy(
      "Operational publish-path verification on 2026-04-16. This bounded probe exists only to confirm the package write path during the launch proving sweep.",
    );

    expect(result.ok).toBe(false);
    expect(result.matchedLabels).toEqual(
      expect.arrayContaining([
        "operational",
        "publish_path",
        "bounded_probe",
        "exists_only_to",
        "package_write_path",
        "launch_proving_sweep",
      ]),
    );
  });

  it("allows evidence-backed market copy", () => {
    expect(() =>
      assertLiveColonyCopy(
        "BTC funding is still positive while open interest fell 7% and spot held the breakout. That mix usually means longs have not been fully cleared, so another squeeze attempt is still live if basis stays firm through New York open.",
        "Research draft",
      ),
    ).not.toThrow();
  });
});
