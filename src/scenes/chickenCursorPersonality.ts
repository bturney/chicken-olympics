export interface ChickenCursorVelocity {
  vx: number;
  vy: number;
}

export interface ChickenCursorPersonality {
  angle: number;
  shadowAlpha: number;
  shadowScaleX: number;
  shadowScaleY: number;
  shadowYOffset: number;
}

const MOVEMENT_SPEED_FOR_FULL_FEEL = 280;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeChickenCursorPersonality(
  velocity: ChickenCursorVelocity,
  elapsedMs: number,
  playerIndex: 0 | 1,
): ChickenCursorPersonality {
  const speed = Math.hypot(velocity.vx, velocity.vy);
  if (speed < 0.001) {
    return {
      angle: 0,
      shadowAlpha: 0.18,
      shadowScaleX: 1,
      shadowScaleY: 1,
      shadowYOffset: 0,
    };
  }

  const speedRatio = clamp(speed / MOVEMENT_SPEED_FOR_FULL_FEEL, 0, 1);
  const direction = clamp(velocity.vx / speed, -1, 1);
  const phase = elapsedMs / 110 + playerIndex * Math.PI;
  const wobble = Math.sin(phase) * (2 + speedRatio * 2.5);

  return {
    angle: direction * 5.5 + wobble * 0.7,
    shadowAlpha: 0.18 + speedRatio * 0.1,
    shadowScaleX: 1 + speedRatio * 0.14,
    shadowScaleY: 1 - speedRatio * 0.12,
    shadowYOffset: wobble,
  };
}
