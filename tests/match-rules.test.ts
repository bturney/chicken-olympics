import { describe, it, expect } from "vitest";
import {
  createMatchState,
  tick,
  addScore,
  getWinner,
  DEFAULT_MATCH_DURATION_MS,
} from "../src/match/rules";

describe("createMatchState", () => {
  it("initializes both player scores to zero", () => {
    const state = createMatchState();

    expect(state.scores).toEqual([0, 0]);
  });

  it("initializes elapsed time to zero", () => {
    const state = createMatchState();

    expect(state.elapsedMs).toBe(0);
  });

  it("initializes match as not complete", () => {
    const state = createMatchState();

    expect(state.isComplete).toBe(false);
  });
});

describe("tick", () => {
  it("advances elapsed time by the given delta", () => {
    const state = createMatchState();
    const next = tick(state, 500);

    expect(next.elapsedMs).toBe(500);
  });

  it("does not mark the match complete before duration is reached", () => {
    const state = createMatchState();
    const next = tick(state, DEFAULT_MATCH_DURATION_MS - 1);

    expect(next.isComplete).toBe(false);
  });

  it("marks the match complete when elapsed reaches the duration", () => {
    const state = createMatchState();
    const next = tick(state, DEFAULT_MATCH_DURATION_MS);

    expect(next.isComplete).toBe(true);
  });

  it("marks the match complete when elapsed exceeds the duration", () => {
    const state = createMatchState();
    const next = tick(state, DEFAULT_MATCH_DURATION_MS + 1);

    expect(next.isComplete).toBe(true);
  });
});

describe("addScore", () => {
  it("adds points to player 1 score", () => {
    const state = createMatchState();
    const next = addScore(state, 0, 1);

    expect(next.scores).toEqual([1, 0]);
  });

  it("adds points to player 2 score", () => {
    const state = createMatchState();
    const next = addScore(state, 1, 1);

    expect(next.scores).toEqual([0, 1]);
  });

  it("accumulates multiple scoring events for the same player", () => {
    let state = createMatchState();
    state = addScore(state, 0, 1);
    state = addScore(state, 0, 1);

    expect(state.scores).toEqual([2, 0]);
  });
});

describe("getWinner", () => {
  it("returns null for a 0-0 tie", () => {
    const state = createMatchState();

    expect(getWinner(state)).toBeNull();
  });

  it("returns 0 when player 1 has a higher score", () => {
    const state = addScore(createMatchState(), 0, 1);

    expect(getWinner(state)).toBe(0);
  });

  it("returns 1 when player 2 has a higher score", () => {
    const state = addScore(createMatchState(), 1, 1);

    expect(getWinner(state)).toBe(1);
  });

  it("returns null for a 3-3 tie", () => {
    let state = createMatchState();
    state = addScore(state, 0, 3);
    state = addScore(state, 1, 3);

    expect(getWinner(state)).toBeNull();
  });
});
