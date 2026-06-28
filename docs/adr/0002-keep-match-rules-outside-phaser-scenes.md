# Keep Match Rules Outside Phaser Scenes

Phaser scenes will own rendering, input, audio, and scene transitions, but match rules will live in pure TypeScript modules that scenes call. This keeps scoring, chick lifecycle, green chick scheduling, hiding spot selection, and win calculation testable through a small interface with Vitest, instead of coupling the rules to canvas rendering and Phaser lifecycle details. The rules module should accept deterministic time/randomness inputs so peek scheduling and the once-per-match green chick can be verified without flaky tests.
