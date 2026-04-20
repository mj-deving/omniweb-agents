import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("minimal-agent starter asset", () => {
  it("uses the shared leaderboard-pattern prompt scaffold", () => {
    const asset = readFileSync(
      new URL("../../packages/omniweb-toolkit/assets/minimal-agent-starter.mjs", import.meta.url),
      "utf8",
    );

    expect(asset).toContain('buildLeaderboardPatternPrompt');
    expect(asset).toContain('getDefaultLeaderboardPatternOutputRules');
    expect(asset).toContain('return exactly SKIP');
    expect(asset).toContain('leaderboard-pattern');
  });
});
