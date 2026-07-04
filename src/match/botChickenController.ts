export interface BotChickenController {
  targetSpotIndex: number | null;
  targetChosenAtMs: number;
  reactionDelayMs: number;
  indecisionEndsAtMs: number;
  random: () => number;
}

export interface BotChickenTarget {
  spotIndex: number;
  x: number;
  y: number;
}

export interface BotChickenTickInput {
  botPosition: { x: number; y: number };
  elapsedMs: number;
  speed: number;
  visibleTargets: readonly BotChickenTarget[];
}

export interface BotChickenTickResult {
  controller: BotChickenController;
  velocity: { vx: number; vy: number };
}

const MIN_REACTION_DELAY_MS = 300;
const REACTION_DELAY_RANGE_MS = 250;
const INDECISION_DURATION_MS = 120;
const INDECISION_CHANCE = 0.25;

export function createBotChickenController(options?: {
  random?: () => number;
}): BotChickenController {
  return {
    targetSpotIndex: null,
    targetChosenAtMs: 0,
    reactionDelayMs: 0,
    indecisionEndsAtMs: 0,
    random: options?.random ?? Math.random,
  };
}

export function tickBotChickenController(
  controller: BotChickenController,
  input: BotChickenTickInput,
): BotChickenTickResult {
  const target = chooseTarget(controller, input);
  if (target === null) {
    return {
      controller: { ...controller, targetSpotIndex: null },
      velocity: { vx: 0, vy: 0 },
    };
  }

  const nextController =
    target.spotIndex === controller.targetSpotIndex
      ? controller
      : chooseNewTarget(controller, target.spotIndex, input.elapsedMs);

  if (
    input.elapsedMs - nextController.targetChosenAtMs <
    nextController.reactionDelayMs
  ) {
    return { controller: nextController, velocity: { vx: 0, vy: 0 } };
  }

  const targetVelocity = moveToward(input.botPosition, target, input.speed);
  if (input.elapsedMs < nextController.indecisionEndsAtMs) {
    return {
      controller: nextController,
      velocity: cleanVelocity({
        vx: -targetVelocity.vx,
        vy: -targetVelocity.vy,
      }),
    };
  }

  return {
    controller: nextController,
    velocity: targetVelocity,
  };
}

function chooseNewTarget(
  controller: BotChickenController,
  spotIndex: number,
  elapsedMs: number,
): BotChickenController {
  const reactionDelayMs =
    MIN_REACTION_DELAY_MS + controller.random() * REACTION_DELAY_RANGE_MS;
  return {
    ...controller,
    targetSpotIndex: spotIndex,
    targetChosenAtMs: elapsedMs,
    reactionDelayMs,
    indecisionEndsAtMs:
      controller.random() > 1 - INDECISION_CHANCE
        ? elapsedMs + reactionDelayMs + INDECISION_DURATION_MS
        : 0,
  };
}

function chooseTarget(
  controller: BotChickenController,
  input: BotChickenTickInput,
): BotChickenTarget | null {
  const currentTarget = input.visibleTargets.find(
    (target) => target.spotIndex === controller.targetSpotIndex,
  );
  if (currentTarget) return currentTarget;
  const distanceRanked = [...input.visibleTargets].sort(
    (a, b) =>
      distanceSquared(input.botPosition, a) -
      distanceSquared(input.botPosition, b),
  );
  if (distanceRanked.length > 1 && controller.random() > 0.85) {
    return distanceRanked[distanceRanked.length - 1] ?? null;
  }
  return distanceRanked[0] ?? null;
}

function distanceSquared(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return dx * dx + dy * dy;
}

function moveToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
): { vx: number; vy: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return { vx: 0, vy: 0 };

  const distance = Math.sqrt(dx * dx + dy * dy);
  return cleanVelocity({
    vx: (dx / distance) * speed,
    vy: (dy / distance) * speed,
  });
}

function cleanVelocity(velocity: { vx: number; vy: number }): {
  vx: number;
  vy: number;
} {
  return {
    vx: Object.is(velocity.vx, -0) ? 0 : velocity.vx,
    vy: Object.is(velocity.vy, -0) ? 0 : velocity.vy,
  };
}
