import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  mergeEvalDraftsConfig,
  evaluateDraftBatch,
  type DraftEvalConfig,
  type DraftInput,
} from "../../packages/omniweb-toolkit/scripts/eval-drafts.ts";

function buildAttestation() {
  return {
    url: "https://example.com/data.json",
    shape: "json",
    status: 200,
    allowlisted: true,
    jsonPathResolved: true,
    prepared: true,
  };
}

describe("eval-drafts", () => {
  it("scores a reply-analysis draft as shape-eligible when it matches the rubric", () => {
    const drafts: DraftInput[] = [
      {
        draft_id: "reply-a1",
        category: "ANALYSIS",
        replyTo: "0xparent",
        text: "BTC at $78.8k and VIX at 19.4 still point in opposite directions, which means this thread is pricing calm and stress at the same time instead of choosing one regime, even as the latest macro chatter keeps pretending those two signals already agree.",
        attestation: buildAttestation(),
      },
    ];

    const result = evaluateDraftBatch(drafts);
    const row = result.rows[0];

    expect(row.track).toBe("REPLY-ANALYSIS");
    expect(row.score_rubric).toBeGreaterThanOrEqual(80);
    expect(row.decision).toBe("publish_candidate");
    expect(result.shortlist).toHaveLength(1);
  });

  it("routes dead categories out of the score-100 track", () => {
    const drafts: DraftInput[] = [
      {
        draft_id: "op-1",
        category: "OPINION",
        text: "I think the market feels better than it did yesterday.",
        attestation: buildAttestation(),
      },
    ];

    const result = evaluateDraftBatch(drafts);
    const row = result.rows[0];

    expect(row.band).toBe("hard-reject");
    expect(row.hard_fail_reasons).toContain("dead_category");
    expect(row.decision).toBe("ineligible_for_score_100_track");
  });

  it("hard-rejects sibling drafts that reuse the same 5-gram sequence", () => {
    const shared = "BTC at $78.8k remains above the local floor";
    const drafts: DraftInput[] = [
      {
        draft_id: "dup-1",
        category: "PREDICTION",
        text: `${shared} within 1h, with 62% confidence because spot has not broken range support yet.`,
        attestation: buildAttestation(),
      },
      {
        draft_id: "dup-2",
        category: "PREDICTION",
        text: `${shared} within 2h, with 64% confidence because the same support level is still intact.`,
        attestation: buildAttestation(),
      },
    ];

    const result = evaluateDraftBatch(drafts);

    expect(result.rows[0].hard_fail_reasons).toContain("sibling_duplicate");
    expect(result.rows[1].hard_fail_reasons).toContain("sibling_duplicate");
  });

  it("still checks sibling duplicates when caller reuses draft ids", () => {
    const shared = "BTC at $78.8k remains above the local floor";
    const drafts: DraftInput[] = [
      {
        draft_id: "dup",
        category: "PREDICTION",
        text: `${shared} within 1h, with 62% confidence because spot has not broken range support yet.`,
        attestation: buildAttestation(),
      },
      {
        draft_id: "dup",
        category: "PREDICTION",
        text: `${shared} within 2h, with 64% confidence because the same support level is still intact.`,
        attestation: buildAttestation(),
      },
    ];

    const result = evaluateDraftBatch(drafts);

    expect(result.rows[0].hard_fail_reasons).toContain("sibling_duplicate");
    expect(result.rows[1].hard_fail_reasons).toContain("sibling_duplicate");
  });

  it("penalizes predictions that lack explicit confidence and horizon", () => {
    const drafts: DraftInput[] = [
      {
        draft_id: "pred-1",
        category: "PREDICTION",
        text: "Prediction: ETH will remain above $2,300 because the local support band is still intact.",
        attestation: buildAttestation(),
      },
    ];

    const result = evaluateDraftBatch(drafts);
    const row = result.rows[0];

    expect(row.score_rubric).toBeLessThan(80);
    expect(row.soft_hits.some(([code]) => code === "S15")).toBe(true);
    expect(row.soft_hits.some(([code]) => code === "S17")).toBe(true);
  });

  it("accepts config overrides for live candidate threshold", () => {
    const drafts: DraftInput[] = [
      {
        draft_id: "cfg-1",
        category: "QUESTION",
        text: "Treasury supply rose 8% over the latest window while BTC stayed pinned near $78.8k instead of repricing lower with the broader macro tape, so why has that funding stress not broken the crypto range yet?",
        attestation: buildAttestation(),
      },
    ];

    const defaultResult = evaluateDraftBatch(drafts);
    const stricterResult = evaluateDraftBatch(drafts, {
      liveCandidateMinScore: defaultResult.rows[0].score_rubric + 1,
    });

    expect(defaultResult.rows[0].decision).toBe("publish_candidate");
    expect(stricterResult.rows[0].decision).not.toBe("publish_candidate");
  });

  it("deep-merges partial category profile overrides", () => {
    const override: Partial<DraftEvalConfig> = {
      categoryProfiles: {
        ANALYSIS: {
          sweet: [180, 240],
        } as DraftEvalConfig["categoryProfiles"]["ANALYSIS"],
      } as Partial<DraftEvalConfig["categoryProfiles"]> as DraftEvalConfig["categoryProfiles"],
    };
    const merged = mergeEvalDraftsConfig(override);

    expect(merged.categoryProfiles.ANALYSIS.sweet).toEqual([180, 240]);
    expect(merged.categoryProfiles.ANALYSIS.band).toEqual([150, 320]);
    expect(merged.categoryProfiles.ANALYSIS.preferredFrames).toBe(2);
    expect(merged.categoryProfiles.ANALYSIS.maxFrames).toBe(3);
  });

  it("returns exit code 2 for malformed CLI input", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "eval-drafts-cli-"));
    const badInput = join(tempDir, "bad.json");
    writeFileSync(badInput, "{bad json", "utf8");

    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const result = spawnSync(
      "node",
      ["--import", "tsx", "./packages/omniweb-toolkit/scripts/eval-drafts.ts", "--in", badInput],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    rmSync(tempDir, { recursive: true, force: true });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Error: invalid input/config:");
  });

  it("returns exit code 2 when a draft is missing required fields", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "eval-drafts-cli-"));
    const badInput = join(tempDir, "missing-fields.json");
    writeFileSync(badInput, JSON.stringify([{ category: "ANALYSIS" }]), "utf8");

    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const result = spawnSync(
      "node",
      ["--import", "tsx", "./packages/omniweb-toolkit/scripts/eval-drafts.ts", "--in", badInput],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    rmSync(tempDir, { recursive: true, force: true });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("must include a non-empty string text");
  });

  it("returns exit code 2 for malformed config overrides", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "eval-drafts-cli-"));
    const inputPath = join(tempDir, "drafts.json");
    const configPath = join(tempDir, "bad-config.json");
    writeFileSync(
      inputPath,
      JSON.stringify([
        {
          category: "ANALYSIS",
          text: "BTC at $78.8k and VIX at 19.4 still point in opposite directions even as the macro tape tries to flatten that contradiction.",
        },
      ]),
      "utf8",
    );
    writeFileSync(configPath, JSON.stringify({ liveCandidateMinScore: "80" }), "utf8");

    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const result = spawnSync(
      "node",
      ["--import", "tsx", "./packages/omniweb-toolkit/scripts/eval-drafts.ts", "--in", inputPath, "--config", configPath],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    rmSync(tempDir, { recursive: true, force: true });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("liveCandidateMinScore");
  });

  it("does not award observation anchor credit for generic sentence-case words", () => {
    const drafts: DraftInput[] = [
      {
        draft_id: "obs-plain",
        category: "OBSERVATION",
        text: "Markets stayed quiet through the session and volatility never broke out.",
        attestation: buildAttestation(),
      },
    ];

    const result = evaluateDraftBatch(drafts);
    const row = result.rows[0];

    expect(row.anchors.institutions).toEqual([]);
    expect(row.soft_hits.some(([code]) => code === "S7")).toBe(false);
  });

  it("returns exit code 2 when duplicateNgramSize is not a positive integer", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "eval-drafts-cli-"));
    const inputPath = join(tempDir, "drafts.json");
    const configPath = join(tempDir, "bad-ngram-config.json");
    writeFileSync(
      inputPath,
      JSON.stringify([
        {
          category: "ANALYSIS",
          text: "BTC at $78.8k and VIX at 19.4 still point in opposite directions even as the macro tape tries to flatten that contradiction.",
        },
      ]),
      "utf8",
    );
    writeFileSync(configPath, JSON.stringify({ duplicateNgramSize: 0 }), "utf8");

    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const result = spawnSync(
      "node",
      ["--import", "tsx", "./packages/omniweb-toolkit/scripts/eval-drafts.ts", "--in", inputPath, "--config", configPath],
      {
        cwd: repoRoot,
        encoding: "utf8",
      },
    );

    rmSync(tempDir, { recursive: true, force: true });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("duplicateNgramSize");
  });
});
