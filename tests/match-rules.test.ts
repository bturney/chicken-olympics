import { describe, it, expect } from "vitest";
import {
  createMatchState,
  tick,
  isMatchComplete,
  getRemainingMs,
  addScore,
  getWinner,
  createPeekState,
  isPeekActive,
  getActiveNormalSpotIndices,
  computeRefillDelayMs,
  selectFreeSpotIndex,
  tickPeekState,
  attemptClaim,
  createGreenChickState,
  tickGreenChickState,
  getActiveGreenChickSpotIndex,
  attemptGreenChickClaim,
  isGreenChickPeekActive,
  PRODUCTION_MATCH_DURATION_MS,
  NORMAL_PEEK_COUNT,
  NORMAL_PEEK_DURATION_MS,
  NORMAL_REFILL_MIN_MS,
  NORMAL_REFILL_MAX_MS,
  GREEN_CHICK_POINTS,
  GREEN_CHICK_SCHEDULE_MIN_MS,
  GREEN_CHICK_SCHEDULE_MAX_MS,
} from "../src/match/rules";

function constantRandom(value: number): () => number {
  return () => value;
}

describe("createMatchState", () => {
  it("initializes both player scores to zero", () => {
    const state = createMatchState();

    expect(state.scores).toEqual([0, 0]);
  });

  it("initializes elapsed time to zero", () => {
    const state = createMatchState();

    expect(state.elapsedMs).toBe(0);
  });

  it("defaults the production match duration to 90 seconds", () => {
    const state = createMatchState();

    expect(state.durationMs).toBe(PRODUCTION_MATCH_DURATION_MS);
    expect(PRODUCTION_MATCH_DURATION_MS).toBe(90_000);
  });

  it("honours a custom duration override from the caller", () => {
    const state = createMatchState({ durationMs: 5_000 });

    expect(state.durationMs).toBe(5_000);
  });

  it("is not complete on creation", () => {
    const state = createMatchState();

    expect(isMatchComplete(state)).toBe(false);
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
    const next = tick(state, PRODUCTION_MATCH_DURATION_MS - 1);

    expect(isMatchComplete(next)).toBe(false);
  });

  it("marks the match complete when elapsed reaches the duration", () => {
    const state = createMatchState();
    const next = tick(state, PRODUCTION_MATCH_DURATION_MS);

    expect(isMatchComplete(next)).toBe(true);
  });

  it("marks the match complete when elapsed exceeds the duration", () => {
    const state = createMatchState();
    const next = tick(state, PRODUCTION_MATCH_DURATION_MS + 1);

    expect(isMatchComplete(next)).toBe(true);
  });

  it("completes the match at the custom override duration, not the production default", () => {
    const state = createMatchState({ durationMs: 5_000 });
    const before = tick(state, 4_999);
    const atDuration = tick(state, 5_000);

    expect(state.durationMs).toBe(5_000);
    expect(isMatchComplete(before)).toBe(false);
    expect(isMatchComplete(atDuration)).toBe(true);
  });
});

describe("getRemainingMs", () => {
  it("returns the full duration at match start", () => {
    const state = createMatchState();

    expect(getRemainingMs(state)).toBe(state.durationMs);
  });

  it("decreases as time advances", () => {
    const state = createMatchState();
    const next = tick(state, 10_000);

    expect(getRemainingMs(next)).toBe(state.durationMs - 10_000);
  });

  it("clamps to zero once the duration is exceeded", () => {
    const state = createMatchState({ durationMs: 1_000 });
    const next = tick(state, 2_500);

    expect(getRemainingMs(next)).toBe(0);
  });

  it("honours a custom duration override", () => {
    const state = createMatchState({ durationMs: 5_000 });

    expect(getRemainingMs(state)).toBe(5_000);
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

describe("green chick constants", () => {
  it("rewards a Green Chick claim with five points", () => {
    expect(GREEN_CHICK_POINTS).toBe(5);
  });

  it("schedules the Green Chick between 20 and 70 seconds in a 90 second Match", () => {
    expect(GREEN_CHICK_SCHEDULE_MIN_MS).toBe(20_000);
    expect(GREEN_CHICK_SCHEDULE_MAX_MS).toBe(70_000);
    expect(PRODUCTION_MATCH_DURATION_MS).toBe(90_000);
  });
});

describe("createGreenChickState", () => {
  it("starts in the pending state with no active spot", () => {
    const state = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0.5),
    );

    expect(state.status).toBe("pending");
    expect(state.activeSpotIndex).toBeNull();
    expect(state.peekStartedAtMs).toBeNull();
  });

  it("schedules the Green Chick at the minimum bound when random returns 0", () => {
    const state = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );

    expect(state.scheduledAtMs).toBe(GREEN_CHICK_SCHEDULE_MIN_MS);
  });

  it("schedules the Green Chick below the maximum bound when random returns just under 1", () => {
    const state = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0.999),
    );

    expect(state.scheduledAtMs).toBeGreaterThan(GREEN_CHICK_SCHEDULE_MIN_MS);
    expect(state.scheduledAtMs).toBeLessThan(GREEN_CHICK_SCHEDULE_MAX_MS);
  });

  it("scales the schedule proportionally for a custom match duration", () => {
    const state = createGreenChickState(9_000, constantRandom(0.5));

    expect(state.scheduledAtMs).toBeGreaterThanOrEqual(2_000);
    expect(state.scheduledAtMs).toBeLessThan(7_000);
  });

  it("returns no claimed player on creation", () => {
    const state = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0.5),
    );

    expect(state.claimedAtMs).toBeNull();
    expect(state.claimedByPlayerIndex).toBeNull();
  });
});

describe("tickGreenChickState", () => {
  it("stays pending before the scheduled time", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );

    const next = tickGreenChickState(
      green,
      createPeekState(),
      green.scheduledAtMs - 1,
      6,
      constantRandom(0.5),
    );

    expect(next.status).toBe("pending");
    expect(next.activeSpotIndex).toBeNull();
  });

  it("becomes active when scheduled and a free hiding spot exists", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();

    const next = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );

    expect(next.status).toBe("active");
    expect(next.activeSpotIndex).not.toBeNull();
    expect(next.peekStartedAtMs).toBe(green.scheduledAtMs);
  });

  it("waits for a free hiding spot when all spots are occupied by normal peeks", () => {
    const matchDuration = 9_000;
    const green = createGreenChickState(matchDuration, constantRandom(0));
    expect(green.scheduledAtMs).toBe(2_000);

    const peekState = tickPeekState(
      createPeekState(),
      0,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );
    expect(getActiveNormalSpotIndices(peekState, 2_000)).toHaveLength(
      NORMAL_PEEK_COUNT,
    );

    const next = tickGreenChickState(
      green,
      peekState,
      2_000,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );

    expect(next.status).toBe("waiting");
    expect(next.activeSpotIndex).toBeNull();
  });

  it("takes a free hiding spot once a normal peek expires while waiting", () => {
    const matchDuration = 9_000;
    const green = createGreenChickState(matchDuration, constantRandom(0));
    const peekState = tickPeekState(
      createPeekState(),
      0,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );

    const waiting = tickGreenChickState(
      green,
      peekState,
      2_000,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );
    expect(waiting.status).toBe("waiting");

    const expiredPeekState = tickPeekState(
      peekState,
      2_000 + NORMAL_PEEK_DURATION_MS,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );
    expect(
      getActiveNormalSpotIndices(
        expiredPeekState,
        2_000 + NORMAL_PEEK_DURATION_MS,
      ),
    ).toHaveLength(0);

    const active = tickGreenChickState(
      waiting,
      expiredPeekState,
      2_000 + NORMAL_PEEK_DURATION_MS,
      NORMAL_PEEK_COUNT,
      constantRandom(0),
    );

    expect(active.status).toBe("active");
    expect(active.activeSpotIndex).not.toBeNull();
  });

  it("does not return to active after the peek expires and is marked missed", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();
    const active = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );
    expect(active.status).toBe("active");

    const expired = tickGreenChickState(
      active,
      peekState,
      green.scheduledAtMs + NORMAL_PEEK_DURATION_MS,
      6,
      constantRandom(0.5),
    );
    expect(expired.status).toBe("missed");
    expect(expired.activeSpotIndex).toBeNull();

    const later = tickGreenChickState(
      expired,
      peekState,
      green.scheduledAtMs + NORMAL_PEEK_DURATION_MS + 1_000,
      6,
      constantRandom(0.5),
    );
    expect(later.status).toBe("missed");
  });

  it("does not return to active after a claim", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();
    const active = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );

    const claim = attemptGreenChickClaim(
      createMatchState(),
      active,
      active.activeSpotIndex!,
      0,
      green.scheduledAtMs + 100,
    );
    expect(claim.greenChickState.status).toBe("claimed");
    expect(claim.matchState.scores).toEqual([GREEN_CHICK_POINTS, 0]);

    const later = tickGreenChickState(
      claim.greenChickState,
      peekState,
      green.scheduledAtMs + 1_000,
      6,
      constantRandom(0.5),
    );
    expect(later.status).toBe("claimed");
  });
});

describe("isGreenChickPeekActive", () => {
  it("returns true while the Green Chick is peeking and within the duration", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();
    const active = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );

    expect(isGreenChickPeekActive(active, green.scheduledAtMs)).toBe(true);
    expect(
      isGreenChickPeekActive(
        active,
        green.scheduledAtMs + NORMAL_PEEK_DURATION_MS - 1,
      ),
    ).toBe(true);
    expect(
      isGreenChickPeekActive(
        active,
        green.scheduledAtMs + NORMAL_PEEK_DURATION_MS,
      ),
    ).toBe(false);
  });
});

describe("getActiveGreenChickSpotIndex", () => {
  it("returns the active spot while the Green Chick is peeking", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();
    const active = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );

    expect(getActiveGreenChickSpotIndex(active, green.scheduledAtMs)).toBe(
      active.activeSpotIndex,
    );
  });

  it("returns null before the Green Chick activates", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );

    expect(getActiveGreenChickSpotIndex(green, 0)).toBeNull();
  });

  it("returns null after the Green Chick expires", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();
    const active = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );
    const expired = tickGreenChickState(
      active,
      peekState,
      green.scheduledAtMs + NORMAL_PEEK_DURATION_MS + 1,
      6,
      constantRandom(0.5),
    );

    expect(
      getActiveGreenChickSpotIndex(
        expired,
        green.scheduledAtMs + NORMAL_PEEK_DURATION_MS + 1,
      ),
    ).toBeNull();
  });
});

describe("attemptGreenChickClaim", () => {
  function makeActiveGreenChick() {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const peekState = createPeekState();
    const active = tickGreenChickState(
      green,
      peekState,
      green.scheduledAtMs,
      6,
      constantRandom(0),
    );
    return { green, active };
  }

  it("scores five points and marks the Green Chick claimed when a player claims the active spot", () => {
    const { active } = makeActiveGreenChick();
    const match = createMatchState();

    const result = attemptGreenChickClaim(
      match,
      active,
      active.activeSpotIndex!,
      0,
      active.peekStartedAtMs! + 100,
    );

    expect(result.claimed).toBe(true);
    expect(result.matchState.scores).toEqual([GREEN_CHICK_POINTS, 0]);
    expect(result.greenChickState.status).toBe("claimed");
    expect(result.greenChickState.claimedByPlayerIndex).toBe(0);
    expect(result.greenChickState.claimedAtMs).toBe(
      active.peekStartedAtMs! + 100,
    );
  });

  it("scores five points for player 2 too", () => {
    const { active } = makeActiveGreenChick();
    const match = createMatchState();

    const result = attemptGreenChickClaim(
      match,
      active,
      active.activeSpotIndex!,
      1,
      active.peekStartedAtMs! + 100,
    );

    expect(result.claimed).toBe(true);
    expect(result.matchState.scores).toEqual([0, GREEN_CHICK_POINTS]);
  });

  it("does not claim when the spot does not match the active Green Chick spot", () => {
    const { active } = makeActiveGreenChick();
    const match = createMatchState();

    const wrongSpot =
      active.activeSpotIndex === 0 ? 1 : (active.activeSpotIndex ?? 0) + 1;
    const result = attemptGreenChickClaim(
      match,
      active,
      wrongSpot,
      0,
      active.peekStartedAtMs! + 100,
    );

    expect(result.claimed).toBe(false);
    expect(result.matchState.scores).toEqual([0, 0]);
  });

  it("does not claim when the Green Chick peek has expired", () => {
    const { active } = makeActiveGreenChick();
    const match = createMatchState();

    const result = attemptGreenChickClaim(
      match,
      active,
      active.activeSpotIndex!,
      0,
      active.peekStartedAtMs! + NORMAL_PEEK_DURATION_MS + 1,
    );

    expect(result.claimed).toBe(false);
    expect(result.matchState.scores).toEqual([0, 0]);
  });

  it("prevents duplicate claims after a successful claim (first-Claim wins)", () => {
    const { active } = makeActiveGreenChick();
    const match = createMatchState();

    const first = attemptGreenChickClaim(
      match,
      active,
      active.activeSpotIndex!,
      0,
      active.peekStartedAtMs! + 100,
    );
    expect(first.claimed).toBe(true);

    const second = attemptGreenChickClaim(
      first.matchState,
      first.greenChickState,
      active.activeSpotIndex!,
      1,
      active.peekStartedAtMs! + 200,
    );

    expect(second.claimed).toBe(false);
    expect(second.matchState.scores).toEqual([GREEN_CHICK_POINTS, 0]);
  });

  it("does not claim when the Green Chick is in pending status", () => {
    const green = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0),
    );
    const result = attemptGreenChickClaim(createMatchState(), green, 0, 0, 0);

    expect(result.claimed).toBe(false);
  });

  it("does not claim when the Green Chick is in waiting status", () => {
    const matchDuration = 9_000;
    const green = createGreenChickState(matchDuration, constantRandom(0));
    const peekState = tickPeekState(
      createPeekState(),
      0,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );
    const waiting = tickGreenChickState(
      green,
      peekState,
      2_000,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );
    expect(waiting.status).toBe("waiting");

    const result = attemptGreenChickClaim(
      createMatchState(),
      waiting,
      0,
      0,
      2_000,
    );

    expect(result.claimed).toBe(false);
  });
});

describe("Green Chick scheduling window", () => {
  it("schedules within the 20 to 70 second window for a 90 second match across random values", () => {
    for (const v of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999]) {
      const state = createGreenChickState(
        PRODUCTION_MATCH_DURATION_MS,
        constantRandom(v),
      );
      expect(state.scheduledAtMs).toBeGreaterThanOrEqual(
        GREEN_CHICK_SCHEDULE_MIN_MS,
      );
      expect(state.scheduledAtMs).toBeLessThanOrEqual(
        GREEN_CHICK_SCHEDULE_MAX_MS - 1,
      );
    }
  });

  it("produces a different schedule for different random values", () => {
    const a = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0.1),
    );
    const b = createGreenChickState(
      PRODUCTION_MATCH_DURATION_MS,
      constantRandom(0.7),
    );

    expect(a.scheduledAtMs).not.toBe(b.scheduledAtMs);
  });
});

describe("normal peek slot constants", () => {
  it("defines three normal peek slots", () => {
    expect(NORMAL_PEEK_COUNT).toBe(3);
  });

  it("uses a five second normal peek duration", () => {
    expect(NORMAL_PEEK_DURATION_MS).toBe(5_000);
  });

  it("uses 500ms to 1500ms refill delay bounds", () => {
    expect(NORMAL_REFILL_MIN_MS).toBe(500);
    expect(NORMAL_REFILL_MAX_MS).toBe(1_500);
  });
});

describe("createPeekState", () => {
  it("creates three peek slots", () => {
    const state = createPeekState();

    expect(state.peeks).toHaveLength(NORMAL_PEEK_COUNT);
  });

  it("starts with no active peeks when no time has elapsed", () => {
    const state = createPeekState();
    const active = getActiveNormalSpotIndices(state, 0);

    expect(active).toEqual([]);
  });
});

describe("tickPeekState", () => {
  it("starts all three normal peeks immediately when there are enough spots", () => {
    const state = createPeekState();
    const ticked = tickPeekState(state, 0, 6, constantRandom(0.5));

    const active = getActiveNormalSpotIndices(ticked, 0);
    expect(active).toHaveLength(NORMAL_PEEK_COUNT);
    expect(new Set(active).size).toBe(NORMAL_PEEK_COUNT);
  });

  it("keeps all three peeks active across subsequent ticks before any expire", () => {
    let state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    state = tickPeekState(state, 1_000, 6, constantRandom(0.5));
    state = tickPeekState(state, 2_000, 6, constantRandom(0.5));

    expect(getActiveNormalSpotIndices(state, 2_000)).toHaveLength(
      NORMAL_PEEK_COUNT,
    );
  });

  it("expires a peek after the five second peek duration has passed", () => {
    const state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const firstPeek = state.peeks[0]!;
    expect(isPeekActive(firstPeek, 0)).toBe(true);

    const justBefore = tickPeekState(state, 4_999, 6, constantRandom(0.5));
    expect(isPeekActive(justBefore.peeks[0]!, 4_999)).toBe(true);

    const atExpiry = tickPeekState(state, 5_000, 6, constantRandom(0.5));
    expect(isPeekActive(atExpiry.peeks[0]!, 5_000)).toBe(false);
  });

  it("schedules a new peek in the free spot after the refill delay elapses", () => {
    let state = tickPeekState(createPeekState(), 0, 6, constantRandom(0));
    const initialActive = [...getActiveNormalSpotIndices(state, 0)];

    state = tickPeekState(state, 5_000, 6, constantRandom(0));

    expect(getActiveNormalSpotIndices(state, 5_000)).toHaveLength(0);

    const afterDelay = tickPeekState(
      state,
      5_000 + NORMAL_REFILL_MIN_MS,
      6,
      constantRandom(0.5),
    );
    const afterActive = getActiveNormalSpotIndices(
      afterDelay,
      5_000 + NORMAL_REFILL_MIN_MS,
    );

    expect(afterActive).toHaveLength(NORMAL_PEEK_COUNT);
    for (const spot of afterActive) {
      expect(spot).toBeGreaterThanOrEqual(0);
      expect(spot).toBeLessThan(6);
    }
    void initialActive;
  });

  it("keeps normal peeks distinct from each other when refilling", () => {
    let state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));

    for (
      let t = NORMAL_PEEK_DURATION_MS;
      t < NORMAL_PEEK_DURATION_MS * 10;
      t += 100
    ) {
      state = tickPeekState(state, t, 6, constantRandom(0.3));
      const active = getActiveNormalSpotIndices(state, t);
      expect(active.length).toBeLessThanOrEqual(NORMAL_PEEK_COUNT);
      expect(new Set(active).size).toBe(active.length);
    }
  });
});

describe("computeRefillDelayMs", () => {
  it("returns the minimum delay for a random value of 0", () => {
    expect(computeRefillDelayMs(0)).toBe(NORMAL_REFILL_MIN_MS);
  });

  it("returns the maximum delay for a random value of 1", () => {
    expect(computeRefillDelayMs(1)).toBe(NORMAL_REFILL_MAX_MS);
  });

  it("returns a value within the refill delay bounds for intermediate values", () => {
    for (const v of [0.25, 0.5, 0.75]) {
      const delay = computeRefillDelayMs(v);
      expect(delay).toBeGreaterThanOrEqual(NORMAL_REFILL_MIN_MS);
      expect(delay).toBeLessThanOrEqual(NORMAL_REFILL_MAX_MS);
    }
  });
});

describe("selectFreeSpotIndex", () => {
  it("returns null when no spots are free", () => {
    const state = tickPeekState(
      createPeekState(),
      0,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );

    expect(selectFreeSpotIndex(state, 0, NORMAL_PEEK_COUNT, 0.5)).toBeNull();
  });

  it("returns a free spot when at least one is available", () => {
    const state = tickPeekState(
      createPeekState(),
      0,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );

    const free = selectFreeSpotIndex(state, 0, NORMAL_PEEK_COUNT + 2, 0.0);
    expect(free).toBe(NORMAL_PEEK_COUNT);
  });

  it("picks deterministically based on the random value", () => {
    const state = tickPeekState(
      createPeekState(),
      0,
      NORMAL_PEEK_COUNT,
      constantRandom(0.5),
    );

    const a = selectFreeSpotIndex(state, 0, NORMAL_PEEK_COUNT + 2, 0.0);
    const b = selectFreeSpotIndex(state, 0, NORMAL_PEEK_COUNT + 2, 0.999);
    expect(a).not.toBe(b);
  });
});

describe("attemptClaim", () => {
  it("scores one point and frees the slot for refill when claiming an active peek", () => {
    const state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const match = createMatchState();
    const activeSpot = getActiveNormalSpotIndices(state, 0)[0]!;

    const result = attemptClaim(
      match,
      state,
      activeSpot,
      0,
      1_000,
      constantRandom(0.5),
    );

    expect(result.claimed).toBe(true);
    expect(result.matchState.scores).toEqual([1, 0]);
    expect(getActiveNormalSpotIndices(result.peekState, 1_000)).toHaveLength(
      NORMAL_PEEK_COUNT - 1,
    );
  });

  it("does not claim when no peek is active at the requested spot", () => {
    const state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const match = createMatchState();

    const result = attemptClaim(
      match,
      state,
      999,
      0,
      1_000,
      constantRandom(0.5),
    );

    expect(result.claimed).toBe(false);
    expect(result.matchState.scores).toEqual([0, 0]);
  });

  it("does not claim when the peek at the requested spot has expired", () => {
    const state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const match = createMatchState();
    const activeSpot = getActiveNormalSpotIndices(state, 0)[0]!;

    const result = attemptClaim(
      match,
      state,
      activeSpot,
      0,
      NORMAL_PEEK_DURATION_MS + 1,
      constantRandom(0.5),
    );

    expect(result.claimed).toBe(false);
    expect(result.matchState.scores).toEqual([0, 0]);
  });

  it("prevents duplicate claims on the same peek (first-Claim wins)", () => {
    const state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const match = createMatchState();
    const activeSpot = getActiveNormalSpotIndices(state, 0)[0]!;

    const first = attemptClaim(
      match,
      state,
      activeSpot,
      0,
      1_000,
      constantRandom(0.5),
    );

    expect(first.claimed).toBe(true);

    const second = attemptClaim(
      first.matchState,
      first.peekState,
      activeSpot,
      1,
      1_000,
      constantRandom(0.5),
    );

    expect(second.claimed).toBe(false);
    expect(second.matchState.scores).toEqual([1, 0]);
  });

  it("accumulates scores across multiple distinct claims by either player", () => {
    let state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    let match = createMatchState();

    for (let i = 0; i < 3; i++) {
      const active = getActiveNormalSpotIndices(state, 1_000 + i);
      if (active.length === 0) break;
      const result = attemptClaim(
        match,
        state,
        active[0]!,
        (i % 2) as 0 | 1,
        1_000 + i,
        constantRandom(0.5),
      );
      expect(result.claimed).toBe(true);
      match = result.matchState;
      state = result.peekState;
    }

    expect(match.scores[0] + match.scores[1]).toBeGreaterThanOrEqual(1);
  });
});

describe("deterministic randomized refill behavior", () => {
  it("schedules the next refill exactly at the chosen delay after expiry", () => {
    let state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const initialActive = [...getActiveNormalSpotIndices(state, 0)];
    const claimedSpot = initialActive[0]!;
    const otherActive = initialActive.slice(1);

    const claimed = attemptClaim(
      createMatchState(),
      state,
      claimedSpot,
      0,
      1_000,
      constantRandom(0),
    );

    state = claimed.peekState;
    const afterClaim = getActiveNormalSpotIndices(state, 1_000);
    expect(afterClaim).toEqual(otherActive);

    const refillTime = 1_000 + NORMAL_REFILL_MIN_MS;
    const afterRefill = tickPeekState(
      state,
      refillTime,
      6,
      constantRandom(0.5),
    );
    expect(getActiveNormalSpotIndices(afterRefill, refillTime)).toHaveLength(
      NORMAL_PEEK_COUNT,
    );
  });

  it("uses the refill delay random value when computing the next refill window", () => {
    const state = tickPeekState(createPeekState(), 0, 6, constantRandom(0.5));
    const claimed = attemptClaim(
      createMatchState(),
      state,
      getActiveNormalSpotIndices(state, 0)[0]!,
      0,
      1_000,
      constantRandom(0),
    );

    const beforeRefill = tickPeekState(
      claimed.peekState,
      1_000 + NORMAL_REFILL_MIN_MS - 1,
      6,
      constantRandom(0.5),
    );
    expect(
      getActiveNormalSpotIndices(
        beforeRefill,
        1_000 + NORMAL_REFILL_MIN_MS - 1,
      ),
    ).toHaveLength(NORMAL_PEEK_COUNT - 1);

    const atRefill = tickPeekState(
      claimed.peekState,
      1_000 + NORMAL_REFILL_MIN_MS,
      6,
      constantRandom(0.5),
    );
    expect(
      getActiveNormalSpotIndices(atRefill, 1_000 + NORMAL_REFILL_MIN_MS),
    ).toHaveLength(NORMAL_PEEK_COUNT);
  });
});
