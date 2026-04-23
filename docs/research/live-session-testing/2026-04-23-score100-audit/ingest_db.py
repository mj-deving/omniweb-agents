#!/usr/bin/env python3
"""
Ingest all pulled /api/feed pages into a SQLite DB for reusable offline analysis.

Source:   /tmp/score100-audit/pages/*.json
Target:   /tmp/score100-audit/corpus.sqlite
Filter:   keep every unique post seen, add a `cohort` flag for score >= 90.

Further analysis can run SQL against `posts` without re-paging the feed.
"""
import json, os, sqlite3, glob, sys
from pathlib import Path

PAGES_DIR = Path("/tmp/score100-audit/pages")
DB_PATH = Path("/tmp/score100-audit/corpus.sqlite")

DDL = """
CREATE TABLE IF NOT EXISTS posts (
  tx_hash       TEXT PRIMARY KEY,
  author        TEXT,
  block_number  INTEGER,
  ts_ms         INTEGER,
  score         INTEGER,
  category      TEXT,
  reply_to      TEXT,
  confidence    INTEGER,
  assets_json   TEXT,
  tags_json     TEXT,
  mentions_json TEXT,
  source_count  INTEGER,
  reply_count   INTEGER,
  agree         INTEGER,
  disagree      INTEGER,
  flag          INTEGER,
  text          TEXT,
  text_len      INTEGER,
  has_attest    INTEGER,
  raw_json      TEXT
);
CREATE INDEX IF NOT EXISTS idx_score   ON posts(score);
CREATE INDEX IF NOT EXISTS idx_cat     ON posts(category);
CREATE INDEX IF NOT EXISTS idx_ts      ON posts(ts_ms);
CREATE INDEX IF NOT EXISTS idx_score90 ON posts(score, category);
"""

def iter_posts():
    for page_file in sorted(PAGES_DIR.glob("*.json")):
        try:
            d = json.load(open(page_file))
        except Exception as e:
            print(f"[skip] {page_file}: {e}", file=sys.stderr)
            continue
        for p in (d.get("posts") or []):
            yield p

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(DDL)
    cur = conn.cursor()
    seen = 0
    inserted = 0
    for p in iter_posts():
        seen += 1
        tx = p.get("txHash")
        if not tx: continue
        payload = p.get("payload") or {}
        reactions = p.get("reactions") or {}
        attestations = payload.get("sourceAttestations") or []
        text = payload.get("text") or p.get("text") or ""
        row = (
            tx,
            p.get("author"),
            p.get("blockNumber"),
            p.get("timestamp"),
            p.get("score"),
            payload.get("cat") or p.get("category"),
            payload.get("replyTo"),
            payload.get("confidence"),
            json.dumps(payload.get("assets") or []),
            json.dumps(payload.get("tags") or []),
            json.dumps(payload.get("mentions") or []),
            len(attestations),
            p.get("replyCount") or 0,
            reactions.get("agree") or 0,
            reactions.get("disagree") or 0,
            reactions.get("flag") or 0,
            text,
            len(text),
            1 if attestations else 0,
            json.dumps(p, separators=(",",":"))
        )
        try:
            cur.execute("""INSERT OR IGNORE INTO posts
                (tx_hash,author,block_number,ts_ms,score,category,reply_to,confidence,
                 assets_json,tags_json,mentions_json,source_count,reply_count,
                 agree,disagree,flag,text,text_len,has_attest,raw_json)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", row)
            if cur.rowcount:
                inserted += 1
        except Exception as e:
            print(f"insert err {tx}: {e}", file=sys.stderr)
    conn.commit()
    # Stats
    totals = cur.execute("SELECT COUNT(*), SUM(score=100), SUM(score>=90), SUM(score>=80) FROM posts").fetchone()
    cats_100 = cur.execute("SELECT category, COUNT(*) FROM posts WHERE score=100 GROUP BY category ORDER BY 2 DESC").fetchall()
    cats_90  = cur.execute("SELECT category, COUNT(*) FROM posts WHERE score>=90 GROUP BY category ORDER BY 2 DESC").fetchall()
    span     = cur.execute("SELECT MIN(ts_ms), MAX(ts_ms), MIN(block_number), MAX(block_number) FROM posts WHERE score>=90").fetchone()
    conn.close()
    print(json.dumps({
        "seen_rows": seen,
        "inserted_new": inserted,
        "total_unique": totals[0],
        "score_100": totals[1],
        "score_ge_90": totals[2],
        "score_ge_80": totals[3],
        "categories_score_100": dict(cats_100),
        "categories_score_ge_90": dict(cats_90),
        "score_ge_90_ts_range_ms": [span[0], span[1]],
        "score_ge_90_block_range": [span[2], span[3]],
        "db_path": str(DB_PATH),
    }, indent=2))

if __name__ == "__main__":
    main()
