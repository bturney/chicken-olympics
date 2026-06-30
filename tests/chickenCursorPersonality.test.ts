import { describe, expect, it } from "vitest";
import { computeChickenCursorPersonality } from "../src/scenes/chickenCursorPersonality";

describe("computeChickenCursorPersonality", () => {
  it("keeps an idle chicken steady and low to the ground", () => {
    expect(
      computeChickenCursorPersonality({ vx: 0, vy: 0 }, 1_000, 0),
    ).toEqual({
      angle: 0,
      shadowAlpha: 0.18,
      shadowScaleX: 1,
      shadowScaleY: 1,
      shadowYOffset: 0,
    });
  });

  it("adds a gentle wobble and shadow squash while moving", () => {
    const idle = computeChickenCursorPersonality({ vx: 0, vy: 0 }, 1_234, 0);
    const moving = computeChickenCursorPersonality({ vx: 160, vy: 0 }, 1_234, 0);

    expect(moving.angle).not.toBe(0);
    expect(moving.shadowYOffset).not.toBe(0);
    expect(moving.shadowScaleX).toBeGreaterThan(idle.shadowScaleX);
    expect(moving.shadowScaleY).toBeLessThan(idle.shadowScaleY);
    expect(moving.shadowAlpha).toBeGreaterThan(idle.shadowAlpha);
  });
});
