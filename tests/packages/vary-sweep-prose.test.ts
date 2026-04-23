import { describe, expect, it } from "vitest";
import {
  analyzeSweepProse,
  type SweepDraftInput,
} from "../../packages/omniweb-toolkit/scripts/vary-sweep-prose.ts";

describe("vary-sweep-prose", () => {
  it("flags shared 5-gram overlap as high risk", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "blockchain.info",
        category: "PREDICTION",
        text: "Blockchain.info still prints BTC/USD near 78.8k right now. My short-horizon prediction is that BTC will remain above 78,000 within 30 minutes from publication.",
      },
      {
        draft_id: "b",
        source: "blockchain.info",
        category: "PREDICTION",
        text: "Blockchain.info still prints BTC/USD near 78.8k right now. My short-horizon prediction is that BTC will remain above 77,000 within 30 minutes from publication.",
      },
    ];

    const report = analyzeSweepProse(drafts);
    expect(report.summary.highRiskPairs).toBe(1);
    expect(report.pairs[0].risk).toBe("high");
    expect(report.pairs[0].reasons).toContain("shared_5gram_overlap");
  });

  it("flags same-source drafts with too little structural variation", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "treasury-fiscaldata",
        category: "OBSERVATION",
        text: "Treasury FRN carry printed 3.628 percent on 2026-03-31, keeping the front-end floating line visible in public data.",
      },
      {
        draft_id: "b",
        source: "treasury-fiscaldata",
        category: "OBSERVATION",
        text: "Treasury bond carry printed 3.392 percent on 2026-03-31, keeping the long-duration line visible in the same public table.",
      },
    ];

    const report = analyzeSweepProse(drafts);
    expect(report.pairs[0].sameSource).toBe(true);
    expect(report.pairs[0].reasons).toContain("same_source_insufficient_structural_variation");
    expect(report.pairs[0].risk).toBe("high");
  });

  it("flags filler adverbs and stock openers", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "defillama",
        category: "ANALYSIS",
        text: "Importantly, DefiLlama shows USDT supply at 188.6 billion right now, which means the dollar-token base is still expanding.",
      },
    ];

    const report = analyzeSweepProse(drafts);
    expect(report.drafts[0].fillerAdverbs).toContain("importantly");
    expect(report.drafts[0].stockOpener).toBe(true);
  });

  it("treats structurally different same-source drafts as low risk when they avoid overlap", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "cboe",
        category: "OBSERVATION",
        text: "Cboe's delayed quote still serves VIX at 19.39, with the session range between 18.82 and 19.54.",
      },
      {
        draft_id: "b",
        source: "cboe",
        category: "PREDICTION",
        text: "My short-horizon claim is that VIX stays below 25 over the next thirty minutes if the delayed quote does not break its contained band.",
      },
    ];

    const report = analyzeSweepProse(drafts);
    expect(report.pairs[0].risk).toBe("low");
    expect(report.pairs[0].distinctDimensions.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps abbreviated country names from collapsing opener detection", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "treasury",
        category: "OBSERVATION",
        text: "U.S. Treasury bills still yield above notes in the latest public table.",
      },
      {
        draft_id: "b",
        source: "gilts",
        category: "OBSERVATION",
        text: "U.K. gilt yields still sit above the recent local floor in public data.",
      },
    ];

    const report = analyzeSweepProse(drafts);
    expect(report.drafts[0].opener).toBe("U.S. Treasury bills still yield above notes in the latest public table.");
    expect(report.drafts[1].opener).toBe("U.K. gilt yields still sit above the recent local floor in public data.");
    expect(report.pairs[0].reasons).not.toContain("reused_opener");
  });

  it("classifies bare numeric claims with units as absolute numeric mode", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "treasury-fiscaldata",
        category: "OBSERVATION",
        text: "Treasury FRN carry printed 3.628 percent on 2026-03-31, keeping the front-end floating line visible in public data.",
      },
    ];

    const report = analyzeSweepProse(drafts);
    expect(report.drafts[0].profile.numericMode).toBe("absolute");
  });

  it("splits the opener after a sentence ending in a numeric value", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "cboe",
        category: "OBSERVATION",
        text: "VIX closes at 78.8. The delayed quote still shows the same contained band right now.",
      },
      {
        draft_id: "b",
        source: "cboe",
        category: "OBSERVATION",
        text: "VIX closes at 79.1. The delayed quote still shows the same contained band right now.",
      },
    ];

    const report = analyzeSweepProse(drafts);

    expect(report.drafts[0].opener).toBe("VIX closes at 78.8.");
    expect(report.drafts[1].opener).toBe("VIX closes at 79.1.");
    expect(report.pairs[0].reasons).not.toContain("reused_opener");
  });

  it("treats 'over the next' phrasing as a horizon frame", () => {
    const drafts: SweepDraftInput[] = [
      {
        draft_id: "a",
        source: "cboe",
        category: "PREDICTION",
        text: "My short-horizon claim is that VIX stays below 25 over the next thirty minutes if the delayed quote does not break its contained band.",
      },
    ];

    const report = analyzeSweepProse(drafts);

    expect(report.drafts[0].profile.temporalFrame).toBe("horizon");
  });
});
