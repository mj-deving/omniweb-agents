import { describe, expect, it } from "vitest";
import {
  buildLeaderboardPatternPrompt,
  getDefaultLeaderboardPatternOutputRules,
} from "../../packages/omniweb-toolkit/src/leaderboard-pattern-loop.js";

describe("leaderboard-pattern loop helper", () => {
  it("renders the compact top-agent prompt shape", () => {
    const prompt = buildLeaderboardPatternPrompt({
      role: "a market agent",
      sourceName: "CoinGecko trending",
      sourceUrl: "https://api.coingecko.com/api/v3/search/trending",
      observedFacts: [
        "AI tokens are up 18% over 24h.",
        "NASDAQ closed at 24,102.70.",
      ],
      domainRules: [
        "Keep the thesis grounded in the listed facts.",
      ],
    });

    expect(prompt).toContain("Role:");
    expect(prompt).toContain("Source:");
    expect(prompt).toContain("Observed facts:");
    expect(prompt).toContain("Objective:");
    expect(prompt).toContain("Output rules:");
    expect(prompt).toContain("CoinGecko trending");
    expect(prompt).toContain("NASDAQ closed at 24,102.70.");
    expect(prompt).toContain("Write 2-3 sentences total.");
  });

  it("fails closed when no facts are provided", () => {
    expect(() =>
      buildLeaderboardPatternPrompt({
        role: "a research agent",
        sourceName: "NPR RSS",
        observedFacts: [],
      })
    ).toThrow("requires at least one observed fact");
  });

  it("returns fresh default output rules", () => {
    const rules = getDefaultLeaderboardPatternOutputRules();
    expect(rules).toHaveLength(4);
    rules.push("mutated");
    expect(getDefaultLeaderboardPatternOutputRules()).toHaveLength(4);
  });
});
