# Technology and Tooling

Chicken Olympics will start as a static browser game optimized for a two-player local match on one keyboard.

## Runtime

- Game engine: Phaser 4 with TypeScript.
- Collision: Phaser Arcade Physics for simple bounds and overlap-based claiming.
- App shape: title screen, color selection, match, and podium ceremony are all Phaser scenes.
- State management: no external state library.
- Backend: none for the first playable.

## Project Tooling

- Scaffold: start from the official Phaser Vite/TypeScript template, then trim generated clutter.
- Build tool: Vite.
- Package manager: npm.
- Node: Node 24 with npm.
- UI framework: none for the first playable.

## Testing and Quality

- TypeScript: strict mode.
- Unit tests: Vitest for pure match rules and state helpers.
- Browser smoke test: Playwright verifies the game loads and shows the initial canvas/title.
- Linting: ESLint.
- Formatting: Prettier.
- CI: GitHub Actions runs install, typecheck, lint, Vitest, Playwright smoke test, and Vite build.

## Assets and Layout

- Assets: committed PNG/SVG files, with simple placeholder art acceptable for the first playable.
- No texture atlas pipeline, Spine, Tiled, or custom asset build step initially.
- Farmyard Stadium layout: typed TypeScript layout config for arena bounds and hiding spot positions/types.
- Audio: no separate audio tooling; if sounds are added later, use Phaser's built-in audio support with committed files.

## Deployment

- Host the first playable on GitHub Pages.
- Deploy from GitHub Actions only after the CI quality gate passes on the main branch.
- Configure Vite for the repository's GitHub Pages base path when implementation begins.

## Validation Spike

Before building the full MVP, build a tiny playable Phaser 4 spike that proves:

- Two players can move at the same time with WASD and arrow keys.
- A player chicken can claim a peeking chick through an overlap check.
- Timed peeks and match timers work.
- Scene transitions work from setup to match to podium.

If the spike exposes unacceptable Phaser 4 API/docs risk, revisit ADR 0001 before continuing.
