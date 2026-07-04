import { describe, expect, it } from "vitest";
import { rankPlayerSlotsForPodium } from "../src/match/playerSlots";

describe("rankPlayerSlotsForPodium", () => {
  it("orders four active player slots by score for the Podium Ceremony", () => {
    expect(rankPlayerSlotsForPodium([2, 5, 1, 4])).toEqual([
      { playerIndex: 1, score: 5, place: 1 },
      { playerIndex: 3, score: 4, place: 2 },
      { playerIndex: 0, score: 2, place: 3 },
      { playerIndex: 2, score: 1, place: 4 },
    ]);
  });
});
