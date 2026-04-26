#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

database_name="omniweb_agents"
project_id="da77df22-f217-4564-905e-759bb744b93c"
primary_remote="git+https://github.com/mj-deving/omniweb-agents.git"
backup_remote="https://doltremoteapi.dolthub.com/mj-deving/omniweb-agents-beads"
verify_bead="${VERIFY_BEAD:-omniweb-agents-hj6l}"
target=".beads/embeddeddolt/$database_name"

force=false
if [[ "${1:-}" == "--force" ]]; then
  force=true
elif [[ $# -gt 0 ]]; then
  echo "Usage: scripts/restore-beads-db.sh [--force]" >&2
  exit 2
fi

for cmd in git dolt bd; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

mkdir -p .beads/embeddeddolt

if [[ -e "$target" ]]; then
  if [[ "$force" != true ]]; then
    cat >&2 <<EOF
Canonical Beads DB already exists at $target.
Run with --force to move the current embedded Dolt directory aside and reclone.
EOF
    exit 0
  fi

  stamp="$(date +%Y%m%d%H%M%S)"
  backup=".beads/embeddeddolt.shadow.$stamp"
  echo "Moving existing embedded Dolt directory to $backup"
  mv .beads/embeddeddolt "$backup"
  mkdir -p .beads/embeddeddolt
fi

echo "Cloning canonical Beads Dolt DB from $primary_remote"
dolt clone "$primary_remote" "$target"

cat > .beads/metadata.json <<EOF
{
  "database": "dolt",
  "backend": "dolt",
  "dolt_mode": "embedded",
  "dolt_database": "$database_name",
  "project_id": "$project_id"
}
EOF

cat > .beads/config.yaml <<EOF
no-git-ops: true

federation.remote: "$backup_remote"
EOF

echo "Recovered Beads DB:"
bd context --json

echo "Verifying known bead: $verify_bead"
bd show "$verify_bead" --json >/dev/null

cat <<EOF
Beads recovery complete.

Next:
  bd dolt pull
  bd ready --json
EOF
