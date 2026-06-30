import { describe, expect, it } from "vitest";
import { Match } from "../src/match/match";

describe("Match", () => {
  function constantRandom(value: number): () => number {
    return () => value;
  }

  it("starts a Match with no score and the full time remaining", () => {
    const match = new Match({ durationMs: 5_000, spotCount: 6 });

    expect(match.view()).toMatchObject({
      scores: [0, 0],
      remainingMs: 5_000,
      complete: false,
      winner: null,
      normalChicks: [],
      greenChick: null,
    });
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

    expect(match.view().normalChicks).toEqual([
      { slotIndex: 0, spotIndex: 0 },
      { slotIndex: 1, spotIndex: 1 },
      { slotIndex: 2, spotIndex: 2 },
    ]);
  });

  it("lets a player claim a visible normal chick for one point", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);

    const events = match.claim(0, 1);

    expect(events).toEqual([
      {
        type: "normalChickClaimed",
        slotIndex: 0,
        spotIndex: 0,
        playerIndex: 1,
      },
    ]);
    expect(match.view().scores).toEqual([0, 1]);
    expect(match.view().normalChicks).not.toContainEqual({
      slotIndex: 0,
      spotIndex: 0,
    });
  });

  it("shows the Green Chick once in its schedule window without reusing a normal chick spot", () => {
    const match = new Match({
      durationMs: 9_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);

    const events = match.advance(2_000);

    expect(events).toEqual([{ type: "greenChickAppeared", spotIndex: 3 }]);
    expect(match.view().greenChick).toEqual({ spotIndex: 3 });
    expect(match.view().normalChicks.map((chick) => chick.spotIndex)).toEqual([
      0, 1, 2,
    ]);
  });

  it("lets a player claim the Green Chick for five points through the same claim path", () => {
    const match = new Match({
      durationMs: 9_000,
      spotCount: 6,
      random: constantRandom(0),
    });
    match.advance(0);
    match.advance(2_000);

    const events = match.claim(3, 0);

    expect(events).toEqual([
      { type: "greenChickClaimed", spotIndex: 3, playerIndex: 0 },
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

    const events = match.advance(5_000);

    expect(events).toEqual([{ type: "greenChickMissed", spotIndex: 3 }]);
    expect(match.view().greenChick).toBeNull();
  });
});
