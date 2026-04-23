# 2026-04-23 Score-100 Structural Pattern Audit — Corpus Artifacts

This directory holds the reusable corpus and analysis scripts for the 2026-04-23
offline post-quality evaluation framework. See:

- `docs/archive/agent-handoffs/score-100-structural-pattern-audit-2026-04-23.md`
- `docs/archive/agent-handoffs/dry-run-wave-eval-framework-2026-04-23.md`

## Files

- `corpus.sqlite` — deduped post corpus (indexed on `score`, `category`,
  `ts_ms`). One `posts` table with structured columns plus `raw_json`. Large
  (~40MB); **gitignored by default** — regenerate with `pull.sh` + `ingest_db.py`.
- `pull.sh` — paginated `/api/feed` scrape (unauthenticated). Idempotent —
  re-runs skip already-pulled pages.
- `ingest_db.py` — ingest all `pages/*.json` into SQLite. `INSERT OR IGNORE`
  dedupes on `txHash`.
- `analyze.py` — structural analyzer. Reads the local `corpus.sqlite` when
  present (falls back to `/tmp/score100-audit/corpus.sqlite`), writes
  `analysis.json`, and excludes non-human-writable boilerplate from the
  dedicated human-writable views.
- `analysis.json` — dimension-by-dimension summary of the score≥90 cohort.

## Reproduce

```bash
cd docs/research/live-session-testing/2026-04-23-score100-audit
OUT_DIR=/tmp/score100-audit ./pull.sh
python3 ingest_db.py
python3 analyze.py
```

`pull.sh` writes raw pages and JSON artifacts to `OUT_DIR` (default:
`/tmp/score100-audit`). If the corpus lives next to the scripts in the repo,
`analyze.py` prefers that local `corpus.sqlite` automatically. The `/tmp`
location remains the fallback for ad hoc scratch runs.

## Corpus shape (snapshot at 2026-04-23)

- 18,541 unique posts across ~40h of recent blocks (2,129,961 → 2,141,983)
- 1,054 `score >= 90`
- 390 `score = 100`
- 75% of `score >= 90` are replies (`reply_to IS NOT NULL`)
- 8% of `score = 100` are SHIELD-ALERT boilerplate — exclude from human-writable
  reference set

## Human-writability filter

The analyzer now emits two parallel views:

- raw cohort stats
- `*_human_writable` stats that exclude system boilerplate

Current filter scope:

- `SHIELD ALERT`
- `flagged for posting at abnormally high volume`
- `check recent tippers before rewarding`
- `under surveillance`

The output also includes:

- `human_writable_filter.excluded_*` counts
- `human_writable_filter.excluded_examples`
- `top_4grams_score_ge_90_human_writable`
- `top_4grams_score_100_human_writable`

That keeps the repeated n-grams inspectable while preventing boilerplate winner
clusters from contaminating the human-writable reference set.

## Reuse

The DB is the substrate for offline draft evaluation. Query patterns:

```sql
-- winner reference set (excludes SHIELD boilerplate)
SELECT * FROM posts
WHERE score >= 90
  AND text NOT LIKE '%SHIELD ALERT%';

-- reply-ANALYSIS winners (dominant winner cluster)
SELECT * FROM posts
WHERE score >= 90
  AND category = 'ANALYSIS'
  AND reply_to IS NOT NULL
  AND text NOT LIKE '%SHIELD ALERT%';

-- inspect repeated boilerplate directly
SELECT tx_hash, score, category, text
FROM posts
WHERE score = 100
  AND text LIKE '%SHIELD ALERT%';

-- top 4-grams by frequency (stock opener detection / boilerplate inspection)
-- done in analyze.py for both raw and human-writable cohorts
```
