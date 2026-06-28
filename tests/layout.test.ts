import { describe, it, expect } from "vitest";
import { FARMYARD_LAYOUT } from "../src/match/layout";

describe("FarmyardLayout", () => {
  it("defines playable bounds within the game dimensions", () => {
    expect(FARMYARD_LAYOUT.bounds.x).toBeGreaterThanOrEqual(0);
    expect(FARMYARD_LAYOUT.bounds.y).toBeGreaterThanOrEqual(0);
    expect(FARMYARD_LAYOUT.bounds.width).toBeGreaterThan(0);
    expect(FARMYARD_LAYOUT.bounds.height).toBeGreaterThan(0);
    expect(
      FARMYARD_LAYOUT.bounds.x + FARMYARD_LAYOUT.bounds.width,
    ).toBeLessThanOrEqual(800);
    expect(
      FARMYARD_LAYOUT.bounds.y + FARMYARD_LAYOUT.bounds.height,
    ).toBeLessThanOrEqual(600);
  });

  it("has two player start positions inside the bounds", () => {
    const { bounds, playerStartPositions } = FARMYARD_LAYOUT;

    expect(playerStartPositions).toHaveLength(2);

    for (const pos of playerStartPositions) {
      expect(pos.x).toBeGreaterThanOrEqual(bounds.x);
      expect(pos.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(pos.y).toBeGreaterThanOrEqual(bounds.y);
      expect(pos.y).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
  });

  it("has distinct start positions for both players", () => {
    const [p1, p2] = FARMYARD_LAYOUT.playerStartPositions;
    expect(p1).not.toEqual(p2);
  });

  it("defines a positive player movement speed", () => {
    expect(FARMYARD_LAYOUT.playerSpeed).toBeGreaterThan(0);
  });
});
