#!/usr/bin/env bash
set -euo pipefail

required_node_major="${AGENT_REQUIRED_NODE_MAJOR:-24}"
node_major="$(node --version 2>/dev/null | cut -d. -f1 | tr -d v || true)"

if [[ "$node_major" != "$required_node_major" ]]; then
  printf 'Node %s is required; found %s. Provision the declared runner toolchain.\n' \
    "$required_node_major" "${node_major:-missing}" >&2
  exit 1
fi

if [[ ! -f package-lock.json ]]; then
  printf 'package-lock.json is required for a reproducible bootstrap.\n' >&2
  exit 1
fi

npm ci
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium

printf 'Bootstrap ready: Node %s, locked dependencies, and Chromium are available.\n' \
  "$(node --version)"
