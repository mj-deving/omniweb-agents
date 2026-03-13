#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="${ROOT_DIR}/.git/.drift-guard-state"

SENSITIVE_FILES=(
  "tools/verify.ts"
  "tools/publish.ts"
  "tools/lib/publish-pipeline.ts"
  "tools/session-runner.ts"
)

usage() {
  cat <<'EOF'
Usage:
  tools/check-drift.sh snapshot
  tools/check-drift.sh check
  tools/check-drift.sh run -- <command...>

Behavior:
  snapshot   Record sha256 hashes for sensitive files into .git/.drift-guard-state
  check      Compare current hashes against the last snapshot and fail on drift
  run        Snapshot, run the given command, then compare and fail on drift

Environment:
  DRIFT_STATE_FILE   Override snapshot file path
EOF
}

hash_cmd() {
  if command -v sha256sum >/dev/null 2>&1; then
    echo "sha256sum"
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    echo "shasum -a 256"
    return
  fi
  echo "No sha256 tool found (need sha256sum or shasum)." >&2
  exit 1
}

write_snapshot() {
  local hash_tool
  hash_tool="$(hash_cmd)"
  local tmp_file
  tmp_file="$(mktemp)"

  : > "${tmp_file}"
  for rel in "${SENSITIVE_FILES[@]}"; do
    local abs="${ROOT_DIR}/${rel}"
    if [[ ! -f "${abs}" ]]; then
      echo "MISSING  ${rel}" >> "${tmp_file}"
      continue
    fi
    local digest
    if [[ "${hash_tool}" == "sha256sum" ]]; then
      digest="$(sha256sum "${abs}" | awk '{print $1}')"
    else
      digest="$(shasum -a 256 "${abs}" | awk '{print $1}')"
    fi
    printf '%s  %s\n' "${digest}" "${rel}" >> "${tmp_file}"
  done

  mkdir -p "$(dirname "${STATE_FILE}")"
  mv "${tmp_file}" "${STATE_FILE}"
  echo "Snapshot written: ${STATE_FILE}"
}

check_snapshot() {
  if [[ ! -f "${STATE_FILE}" ]]; then
    echo "No snapshot file: ${STATE_FILE}" >&2
    exit 1
  fi

  local expected current tmp_file
  tmp_file="$(mktemp)"
  write_snapshot_to "${tmp_file}"

  local drift=0
  while IFS= read -r line; do
    expected="${line}"
    current="$(grep -F "  ${expected##*  }" "${tmp_file}" || true)"
    if [[ "${expected}" != "${current}" ]]; then
      if [[ ${drift} -eq 0 ]]; then
        echo "Drift detected:"
      fi
      drift=1
      echo "  expected: ${expected}"
      echo "  current:  ${current:-<missing>}"
    fi
  done < "${STATE_FILE}"

  rm -f "${tmp_file}"

  if [[ ${drift} -ne 0 ]]; then
    exit 1
  fi

  echo "No drift detected."
}

write_snapshot_to() {
  local target_file="$1"
  local hash_tool
  hash_tool="$(hash_cmd)"

  : > "${target_file}"
  for rel in "${SENSITIVE_FILES[@]}"; do
    local abs="${ROOT_DIR}/${rel}"
    if [[ ! -f "${abs}" ]]; then
      echo "MISSING  ${rel}" >> "${target_file}"
      continue
    fi
    local digest
    if [[ "${hash_tool}" == "sha256sum" ]]; then
      digest="$(sha256sum "${abs}" | awk '{print $1}')"
    else
      digest="$(shasum -a 256 "${abs}" | awk '{print $1}')"
    fi
    printf '%s  %s\n' "${digest}" "${rel}" >> "${target_file}"
  done
}

run_guarded() {
  if [[ $# -eq 0 ]]; then
    echo "Missing command after run --" >&2
    exit 1
  fi

  local original_state_file="${STATE_FILE}"
  local temp_state_file=""
  if [[ -z "${DRIFT_STATE_FILE:-}" ]]; then
    temp_state_file="$(mktemp "${ROOT_DIR}/.git/.drift-guard-run.XXXXXX")"
    STATE_FILE="${temp_state_file}"
  fi
  trap '[[ -n "${temp_state_file:-}" ]] && rm -f "${temp_state_file}"' RETURN

  write_snapshot
  "$@"
  check_snapshot

  STATE_FILE="${original_state_file}"
}

main() {
  cd "${ROOT_DIR}"
  STATE_FILE="${DRIFT_STATE_FILE:-${STATE_FILE}}"

  local subcommand="${1:-}"
  case "${subcommand}" in
    snapshot)
      write_snapshot
      ;;
    check)
      check_snapshot
      ;;
    run)
      shift
      if [[ "${1:-}" == "--" ]]; then
        shift
      fi
      run_guarded "$@"
      ;;
    -h|--help|"")
      usage
      ;;
    *)
      echo "Unknown subcommand: ${subcommand}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
