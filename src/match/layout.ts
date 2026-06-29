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

/**
 * Single resolution knob. The game was originally authored against an 800x600
 * canvas; every absolute-pixel quantity (here and in the scenes) is expressed
 * as `base * WORLD_SCALE` so the whole game scales uniformly from one number.
 * Bumping the canvas resolution in main.ts means changing this and nothing else.
 */
export const WORLD_SCALE = 2;

export const FARMYARD_LAYOUT: FarmyardLayout = {
  bounds: {
    x: 40 * WORLD_SCALE,
    y: 90 * WORLD_SCALE,
    width: 720 * WORLD_SCALE,
    height: 470 * WORLD_SCALE,
  },
  playerStartPositions: [
    { x: 200 * WORLD_SCALE, y: 300 * WORLD_SCALE },
    { x: 600 * WORLD_SCALE, y: 300 * WORLD_SCALE },
  ],
  playerSpeed: 200 * WORLD_SCALE,
  hidingSpots: [
    {
      x: 140 * WORLD_SCALE,
      y: 180 * WORLD_SCALE,
      type: "bush",
      name: "Northwest Bush",
    },
    {
      x: 400 * WORLD_SCALE,
      y: 150 * WORLD_SCALE,
      type: "hay-bale",
      name: "North Hay Bale",
    },
    {
      x: 680 * WORLD_SCALE,
      y: 200 * WORLD_SCALE,
      type: "barrel",
      name: "Northeast Barrel",
    },
    {
      x: 200 * WORLD_SCALE,
      y: 470 * WORLD_SCALE,
      type: "flower-pot",
      name: "Southwest Flower Pot",
    },
    {
      x: 560 * WORLD_SCALE,
      y: 490 * WORLD_SCALE,
      type: "fence",
      name: "South Fence",
    },
    {
      x: 400 * WORLD_SCALE,
      y: 400 * WORLD_SCALE,
      type: "nest-box",
      name: "Center Nest Box",
    },
  ],
};
