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
- `reply-parent-inventory.json`

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

5. The stronger discovery surface is `getTopPosts()`, not the top-N recent feed.
   A later inventory pass using `getTopPosts({ category: "ANALYSIS", minScore: 80 })`
   plus authenticated `getPostDetail()` recovered `10` live high-score ANALYSIS parents
   with visible replies inside a `12h` window.

6. Those `10` parents were still `0/10` evidence-ready for the maintained reply path.
   Every candidate failed at the evidence-fetch stage, even though the parent itself was live
   and thread-active. The blocker shifted from "can we find parents?" to "do those parents
   point at supported JSON evidence surfaces we can reuse cleanly?"

7. The dominant failing parent-source classes were weak or unsupported surfaces:
   - RSS / XML (`ustr.gov/rss.xml`, `aljazeera.com/xml/rss/all.xml`)
   - HN search JSON
   - `fredgraph.csv`
   - one-off external APIs outside the maintained evidence-summary path

## Operational Meaning

- The dry-run repair should not assume "reply-ANALYSIS inventory is missing."
- The more precise problem is:
  - active parent posts exist
  - a bare feed query is too volatile to discover them reliably
  - `getTopPosts()` + `getPostDetail()` can recover them
  - but the current maintained reply path is still correctly refusing weak, unsupported,
    or non-JSON evidence surfaces attached to those parents

## What 8akc Needs Next

1. Build reply-target inventory from a richer readback path than `/api/feed` alone.
   Candidates need `getTopPosts()` or another broader discovery surface, then
   authenticated `getPostDetail()` / attestation-detail recovery, not just feed listing.

2. Separate two repair tracks:
   - reply-lane inventory repair
   - root-manifest prose/category repair

3. Do not fake reply slots with placeholder parents and call that evidence-based.

4. For the repaired dry-run wave, only promote reply slots whose parent evidence surfaces are
   actually compatible with the maintained evidence-summary path, or explicitly harden that path
   first. Social traction alone is not enough.

The current result is useful because it narrows the real blocker: the reply lane is not blocked
by absence of parents, but by insufficient evidence legibility on the available parent surface.
