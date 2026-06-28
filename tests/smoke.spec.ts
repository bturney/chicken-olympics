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

test("clicking Start in canvas transitions to Match scene", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not visible");

  const gameWidth = 800;
  const gameHeight = 600;
  const scaleX = box.width / gameWidth;
  const scaleY = box.height / gameHeight;

  const startX = 400 * scaleX;
  const startY = 380 * scaleY;

  await canvas.click({ position: { x: startX, y: startY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect(canvas).toBeAttached();
});

test("Match to Podium Ceremony scene transition works", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const boxA = await canvas.boundingBox();
  if (!boxA) throw new Error("Canvas not visible");
  const scaleX = boxA.width / 800;
  const scaleY = boxA.height / 600;

  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await canvas.click({ position: { x: 400 * scaleX, y: 540 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("PodiumScene");

  await expect(canvas).toBeAttached();
});
