import { describe, expect, it } from "vitest";
import { canStartMatch, type SetupSelection } from "../src/setup/colors";

describe("Solo local match setup", () => {
  it("allows starting a match with only Player 1 selected (solo mode)", () => {
    const soloSelection: SetupSelection = { p1: "blue", p2: null };
    expect(canStartMatch(soloSelection)).toBe(true);
  });
});
