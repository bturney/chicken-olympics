import { test, expect } from "@playwright/test";
import type { PlayerChickenColor } from "../src/setup/colors";

function getSceneKey(
  page: import("@playwright/test").Page,
): Promise<string | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scenes = game.scene.getScenes(true);
    return scenes.length > 0
      ? (scenes[0] as { scene: { key: string } }).scene.key
      : null;
  });
}

function getCanvasScale(
  page: import("@playwright/test").Page,
): Promise<{ scaleX: number; scaleY: number }> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("No canvas");
    const rect = canvas.getBoundingClientRect();
    return {
      scaleX: rect.width / 800,
      scaleY: rect.height / 600,
    };
  });
}

function getSwatchEnabled(
  page: import("@playwright/test").Page,
  player: 0 | 1,
  color: PlayerChickenColor,
): Promise<boolean | null> {
  return page.evaluate(
    ({ player, color }) => {
      const game = window.__CHICKEN_OLYMPICS__;
      if (!game) return null;
      const scene = game.scene.getScene("SetupScene");
      if (!scene) return null;
      const swatches = (
        scene as unknown as {
          swatches: Array<{
            player: number;
            color: string;
            text: { input: { enabled: boolean } };
          }>;
        }
      ).swatches;
      const target = swatches.find(
        (s) => s.player === player && s.color === color,
      );
      if (!target) return null;
      return target.text.input.enabled;
    },
    { player, color },
  );
}

test("app loads, canvas mounts, and setup scene is active", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");
});

test("setup lets both players pick distinct Player Chicken colors and passes them to the Match", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });

  expect(await getSwatchEnabled(page, 1, "blue")).toBe(false);
  expect(await getSwatchEnabled(page, 1, "red")).toBe(true);
  expect(await getSwatchEnabled(page, 1, "purple")).toBe(true);
  expect(await getSwatchEnabled(page, 1, "orange")).toBe(true);

  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });

  expect(await getSwatchEnabled(page, 0, "red")).toBe(false);
  expect(await getSwatchEnabled(page, 0, "blue")).toBe(true);

  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  const sceneData = await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return null;
    const match = scene as unknown as {
      matchState?: { scores: [number, number]; elapsedMs: number };
      p1Color?: string;
      p2Color?: string;
    };
    return {
      matchStatePresent: match.matchState != null,
      p1Color: match.p1Color,
      p2Color: match.p2Color,
    };
  });

  expect(sceneData).not.toBeNull();
  expect(sceneData?.matchStatePresent).toBe(true);
  expect(sceneData?.p1Color).toBe("blue");
  expect(sceneData?.p2Color).toBe("red");
});
