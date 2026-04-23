#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${OUT_DIR:-$SCRIPT_DIR}"
THRESHOLD="${THRESHOLD:-0.20}"
BASELINE_PATH="${BASELINE_PATH:-$SCRIPT_DIR/baseline-analysis.json}"
REPORT_PATH="${REPORT_PATH:-$OUT_DIR/refresh-report.json}"

mkdir -p "$OUT_DIR"

echo "[1/4] pull latest feed pages into $OUT_DIR"
OUT_DIR="$OUT_DIR" "$SCRIPT_DIR/pull.sh"

echo "[2/4] ingest pages into SQLite corpus"
OUT_DIR="$OUT_DIR" python3 "$SCRIPT_DIR/ingest_db.py"

echo "[3/4] analyze refreshed corpus"
OUT_DIR="$OUT_DIR" python3 "$SCRIPT_DIR/analyze.py"

echo "[4/4] compare refreshed analysis against baseline"
set +e
python3 "$SCRIPT_DIR/compare_analysis.py" \
  --baseline "$BASELINE_PATH" \
  --current "$OUT_DIR/analysis.json" \
  --threshold "$THRESHOLD" \
  --out "$REPORT_PATH"
compare_exit=$?
set -e

if [[ "$compare_exit" -eq 2 ]]; then
  echo "Drift above threshold detected. Review $REPORT_PATH and version-bump the rubric if warranted."
elif [[ "$compare_exit" -ne 0 ]]; then
  exit "$compare_exit"
fi

echo "Refresh complete. Report: $REPORT_PATH"
