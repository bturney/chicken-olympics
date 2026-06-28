export interface Position {
  x: number;
  y: number;
}

export interface FarmyardLayout {
  bounds: { x: number; y: number; width: number; height: number };
  playerStartPositions: [Position, Position];
  playerSpeed: number;
  hidingSpots: Position[];
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
    { x: 160, y: 180 },
    { x: 480, y: 180 },
    { x: 640, y: 380 },
    { x: 320, y: 420 },
  ],
};
