#!/usr/bin/env bash
# Scheduled colony-operator cycle.
# Logs to ~/.demos-agent-logs/colony-operator-{timestamp}.log
#
# Usage:
#   bash scripts/scheduled-run.sh
#   bash scripts/scheduled-run.sh --dry-run

set -euo pipefail

export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

if [ -f "$HOME/.config/agent-env/paths.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.config/agent-env/paths.sh"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "bun not found; install Bun or update ~/.config/agent-env/paths.sh" >&2
  exit 127
fi

exec < /dev/null

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$HOME/.demos-agent-logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Scheduled colony-operator cycle"

if $DRY_RUN; then
  echo "[dry-run] Would run: bun run --cwd packages/omniweb-toolkit run:colony-operator-cycle -- --execute"
  echo "[dry-run] Log dir: $LOG_DIR"
  exit 0
fi

LOG="$LOG_DIR/colony-operator-${TIMESTAMP}.log"

if bun run --cwd "$REPO/packages/omniweb-toolkit" run:colony-operator-cycle -- --execute > "$LOG" 2>&1; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] colony-operator OK"
else
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] colony-operator FAILED (see $LOG)"
  curl -s -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Scheduled colony-operator cycle failed\", \"voice_enabled\": true}" \
    > /dev/null 2>&1 || true
  exit 1
fi

bunx tsx "$REPO/cli/source-lifecycle.ts" apply \
  > "$LOG_DIR/lifecycle-${TIMESTAMP}.log" 2>&1 || true
