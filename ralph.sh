#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s <prd-issue> <iterations>\n' "$0"
  printf '\n'
  printf 'Runs a bounded OpenCode Ralph AFK loop targeting one GitHub PRD issue.\n'
  printf '\n'
  printf 'Arguments:\n'
  printf '  prd-issue       GitHub issue URL or number (e.g. 42 or https://github.com/org/repo/issues/42)\n'
  printf '  iterations      Positive integer cap on loop iterations\n'
  printf '\n'
  printf 'Environment overrides:\n'
  printf '  RALPH_REPO=bturney/chicken-olympics\n'
  printf '  RALPH_DRY_RUN=1\n'
  printf '  OPENCODE_AGENT=<agent-name>\n'
  printf '  OPENCODE_MODEL=<provider/model>\n'
  printf '\n'
  printf 'Examples:\n'
  printf '  %s 42 5\n' "$0"
  printf '  %s https://github.com/org/repo/issues/42 5\n' "$0"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 1
fi

prd_arg="$1"
iterations="$2"
repo="${RALPH_REPO:-bturney/chicken-olympics}"

# Normalize PRD: extract issue number from URL or bare number.
if [[ "$prd_arg" =~ github\.com/.*/issues/([0-9]+) ]]; then
  prd_number="${BASH_REMATCH[1]}"
elif [[ "$prd_arg" =~ ^#?([0-9]+)$ ]]; then
  prd_number="${BASH_REMATCH[1]}"
else
  printf 'Invalid PRD argument: "%s". Pass a GitHub issue URL or number.\n' "$prd_arg" >&2
  exit 1
fi

if ! [[ "$iterations" =~ ^[1-9][0-9]*$ ]]; then
  printf 'Iterations must be a positive integer.\n' >&2
  exit 1
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  printf 'Ralph must be run from inside a git repository.\n' >&2
  exit 1
fi

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  printf 'Refusing to run on a detached HEAD. Create/check out a feature branch first.\n' >&2
  exit 1
fi

if [[ "${RALPH_DRY_RUN:-}" != "1" && ("$branch" == "main" || "$branch" == "master") ]]; then
  printf 'Refusing to run on %s. This repo requires feature branches for all changes.\n' "$branch" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  printf 'gh is not installed or not on PATH.\n' >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  printf 'gh is not authenticated. Run gh auth login before using Ralph.\n' >&2
  exit 1
fi

if [[ "${RALPH_DRY_RUN:-}" != "1" ]] && ! command -v opencode >/dev/null 2>&1; then
  printf 'opencode is not installed or not on PATH.\n' >&2
  exit 1
fi

issue_body() {
  gh api "repos/$repo/issues/$1" --jq '.body // ""'
}

issue_comments() {
  gh api "repos/$repo/issues/$1/comments" --paginate --jq '.[].body'
}

issue_state() {
  gh api "repos/$repo/issues/$1" --jq '.state'
}

issue_title() {
  gh api "repos/$repo/issues/$1" --jq '.title'
}

prd_comments() {
  issue_comments "$prd_number"
}

prd_marks_slice_complete() {
  local issue_number="$1"
  local comments

  comments="$(prd_comments)"
  [[ "$comments" == *"<!-- ralph:slice-complete issue=$issue_number"* ]]
}

issue_is_complete() {
  local issue_number="$1"

  if [[ "$(issue_state "$issue_number")" == "closed" ]]; then
    return 0
  fi

  prd_marks_slice_complete "$issue_number"
}

parent_slice_numbers() {
  gh api -X GET "repos/$repo/issues" \
    -f state=all \
    -f labels=ready-for-agent \
    -f per_page=100 \
    --paginate \
    --jq ".[] | select(.pull_request | not) | select(.number != $prd_number) | select((.body // \"\") as \$body | (\$body | contains(\"## Parent\")) and ((\$body | contains(\"https://github.com/$repo/issues/$prd_number\")) or (\$body | contains(\"$repo#$prd_number\")) or (\$body | contains(\"\\n#$prd_number\\n\")))) | .number" \
    | sort -n
}

blocked_by_numbers() {
  local body="$1"
  local in_blocked_by=0
  local line

  while IFS= read -r line; do
    if [[ "$line" =~ ^##[[:space:]]+Blocked[[:space:]]+by ]]; then
      in_blocked_by=1
      continue
    fi

    if ((in_blocked_by)) && [[ "$line" =~ ^##[[:space:]]+ ]]; then
      break
    fi

    if ((in_blocked_by)); then
      while [[ "$line" =~ \#([0-9]+) ]]; do
        printf '%s\n' "${BASH_REMATCH[1]}"
        line="${line#*#${BASH_REMATCH[1]}}"
      done
    fi
  done <<< "$body"
}

blockers_are_complete() {
  local body="$1"
  local blocker

  while IFS= read -r blocker; do
    if [[ -n "$blocker" ]] && ! issue_is_complete "$blocker"; then
      return 1
    fi
  done < <(blocked_by_numbers "$body")

  return 0
}

next_ready_slice() {
  local issue_number
  local body

  while IFS= read -r issue_number; do
    if [[ -z "$issue_number" ]] || issue_is_complete "$issue_number"; then
      continue
    fi

    body="$(issue_body "$issue_number")"
    if blockers_are_complete "$body"; then
      printf '%s\n' "$issue_number"
      return 0
    fi
  done < <(parent_slice_numbers)

  return 1
}

for ((i = 1; i <= iterations; i++)); do
  printf '\n== Ralph iteration %d/%d (PRD #%s) ==\n' "$i" "$iterations" "$prd_number"

  active_slice=""
  if active_slice="$(next_ready_slice)"; then
    active_slice_title="$(issue_title "$active_slice")"
    printf 'Selected slice #%s: %s\n' "$active_slice" "$active_slice_title"

    prompt=$(cat <<PROMPT
GitHub PRD: $repo#$prd_number
Active slice: $repo#$active_slice - $active_slice_title

Ralph iteration contract: this run may complete at most one implementation slice.
After completing, verifying, committing, and commenting on one slice, stop immediately
and output RALPH_STATUS=SLICE_COMPLETE. Do not choose, implement, verify,
commit, or comment on any additional slice in this run. The outer ralph.sh loop is
responsible for starting the next slice in a fresh OpenCode run.

1. Read AGENTS.md, CONTEXT.md, docs/agents/issue-tracker.md, docs/agents/triage-labels.md, the PRD issue, its labels, and its comments.
2. Read only the active slice issue selected above. Do not discover, choose, implement, verify, commit, or comment on any other slice issue.
3. Use only the PRD comments as Ralph's progress log. Read prior Ralph/progress comments on the PRD before deciding what remains in the active slice; do not use slice issue comments as progress state.
4. If the active slice is blocked, needs human input, or lacks enough information, add a short comment to the PRD explaining the state, reference the active slice, include "<!-- ralph:slice-blocked issue=$active_slice -->" or "<!-- ralph:slice-needs-info issue=$active_slice -->", and output RALPH_STATUS=BLOCKED or RALPH_STATUS=NEEDS_INFO.
5. Otherwise, execute only the active slice by using /tdd. Pass the PRD and active slice issue context into the skill.
6. After the skill finishes, run appropriate verification, make one commit for the completed active slice, then comment on the PRD with concise progress, result, verification, active slice number, and commit hash. Include the exact line "<!-- ralph:slice-complete issue=$active_slice -->" in that PRD comment so the outer script can skip it in future iterations.
7. Stop after that one completed slice and output RALPH_STATUS=SLICE_COMPLETE. Do not inspect or start the next slice.
8. Your final response must end with exactly one status line: RALPH_STATUS=SLICE_COMPLETE, RALPH_STATUS=BLOCKED, or RALPH_STATUS=NEEDS_INFO.

Nonnegotiables: follow repo AGENTS.md files, do not push, do not rebase, do not touch unrelated user changes, and do not close issues directly unless the issue explicitly says to.
PROMPT
)
  else
    printf 'No ready unfinished slice found for PRD #%s. Asking OpenCode to assess PRD state only.\n' "$prd_number"

    prompt=$(cat <<PROMPT
GitHub PRD: $repo#$prd_number

The outer ralph.sh loop found no ready unfinished slice issues whose "## Parent" section references this PRD and whose blockers are satisfied.

1. Read AGENTS.md, CONTEXT.md, docs/agents/issue-tracker.md, docs/agents/triage-labels.md, the PRD issue, its labels, and its comments.
2. Do not implement code in this run.
3. Determine whether the PRD is complete, blocked, waiting for human input, missing required information, or needs slice issues created before implementation can continue.
4. If the PRD is complete, add a concise PRD comment explaining the state and output RALPH_STATUS=PRD_COMPLETE.
5. If the PRD is blocked, waiting for human input, missing required information, or needs slice issues created before implementation can continue, add a concise PRD comment explaining the state and output RALPH_STATUS=BLOCKED or RALPH_STATUS=NEEDS_INFO.
6. Do not create new slice issues in this run. Slice decomposition is a separate human-approved /to-issues step.
7. Your final response must end with exactly one status line: RALPH_STATUS=PRD_COMPLETE, RALPH_STATUS=BLOCKED, or RALPH_STATUS=NEEDS_INFO.

Nonnegotiables: follow repo AGENTS.md files, do not push, do not rebase, do not touch unrelated user changes, and do not close issues directly unless the issue explicitly says to.
PROMPT
)
  fi

  if [[ "${RALPH_DRY_RUN:-}" == "1" ]]; then
    printf '\n== Ralph dry run prompt ==\n%s\n' "$prompt"
    exit 0
  fi

  if [[ -n "${OPENCODE_AGENT:-}" && -n "${OPENCODE_MODEL:-}" ]]; then
    result="$(opencode run --agent "$OPENCODE_AGENT" --model "$OPENCODE_MODEL" "$prompt" 2>&1)"
  elif [[ -n "${OPENCODE_AGENT:-}" ]]; then
    result="$(opencode run --agent "$OPENCODE_AGENT" "$prompt" 2>&1)"
  elif [[ -n "${OPENCODE_MODEL:-}" ]]; then
    result="$(opencode run --model "$OPENCODE_MODEL" "$prompt" 2>&1)"
  else
    result="$(opencode run "$prompt" 2>&1)"
  fi

  printf '%s\n' "$result"

  if [[ "$result" == *'RALPH_STATUS=PRD_COMPLETE'* ]]; then
    printf 'PRD complete; exiting.\n'
    exit 0
  elif [[ "$result" == *'RALPH_STATUS=BLOCKED'* ]]; then
    printf 'Ralph blocked; exiting.\n'
    exit 0
  elif [[ "$result" == *'RALPH_STATUS=NEEDS_INFO'* ]]; then
    printf 'Ralph needs human input; exiting.\n'
    exit 0
  elif [[ "$result" == *'RALPH_STATUS=SLICE_COMPLETE'* ]]; then
    if [[ -n "$active_slice" ]] && ! prd_marks_slice_complete "$active_slice"; then
      printf 'OpenCode reported slice completion, but PRD #%s does not have a completion marker comment for slice #%s; exiting for review.\n' "$prd_number" "$active_slice" >&2
      exit 1
    fi
    printf 'Slice complete; continuing to next iteration if any remain.\n'
  else
    printf 'OpenCode did not report a recognized RALPH_STATUS; exiting for review.\n' >&2
    exit 1
  fi
done

printf 'Reached iteration cap (%d). Review progress on PRD #%s.\n' "$iterations" "$prd_number"
