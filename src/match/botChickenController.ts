export interface BotChickenConfig {
  reactionDelayMinMs: number;
  reactionDelayMaxMs: number;
  indecisionChance: number;
  indecisionDurationMs: number;
  farTargetChance: number;
}

export const PRODUCTION_BOT_CHICKEN_CONFIG: BotChickenConfig = {
  reactionDelayMinMs: 300,
  reactionDelayMaxMs: 550,
  indecisionChance: 0.25,
  indecisionDurationMs: 120,
  farTargetChance: 0.15,
};

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
  config?: Partial<BotChickenConfig>;
}

export interface BotChickenTickResult {
  controller: BotChickenController;
  velocity: { vx: number; vy: number };
}

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

function resolveConfig(input: BotChickenTickInput): BotChickenConfig {
  return { ...PRODUCTION_BOT_CHICKEN_CONFIG, ...input.config };
}

export function tickBotChickenController(
  controller: BotChickenController,
  input: BotChickenTickInput,
): BotChickenTickResult {
  const config = resolveConfig(input);
  const target = chooseTarget(controller, input, config);
  if (target === null) {
    return {
      controller: { ...controller, targetSpotIndex: null },
      velocity: { vx: 0, vy: 0 },
    };
  }

  const nextController =
    target.spotIndex === controller.targetSpotIndex
      ? controller
      : chooseNewTarget(controller, target.spotIndex, input.elapsedMs, config);

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
  config: BotChickenConfig,
): BotChickenController {
  const range = config.reactionDelayMaxMs - config.reactionDelayMinMs;
  const reactionDelayMs =
    config.reactionDelayMinMs + controller.random() * range;
  return {
    ...controller,
    targetSpotIndex: spotIndex,
    targetChosenAtMs: elapsedMs,
    reactionDelayMs,
    indecisionEndsAtMs:
      controller.random() > 1 - config.indecisionChance
        ? elapsedMs + reactionDelayMs + config.indecisionDurationMs
        : 0,
  };
}

function chooseTarget(
  controller: BotChickenController,
  input: BotChickenTickInput,
  config: BotChickenConfig,
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
  if (distanceRanked.length > 1 && controller.random() > 1 - config.farTargetChance) {
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
