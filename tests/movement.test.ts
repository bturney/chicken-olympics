import { describe, it, expect } from "vitest";
import { computeMoveVelocity } from "../src/match/movement";

describe("computeMoveVelocity", () => {
  it("returns zero velocity when no direction is pressed", () => {
    const v = computeMoveVelocity(
      { left: false, right: false, up: false, down: false },
      200,
    );

    expect(v).toEqual({ vx: 0, vy: 0 });
  });

  it("moves purely right at the configured speed", () => {
    const v = computeMoveVelocity(
      { left: false, right: true, up: false, down: false },
      200,
    );

    expect(v).toEqual({ vx: 200, vy: 0 });
  });

  it("moves purely down at the configured speed", () => {
    const v = computeMoveVelocity(
      { left: false, right: false, up: false, down: true },
      200,
    );

    expect(v).toEqual({ vx: 0, vy: 200 });
  });

  it("cancels out opposite horizontal presses", () => {
    const v = computeMoveVelocity(
      { left: true, right: true, up: false, down: false },
      200,
    );

    expect(v).toEqual({ vx: 0, vy: 0 });
  });

  it("cancels out opposite vertical presses", () => {
    const v = computeMoveVelocity(
      { left: false, right: false, up: true, down: true },
      200,
    );

    expect(v).toEqual({ vx: 0, vy: 0 });
  });

  it("normalizes diagonal movement so total speed matches the configured speed", () => {
    const speed = 200;
    const v = computeMoveVelocity(
      { left: false, right: true, up: true, down: false },
      speed,
    );

    const magnitude = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
    expect(magnitude).toBeCloseTo(speed, 6);
    expect(v.vx).toBeCloseTo(speed / Math.sqrt(2), 6);
    expect(v.vy).toBeCloseTo(-speed / Math.sqrt(2), 6);
  });

  it("normalizes diagonal movement in all four diagonal directions to the configured speed", () => {
    const speed = 180;
    const dirs = [
      { left: false, right: true, up: true, down: false },
      { left: false, right: true, up: false, down: true },
      { left: true, right: false, up: true, down: false },
      { left: true, right: false, up: false, down: true },
    ];

    for (const input of dirs) {
      const v = computeMoveVelocity(input, speed);
      const magnitude = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
      expect(magnitude).toBeCloseTo(speed, 6);
    }
  });
});
