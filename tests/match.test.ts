import { describe, expect, it } from "vitest";
import { Match } from "../src/match/match";
import { FARMYARD_LAYOUT } from "../src/match/layout";
import {
  NORMAL_REFILL_MIN_MS,
  PEEK_ANTICIPATION_DURATION_MS,
} from "../src/match/rules";

describe("Match", () => {
  function constantRandom(value: number): () => number {
    return () => value;
  }

  it("starts a Match with no score and the full time remaining", () => {
    const match = new Match({ durationMs: 5_000, spotCount: 6 });
    const view = match.view();

    expect(view).toMatchObject({
      scores: [0, 0],
      remainingMs: 5_000,
      complete: false,
      winner: null,
      greenChick: null,
    });
    expect(view.normalChicks).toHaveLength(0);
  });

  it("can represent four active player slots with independent scores", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      playerSlotCount: 4,
    });

    expect(match.view().scores).toEqual([0, 0, 0, 0]);
  });

  it("advances time and completes the Match at its duration", () => {
    const match = new Match({ durationMs: 5_000, spotCount: 6 });

    match.advance(4_999);
    expect(match.view()).toMatchObject({
      remainingMs: 1,
      complete: false,
    });

    match.advance(1);
    expect(match.view()).toMatchObject({
      remainingMs: 0,
      complete: true,
      winner: null,
    });
  });

  it("reports the highest scoring player slot as the winner across four slots", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      playerSlotCount: 4,
      random: constantRandom(0),
    });

    match.advance(0);
    const activeSpot = match.view().normalChicks[0]?.spotIndex ?? 0;
    match.claim(activeSpot, 3);
    match.advance(5_000);

    expect(match.view()).toMatchObject({
      complete: true,
      scores: [0, 0, 0, 1],
      winner: 3,
    });
  });

  it("shows normal chicks in unique hiding spots when the Match starts", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      random: constantRandom(0),
    });

    match.advance(0);

    const normalChicks = match.view().normalChicks;
    expect(normalChicks).toHaveLength(3);
    expect(new Set(normalChicks.map((chick) => chick.spotIndex)).size).toBe(3);
  });

  it("keeps simultaneous normal peeks unchanged with the expanded Farmyard Stadium layout", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: FARMYARD_LAYOUT.hidingSpots.length,
      random: constantRandom(0.999),
    });

    match.advance(0);

    const normalChicks = match.view().normalChicks;
    expect(normalChicks).toHaveLength(3);
    expect(normalChicks.some((chick) => chick.spotIndex >= 6)).toBe(true);
  });

  it("exposes a brief Peek Anticipation before refilling normal chicks", () => {
    const match = new Match({
      durationMs: 10_000,
      spotCount: 6,
      random: constantRandom(0),
    });

    match.advance(0);
    match.advance(5_000);

    expect(match.view().normalChicks).toHaveLength(0);
    expect(match.view().peekAnticipations).toHaveLength(0);

    match.advance(PEEK_ANTICIPATION_DURATION_MS);

    const cueView = match.view();
    expect(cueView.peekAnticipations).toHaveLength(3);
    expect(
      new Set(cueView.peekAnticipations.map((cue) => cue.spotIndex)).size,
    ).toBe(3);
    expect(cueView.normalChicks).toHaveLength(0);

    match.advance(NORMAL_REFILL_MIN_MS - PEEK_ANTICIPATION_DURATION_MS);

    const refilledView = match.view();
    expect(refilledView.peekAnticipations).toHaveLength(0);
    expect(refilledView.normalChicks).toHaveLength(3);
  });

  it("lets a player claim a visible normal chick for one point", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);

    const activeSpot = match.view().normalChicks[0]?.spotIndex ?? 0;
    const events = match.claim(activeSpot, 1);

    expect(events).toEqual([
      {
        type: "normalChickClaimed",
        slotIndex: 0,
        spotIndex: 0,
        playerIndex: 1,
        points: 1,
      },
    ]);
    expect(match.view().scores).toEqual([0, 1]);
    expect(
      match.view().normalChicks.map((chick) => chick.spotIndex),
    ).not.toContain(activeSpot);
  });

  it("lets player slot 4 claim a visible normal chick for one point", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      playerSlotCount: 4,
      random: constantRandom(0),
    });
    match.advance(0);

    const activeSpot = match.view().normalChicks[0]?.spotIndex ?? 0;
    const events = match.claim(activeSpot, 3);

    expect(events).toEqual([
      {
        type: "normalChickClaimed",
        slotIndex: 0,
        spotIndex: 0,
        playerIndex: 3,
        points: 1,
      },
    ]);
    expect(match.view().scores).toEqual([0, 0, 0, 1]);
  });

  it("does not immediately refill a just-claimed hiding spot when another free spot exists", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      random: constantRandom(0),
    });

    match.advance(0);
    const claimedSpot = match.view().normalChicks[0]?.spotIndex ?? 0;
    match.claim(claimedSpot, 0);
    match.advance(500);

    expect(
      match.view().normalChicks.map((chick) => chick.spotIndex),
    ).not.toContain(claimedSpot);
  });

  it("uses injected Hiding Spot geometry when choosing a refill spot", () => {
    const match = new Match({
      durationMs: 10_000,
      spotCount: 5,
      spotPositions: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 100, y: 0 },
        { x: 10, y: 0 },
      ],
      random: constantRandom(0),
    });

    match.advance(0);
    match.claim(0, 0);
    match.advance(NORMAL_REFILL_MIN_MS);

    expect(match.view().normalChicks.map((chick) => chick.spotIndex)).toEqual([
      2, 3, 4,
    ]);
  });

  it("shows the Green Chick once in its schedule window without reusing a normal chick spot", () => {
    const match = new Match({
      durationMs: 9_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);

    const events = match.advance(2_000);
    const greenSpot = match.view().greenChick?.spotIndex;

    expect(events).toEqual([
      { type: "greenChickAppeared", spotIndex: greenSpot ?? -1 },
    ]);
    expect(match.view().greenChick).toEqual({ spotIndex: greenSpot ?? -1 });
    expect(
      match.view().normalChicks.map((chick) => chick.spotIndex),
    ).not.toContain(greenSpot);
  });

  it("lets a player claim the Green Chick for five points through the same claim path", () => {
    const match = new Match({
      durationMs: 9_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);
    match.advance(2_000);

    const greenSpot = match.view().greenChick?.spotIndex ?? 0;
    const events = match.claim(greenSpot, 0);

    expect(events).toEqual([
      { type: "greenChickClaimed", spotIndex: greenSpot, playerIndex: 0 },
    ]);
    expect(match.view().scores).toEqual([5, 0]);
    expect(match.view().greenChick).toBeNull();
  });

  it("reports when the Green Chick is missed after its peek window", () => {
    const match = new Match({
      durationMs: 9_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);
    match.advance(2_000);

    const greenSpot = match.view().greenChick?.spotIndex ?? 0;
    const events = match.advance(5_000);

    expect(events).toEqual([
      { type: "greenChickMissed", spotIndex: greenSpot },
    ]);
    expect(match.view().greenChick).toBeNull();
  });

  describe("with tuned Peek Pressure", () => {
    it("uses tuned normalPeekCount to control the number of simultaneous normal chicks", () => {
      const match = new Match({
        durationMs: 10_000,
        spotCount: 10,
        random: constantRandom(0),
        peekPressureConfig: { normalPeekCount: 1 },
      });
      match.advance(0);
      expect(match.view().normalChicks).toHaveLength(1);
    });

    it("uses tuned normalPeekDurationMs to control how long chicks stay visible", () => {
      const match = new Match({
        durationMs: 10_000,
        spotCount: 10,
        random: constantRandom(0),
        peekPressureConfig: {
          normalPeekDurationMs: 100,
          normalRefillMinMs: 10_000,
          normalRefillMaxMs: 10_000,
        },
      });
      match.advance(0);
      expect(match.view().normalChicks).toHaveLength(3);
      match.advance(200);
      expect(match.view().normalChicks).toHaveLength(0);
    });

    it("uses tuned normalRefillMinMs and normalRefillMaxMs for refill timing", () => {
      const match = new Match({
        durationMs: 50_000,
        spotCount: 10,
        random: constantRandom(0),
        peekPressureConfig: {
          normalPeekDurationMs: 100,
          normalRefillMinMs: 5_000,
          normalRefillMaxMs: 5_000,
        },
      });
      // Initial peeks activate from nextRefillAtMs=0
      match.advance(50);
      expect(match.view().normalChicks).toHaveLength(3);
      // Advance past peek duration: peeks expire, refill set to elapsed + 5000
      match.advance(100);
      expect(match.view().normalChicks).toHaveLength(0);
      // Advance only a bit — refill not yet due
      match.advance(1_000);
      expect(match.view().normalChicks).toHaveLength(0);
      // Advance to just before refill should still be no chicks
      match.advance(3_000);
      expect(match.view().normalChicks).toHaveLength(0);
    });

    it("uses tuned peekAnticipationDurationMs for anticipation timing", () => {
      const match = new Match({
        durationMs: 50_000,
        spotCount: 10,
        random: constantRandom(0),
        peekPressureConfig: {
          normalPeekDurationMs: 100,
          normalRefillMinMs: 5_000,
          normalRefillMaxMs: 5_000,
          peekAnticipationDurationMs: 2_000,
        },
      });
      // Activate initial peeks
      match.advance(50);
      expect(match.view().normalChicks).toHaveLength(3);
      // Expire them
      match.advance(100);
      expect(match.view().normalChicks).toHaveLength(0);
      // Just before anticipation would start (refill time - anticipation duration)
      match.advance(2_700);
      // elapsed = 50+100+2700 = 2850, refill scheduled at 2850+0+5000=7850? no...
      // Actually let me rethink. At expire time elapsed=150, nextRefillAtMs=150+5000=5150
      // Anticipation starts at 5150-2000=3150. After 2700ms from expire, elapsed=150+2700=2850, still before 3150
      expect(match.view().peekAnticipations).toHaveLength(0);
      // Now advance into anticipation window
      match.advance(500);
      expect(match.view().peekAnticipations.length).toBeGreaterThan(0);
      expect(match.view().normalChicks).toHaveLength(0);
    });

    it("uses tuned normalChickPoints for claim scoring", () => {
      const match = new Match({
        durationMs: 9_000,
        spotCount: 6,
        random: constantRandom(0),
        peekPressureConfig: { normalChickPoints: 3 },
      });
      match.advance(0);
      const spot = match.view().normalChicks[0]?.spotIndex ?? 0;
      match.claim(spot, 1);
      expect(match.view().scores).toEqual([0, 3]);
    });

    it("includes tuned normalChickPoints in claim events", () => {
      const match = new Match({
        durationMs: 9_000,
        spotCount: 6,
        random: constantRandom(0),
        peekPressureConfig: { normalChickPoints: 3 },
      });
      match.advance(0);
      const spot = match.view().normalChicks[0]?.spotIndex ?? 0;
      const events = match.claim(spot, 1);
      expect(events).toEqual([
        {
          type: "normalChickClaimed",
          slotIndex: 0,
          spotIndex: 0,
          playerIndex: 1,
          points: 3,
        },
      ]);
    });
  });

  describe("with tuned Green Chick", () => {
    it("does not spawn a green chick when greenChickEnabled is false", () => {
      const match = new Match({
        durationMs: 10_000,
        spotCount: 6,
        random: constantRandom(0),
        greenChickConfig: { enabled: false },
      });
      match.advance(10_000);
      expect(match.view().greenChick).toBeNull();
    });

    it("uses tuned greenChickPoints for scoring", () => {
      const match = new Match({
        durationMs: 9_000,
        spotCount: 6,
        random: constantRandom(0),
        greenChickConfig: { points: 10 },
      });
      match.advance(0);
      match.advance(2_000);
      const greenSpot = match.view().greenChick?.spotIndex ?? 0;
      match.claim(greenSpot, 0);
      expect(match.view().scores).toEqual([10, 0]);
    });

    it("uses tuned schedule to control green chick appearance timing", () => {
      const match = new Match({
        durationMs: 100_000,
        spotCount: 6,
        random: constantRandom(0),
        greenChickConfig: { scheduleMinMs: 1_000, scheduleMaxMs: 1_000 },
      });
      match.advance(0);
      expect(match.view().greenChick).toBeNull();
      // schedule is scaled: 1000 * 100000 / 90000 ≈ 1111ms
      match.advance(1_200);
      expect(match.view().greenChick).not.toBeNull();
    });

    it("scales schedule proportionally with match duration", () => {
      const match = new Match({
        durationMs: 180_000,
        spotCount: 6,
        random: constantRandom(0),
        greenChickConfig: { scheduleMinMs: 20_000, scheduleMaxMs: 70_000 },
      });
      match.advance(0);
      expect(match.view().greenChick).toBeNull();
      // scheduleMin scaled: 20000 * 180000 / 90000 = 40000
      match.advance(40_100);
      expect(match.view().greenChick).not.toBeNull();
    });
  });
});
