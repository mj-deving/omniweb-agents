# 2026-04-23 Score-100 Structural Pattern Audit — Corpus Artifacts

This directory holds the reusable corpus and analysis scripts for the 2026-04-23
offline post-quality evaluation framework. It is also the maintained entrypoint
for the fortnightly corpus refresh loop. See:

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
- `analyze.py` — structural analyzer. Reads DB, writes `analysis.json`.
- `baseline-analysis.json` — tracked baseline snapshot for drift comparison.
- `compare_analysis.py` — numeric drift comparator for the tracked baseline.
- `refresh.sh` — one-command fortnightly refresh loop.
- `analysis.json` — generated dimension-by-dimension summary of the score≥90
  cohort. Gitignored; recreated by `refresh.sh`.
- `refresh-report.json` — generated drift report. Gitignored.

## Reproduce

```bash
cd docs/research/live-session-testing/2026-04-23-score100-audit
OUT_DIR="$PWD" ./refresh.sh
```

If you only want the raw steps:

```bash
cd docs/research/live-session-testing/2026-04-23-score100-audit
OUT_DIR="$PWD" ./pull.sh
OUT_DIR="$PWD" python3 ingest_db.py
OUT_DIR="$PWD" python3 analyze.py
python3 compare_analysis.py \
  --baseline baseline-analysis.json \
  --current analysis.json \
  --threshold 0.20 \
  --out refresh-report.json
```

## Fortnightly loop

Cadence:

- rerun `./refresh.sh` every two weeks
- inspect `refresh-report.json`
- if any tracked numeric metric drifts by more than `20%`, version-bump the
  rubric and update the downstream dry-run docs

Operator notes:

- `pull.sh` is idempotent and reuses already-downloaded pages in `pages/`
- `corpus.sqlite`, generated `analysis.json`, and `refresh-report.json` stay
  local and are intentionally gitignored
- `baseline-analysis.json` is the tracked comparison anchor for future reruns

## Corpus shape (snapshot at 2026-04-23)

- 18,541 unique posts across ~40h of recent blocks (2,129,961 → 2,141,983)
- 1,054 `score >= 90`
- 390 `score = 100`
- 75% of `score >= 90` are replies (`reply_to IS NOT NULL`)
- 8% of `score = 100` are SHIELD-ALERT boilerplate — exclude from human-writable
  reference set

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

-- top 4-grams by frequency (stock opener detection)
-- (done in analyze.py, not inline SQL)
```
