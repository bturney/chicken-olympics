# Deepen Match Presentation Feedback Behind One Module

Status: accepted

## Context

Claim-triggered presentation feedback — normal claim beat, green chick claim beat, claim score echo, and score bump — is scattered across three locations: `rules.ts` exports claim animation helpers, `MatchPresentationFeedback.ts` is a thin wrapper forwarding to those helpers, and `MatchScene.ts` owns green claim beat and score echo state directly as private fields. Understanding one claim-feedback concept requires bouncing between all three files.

## Decision

Deepen `MatchPresentationFeedback` into a scene-local module that owns all claim-triggered feedback timing behind a single interface.

**Module boundary:** Commands, not queries. The scene pushes `MatchEvent[]` + elapsed time into the module each frame; the module returns a list of declarative feedback commands.

**Input interface:** Single call — `update(events: MatchEvent[], elapsedMs: number): FeedbackCommand[]`. No separate handle/tick split.

**SFX ownership:** The module emits SFX commands. Sound is part of the claim beat (the glossary defines Claim Beat as "the paired animation-and-sound moment"), so the module owns when to play it.

**Rendering detail:** Rich commands with computed parameters. The module computes scale, progress, color, etc. The scene applies values without knowing beat duration or easing curves. Exception: green claim burst visual design (circles, lines, radial spokes) stays in the scene — the module returns a thin command with progress, and the scene owns what the burst looks like.

**Construction:** `new MatchPresentationFeedback({ spotPositions, playerColors })`. Spot positions and player colors are fixed per match and passed at construction time, keeping the update signature clean.

**What moves from `rules.ts`:** All claim animation state, types, and helpers (`ClaimAnimationState`, `startClaimAnimation`, `getActiveClaimAnimation`, `tickClaimAnimations`, `computeClaimPopScale`, `CLAIM_FEEDBACK_DURATION_MS`, `CLAIM_POP_PEAK_SCALE`) become private internals of the module.

**What moves from `MatchScene.ts`:** Green claim beat state and timing, claim score echo lifecycle, `bumpScoreText`, and SFX dispatch.

**Scene's role after deepening:** `handleMatchEvents` becomes a forwarding layer that calls `this.presentationFeedback.update(events, elapsedMs)` and applies the returned commands. No event interpretation left in the scene.

**Test approach:** `tests/claim-animations.test.ts` rewrites to test through the module's command output — asserting on `normalClaimBeat` scale values, `greenClaimBeat` progress, etc. — rather than testing raw helpers.

## Considered alternatives

- **Scene queries active feedback state each frame.** Rejected: would require separate getters for each feedback type, contradicting the "one interface" goal.
- **Module also owns burst visual design.** Rejected: burst rendering involves Phaser Graphics calls that belong in the scene. Module owns timing (progress), scene owns shapes.
- **Keep claim animation helpers in `rules.ts`.** Rejected: these are presentation concerns, not match rules. Moving them into the module keeps `rules.ts` focused on match logic.

## Consequences

- `rules.ts` shrinks: claim animation exports move into the module.
- `MatchScene.ts` loses ~200 lines of green claim beat and score echo code.
- Tests become more behavior-focused: they exercise the module's command output rather than internal helpers.
- Adding new feedback types (e.g., a future stadium reaction) means adding a new command variant and extending the module, rather than scattering logic across the scene.
