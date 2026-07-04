import { type PlayerIndex } from "./rules";

export interface PodiumPlacement {
  playerIndex: PlayerIndex;
  score: number;
  place: number;
}

export function rankPlayerSlotsForPodium(
  scores: readonly number[],
): PodiumPlacement[] {
  return scores
    .map((score, playerIndex) => ({
      playerIndex: playerIndex as PlayerIndex,
      score,
    }))
    .sort((a, b) => b.score - a.score || a.playerIndex - b.playerIndex)
    .map((slot, index) => ({ ...slot, place: index + 1 }));
}
