import { describe, expect, it } from "vitest";
import { Match } from "../src/match/match";
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
      },
    ]);
    expect(match.view().scores).toEqual([0, 1]);
    expect(
      match.view().normalChicks.map((chick) => chick.spotIndex),
    ).not.toContain(activeSpot);
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
});
