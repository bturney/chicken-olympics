# Chicken Olympics

Chicken Olympics is a local two-player browser game built with Phaser 4, TypeScript, Vite, and npm. The current validation spike proves the core runtime path: setup scene, local Match, simultaneous keyboard movement, timed Chick peeks, overlap-based Claims, scoring, and Podium Ceremony.

## Requirements

- Node 24
- npm

## Install

```bash
npm install
```

## Run Locally

Start the Vite dev server:

```bash
npm run dev
```

Then open the local URL printed by Vite, usually `http://localhost:5173`.

## Controls

- Player 1: `WASD`
- Player 2: arrow keys

## Test

Run the unit tests:

```bash
npm test
```

Run the Playwright smoke tests:

```bash
npm run test:e2e
```

If Firefox fails to launch because a system audio library is missing in this environment, use the CI-style script:

```bash
npm run test:e2e:ci
```

## Quality Gate

Run these before opening or merging a PR:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:e2e
npm run build
```

If `npm run test:e2e` fails only because of missing local browser system libraries, run `npm run test:e2e:ci` and include that result in your notes.

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Notes

- Game design lives in `docs/game-design.md`.
- Runtime/tooling decisions live in `docs/technology-tooling.md`.
- ADRs live in `docs/adr/`.
- Domain language lives in `CONTEXT.md`.
