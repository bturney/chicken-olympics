import { describe, it, expect } from "vitest";
import {
  PLAYER_CHICKEN_COLORS,
  availableColors,
  canStartMatch,
  type PlayerChickenColor,
  type SetupSelection,
} from "../src/setup/colors";

describe("PLAYER_CHICKEN_COLORS", () => {
  it("exposes blue, red, purple, and orange as available Player Chicken colors", () => {
    expect(PLAYER_CHICKEN_COLORS).toEqual(["blue", "red", "purple", "orange"]);
  });

  it("treats green and yellow as reserved (not Player Chicken colors)", () => {
    const colors: readonly string[] = PLAYER_CHICKEN_COLORS;
    expect(colors).not.toContain("green");
    expect(colors).not.toContain("yellow");
  });
});

describe("availableColors", () => {
  it("returns every available color for either player when nothing is chosen", () => {
    const selection: SetupSelection = { p1: null, p2: null };

    expect(availableColors(selection, 0)).toEqual([...PLAYER_CHICKEN_COLORS]);
    expect(availableColors(selection, 1)).toEqual([...PLAYER_CHICKEN_COLORS]);
  });

  it("excludes the other player's pick from the available list for the current player", () => {
    const selection: SetupSelection = { p1: "blue", p2: null };

    const p2Choices: PlayerChickenColor[] = availableColors(selection, 1);

    expect(p2Choices).not.toContain("blue");
    expect(p2Choices).toHaveLength(PLAYER_CHICKEN_COLORS.length - 1);
  });

  it("does not exclude a player's own pick from their own available list", () => {
    const selection: SetupSelection = { p1: "blue", p2: null };

    expect(availableColors(selection, 0)).toContain("blue");
    expect(availableColors(selection, 0)).toEqual([...PLAYER_CHICKEN_COLORS]);
  });

  it("excludes player 1's pick from player 2's available list", () => {
    const selection: SetupSelection = { p1: "red", p2: null };

    const p2Choices = availableColors(selection, 1);

    expect(p2Choices).not.toContain("red");
    expect(p2Choices).toContain("blue");
    expect(p2Choices).toContain("purple");
    expect(p2Choices).toContain("orange");
  });

  it("excludes player 2's pick from player 1's available list", () => {
    const selection: SetupSelection = { p1: null, p2: "purple" };

    const p1Choices = availableColors(selection, 0);

    expect(p1Choices).not.toContain("purple");
    expect(p1Choices).toContain("blue");
    expect(p1Choices).toContain("red");
    expect(p1Choices).toContain("orange");
  });
});

describe("canStartMatch", () => {
  it("returns false when no player has chosen a color", () => {
    const selection: SetupSelection = { p1: null, p2: null };

    expect(canStartMatch(selection)).toBe(false);
  });

  it("returns false when only player 1 has chosen a color", () => {
    const selection: SetupSelection = { p1: "blue", p2: null };

    expect(canStartMatch(selection)).toBe(false);
  });

  it("returns false when only player 2 has chosen a color", () => {
    const selection: SetupSelection = { p1: null, p2: "red" };

    expect(canStartMatch(selection)).toBe(false);
  });

  it("returns true when both players have chosen distinct colors", () => {
    const selection: SetupSelection = { p1: "blue", p2: "red" };

    expect(canStartMatch(selection)).toBe(true);
  });

  it("returns false when both players have chosen the same color", () => {
    const selection: SetupSelection = { p1: "blue", p2: "blue" };

    expect(canStartMatch(selection)).toBe(false);
  });
});
