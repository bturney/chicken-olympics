export const PLAYER_CHICKEN_COLORS = [
  "blue",
  "red",
  "purple",
  "orange",
] as const;

export type PlayerChickenColor = (typeof PLAYER_CHICKEN_COLORS)[number];

export interface SetupSelection {
  p1: PlayerChickenColor | null;
  p2: PlayerChickenColor | null;
}

export function availableColors(
  selection: SetupSelection,
  player: 0 | 1,
): PlayerChickenColor[] {
  const otherPick = player === 0 ? selection.p2 : selection.p1;
  if (otherPick === null) return [...PLAYER_CHICKEN_COLORS];
  return PLAYER_CHICKEN_COLORS.filter((c) => c !== otherPick);
}

export function canStartMatch(selection: SetupSelection): boolean {
  if (selection.p1 === null || selection.p2 === null) return false;
  return selection.p1 !== selection.p2;
}
