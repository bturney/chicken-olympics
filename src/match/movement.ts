export interface MoveInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export function computeMoveVelocity(
  input: MoveInput,
  speed: number,
): { vx: number; vy: number } {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

  if (dx === 0 && dy === 0) return { vx: 0, vy: 0 };

  const length = Math.sqrt(dx * dx + dy * dy);
  return {
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
  };
}
