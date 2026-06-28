import { describe, it, expect } from "vitest";
import {
  createClaimAnimationState,
  startClaimAnimation,
  getActiveClaimAnimation,
  tickClaimAnimations,
  computeClaimPopScale,
  CLAIM_FEEDBACK_DURATION_MS,
  type ClaimAnimationState,
} from "../src/match/rules";

describe("CLAIM_FEEDBACK_DURATION_MS", () => {
  it("defines a short, positive feedback duration in milliseconds", () => {
    expect(CLAIM_FEEDBACK_DURATION_MS).toBeGreaterThan(0);
    expect(CLAIM_FEEDBACK_DURATION_MS).toBeLessThanOrEqual(1_000);
  });
});

describe("createClaimAnimationState", () => {
  it("starts with no claim animations", () => {
    const state = createClaimAnimationState();

    expect(state.animations).toEqual([]);
  });
});

describe("startClaimAnimation", () => {
  it("records an active claim animation for the claimed slot and player", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      1,
      3,
      0,
      1_000,
    );

    const active = getActiveClaimAnimation(state, 1, 1_000);
    expect(active).not.toBeNull();
    expect(active?.slotIndex).toBe(1);
    expect(active?.spotIndex).toBe(3);
    expect(active?.playerIndex).toBe(0);
    expect(active?.startedAtMs).toBe(1_000);
  });

  it("records the claiming player index for player 2 claims", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      2,
      0,
      1,
      500,
    );

    const active = getActiveClaimAnimation(state, 2, 500);
    expect(active?.playerIndex).toBe(1);
  });

  it("keeps multiple animations for different slots running concurrently", () => {
    let state = createClaimAnimationState();
    state = startClaimAnimation(state, 0, 0, 0, 0);
    state = startClaimAnimation(state, 1, 1, 1, 50);
    state = startClaimAnimation(state, 2, 2, 0, 100);

    expect(getActiveClaimAnimation(state, 0, 200)?.playerIndex).toBe(0);
    expect(getActiveClaimAnimation(state, 1, 200)?.playerIndex).toBe(1);
    expect(getActiveClaimAnimation(state, 2, 200)?.playerIndex).toBe(0);
  });

  it("preserves a new animation for the same slot even if one is already active", () => {
    let state = createClaimAnimationState();
    state = startClaimAnimation(state, 0, 0, 0, 1_000);
    state = startClaimAnimation(state, 0, 1, 1, 1_050);

    const active = getActiveClaimAnimation(state, 0, 1_050);
    expect(active?.playerIndex).toBe(1);
    expect(active?.startedAtMs).toBe(1_050);
  });
});

describe("getActiveClaimAnimation", () => {
  it("returns the animation while the current time is within the duration", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      0,
      0,
      0,
      1_000,
    );

    expect(getActiveClaimAnimation(state, 0, 1_000)).not.toBeNull();
    expect(
      getActiveClaimAnimation(state, 0, 1_000 + CLAIM_FEEDBACK_DURATION_MS - 1),
    ).not.toBeNull();
  });

  it("returns null once the duration has elapsed", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      0,
      0,
      0,
      1_000,
    );

    expect(
      getActiveClaimAnimation(state, 0, 1_000 + CLAIM_FEEDBACK_DURATION_MS),
    ).toBeNull();
    expect(
      getActiveClaimAnimation(
        state,
        0,
        1_000 + CLAIM_FEEDBACK_DURATION_MS + 50,
      ),
    ).toBeNull();
  });

  it("returns null for a slot with no claim animation", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      0,
      0,
      0,
      1_000,
    );

    expect(getActiveClaimAnimation(state, 1, 1_000)).toBeNull();
    expect(getActiveClaimAnimation(state, 2, 1_000)).toBeNull();
  });
});

describe("tickClaimAnimations", () => {
  it("removes claim animations whose duration has elapsed", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      0,
      0,
      0,
      1_000,
    );

    const ticked = tickClaimAnimations(
      state,
      1_000 + CLAIM_FEEDBACK_DURATION_MS,
    );

    expect(ticked.animations).toEqual([]);
  });

  it("keeps claim animations that are still within their duration", () => {
    const state = startClaimAnimation(
      createClaimAnimationState(),
      0,
      0,
      0,
      1_000,
    );

    const ticked = tickClaimAnimations(
      state,
      1_000 + CLAIM_FEEDBACK_DURATION_MS - 1,
    );

    expect(ticked.animations).toHaveLength(1);
    expect(ticked.animations[0]?.slotIndex).toBe(0);
  });

  it("preserves other in-flight animations while removing completed ones", () => {
    let state: ClaimAnimationState = createClaimAnimationState();
    state = startClaimAnimation(state, 0, 0, 0, 1_000);
    state = startClaimAnimation(state, 1, 1, 1, 1_500);
    state = startClaimAnimation(state, 2, 2, 0, 1_000);

    const ticked = tickClaimAnimations(
      state,
      1_000 + CLAIM_FEEDBACK_DURATION_MS,
    );

    expect(ticked.animations).toHaveLength(1);
    expect(ticked.animations[0]?.slotIndex).toBe(1);
    expect(ticked.animations[0]?.startedAtMs).toBe(1_500);
  });
});

describe("computeClaimPopScale", () => {
  it("returns the natural scale at the start of the feedback window", () => {
    expect(computeClaimPopScale(1_000, 1_000)).toBeCloseTo(1, 6);
  });

  it("peaks above the natural scale halfway through the feedback window", () => {
    const peakTime = 1_000 + CLAIM_FEEDBACK_DURATION_MS / 2;
    const scale = computeClaimPopScale(1_000, peakTime);

    expect(scale).toBeGreaterThan(1);
    expect(scale).toBeLessThanOrEqual(1.5);
  });

  it("shrinks to zero at the end of the feedback window", () => {
    const endTime = 1_000 + CLAIM_FEEDBACK_DURATION_MS;
    const scale = computeClaimPopScale(1_000, endTime);

    expect(scale).toBe(0);
  });

  it("returns zero once the feedback window has elapsed", () => {
    const pastTime = 1_000 + CLAIM_FEEDBACK_DURATION_MS + 50;
    expect(computeClaimPopScale(1_000, pastTime)).toBe(0);
  });

  it("returns the natural scale before the animation starts", () => {
    expect(computeClaimPopScale(1_000, 500)).toBeCloseTo(1, 6);
  });

  it("scales up monotonically during the first half of the feedback window", () => {
    let previous = -Infinity;
    for (let i = 0; i <= 5; i++) {
      const t = 1_000 + (i * CLAIM_FEEDBACK_DURATION_MS) / 10;
      const scale = computeClaimPopScale(1_000, t);
      expect(scale).toBeGreaterThanOrEqual(previous);
      previous = scale;
    }
  });
});
