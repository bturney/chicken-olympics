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

## Quality Gate

Run these before opening or merging a PR:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

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
