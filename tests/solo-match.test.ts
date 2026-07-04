import { describe, expect, it } from "vitest";
import { Match } from "../src/match/match";

describe("Solo local match", () => {
  function constantRandom(value: number): () => number {
    return () => value;
  }

  it("starts a 2-slot match where both slots can score and produce a winner", () => {
    const match = new Match({
      durationMs: 5_000,
      spotCount: 6,
      playerSlotCount: 2,
      random: constantRandom(0),
    });

    match.advance(0);
    const activeSpot = match.view().normalChicks[0]?.spotIndex ?? 0;

    // Human (slot 0) claims one chick
    match.claim(activeSpot, 0);
    // Bot (slot 1) claims another chick after time passes
    match.advance(5_000);

    const view = match.view();
    expect(view.scores).toHaveLength(2);
    expect(view.scores[0]).toBe(1);
    expect(view.complete).toBe(true);
    expect(view.winner).toBe(0);
  });

  it("allows the bot slot to win a solo match", () => {
    const match = new Match({
      durationMs: 10_000,
      spotCount: 6,
      playerSlotCount: 2,
      random: constantRandom(0),
    });

    match.advance(0);
    const firstSpot = match.view().normalChicks[0]?.spotIndex ?? 0;

    // Bot claims the first visible chick
    match.claim(firstSpot, 1);

    // Advance to end
    match.advance(10_000);

    const view = match.view();
    expect(view.complete).toBe(true);
    expect(view.scores).toEqual([0, 1]);
    expect(view.winner).toBe(1);
  });
});
