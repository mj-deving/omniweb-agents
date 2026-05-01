import { describe, expect, it } from "vitest";

import {
  evaluateSupervisedVerdictWindow,
  extractSupervisedVerdictMetrics,
  getSupervisedVerdictPolicy,
  scheduleSupervisedVerdict,
} from "../../packages/omniweb-toolkit/scripts/_supervised-publish-verdict";
import { decideIndexingLagOutcome } from "../../packages/omniweb-toolkit/scripts/_pending-verdict-indexing-policy";

describe("supervised publish verdict policy", () => {
  it("uses a two-hour fixed window for analysis", () => {
    const schedule = scheduleSupervisedVerdict("ANALYSIS", "2026-04-21T06:00:00.000Z");

    expect(schedule.followUpEarliestAt).toBe("2026-04-21T08:00:00.000Z");
    expect(schedule.followUpLatestAt).toBe("2026-04-21T08:00:00.000Z");
    expect(getSupervisedVerdictPolicy("analysis").followUpLabel).toContain("Two-hour");
  });

  it("uses a four-to-six-hour window for prediction", () => {
    const schedule = scheduleSupervisedVerdict("PREDICTION", "2026-04-21T06:00:00.000Z");

    expect(schedule.followUpEarliestAt).toBe("2026-04-21T10:00:00.000Z");
    expect(schedule.followUpLatestAt).toBe("2026-04-21T12:00:00.000Z");
  });

  it("keeps the two-hour window but customizes the label for other supervised categories", () => {
    const schedule = scheduleSupervisedVerdict("OBSERVATION", "2026-04-21T06:00:00.000Z");

    expect(schedule.followUpEarliestAt).toBe("2026-04-21T08:00:00.000Z");
    expect(schedule.followUpLatestAt).toBe("2026-04-21T08:00:00.000Z");
    expect(schedule.followUpLabel).toContain("OBSERVATION");
    expect(getSupervisedVerdictPolicy("ACTION").followUpLabel).toContain("ACTION");
  });

  it("classifies observation time as too early, due, or overdue", () => {
    expect(
      evaluateSupervisedVerdictWindow(
        "ANALYSIS",
        "2026-04-21T06:00:00.000Z",
        "2026-04-21T07:59:00.000Z",
      ).status,
    ).toBe("too_early");

    expect(
      evaluateSupervisedVerdictWindow(
        "PREDICTION",
        "2026-04-21T06:00:00.000Z",
        "2026-04-21T10:30:00.000Z",
      ).status,
    ).toBe("due");

    expect(
      evaluateSupervisedVerdictWindow(
        "PREDICTION",
        "2026-04-21T06:00:00.000Z",
        "2026-04-21T12:30:00.000Z",
      ).status,
    ).toBe("overdue");
  });

  it("extracts score and reaction counts from post detail records", () => {
    const metrics = extractSupervisedVerdictMetrics({
      score: "80",
      replyCount: 2,
      reactions: {
        agree: 1,
        disagree: "0",
        flag: 3,
      },
    });

    expect(metrics).toEqual({
      score: 80,
      replyCount: 2,
      reactions: {
        agree: 1,
        disagree: 0,
        flag: 3,
      },
      reactionTotal: 4,
    });
  });
});


describe("pending verdict indexing lag policy", () => {
  it("defers non-indexed entries while they are still within the lag window", () => {
    expect(
      decideIndexingLagOutcome({
        entryAgeMs: 6 * 60 * 60 * 1000,
        maxIndexingLagMs: 24 * 60 * 60 * 1000,
        deferLagMs: 60 * 60 * 1000,
      }),
    ).toEqual({
      kind: "defer",
      deferByMs: 60 * 60 * 1000,
    });
  });

  it("records a terminal negative verdict after the indexing lag ceiling", () => {
    expect(
      decideIndexingLagOutcome({
        entryAgeMs: 25 * 60 * 60 * 1000,
        maxIndexingLagMs: 24 * 60 * 60 * 1000,
        deferLagMs: 60 * 60 * 1000,
      }),
    ).toEqual({
      kind: "terminal",
      indexingLagMs: 25 * 60 * 60 * 1000,
    });
  });
});
