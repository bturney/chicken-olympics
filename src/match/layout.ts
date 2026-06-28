export interface FarmyardLayout {
  bounds: { x: number; y: number; width: number; height: number };
  playerStartPositions: [{ x: number; y: number }, { x: number; y: number }];
  playerSpeed: number;
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
};
