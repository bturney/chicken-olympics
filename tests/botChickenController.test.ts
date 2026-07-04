import { describe, expect, it } from "vitest";
import {
  createBotChickenController,
  tickBotChickenController,
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
