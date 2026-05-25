#!/usr/bin/env bash
# Scheduled sentinel session runner.
# Runs the maintained V3 loop via session-runner.ts.
# Post-session: source lifecycle transitions.
# Logs to ~/.demos-agent-logs/{agent}-{timestamp}.log
#
# Usage:
#   bash scripts/scheduled-run.sh              # run sentinel
#   bash scripts/scheduled-run.sh sentinel     # run sentinel explicitly
#   bash scripts/scheduled-run.sh --dry-run    # show what would run
#
# Crontab (every 6 hours UTC):
#   CRON_TZ=UTC
#   0 0,6,12,18 * * * /home/mj/projects/demos-agents/scripts/scheduled-run.sh >> ~/.demos-agent-logs/cron.log 2>&1

set -euo pipefail

# Cron starts with a minimal PATH; provide Bun/default CLI roots before the
# shared policy file applies any local ordering.
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

if [ -f "$HOME/.config/agent-env/paths.sh" ]; then
  # Shared agent PATH policy; source last so cron gets the same CLI roots as shells.
  # shellcheck disable=SC1091
  source "$HOME/.config/agent-env/paths.sh"
fi

if ! command -v bunx >/dev/null 2>&1; then
  echo "bunx not found; install Bun or update ~/.config/agent-env/paths.sh" >&2
  exit 127
fi

# Prevent stdin hangs under cron (session-runner needs --oversight autonomous, not stdin)
exec < /dev/null

# Ensure LLM provider is set — without this, auto-detect finds codex before claude
export LLM_CLI_COMMAND="claude --print"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
CREDS="$HOME/.config/demos/credentials"
LOG_DIR="$HOME/.demos-agent-logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DRY_RUN=false

# Default agent
AGENTS=(sentinel)

# Parse args
CUSTOM_AGENTS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    sentinel) CUSTOM_AGENTS+=("$arg") ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

if [ ${#CUSTOM_AGENTS[@]} -gt 0 ]; then
  AGENTS=("${CUSTOM_AGENTS[@]}")
fi

mkdir -p "$LOG_DIR"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Scheduled run: ${AGENTS[*]}"

if $DRY_RUN; then
  echo "[dry-run] Would run: ${AGENTS[*]}"
  echo "[dry-run] Credentials: $CREDS"
  echo "[dry-run] Log dir: $LOG_DIR"
  exit 0
fi

FAILED=0
PUBLISHED=0

for AGENT in "${AGENTS[@]}"; do
  AGENT_LOG="$LOG_DIR/${AGENT}-${TIMESTAMP}.log"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting $AGENT session..."

  if bunx tsx "$REPO/cli/session-runner.ts" \
    --agent "$AGENT" \
    --oversight autonomous \
    --env "$CREDS" \
    > "$AGENT_LOG" 2>&1; then
    # Count published posts from log
    POSTS=$(grep -c "Published:" "$AGENT_LOG" 2>/dev/null || true)
    POSTS=${POSTS:-0}
    PUBLISHED=$((PUBLISHED + POSTS))
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $AGENT OK ($POSTS posts)"
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $AGENT FAILED (see $AGENT_LOG)"
    FAILED=$((FAILED + 1))
    # Best-effort failure notification (non-blocking, doesn't affect exit code)
    curl -s -X POST http://localhost:8888/notify \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"Agent $AGENT session failed\", \"voice_enabled\": false}" \
      > /dev/null 2>&1 || true
  fi
done

# Post-session: source lifecycle transitions
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running source lifecycle..."
bunx tsx "$REPO/cli/source-lifecycle.ts" apply \
  > "$LOG_DIR/lifecycle-${TIMESTAMP}.log" 2>&1 || true

# Summary
TOTAL=${#AGENTS[@]}
OK=$((TOTAL - FAILED))
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Done: $OK/$TOTAL ok, $PUBLISHED published, $FAILED failed"

if [ $FAILED -gt 0 ]; then
  curl -s -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Scheduled run: $FAILED/$TOTAL agents failed, $PUBLISHED posts published\", \"voice_enabled\": true}" \
    > /dev/null 2>&1 || true
  exit 1
fi
