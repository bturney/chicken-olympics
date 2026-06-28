import { test, expect } from "@playwright/test";

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

test("app loads, canvas mounts, and setup scene is active", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");
});

test("clicking Start transitions to Match scene with HUD", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not visible");

  const scaleX = box.width / 800;
  const scaleY = box.height / 600;

  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect(canvas).toBeAttached();

  const hudOk = await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return false;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return false;
    const matchScene = scene as {
      matchState?: { scores: [number, number]; elapsedMs: number };
    };
    return matchScene.matchState != null;
  });

  expect(hudOk).toBe(true);
});
