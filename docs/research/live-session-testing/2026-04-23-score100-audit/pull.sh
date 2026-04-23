#!/usr/bin/env bash
# Paginate /api/feed and save EVERY post we see. Score-100 is derived client-side.
# No code edits to the repo — just curl + python stdlib.
set -euo pipefail

OUT_DIR=${OUT_DIR:-/tmp/score100-audit}
TARGET=${TARGET:-500}              # stop once we have this many score-100 unique posts
MAX_PAGES=${MAX_PAGES:-400}        # hard cap on pagination
LIMIT=100
INCLUDE_REPLIES=${INCLUDE_REPLIES:-both}  # "false", "true", or "both" — both pulls no-replies then replies
RAW_PAGES_DIR="$OUT_DIR/pages"
mkdir -p "$RAW_PAGES_DIR"

log()  { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT_DIR/meta.log" >&2; }
fetch_series() {
  local repflag="$1"   # false|true
  local offset=0
  local page=0
  local last_has_more=true
  log "--- series replies=$repflag ---"
  while [ "$page" -lt "$MAX_PAGES" ] && [ "$last_has_more" = "true" ]; do
    local url="https://supercolony.ai/api/feed?limit=$LIMIT&offset=$offset&replies=$repflag"
    local file="$RAW_PAGES_DIR/rep${repflag}_p${page}_off${offset}.json"
    if [ ! -s "$file" ]; then
      if ! curl -sS --max-time 20 "$url" -H "Accept: application/json" -o "$file"; then
        log "curl failed at page $page offset $offset"
        return 1
      fi
    else
      log "skip existing page $page offset $offset replies=$repflag"
    fi
    python3 - "$file" "$OUT_DIR/accum.ndjson" <<'PY'
import json, sys
path, out = sys.argv[1], sys.argv[2]
try:
    d = json.load(open(path))
except Exception as e:
    print(f'JSON_PARSE_ERROR {e}', file=sys.stderr); sys.exit(1)
posts = d.get('posts') or []
with open(out, 'a') as f:
    for p in posts:
        f.write(json.dumps(p, separators=(',',':')) + '\n')
has_more = d.get('hasMore', False)
meta = d.get('meta') or {}
print(f"PAGE posts={len(posts)} hasMore={has_more} totalIndexed={meta.get('totalIndexed')} lastBlock={meta.get('lastBlock')}")
PY
    last_has_more=$(python3 -c "import json;print(str(json.load(open('$file')).get('hasMore', False)).lower())" || echo "false")
    unique=$(python3 -c "
import json
seen=set(); c=0
try:
  for line in open('$OUT_DIR/accum.ndjson'):
    p=json.loads(line); tx=p.get('txHash')
    if tx in seen: continue
    seen.add(tx)
    if p.get('score')==100: c+=1
except FileNotFoundError: pass
print(c)")
    log "rep=$repflag page=$page offset=$offset has_more=$last_has_more score100_unique_so_far=$unique"
    if [ "$unique" -ge "$TARGET" ]; then
      log "TARGET $TARGET reached"
      return 0
    fi
    offset=$((offset + LIMIT))
    page=$((page + 1))
  done
}

> "$OUT_DIR/accum.ndjson"
> "$OUT_DIR/meta.log"

if [ "$INCLUDE_REPLIES" = "both" ]; then
  fetch_series false
  # after the top-level feed, also pull the replies feed for category shape insight
  fetch_series true
elif [ "$INCLUDE_REPLIES" = "true" ]; then
  fetch_series true
else
  fetch_series false
fi

# Dedup + emit artifacts
python3 - "$OUT_DIR" <<'PY'
import json
import sys
from pathlib import Path
out_dir = Path(sys.argv[1])
accum = out_dir / 'accum.ndjson'
seen={}
for line in open(accum):
    try: p=json.loads(line)
    except Exception: continue
    tx=p.get('txHash')
    if not tx: continue
    if tx in seen: continue
    seen[tx]=p
all_posts=list(seen.values())
# Sort newest first by timestamp
all_posts.sort(key=lambda p: p.get('timestamp',0), reverse=True)
score100=[p for p in all_posts if p.get('score')==100]
json.dump(all_posts, open(out_dir / 'all-unique.json','w'))
json.dump(score100, open(out_dir / 'score100.json','w'))
# quick bucket summary
from collections import Counter
cat_all=Counter((p.get('payload') or {}).get('cat','?') for p in all_posts)
cat_100=Counter((p.get('payload') or {}).get('cat','?') for p in score100)
score_hist=Counter(p.get('score') for p in all_posts)
summary={
  'unique_all':len(all_posts),
  'score100_count':len(score100),
  'categories_all':dict(cat_all),
  'categories_score100':dict(cat_100),
  'score_histogram':dict(sorted(score_hist.items())),
  'timestamp_range':[min((p.get('timestamp') or 0) for p in all_posts) if all_posts else None,
                     max((p.get('timestamp') or 0) for p in all_posts) if all_posts else None],
  'block_range':[min((p.get('blockNumber') or 0) for p in all_posts) if all_posts else None,
                 max((p.get('blockNumber') or 0) for p in all_posts) if all_posts else None],
}
json.dump(summary, open(out_dir / 'summary.json','w'), indent=2)
print(json.dumps(summary, indent=2))
PY
