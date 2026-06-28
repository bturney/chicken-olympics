import { describe, it, expect } from "vitest";
import {
  createMatchState,
  tick,
  addScore,
  getWinner,
  createPeekState,
  startPeek,
  isPeekActive,
  expirePeek,
  selectNextPeekSpot,
  attemptClaim,
  DEFAULT_MATCH_DURATION_MS,
  DEFAULT_PEEK_DURATION_MS,
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

describe("selectNextPeekSpot", () => {
  it("returns 0 when random value is at the start of the range", () => {
    const spot = selectNextPeekSpot(4, 0);
    expect(spot).toBe(0);
  });

  it("returns last spot when random value is near 1", () => {
    const spot = selectNextPeekSpot(4, 0.999);
    expect(spot).toBe(3);
  });

  it("returns different spots for different random values", () => {
    const a = selectNextPeekSpot(4, 0.1);
    const b = selectNextPeekSpot(4, 0.6);
    expect(a).not.toBe(b);
  });
});

describe("peek lifecycle", () => {
  it("starts with no active peek", () => {
    const state = createPeekState();
    expect(isPeekActive(state, 0)).toBe(false);
  });

  it("activates a peek at the given spot and time", () => {
    const state = startPeek(createPeekState(), 1000, 2);
    expect(isPeekActive(state, 1000)).toBe(true);
    expect(state.activeSpotIndex).toBe(2);
  });

  it("deactivates a peek after the peek duration", () => {
    const state = startPeek(createPeekState(), 1000, 1);
    expect(isPeekActive(state, 1000)).toBe(true);
    expect(isPeekActive(state, 1000 + DEFAULT_PEEK_DURATION_MS)).toBe(false);
  });

  it("deactivates a peek after the peek duration plus some", () => {
    const state = startPeek(createPeekState(), 1000, 1);
    expect(isPeekActive(state, 1000 + DEFAULT_PEEK_DURATION_MS + 1)).toBe(
      false,
    );
  });

  it("keeps a peek active before the duration expires", () => {
    const state = startPeek(createPeekState(), 1000, 3);
    expect(isPeekActive(state, 1000 + DEFAULT_PEEK_DURATION_MS - 1)).toBe(true);
  });

  it("expirePeek clears the active peek", () => {
    let state = startPeek(createPeekState(), 1000, 1);
    expect(isPeekActive(state, 1000)).toBe(true);

    state = expirePeek(state);
    expect(isPeekActive(state, 5000)).toBe(false);
    expect(state.activeSpotIndex).toBeNull();
  });
});

describe("attemptClaim", () => {
  it("scores one point for the claiming player and clears the peek", () => {
    const match = createMatchState();
    const peek = startPeek(createPeekState(), 2000, 1);
    const result = attemptClaim(match, peek, 0, 2000);

    expect(result.claimed).toBe(true);
    expect(result.matchState.scores).toEqual([1, 0]);
    expect(result.peekState.activeSpotIndex).toBeNull();
  });

  it("does not claim when no peek is active", () => {
    const match = createMatchState();
    const peek = createPeekState();
    const result = attemptClaim(match, peek, 0, 1000);

    expect(result.claimed).toBe(false);
    expect(result.matchState.scores).toEqual([0, 0]);
    expect(result.peekState.activeSpotIndex).toBeNull();
  });

  it("does not claim when the peek has expired", () => {
    const match = createMatchState();
    const peek = startPeek(createPeekState(), 1000, 2);
    const result = attemptClaim(
      match,
      peek,
      1,
      1000 + DEFAULT_PEEK_DURATION_MS + 1,
    );

    expect(result.claimed).toBe(false);
    expect(result.matchState.scores).toEqual([0, 0]);
  });

  it("cannot claim the same peek twice (duplicate prevention)", () => {
    const match = createMatchState();
    const peek = startPeek(createPeekState(), 3000, 0);
    const first = attemptClaim(match, peek, 0, 3000);

    expect(first.claimed).toBe(true);

    const second = attemptClaim(first.matchState, first.peekState, 1, 3000);

    expect(second.claimed).toBe(false);
    expect(second.matchState.scores).toEqual([1, 0]);
  });

  it("accumulates scores across multiple claims", () => {
    let match = createMatchState();

    let peek = startPeek(createPeekState(), 1000, 0);
    let result = attemptClaim(match, peek, 0, 1000);
    match = result.matchState;

    peek = startPeek(createPeekState(), 3000, 1);
    result = attemptClaim(match, peek, 1, 3000);
    match = result.matchState;

    peek = startPeek(createPeekState(), 5000, 2);
    result = attemptClaim(match, peek, 1, 5000);

    expect(result.matchState.scores).toEqual([1, 2]);
  });
});
