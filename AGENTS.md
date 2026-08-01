## Agent skills

## Agent lifecycle

Run `npm run agent:bootstrap` before implementation in a clean checkout. It
requires Node 24, installs the locked dependencies and browser runtime, and
never asks for credentials. Run `npm run agent:verify` before handing work
back; it writes logs, a Playwright report, and a manifest beneath
`artifacts/<task-id>/<attempt-id>/`. Always run `npm run agent:teardown` after
verification, including after failures.

The runner owns the isolated checkout, Node 24, npm network access, and any
scoped GitHub identity. This game has no runtime secrets or backend. Do not
run deployment commands or push branches unless the assigned task explicitly
requires it.

### Issue tracker

Issues live in GitHub Issues on `bturney/chicken-olympics`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/` at root). See `docs/agents/domain.md`.
