#!/usr/bin/env bash
set -euo pipefail

task_id="${AGENT_TASK_ID:-local}"
attempt_id="${AGENT_ATTEMPT_ID:-1}"
artifact_directory="artifacts/${task_id}/${attempt_id}"

if [[ ! "$task_id" =~ ^[A-Za-z0-9._-]+$ ]] || [[ ! "$attempt_id" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf 'AGENT_TASK_ID and AGENT_ATTEMPT_ID may contain only letters, digits, dots, underscores, and hyphens.\n' >&2
  exit 1
fi

mkdir -p "$artifact_directory"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

run_gate() {
  local name="$1"
  shift

  if "$@" >"$artifact_directory/${name}.log" 2>&1; then
    printf '%s: passed\n' "$name"
    return 0
  fi

  printf '%s: failed; see %s/%s.log\n' "$name" "$artifact_directory" "$name" >&2
  return 1
}

result="passed"
for gate in typecheck lint format-check unit build browser; do
  case "$gate" in
    typecheck) run_gate "$gate" npm run typecheck ;;
    lint) run_gate "$gate" npm run lint ;;
    format-check) run_gate "$gate" npm run format:check ;;
    unit) run_gate "$gate" npm test ;;
    build) run_gate "$gate" npm run build ;;
    browser) AGENT_ARTIFACTS="$artifact_directory" run_gate "$gate" npm run test:e2e ;;
  esac || {
    result="failed"
    break
  }
done

finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"task_id":"%s","attempt_id":"%s","started_at":"%s","finished_at":"%s","result":"%s","artifacts":"%s"}\n' \
  "$task_id" "$attempt_id" "$started_at" "$finished_at" "$result" "$artifact_directory" \
  >"$artifact_directory/manifest.json"

[[ "$result" == "passed" ]]
