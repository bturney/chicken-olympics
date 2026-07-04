# Art and Audio Slice Brief

## Purpose

Prove a higher-fidelity art and sound direction inside an active local match before replacing all prototype presentation. The slice succeeds only if players can read the normal claim loop clearly at play speed.

## Slice Scope

- Player chicken sprites using one shared recolorable base for blue, red, purple, and orange player chickens.
- Normal yellow chick sprites.
- A small number of hiding spot sprites, starting with two readable types such as a bush and hay bale.
- Low-contrast Farmyard Stadium framing that supports the premise without competing with chicks or hiding spots.
- Normal claim feedback, including a small poof or burst and claim score echo support.
- A small authored SFX pack for normal claim chirp/pop variants, while generated WebAudio remains fallback scaffolding.

## Runtime Asset Shape

- Use PNG spritesheets for the first runtime art assets.
- Keep animation frame counts minimal and readability-driven.
- Let code-driven motion handle lightweight bob, squash, and simple claim timing where it remains readable.
- Do not introduce a full texture atlas pipeline until the asset count justifies it.

## Provenance

- Track the creator, source, and license for each committed runtime asset and source file.
- Prefer repo-owned or explicitly licensed bespoke assets.
- Keep exported runtime assets in the repo when they are small enough to version comfortably.
- Use a simple human-readable manifest, such as `public/assets/manifest.md`, when the first assets are committed.
- Treat AI-generated drafts as concept material only unless their reuse rights are explicit.

## Out Of Scope

- Full arena replacement.
- Busy decorative farm props that could be confused with hiding spots.
- Green chick showcase art or fanfare pass.
- Podium ceremony polish.
- Menu or title-screen polish.
- Different player chicken silhouettes per color.
- A full formal art bible before the slice has been playtested.

## Pass/Fail Criteria

The slice passes when players in an active local match can tell player chickens, chicks, hiding spots, and claim ownership apart without relying on the scoreboard. It fails if the art is prettier but peeks, claims, or player ownership become harder to understand.
