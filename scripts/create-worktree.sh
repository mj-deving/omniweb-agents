#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: scripts/create-worktree.sh <name> [branch] [--base <ref>]

Creates a shared-Beads worktree at ../demos-agents-worktrees/<name> based on
<ref> (default: origin/main). The new branch defaults to <name> unless an
explicit branch name is provided as the second positional argument.

Always produces a worktree with BOTH:
  (a) the requested base ref as starting commit
  (b) a .beads/redirect file so it shares the parent's Beads database
      (verify with: cd <path> && bd worktree info)

Examples:
  scripts/create-worktree.sh research-pass
      # base=origin/main, branch=research-pass

  scripts/create-worktree.sh research-pass codex/research-pass
      # base=origin/main, branch=codex/research-pass

  scripts/create-worktree.sh hotfix --base origin/release/v2
      # base=origin/release/v2, branch=hotfix
EOF
  exit 1
}

base="origin/main"
positional=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      [[ $# -lt 2 ]] && { echo "Error: --base requires a value" >&2; usage; }
      base="$2"
      shift 2
      ;;
    --base=*)
      base="${1#--base=}"
      shift
      ;;
    -h|--help)
      usage
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do positional+=("$1"); shift; done
      ;;
    -*)
      echo "Error: unknown flag: $1" >&2
      usage
      ;;
    *)
      positional+=("$1")
      shift
      ;;
  esac
done

if [[ ${#positional[@]} -lt 1 || ${#positional[@]} -gt 2 ]]; then
  usage
fi

name="${positional[0]}"
branch="${positional[1]:-$name}"

common_git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
main_repo_root="$(dirname "$common_git_dir")"
target_root="$(dirname "$main_repo_root")/demos-agents-worktrees"
target_path="$target_root/$name"

if ! git rev-parse --verify --quiet "$base" >/dev/null; then
  echo "Error: base ref '$base' not found. Run 'git fetch' first or check the ref name." >&2
  exit 1
fi

mkdir -p "$target_root"

if [[ -e "$target_path" ]]; then
  echo "Worktree path already exists: $target_path" >&2
  exit 1
fi

echo "Creating shared Beads worktree at: $target_path"
echo "Branch: $branch"
echo "Base:   $base"

bd worktree create "$target_path" --branch "$branch"

# bd worktree create inherits the parent's HEAD as the new branch's starting
# commit. The parent's HEAD is routinely an incidental/stale branch in this
# 100-worktree repo, so we lock the base explicitly. Reset is safe: the
# branch was just created with no work yet.
if [[ "$(git -C "$target_path" rev-parse HEAD)" != "$(git rev-parse "$base")" ]]; then
  echo "Resetting worktree to $base..."
  git -C "$target_path" reset --hard "$base"
fi

source_node_modules="$main_repo_root/node_modules"
target_node_modules="$target_path/node_modules"

if [[ -d "$source_node_modules" && ! -e "$target_node_modules" ]]; then
  ln -s "$source_node_modules" "$target_node_modules"
  echo "Linked node_modules into worktree: $target_node_modules -> $source_node_modules"
fi
