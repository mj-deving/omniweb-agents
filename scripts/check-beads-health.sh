#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/check-beads-health.sh [--fix] [--repair-broken] [--sync]

Checks that the current repo/worktree uses Beads safely.

What it validates:
  - bd bootstrap sees a valid existing/shared ledger
  - worktrees have a .beads/redirect file
  - local operational .beads files are excluded from Git noise
  - bd export.git-add is disabled for this repo
  - the local .beads directory permissions are sane

Flags:
  --fix             Apply safe local fixes (exclude file, export.git-add=false,
                    chmod 700 on a local .beads directory, bootstrap when missing)
  --repair-broken   If .beads looks present but bootstrap still says has_existing=false,
                    move the broken .beads aside and re-bootstrap from origin.
                    Requires --fix.
  --sync            Run bd dolt pull after a healthy/bootstrap-repaired setup.
  -h, --help        Show this help.

Notes:
  - Never use stash/restore as the normal way to recover .beads.
  - In worktrees, Beads 1.0.3 shares the main repo database via git common-dir discovery; `.beads/redirect` is not required.
EOF
}

fix=false
repair_broken=false
sync=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fix) fix=true ;;
    --repair-broken) repair_broken=true ;;
    --sync) sync=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

if [[ "$repair_broken" == true && "$fix" != true ]]; then
  echo "--repair-broken requires --fix" >&2
  exit 2
fi

say() { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git_dir="$(git rev-parse --path-format=absolute --git-dir)"
common_git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
exclude_file="$(git rev-parse --git-path info/exclude)"
beads_dir="$repo_root/.beads"
redirect_file="$beads_dir/redirect"
is_worktree=false
[[ "$git_dir" != "$common_git_dir" ]] && is_worktree=true

exclude_patterns=(
  ".beads/.local_version"
  ".beads/backup/"
  ".beads/config.yaml"
  ".beads/embeddeddolt/"
  ".beads/export-state.json"
  ".beads/interactions.jsonl"
  ".beads/issues.jsonl"
  ".beads/last-touched"
  ".beads/metadata.json"
  ".beads-recovery-backups/"
)

ensure_excludes() {
  mkdir -p "$(dirname "$exclude_file")"
  touch "$exclude_file"
  local marker="# Local Beads operational state"
  if ! grep -Fqx "$marker" "$exclude_file" 2>/dev/null; then
    printf '\n%s\n' "$marker" >> "$exclude_file"
  fi
  local pattern
  for pattern in "${exclude_patterns[@]}"; do
    if ! grep -Fqx "$pattern" "$exclude_file" 2>/dev/null; then
      printf '%s\n' "$pattern" >> "$exclude_file"
    fi
  done
}

resolve_redirect_target() {
  python3 - "$redirect_file" <<'PY'
import os, sys
redirect = sys.argv[1]
base = os.path.dirname(redirect)
with open(redirect, 'r', encoding='utf-8') as fh:
    target = fh.read().strip()
print(os.path.realpath(os.path.join(base, target)))
PY
}

worktree_info_json() {
  bd worktree info --json
}

bootstrap_dry_run() {
  bd bootstrap --dry-run --json
}

maybe_bootstrap() {
  bd bootstrap --yes --json >/dev/null
}

repair_broken_beads() {
  local stamp backup_dir
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  backup_dir="$repo_root/.beads-recovery-backups/$stamp"
  mkdir -p "$backup_dir"
  mv "$beads_dir" "$backup_dir/.beads-broken-restore"
  say "Moved broken .beads aside to $backup_dir/.beads-broken-restore"
  maybe_bootstrap
}

if [[ "$fix" == true ]]; then
  ensure_excludes
fi

worktree_info_json=''
redirect_target=''
if [[ "$is_worktree" == true ]]; then
  worktree_info_json="$(worktree_info_json)"
  beads_redirected="$(jq -r '.beads_redirected // false' <<<"$worktree_info_json")"
  if [[ "$beads_redirected" == "true" ]]; then
    if [[ ! -f "$redirect_file" ]]; then
      fail "bd worktree info says Beads is redirected, but .beads/redirect is missing."
    fi
    redirect_target="$(resolve_redirect_target)"
    if [[ ! -e "$redirect_target" ]]; then
      fail ".beads/redirect points to a missing target: $redirect_target"
    fi
  fi
fi

context_json="$(bd context --json)"
dry_run_json="$(bootstrap_dry_run)"
has_existing="$(jq -r '.has_existing // "n/a"' <<<"$dry_run_json")"
action="$(jq -r '.action // "n/a"' <<<"$dry_run_json")"
reason="$(jq -r '.reason // empty' <<<"$dry_run_json")"

broken_restore=false
if [[ -d "$beads_dir" && ! -f "$redirect_file" && "$has_existing" == "false" ]]; then
  broken_restore=true
fi

if [[ "$broken_restore" == true ]]; then
  if [[ "$repair_broken" == true ]]; then
    repair_broken_beads
    context_json="$(bd context --json)"
    dry_run_json="$(bootstrap_dry_run)"
    has_existing="$(jq -r '.has_existing // "n/a"' <<<"$dry_run_json")"
    action="$(jq -r '.action // "n/a"' <<<"$dry_run_json")"
    reason="$(jq -r '.reason // empty' <<<"$dry_run_json")"
  else
    fail ".beads exists but bootstrap still reports has_existing=false. Treat this as a broken manual restore; rerun with --fix --repair-broken. Reason: $reason"
  fi
fi

if [[ ! -d "$beads_dir" && "$is_worktree" == false ]]; then
  if [[ "$fix" == true ]]; then
    maybe_bootstrap
    context_json="$(bd context --json)"
    dry_run_json="$(bootstrap_dry_run)"
    has_existing="$(jq -r '.has_existing // "n/a"' <<<"$dry_run_json")"
    action="$(jq -r '.action // "n/a"' <<<"$dry_run_json")"
    reason="$(jq -r '.reason // empty' <<<"$dry_run_json")"
  else
    fail "No .beads directory present in repo root. Run with --fix to bootstrap it."
  fi
fi

if [[ "$is_worktree" == false && -d "$beads_dir" && ! -f "$redirect_file" && "$fix" == true ]]; then
  chmod 700 "$beads_dir" || warn "Could not chmod 700 $beads_dir"
fi

export_git_add="$(bd config get export.git-add 2>/dev/null || true)"
if [[ "$export_git_add" != "false" ]]; then
  if [[ "$fix" == true ]]; then
    bd config set export.git-add false >/dev/null
    export_git_add=false
  else
    fail "bd config export.git-add is '$export_git_add'; expected 'false'. Run with --fix."
  fi
fi

if [[ "$sync" == true ]]; then
  bd dolt pull >/dev/null
fi

tracked_beads_files="$(git ls-files .beads | tr '\n' ' ')"
if [[ "$tracked_beads_files" != ".beads/PRIME.md " && "$tracked_beads_files" != ".beads/PRIME.md" ]]; then
  warn "Tracked .beads files are unusual: $tracked_beads_files"
fi

say "Beads health OK"
say "- repo: $repo_root"
say "- worktree: $is_worktree"
say "- database: $(jq -r '.database // "unknown"' <<<"$context_json")"
say "- bootstrap.has_existing: $has_existing"
say "- bootstrap.action: $action"
[[ -n "$reason" ]] && say "- bootstrap.reason: $reason"
if [[ "$is_worktree" == true ]]; then
  if [[ -n "$redirect_target" ]]; then
    say "- redirect: $redirect_target"
  else
    say "- redirect: none (shared via git common-dir discovery)"
  fi
fi
say "- export.git-add: $export_git_add"
say "- exclude file: $exclude_file"
