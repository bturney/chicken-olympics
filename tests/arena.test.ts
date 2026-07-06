import { describe, expect, it } from "vitest";
import { createArena } from "../src/match/arena";

describe("Arena", () => {
  it("allocates a free Hiding Spot without reusing occupied spots", () => {
    const arena = createArena({ spotCount: 4 });

    const first = arena.allocateSpot(0);
    const second = arena.allocateSpot(0);

    expect(first).toBe(0);
    expect(second).toBe(1);
  });

  it("does not allocate a Hiding Spot reserved for Peek Anticipation", () => {
    const arena = createArena({ spotCount: 3 });

    arena.reserveSpot(0);

    expect(arena.allocateSpot(0)).toBe(1);
  });

  it("prefers the farthest free Hiding Spot from recent allocations", () => {
    const arena = createArena({
      spotCount: 3,
      spotPositions: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 100, y: 0 },
      ],
    });

    expect(arena.allocateSpot(0)).toBe(0);
    arena.releaseSpot(0);

    expect(arena.allocateSpot(0)).toBe(2);
  });

  it("allocates from seeded occupied, reserved, and recent Hiding Spots", () => {
    const arena = createArena({
      spotCount: 5,
      occupiedSpotIndices: [1],
      reservedSpotIndices: [2],
      recentSpotIndices: [0],
      spotPositions: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 100, y: 0 },
        { x: 10, y: 0 },
      ],
    });

    expect(arena.allocateSpot(0)).toBe(3);
  });
});
