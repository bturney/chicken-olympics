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

if [[ "$branch" == "main" || "$branch" == "master" ]]; then
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

if ! command -v opencode >/dev/null 2>&1; then
  printf 'opencode is not installed or not on PATH.\n' >&2
  exit 1
fi

for ((i = 1; i <= iterations; i++)); do
  printf '\n== Ralph iteration %d/%d (PRD #%s) ==\n' "$i" "$iterations" "$prd_number"

  prompt=$(cat <<PROMPT
GitHub PRD: $repo#$prd_number

1. Read AGENTS.md, CONTEXT.md, docs/agents/issue-tracker.md, docs/agents/triage-labels.md, the PRD issue, its labels, and its comments.
2. Discover slice issues created by the /to-issues flow. They are normal GitHub issues, not GitHub sub-issues. Look for issues whose body has a "## Parent" section referencing $repo#$prd_number, #$prd_number, or https://github.com/$repo/issues/$prd_number. Use gh issue list/search; do not use the GitHub sub-issues API.
3. If slice issues exist, choose the next unfinished ready slice from that discovered set. Respect its "## Blocked by" section and skip closed, blocked, or not-ready slices.
4. If no slice issues exist, decide the next smallest unfinished vertical slice from the PRD body and comments. Create slice issues only if the PRD clearly needs /to-issues-style decomposition before implementation.
5. Use the PRD comments as the overall progress log, and the active slice issue comments as the slice progress log. Read prior Ralph/progress comments before deciding what remains.
6. If there is no remaining work, or the next work is blocked, needs human input, or lacks enough information, add a short comment to the PRD or active slice explaining the state and output <promise>COMPLETE</promise>.
7. Otherwise, execute the chosen work by using /tdd. Pass the PRD and active slice issue context into the skill.
8. After the skill finishes, run appropriate verification, make one commit for the completed slice, then comment on the PRD or active slice with concise progress, result, verification, and commit hash.

Nonnegotiables: follow repo AGENTS.md files, do not push, do not rebase, do not touch unrelated user changes, and do not close issues directly unless the issue explicitly says to.
PROMPT
)

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

  if [[ "$result" == *'<promise>COMPLETE</promise>'* ]]; then
    printf 'Issue complete or blocked; exiting.\n'
    exit 0
  fi
done

printf 'Reached iteration cap (%d). Review progress on PRD #%s.\n' "$iterations" "$prd_number"
