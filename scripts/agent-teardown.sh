#!/usr/bin/env bash
set -euo pipefail

# Playwright owns and stops its Vite child process after every browser run.
# This lifecycle has no database, container, or persistent service to tear down.
printf 'Teardown complete: no persistent services were started.\n'
