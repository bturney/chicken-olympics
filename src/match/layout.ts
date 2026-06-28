export interface Position {
  x: number;
  y: number;
}

export type HidingSpotType =
  "bush" | "hay-bale" | "barrel" | "flower-pot" | "fence" | "nest-box";

export const HIDING_SPOT_TYPES: readonly HidingSpotType[] = [
  "bush",
  "hay-bale",
  "barrel",
  "flower-pot",
  "fence",
  "nest-box",
] as const;

export interface HidingSpot extends Position {
  type: HidingSpotType;
  name: string;
}

export interface FarmyardLayout {
  bounds: { x: number; y: number; width: number; height: number };
  playerStartPositions: [Position, Position];
  playerSpeed: number;
  hidingSpots: HidingSpot[];
}

export const FARMYARD_LAYOUT: FarmyardLayout = {
  bounds: {
    x: 40,
    y: 90,
    width: 720,
    height: 470,
  },
  playerStartPositions: [
    { x: 200, y: 300 },
    { x: 600, y: 300 },
  ],
  playerSpeed: 200,
  hidingSpots: [
    { x: 140, y: 180, type: "bush", name: "Northwest Bush" },
    { x: 400, y: 150, type: "hay-bale", name: "North Hay Bale" },
    { x: 680, y: 200, type: "barrel", name: "Northeast Barrel" },
    { x: 200, y: 470, type: "flower-pot", name: "Southwest Flower Pot" },
    { x: 560, y: 490, type: "fence", name: "South Fence" },
    { x: 400, y: 400, type: "nest-box", name: "Center Nest Box" },
  ],
};
