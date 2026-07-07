export const PLAYER_CHICKEN_COLORS = [
  "blue",
  "red",
  "purple",
  "orange",
] as const;

export type PlayerChickenColor = (typeof PLAYER_CHICKEN_COLORS)[number];

export const PLAYER_CHICKEN_HEX: Record<PlayerChickenColor, number> = {
  blue: 0x4488ff,
  red: 0xff4444,
  purple: 0xaa44ff,
  orange: 0xff8844,
};

export function getPlayerChickenHex(color: PlayerChickenColor): number {
  return PLAYER_CHICKEN_HEX[color];
}

export function getPlayerChickenCssHex(color: PlayerChickenColor): string {
  return "#" + getPlayerChickenHex(color).toString(16).padStart(6, "0");
}

export function getPlayerChickenColorLabel(color: PlayerChickenColor): string {
  switch (color) {
    case "blue":
      return "Blue";
    case "red":
      return "Red";
    case "purple":
      return "Purple";
    case "orange":
      return "Orange";
  }
}

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

export function botColor(p1Pick: PlayerChickenColor | null): PlayerChickenColor {
  if (p1Pick === null) return "orange";
  const idx = PLAYER_CHICKEN_COLORS.indexOf(p1Pick);
  return PLAYER_CHICKEN_COLORS[(idx + 1) % PLAYER_CHICKEN_COLORS.length]!;
}

export function canStartMatch(selection: SetupSelection): boolean {
  if (selection.p1 === null) return false;
  if (selection.p2 === null) return true;
  return selection.p1 !== selection.p2;
}
