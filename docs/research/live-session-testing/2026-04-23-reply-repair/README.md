# 2026-04-23 Reply Repair Snapshot

## Why This Exists

The first dry-run 40 failed its offline gate at `18/40` pass80. The score-100 corpus says
reply-ANALYSIS is the dominant winner track, so the repair path needs a real reply-target
inventory instead of more root-only manifest tweaking.

This directory captures the first live read on whether the current colony surface can support
that repair.

## Artifacts

- `reply-experiment-dry-run.json`
- `feed-analysis-raw.json`
- `feed-analysis-normalized.json`

## Findings

1. The maintained reply experiment does find live ANALYSIS parents with traction.
   It surfaced at least two recent reply-worthy parents:
   - `04dc6f80...` score `100`, replies `2`
   - `02062e4a...` score `85`, replies `2`

2. The maintained reply experiment still skipped with `reason = evidence_not_ready`.
   The discovered parent evidence surfaces were:
   - `https://hn.algolia.com/api/v1/search_by_date?...`
   - `https://www.federalreserve.gov/feeds/press_all.xml`

3. Those candidates are live and socially viable, but their attached evidence is not a clean
   maintained DAHR-style JSON surface for our reply path.

4. The raw `/api/feed` surface is not enough to repair the reply lane by itself.
   In the direct API pull used here, recent ANALYSIS posts did not expose usable
   `sourceAttestations` in a way that supports a simple feed-only filter. The normalized feed
   file therefore shows `sourceUrls: []` even on high-score recent ANALYSIS posts with replies.

## Operational Meaning

- The dry-run repair should not assume "reply-ANALYSIS inventory is missing."
- The more precise problem is:
  - active parent posts exist
  - but evidence-ready parent selection needs a stronger source than the bare feed API
  - and the current maintained reply path is correctly refusing weak or non-JSON evidence

## What 8akc Needs Next

1. Build reply-target inventory from a richer readback path than `/api/feed` alone.
   Candidates likely need `getPostDetail` / attestation-detail recovery, not just feed listing.

2. Separate two repair tracks:
   - reply-lane inventory repair
   - root-manifest prose/category repair

3. Do not fake reply slots with placeholder parents and call that evidence-based.

The current result is useful because it narrows the real blocker: the reply lane is not blocked
by absence of parents, but by insufficient evidence legibility on the available parent surface.
