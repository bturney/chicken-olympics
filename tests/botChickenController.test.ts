import { describe, expect, it } from "vitest";
import {
  createBotChickenController,
  tickBotChickenController,
  type BotChickenConfig,
} from "../src/match/botChickenController";

describe("Bot Chicken controller", () => {
  function randomSequence(values: number[]): () => number {
    let index = 0;
    return () => values[index++] ?? values.at(-1) ?? 0;
  }

  it("waits before chasing a newly visible chick", () => {
    let bot = createBotChickenController({ random: () => 0 });

    const beforeReaction = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 100,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });
    bot = beforeReaction.controller;

    expect(beforeReaction.velocity).toEqual({ vx: 0, vy: 0 });

    const afterReaction = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 400,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });

    expect(afterReaction.velocity).toEqual({ vx: 200, vy: 0 });
  });

  it("usually chases a nearby chick instead of the first visible chick", () => {
    let bot = createBotChickenController({ random: () => 0 });

    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 400,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 100, y: 0 },
        { spotIndex: 2, x: 0, y: 50 },
      ],
    });
    bot = result.controller;

    const afterReaction = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 700,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 100, y: 0 },
        { spotIndex: 2, x: 0, y: 50 },
      ],
    });

    expect(afterReaction.velocity).toEqual({ vx: 0, vy: 200 });
  });

  it("sometimes chooses a worse visible chick", () => {
    let bot = createBotChickenController({ random: randomSequence([0.95, 0]) });

    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 400,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 0, y: 50 },
        { spotIndex: 2, x: 100, y: 0 },
      ],
    });
    bot = result.controller;

    const afterReaction = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 700,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 0, y: 50 },
        { spotIndex: 2, x: 100, y: 0 },
      ],
    });

    expect(afterReaction.velocity).toEqual({ vx: 200, vy: 0 });
  });

  it("briefly moves the wrong way before correcting when indecisive", () => {
    let bot = createBotChickenController({ random: randomSequence([0, 0.95]) });

    const waiting = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 0,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });
    bot = waiting.controller;

    const indecisive = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 350,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });

    expect(indecisive.velocity).toEqual({ vx: -200, vy: 0 });

    const corrected = tickBotChickenController(indecisive.controller, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 500,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });

    expect(corrected.velocity).toEqual({ vx: 200, vy: 0 });
  });

  it("restarts its reaction delay when its target disappears", () => {
    let bot = createBotChickenController({ random: () => 0 });

    const firstTarget = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 0,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });
    bot = firstTarget.controller;

    const chasing = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 300,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
    });

    expect(chasing.velocity).toEqual({ vx: 200, vy: 0 });

    const newTarget = tickBotChickenController(chasing.controller, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 350,
      speed: 200,
      visibleTargets: [{ spotIndex: 2, x: 0, y: 100 }],
    });

    expect(newTarget.velocity).toEqual({ vx: 0, vy: 0 });
  });
});

describe("Bot Chicken controller with tuned indecision config", () => {
  function defaultConfig(
    overrides?: Partial<BotChickenConfig>,
  ): BotChickenConfig {
    return {
      reactionDelayMinMs: 300,
      reactionDelayMaxMs: 550,
      indecisionChance: 0.25,
      indecisionDurationMs: 120,
      farTargetChance: 0.15,
      ...overrides,
    };
  }

  it("reacts immediately with zero reaction delay min/max", () => {
    const bot = createBotChickenController({ random: () => 0 });
    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 0,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({ reactionDelayMinMs: 0, reactionDelayMaxMs: 0 }),
    });
    expect(result.velocity).toEqual({ vx: 200, vy: 0 });
  });

  it("delays with long reaction delay min", () => {
    const bot = createBotChickenController({ random: () => 0 });
    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 50,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({
        reactionDelayMinMs: 200,
        reactionDelayMaxMs: 200,
      }),
    });
    expect(result.velocity).toEqual({ vx: 0, vy: 0 });
  });

  it("never shows indecision when indecisionChance is zero", () => {
    const bot = createBotChickenController({ random: () => 0.99 });
    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 400,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({
        indecisionChance: 0,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });
    expect(result.velocity).toEqual({ vx: 200, vy: 0 });
  });

  it("always shows indecision when indecisionChance is one", () => {
    let bot = createBotChickenController({ random: () => 0.01 });
    const waiting = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 0,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({
        indecisionChance: 1,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });
    bot = waiting.controller;

    expect(waiting.velocity).toEqual({ vx: -200, vy: 0 });
  });

  it("extends indecision with longer indecisionDurationMs", () => {
    let bot = createBotChickenController({ random: () => 0.01 });
    const indecisive = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 0,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({
        indecisionChance: 1,
        indecisionDurationMs: 500,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });
    bot = indecisive.controller;

    expect(indecisive.velocity).toEqual({ vx: -200, vy: 0 });

    const stillIndecisive = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 200,
      speed: 200,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({
        indecisionChance: 1,
        indecisionDurationMs: 500,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });

    expect(stillIndecisive.velocity).toEqual({ vx: -200, vy: 0 });
  });

  it("always picks the closest target when farTargetChance is zero", () => {
    let bot = createBotChickenController({ random: () => 0.99 });
    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 400,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 100, y: 0 },
        { spotIndex: 2, x: 0, y: 50 },
      ],
      config: defaultConfig({
        farTargetChance: 0,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });
    bot = result.controller;

    const afterReaction = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 700,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 100, y: 0 },
        { spotIndex: 2, x: 0, y: 50 },
      ],
      config: defaultConfig({
        farTargetChance: 0,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });

    expect(afterReaction.velocity).toEqual({ vx: 0, vy: 200 });
  });

  it("always picks the farthest target when farTargetChance is one", () => {
    let bot = createBotChickenController({ random: () => 0.01 });
    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 400,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 0, y: 50 },
        { spotIndex: 2, x: 100, y: 0 },
      ],
      config: defaultConfig({
        farTargetChance: 1,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });
    bot = result.controller;

    const afterReaction = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 700,
      speed: 200,
      visibleTargets: [
        { spotIndex: 1, x: 0, y: 50 },
        { spotIndex: 2, x: 100, y: 0 },
      ],
      config: defaultConfig({
        farTargetChance: 1,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });

    expect(afterReaction.velocity).toEqual({ vx: 200, vy: 0 });
  });

  it("uses correct speed from input when indecision is tuned", () => {
    let bot = createBotChickenController({ random: () => 0.01 });
    const result = tickBotChickenController(bot, {
      botPosition: { x: 0, y: 0 },
      elapsedMs: 0,
      speed: 100,
      visibleTargets: [{ spotIndex: 1, x: 100, y: 0 }],
      config: defaultConfig({
        indecisionChance: 1,
        reactionDelayMinMs: 0,
        reactionDelayMaxMs: 0,
      }),
    });
    bot = result.controller;

    expect(result.velocity).toEqual({ vx: -100, vy: 0 });
  });
});
