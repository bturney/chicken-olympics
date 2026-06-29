import { describe, it, expect } from "vitest";
import {
  FARMYARD_LAYOUT,
  HIDING_SPOT_TYPES,
  type HidingSpot,
  type HidingSpotType,
} from "../src/match/layout";

describe("HidingSpot types", () => {
  it("exposes the canonical Hiding Spot types referenced by the layout", () => {
    const expected: HidingSpotType[] = [
      "bush",
      "hay-bale",
      "barrel",
      "flower-pot",
      "fence",
      "nest-box",
    ];
    expect([...HIDING_SPOT_TYPES]).toEqual(expected);
  });
});

describe("FarmyardLayout", () => {
  it("defines playable bounds within the game dimensions", () => {
    expect(FARMYARD_LAYOUT.bounds.x).toBeGreaterThanOrEqual(0);
    expect(FARMYARD_LAYOUT.bounds.y).toBeGreaterThanOrEqual(0);
    expect(FARMYARD_LAYOUT.bounds.width).toBeGreaterThan(0);
    expect(FARMYARD_LAYOUT.bounds.height).toBeGreaterThan(0);
    expect(
      FARMYARD_LAYOUT.bounds.x + FARMYARD_LAYOUT.bounds.width,
    ).toBeLessThanOrEqual(1600);
    expect(
      FARMYARD_LAYOUT.bounds.y + FARMYARD_LAYOUT.bounds.height,
    ).toBeLessThanOrEqual(1200);
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

  it("has at least four hiding spots to support three normal Chicks plus the Green Chick extra peek", () => {
    expect(FARMYARD_LAYOUT.hidingSpots.length).toBeGreaterThanOrEqual(4);
  });

  it("describes every hiding spot with a valid type from the canonical set", () => {
    const validTypes = new Set<string>(HIDING_SPOT_TYPES);

    for (const spot of FARMYARD_LAYOUT.hidingSpots) {
      expect(validTypes.has(spot.type)).toBe(true);
    }
  });

  it("names every hiding spot with a non-empty human-readable name", () => {
    for (const spot of FARMYARD_LAYOUT.hidingSpots) {
      expect(spot.name).toBeTypeOf("string");
      expect(spot.name.length).toBeGreaterThan(0);
    }
  });

  it("uses more than one type of hiding spot for visual variety", () => {
    const usedTypes = new Set<HidingSpotType>(
      FARMYARD_LAYOUT.hidingSpots.map((spot) => spot.type),
    );
    expect(usedTypes.size).toBeGreaterThan(1);
  });

  it("exposes hiding spots as HidingSpot objects that satisfy the public type shape", () => {
    const spots: HidingSpot[] = FARMYARD_LAYOUT.hidingSpots;
    expect(spots.length).toBeGreaterThan(0);
    for (const spot of spots) {
      expect(spot).toHaveProperty("x");
      expect(spot).toHaveProperty("y");
      expect(spot).toHaveProperty("type");
      expect(spot).toHaveProperty("name");
    }
  });

  it("has all hiding spots within the playable bounds", () => {
    const { bounds, hidingSpots } = FARMYARD_LAYOUT;

    for (const spot of hidingSpots) {
      expect(spot.x).toBeGreaterThanOrEqual(bounds.x);
      expect(spot.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(spot.y).toBeGreaterThanOrEqual(bounds.y);
      expect(spot.y).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
  });

  it("has distinct hiding spot positions", () => {
    const spots = FARMYARD_LAYOUT.hidingSpots;
    const seen = new Set<string>();

    for (const spot of spots) {
      const key = `${spot.x},${spot.y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
