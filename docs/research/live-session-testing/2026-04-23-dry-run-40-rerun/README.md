# 2026-04-23 Dry-Run 40 Rerun

This directory records the repaired rerun of the first `40`-draft dry-run wave after the gap audit, source-health classification, and reply-parent inventory work.

## Outcome

The repaired wave passes the offline gate.

- baseline wave: `18/40` drafts scored `>=80`
- repaired wave: `31/40` drafts scored `>=80`
- gate requirement: `20/40`

The rerun materially improved the wave on all three axes that caused the first failure:

- lane mix: rebuilt around `30 ANALYSIS`, `5 OBSERVATION`, `3 PREDICTION`, `2 QUESTION`
- reply coverage: `10` reply-aware `ANALYSIS` drafts are now present in the wave
- source health: repaired wave uses only healthy sources

## Comparison

### Offline scoring

- baseline band counts:
  - `18` `shape-eligible`
  - `15` `rework`
  - `7` `hard-reject`
- repaired band counts:
  - `22` `shape-eligible`
  - `9` `perfect`
  - `9` `rework`
  - `0` `hard-reject`

### Category hit rates

- baseline:
  - `OBSERVATION`: `18 of 29 shape-eligible`
  - `PREDICTION`: `0 of 3 shape-eligible`
  - `ANALYSIS`: `0 of 8 shape-eligible`
- repaired:
  - `ANALYSIS`: `23 of 30 shape-eligible`
  - `PREDICTION`: `1 of 3 shape-eligible`
  - `OBSERVATION`: `5 of 5 shape-eligible`
  - `QUESTION`: `2 of 2 shape-eligible`

### Source health

- baseline source-health run: `71` entries checked, `24` failures, `ok=false`
- gap-audit classification of those baseline failures:
  - `15` `env_blocked`
  - `8` genuinely broken
  - `1` timeout
- repaired source-health run:
  - `60` entries checked
  - `0` failures
  - `ok=true`

### Prose variation

- baseline variation summary:
  - `5` high-risk pairs
  - `1` medium-risk pair
- repaired variation summary:
  - `0` high-risk pairs
  - `1` medium-risk pair

Remaining medium-risk pair:

- `s3-p1-binance-lido-reply-concentration`
- `s10-p2-top-three-tvl-cluster`

Reason:

- same-source insufficient structural variation

This remaining pair is no longer a hard blocker for the wave, but it should be considered when curating the live shortlist.

## Artifacts

- `drafts-input.json`
- `eval-scorecard.json`
- `variation-input.json`
- `variation-report.json`
- `source-health.json`
- `comparison-summary.json`

## Decision

`voh3` succeeds.

The repaired dry-run wave clears the offline rubric gate, removes the source-health failures, and reduces duplicate risk from a hard blocker to a single medium-risk same-source pair. The live wave is no longer blocked by the original dry-run failure, though final live selection should still be curated rather than auto-promoted.
