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
    // The click coordinates below are expressed in the original 800x600
    // authoring space. The game now renders at 2x that (1600x1200), but a point
    // at the same screen *fraction* maps identically whether we divide the old
    // coordinate by the old dimensions or the (doubled) coordinate by the new
    // ones. Keeping the 800x600 divisor lets those call sites stay unchanged.
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

function getMatchSceneColors(page: import("@playwright/test").Page): Promise<{
  p1Color: string | undefined;
  p2Color: string | undefined;
  p1TextureExists: boolean;
  p2TextureExists: boolean;
  p1ScoreText: string;
  p2ScoreText: string;
  p1ScoreTextColor: string;
  p2ScoreTextColor: string;
} | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return null;
    const match = scene as unknown as {
      p1Color?: string;
      p2Color?: string;
      p1Chicken: { texture: { key: string } };
      p2Chicken: { texture: { key: string } };
      p1ScoreText: { text: string; style: { color: string } };
      p2ScoreText: { text: string; style: { color: string } };
    };
    return {
      p1Color: match.p1Color,
      p2Color: match.p2Color,
      p1TextureExists:
        match.p1Chicken.texture.key === `p1_chicken_${match.p1Color}`,
      p2TextureExists:
        match.p2Chicken.texture.key === `p2_chicken_${match.p2Color}`,
      p1ScoreText: match.p1ScoreText.text,
      p2ScoreText: match.p2ScoreText.text,
      p1ScoreTextColor: match.p1ScoreText.style.color,
      p2ScoreTextColor: match.p2ScoreText.style.color,
    };
  });
}

function getMatchTextureColor(
  page: import("@playwright/test").Page,
  textureKey: string,
): Promise<{ r: number; g: number; b: number } | null> {
  return page.evaluate((key) => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const textureManager = game.textures;
    const texture = textureManager.get(key);
    if (!texture) return null;
    const source = texture.getSourceImage() as HTMLCanvasElement | null;
    if (!source) return null;
    const ctx = source.getContext("2d");
    if (!ctx) return null;
    // Sample the texture's center, which is the middle of the player circle
    // regardless of the resolution scale factor.
    const cx = Math.floor(source.width / 2);
    const cy = Math.floor(source.height / 2);
    const pixel = ctx.getImageData(cx, cy, 1, 1).data;
    return { r: pixel[0] ?? 0, g: pixel[1] ?? 0, b: pixel[2] ?? 0 };
  }, textureKey);
}

function getMatchTexturePixel(
  page: import("@playwright/test").Page,
  textureKey: string,
  x: number,
  y: number,
): Promise<{ r: number; g: number; b: number; a: number } | null> {
  return page.evaluate(
    ({ key, x, y }) => {
      const game = window.__CHICKEN_OLYMPICS__;
      if (!game) return null;
      const textureManager = game.textures;
      const texture = textureManager.get(key);
      if (!texture) return null;
      const source = texture.getSourceImage() as HTMLCanvasElement | null;
      if (!source) return null;
      const ctx = source.getContext("2d");
      if (!ctx) return null;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return {
        r: pixel[0] ?? 0,
        g: pixel[1] ?? 0,
        b: pixel[2] ?? 0,
        a: pixel[3] ?? 0,
      };
    },
    { key: textureKey, x, y },
  );
}

function cssHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = match[1]!;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

const EXPECTED_HEX: Record<
  PlayerChickenColor,
  { r: number; g: number; b: number }
> = {
  blue: { r: 0x44, g: 0x88, b: 0xff },
  red: { r: 0xff, g: 0x44, b: 0x44 },
  purple: { r: 0xaa, g: 0x44, b: 0xff },
  orange: { r: 0xff, g: 0x88, b: 0x44 },
};

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

  const sceneData = await getMatchSceneColors(page);

  expect(sceneData).not.toBeNull();
  expect(sceneData?.p1Color).toBe("blue");
  expect(sceneData?.p2Color).toBe("red");
  expect(sceneData?.p1TextureExists).toBe(true);
  expect(sceneData?.p2TextureExists).toBe(true);
  expect(sceneData?.p1ScoreText).toBe("P1 (Blue): 0");
  expect(sceneData?.p2ScoreText).toBe("P2 (Red): 0");

  const expectedBlue = cssHexToRgb("#4488ff");
  const expectedRed = cssHexToRgb("#ff4444");
  expect(expectedBlue).not.toBeNull();
  expect(expectedRed).not.toBeNull();
  const p1Color = cssHexToRgb(sceneData!.p1ScoreTextColor);
  const p2Color = cssHexToRgb(sceneData!.p2ScoreTextColor);
  expect(p1Color).toEqual(expectedBlue);
  expect(p2Color).toEqual(expectedRed);
});

test("Match scene renders Player Chicken textures and HUD in the selected colors", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 480 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 640 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  const sceneData = await getMatchSceneColors(page);

  expect(sceneData).not.toBeNull();
  expect(sceneData?.p1Color).toBe("purple");
  expect(sceneData?.p2Color).toBe("orange");
  expect(sceneData?.p1TextureExists).toBe(true);
  expect(sceneData?.p2TextureExists).toBe(true);
  expect(sceneData?.p1ScoreText).toBe("P1 (Purple): 0");
  expect(sceneData?.p2ScoreText).toBe("P2 (Orange): 0");

  const expectedPurple = cssHexToRgb("#aa44ff");
  const expectedOrange = cssHexToRgb("#ff8844");
  expect(expectedPurple).not.toBeNull();
  expect(expectedOrange).not.toBeNull();
  const p1Color = cssHexToRgb(sceneData!.p1ScoreTextColor);
  const p2Color = cssHexToRgb(sceneData!.p2ScoreTextColor);
  expect(p1Color).toEqual(expectedPurple);
  expect(p2Color).toEqual(expectedOrange);

  const p1TextureColor = await getMatchTextureColor(page, "p1_chicken_purple");
  const p2TextureColor = await getMatchTextureColor(page, "p2_chicken_orange");
  expect(p1TextureColor).toEqual(EXPECTED_HEX.purple);
  expect(p2TextureColor).toEqual(EXPECTED_HEX.orange);
});

test("Match scene gives each Player Chicken a mirrored beak and a more chicken-like silhouette", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  const p1Beak = await getMatchTexturePixel(page, "p1_chicken_blue", 42, 31);
  const p2Beak = await getMatchTexturePixel(page, "p2_chicken_red", 14, 31);
  const p1Center = await getMatchTextureColor(page, "p1_chicken_blue");

  expect(p1Beak).not.toBeNull();
  expect(p2Beak).not.toBeNull();
  expect(p1Center).not.toBeNull();

  const beak = cssHexToRgb("#ffbf4d");
  expect(beak).not.toBeNull();
  expect(p1Beak).toEqual(beak);
  expect(p2Beak).toEqual(beak);
  expect(p1Beak).not.toEqual(p1Center);
});

interface ProductionMatchDefaultsProbe {
  durationMs: number;
  elapsedMs: number;
  timerText: string;
  scores: [number, number];
}

function probeProductionMatchDefaults(
  page: import("@playwright/test").Page,
): Promise<ProductionMatchDefaultsProbe | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return null;
    const match = scene as unknown as {
      matchState: {
        durationMs: number;
        elapsedMs: number;
        scores: [number, number];
      };
      timerText: { text: string };
    };
    return {
      durationMs: match.matchState.durationMs,
      elapsedMs: match.matchState.elapsedMs,
      timerText: match.timerText.text,
      scores: match.matchState.scores,
    };
  });
}

test("production Local Match defaults to a 90 second duration", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect
    .poll(() => probeProductionMatchDefaults(page), { timeout: 2_000 })
    .toMatchObject({
      durationMs: 90_000,
      scores: [0, 0],
    });

  const probe = await probeProductionMatchDefaults(page);
  expect(probe).not.toBeNull();
  const timerMatch = /^Time: (?<seconds>\d+\.\d)s$/.exec(probe!.timerText);
  expect(timerMatch?.groups?.seconds).toBeDefined();
  const displayedSeconds = Number(timerMatch!.groups!.seconds);
  expect(displayedSeconds).toBeGreaterThanOrEqual(89.0);
  expect(displayedSeconds).toBeLessThanOrEqual(90.0);
});

async function completeMatchForTest(
  page: import("@playwright/test").Page,
  scores: [number, number],
): Promise<void> {
  await page.evaluate((nextScores) => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return;
    const match = scene as unknown as {
      matchState: {
        durationMs: number;
        elapsedMs: number;
        scores: [number, number];
      };
    };
    match.matchState = {
      ...match.matchState,
      elapsedMs: match.matchState.durationMs,
      scores: nextScores,
    };
  }, scores);
}

interface PodiumProbe {
  p1ScoreText: string;
  p2ScoreText: string;
  p1ScoreTextColor: string;
  p2ScoreTextColor: string;
  resultText: string;
  titleScaleX: number;
  titleScaleY: number;
  player1ScaleX: number;
  player1ScaleY: number;
  player2ScaleX: number;
  player2ScaleY: number;
  chickenTextureKeys: string[];
}

function probePodium(
  page: import("@playwright/test").Page,
): Promise<PodiumProbe | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("PodiumScene");
    if (!scene) return null;
    const podium = scene as unknown as {
      children: {
        list: Array<{
          type: string;
          text?: string;
          style?: { color?: string };
          texture?: { key: string };
          scaleX?: number;
          scaleY?: number;
        }>;
      };
    };
    const allChildren = podium.children.list;
    const texts = allChildren.filter((c) => c.type === "Text");
    const images = allChildren.filter((c) => c.type === "Image");
    const scoreP1 = texts.find((t) => t.text?.startsWith("Player 1 ("));
    const scoreP2 = texts.find((t) => t.text?.startsWith("Player 2 ("));
    const resultText = texts.find(
      (t) =>
        t.text === "Player 1 Wins!" ||
        t.text === "Player 2 Wins!" ||
        t.text === "It's a Tie!",
    );
    const titleText = texts.find((t) => t.text === "Podium Ceremony");
    const podiumP1 = images.find((i) =>
      i.texture?.key?.startsWith("podium_p1_"),
    );
    const podiumP2 = images.find((i) =>
      i.texture?.key?.startsWith("podium_p2_"),
    );
    return {
      p1ScoreText: scoreP1?.text ?? "",
      p2ScoreText: scoreP2?.text ?? "",
      p1ScoreTextColor: scoreP1?.style?.color ?? "",
      p2ScoreTextColor: scoreP2?.style?.color ?? "",
      resultText: resultText?.text ?? "",
      titleScaleX: titleText?.scaleX ?? 0,
      titleScaleY: titleText?.scaleY ?? 0,
      player1ScaleX: podiumP1?.scaleX ?? 0,
      player1ScaleY: podiumP1?.scaleY ?? 0,
      player2ScaleX: podiumP2?.scaleX ?? 0,
      player2ScaleY: podiumP2?.scaleY ?? 0,
      chickenTextureKeys: images
        .map((i) => i.texture?.key)
        .filter((k): k is string => typeof k === "string"),
    };
  });
}

test("Podium Ceremony renders winner with gold and second place with silver in the selected colors", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await completeMatchForTest(page, [3, 1]);

  await expect.poll(() => getSceneKey(page)).toBe("PodiumScene");

  const podium = await probePodium(page);

  expect(podium).not.toBeNull();
  expect(podium?.p1ScoreText).toBe("Player 1 (Blue): 3");
  expect(podium?.p2ScoreText).toBe("Player 2 (Red): 1");
  expect(cssHexToRgb(podium!.p1ScoreTextColor)).toEqual(cssHexToRgb("#4488ff"));
  expect(cssHexToRgb(podium!.p2ScoreTextColor)).toEqual(cssHexToRgb("#ff4444"));
  expect(podium?.resultText).toBe("Player 1 Wins!");
  expect(podium?.chickenTextureKeys).toContain("podium_p1_blue");
  expect(podium?.chickenTextureKeys).toContain("podium_p2_red");
});

test("Podium Ceremony renders shared-gold for tied scores in the selected colors", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 480 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 640 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await completeMatchForTest(page, [2, 2]);

  await expect.poll(() => getSceneKey(page)).toBe("PodiumScene");

  const podium = await probePodium(page);

  expect(podium).not.toBeNull();
  expect(podium?.p1ScoreText).toBe("Player 1 (Purple): 2");
  expect(podium?.p2ScoreText).toBe("Player 2 (Orange): 2");
  expect(podium?.resultText).toBe("It's a Tie!");
  expect(podium?.chickenTextureKeys).toContain("podium_p1_purple");
  expect(podium?.chickenTextureKeys).toContain("podium_p2_orange");
});

async function movePlayerOntoActiveChick(
  page: import("@playwright/test").Page,
  playerIndex: 0 | 1,
): Promise<void> {
  await page.evaluate(
    ({ playerIndex }) => {
      const game = window.__CHICKEN_OLYMPICS__;
      if (!game) return;
      const scene = game.scene.getScene("MatchScene");
      if (!scene) return;
      const match = scene as unknown as {
        p1Chicken: {
          x: number;
          y: number;
          setPosition: (x: number, y: number) => void;
        };
        p2Chicken: {
          x: number;
          y: number;
          setPosition: (x: number, y: number) => void;
        };
        chickBodies: Array<{ x: number; y: number; visible: boolean }>;
        peekState: { peeks: Array<{ activeSpotIndex: number | null }> };
      };
      const targetChick = match.chickBodies.find(
        (c, i) =>
          c.visible && match.peekState.peeks[i]?.activeSpotIndex !== null,
      );
      if (!targetChick) return;
      const player = playerIndex === 0 ? match.p1Chicken : match.p2Chicken;
      player.setPosition(targetChick.x, targetChick.y);
    },
    { playerIndex },
  );
}

interface ClaimFeedbackProbe {
  chickBodies: Array<{
    tintTopLeft: number;
    scaleX: number;
    scaleY: number;
    visible: boolean;
  }>;
  claimScoreEchoes: Array<{
    text: string;
    x: number;
    y: number;
    alpha: number;
    visible: boolean;
  }>;
  scores: [number, number];
  p1ScoreText: string;
  p2ScoreText: string;
  p1ScoreScaleX: number;
  p1ScoreScaleY: number;
  p2ScoreScaleX: number;
  p2ScoreScaleY: number;
  activeClaimAnimationCount: number;
  elapsedMs: number;
  animationDetails: Array<{
    slotIndex: number;
    playerIndex: number;
    startedAtMs: number;
  }>;
}

function probeClaimFeedback(
  page: import("@playwright/test").Page,
): Promise<ClaimFeedbackProbe | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return null;
    const match = scene as unknown as {
      chickBodies: Array<{
        tintTopLeft: number;
        scaleX: number;
        scaleY: number;
        visible: boolean;
      }>;
      claimScoreEchoes: Array<{
        text: {
          text: string;
          x: number;
          y: number;
          alpha: number;
          visible: boolean;
        };
      }>;
      matchState: { scores: [number, number]; elapsedMs: number };
      p1ScoreText: { text: string; scaleX: number; scaleY: number };
      p2ScoreText: { text: string; scaleX: number; scaleY: number };
      presentationFeedback: {
        claimAnimations: Array<{
          slotIndex: number;
          playerIndex: number;
          startedAtMs: number;
        }>;
      };
    };
    return {
      chickBodies: match.chickBodies.map((b) => ({
        tintTopLeft: b.tintTopLeft,
        scaleX: b.scaleX,
        scaleY: b.scaleY,
        visible: b.visible,
      })),
      claimScoreEchoes: match.claimScoreEchoes.map((echo) => ({
        text: echo.text.text,
        x: echo.text.x,
        y: echo.text.y,
        alpha: echo.text.alpha,
        visible: echo.text.visible,
      })),
      scores: match.matchState.scores,
      p1ScoreText: match.p1ScoreText.text,
      p2ScoreText: match.p2ScoreText.text,
      p1ScoreScaleX: match.p1ScoreText.scaleX,
      p1ScoreScaleY: match.p1ScoreText.scaleY,
      p2ScoreScaleX: match.p2ScoreText.scaleX,
      p2ScoreScaleY: match.p2ScoreText.scaleY,
      activeClaimAnimationCount:
        match.presentationFeedback.claimAnimations.length,
      elapsedMs: match.matchState.elapsedMs,
      animationDetails: match.presentationFeedback.claimAnimations.map((a) => ({
        slotIndex: a.slotIndex,
        playerIndex: a.playerIndex,
        startedAtMs: a.startedAtMs,
      })),
    };
  });
}

test("claiming a normal Chick tints it the claiming player's color, pops it, and updates the score immediately", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect
    .poll(async () => (await probeClaimFeedback(page))?.chickBodies.length, {
      timeout: 2_000,
    })
    .toBe(3);

  const before = await probeClaimFeedback(page);
  expect(before).not.toBeNull();
  const initialScores = before?.scores ?? [0, 0];

  await movePlayerOntoActiveChick(page, 0);

  await expect
    .poll(() => probeClaimFeedback(page), {
      timeout: 2_000,
      intervals: [16, 32, 64],
    })
    .toMatchObject({
      scores: [initialScores[0] + 1, initialScores[1]],
      p1ScoreText: `P1 (Blue): ${initialScores[0] + 1}`,
      p2ScoreText: `P2 (Red): ${initialScores[1]}`,
      activeClaimAnimationCount: 1,
    });

  const after = await probeClaimFeedback(page);
  expect(after).not.toBeNull();
  expect(after!.claimScoreEchoes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ text: "+1", visible: true }),
    ]),
  );
  expect(after!.p1ScoreScaleX).toBeGreaterThan(1);
  expect(after!.p1ScoreScaleY).toBeGreaterThan(1);
  const claimed = after!.chickBodies.find((b) => b.tintTopLeft === 0x4488ff);
  expect(claimed).toBeDefined();
  expect(claimed?.visible).toBe(true);
  expect(claimed?.scaleX).toBeGreaterThan(0);
  expect(claimed?.scaleX).toBeLessThanOrEqual(1.5);
  expect(claimed?.scaleY).toBeCloseTo(claimed?.scaleX ?? 1, 3);
  expect(claimed?.scaleX).not.toBe(1);
});

test("claim animation is removed and the claiming color tint clears once feedback ends", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 480 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 640 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect
    .poll(async () => (await probeClaimFeedback(page))?.chickBodies.length, {
      timeout: 2_000,
    })
    .toBe(3);

  await movePlayerOntoActiveChick(page, 1);

  await expect
    .poll(() => probeClaimFeedback(page), { timeout: 2_000 })
    .toMatchObject({
      scores: [0, 1],
      activeClaimAnimationCount: 1,
    });

  await expect
    .poll(() => probeClaimFeedback(page), { timeout: 2_000 })
    .toMatchObject({ activeClaimAnimationCount: 0 });

  const after = await probeClaimFeedback(page);
  expect(after).not.toBeNull();
  const orangeTinted = after!.chickBodies.find(
    (b) => b.tintTopLeft === 0xff8844,
  );
  expect(orangeTinted).toBeUndefined();
});

interface GreenChickProbe {
  greenChickState: {
    status: string;
    scheduledAtMs: number;
    activeSpotIndex: number | null;
    peekStartedAtMs: number | null;
  };
  greenChickBody: {
    x: number;
    y: number;
    visible: boolean;
    scaleX: number;
    scaleY: number;
  };
  scores: [number, number];
  p1ScoreText: string;
  p2ScoreText: string;
  elapsedMs: number;
}

function probeGreenChick(
  page: import("@playwright/test").Page,
): Promise<GreenChickProbe | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return null;
    const match = scene as unknown as {
      greenChickState: {
        status: string;
        scheduledAtMs: number;
        activeSpotIndex: number | null;
        peekStartedAtMs: number | null;
      };
      greenChickBody: {
        x: number;
        y: number;
        visible: boolean;
        scaleX: number;
        scaleY: number;
      };
      matchState: { scores: [number, number]; elapsedMs: number };
      p1ScoreText: { text: string };
      p2ScoreText: { text: string };
    };
    return {
      greenChickState: match.greenChickState,
      greenChickBody: match.greenChickBody,
      scores: match.matchState.scores,
      p1ScoreText: match.p1ScoreText.text,
      p2ScoreText: match.p2ScoreText.text,
      elapsedMs: match.matchState.elapsedMs,
    };
  });
}

async function activateGreenChickForTest(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return;
    const match = scene as unknown as {
      greenChickState: {
        status: string;
        scheduledAtMs: number;
        activeSpotIndex: number | null;
        peekStartedAtMs: number | null;
        claimedAtMs: number | null;
        claimedByPlayerIndex: 0 | 1 | null;
      };
      matchState: { elapsedMs: number };
      greenChickBody: {
        x: number;
        y: number;
        body: { enable: boolean } | null;
        setPosition: (x: number, y: number) => void;
        setVisible: (v: boolean) => void;
      };
    };
    match.greenChickState = {
      status: "active",
      scheduledAtMs: 0,
      activeSpotIndex: 5,
      peekStartedAtMs: match.matchState.elapsedMs,
      claimedAtMs: null,
      claimedByPlayerIndex: null,
    };
    match.greenChickBody.setPosition(560, 490);
    match.greenChickBody.setVisible(true);
    if (match.greenChickBody.body) {
      match.greenChickBody.body.enable = true;
    }
  });
}

test("Green Chick is scheduled between 20 and 70 seconds in the 90 second match", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  const probe = await probeGreenChick(page);
  expect(probe).not.toBeNull();
  expect(probe?.greenChickState.status).toBe("pending");
  expect(probe?.greenChickState.scheduledAtMs).toBeGreaterThanOrEqual(20_000);
  expect(probe?.greenChickState.scheduledAtMs).toBeLessThanOrEqual(70_000);
});

test("Green Chick renders as an extra peek and awards five points when claimed", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect
    .poll(async () => (await probeClaimFeedback(page))?.chickBodies.length, {
      timeout: 2_000,
    })
    .toBe(3);

  await activateGreenChickForTest(page);

  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return null;
    const match = scene as unknown as {
      handleGreenChickClaim: (playerIndex: 0 | 1) => void;
    };
    match.handleGreenChickClaim(0);
    return { called: true };
  });

  expect(result?.called).toBe(true);

  await expect
    .poll(() => probeGreenChick(page), { timeout: 2_000 })
    .toMatchObject({
      scores: [5, 0],
      p1ScoreText: "P1 (Blue): 5",
      greenChickState: { status: "claimed" },
      greenChickBody: {
        visible: true,
      },
    });

  const afterClaim = await probeGreenChick(page);
  expect(afterClaim?.greenChickBody.scaleX).toBeGreaterThan(1.4);
  expect(afterClaim?.greenChickBody.scaleY).toBeGreaterThan(1.4);
});

test("Green Chick does not return after the match continues past its expiry", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 480 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 640 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await activateGreenChickForTest(page);

  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return;
    const match = scene as unknown as {
      handleGreenChickClaim: (playerIndex: 0 | 1) => void;
    };
    match.handleGreenChickClaim(0);
  });

  await expect
    .poll(() => probeGreenChick(page), { timeout: 2_000 })
    .toMatchObject({ greenChickState: { status: "claimed" } });

  const beforeAdvance = await probeGreenChick(page);
  expect(beforeAdvance?.elapsedMs).toBeDefined();

  await page.evaluate((targetElapsedMs) => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return;
    const match = scene as unknown as {
      matchState: { elapsedMs: number };
    };
    match.matchState.elapsedMs = targetElapsedMs;
  }, 30_000);

  await expect
    .poll(() => probeGreenChick(page), { timeout: 2_000 })
    .toMatchObject({ greenChickState: { status: "claimed" } });
});

function probePlayedSfx(page: import("@playwright/test").Page): Promise<{
  match: string[];
  podium: string[];
} | null> {
  return page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return null;
    const match = game.scene.getScene("MatchScene") as unknown as {
      playedSfx?: string[];
    } | null;
    const podium = game.scene.getScene("PodiumScene") as unknown as {
      playedSfx?: string[];
    } | null;
    return {
      match: match?.playedSfx ?? [],
      podium: podium?.playedSfx ?? [],
    };
  });
}

test("claiming a normal Chick queues a distinct SFX for the normal claim", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await expect
    .poll(async () => (await probeClaimFeedback(page))?.chickBodies.length, {
      timeout: 2_000,
    })
    .toBe(3);

  await movePlayerOntoActiveChick(page, 0);

  await expect
    .poll(() => probePlayedSfx(page), { timeout: 2_000 })
    .toMatchObject({
      match: expect.arrayContaining(["normalClaim"]),
    });
});

async function scheduleGreenChickToAppearNow(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return;
    const match = scene as unknown as {
      greenChickState: {
        status: string;
        scheduledAtMs: number;
        activeSpotIndex: number | null;
        peekStartedAtMs: number | null;
        claimedAtMs: number | null;
        claimedByPlayerIndex: 0 | 1 | null;
      };
    };
    match.greenChickState = {
      status: "pending",
      scheduledAtMs: 0,
      activeSpotIndex: null,
      peekStartedAtMs: null,
      claimedAtMs: null,
      claimedByPlayerIndex: null,
    };
  });
}

test("Green Chick appearance and claim queue distinct SFX events", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await scheduleGreenChickToAppearNow(page);

  await expect
    .poll(() => probePlayedSfx(page), { timeout: 2_000 })
    .toMatchObject({
      match: expect.arrayContaining(["greenChickAppear"]),
    });

  await page.evaluate(() => {
    const game = window.__CHICKEN_OLYMPICS__;
    if (!game) return;
    const scene = game.scene.getScene("MatchScene");
    if (!scene) return;
    const match = scene as unknown as {
      handleGreenChickClaim: (playerIndex: 0 | 1) => void;
    };
    match.handleGreenChickClaim(0);
  });

  await expect
    .poll(() => probePlayedSfx(page), { timeout: 2_000 })
    .toMatchObject({
      match: expect.arrayContaining(["greenChickAppear", "greenChickClaim"]),
    });
});

test("Podium Ceremony queues a celebratory SFX fanfare on entry", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await completeMatchForTest(page, [1, 0]);

  await expect.poll(() => getSceneKey(page)).toBe("PodiumScene");

  await expect
    .poll(() => probePlayedSfx(page), { timeout: 2_000 })
    .toMatchObject({
      podium: expect.arrayContaining(["podiumFanfare"]),
    });
});

test("Podium Ceremony gives the gold podium chicken and title a small celebratory pop", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await completeMatchForTest(page, [3, 1]);

  await expect.poll(() => getSceneKey(page)).toBe("PodiumScene");

  await expect
    .poll(() => probePodium(page), { timeout: 2_000, intervals: [16, 32, 64] })
    .toMatchObject({
      titleScaleX: expect.any(Number),
      player1ScaleX: expect.any(Number),
    });

  const podium = await probePodium(page);
  expect(podium).not.toBeNull();
  expect(podium!.titleScaleX).toBeGreaterThan(1);
  expect(podium!.titleScaleY).toBeGreaterThan(1);
  expect(podium!.player1ScaleX).toBeGreaterThan(1);
  expect(podium!.player1ScaleY).toBeGreaterThan(1);
  expect(podium!.player2ScaleX).toBe(1);
  expect(podium!.player2ScaleY).toBe(1);
});

async function completeShortMatchForTest(
  page: import("@playwright/test").Page,
  scores: [number, number],
  durationMs: number,
): Promise<void> {
  await page.evaluate(
    ({ nextScores, durationMs }) => {
      const game = window.__CHICKEN_OLYMPICS__;
      if (!game) return;
      const scene = game.scene.getScene("MatchScene");
      if (!scene) return;
      const match = scene as unknown as {
        matchState: {
          durationMs: number;
          elapsedMs: number;
          scores: [number, number];
        };
      };
      match.matchState = {
        ...match.matchState,
        durationMs,
        elapsedMs: durationMs,
        scores: nextScores,
      };
    },
    { nextScores: scores, durationMs },
  );
}

test("Play Again on the Podium Ceremony returns to setup with a fresh Player Chicken color selection", async ({
  page,
}) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeAttached();

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  const { scaleX, scaleY } = await getCanvasScale(page);

  await canvas.click({ position: { x: 160 * scaleX, y: 180 * scaleY } });
  await canvas.click({ position: { x: 320 * scaleX, y: 290 * scaleY } });
  await canvas.click({ position: { x: 400 * scaleX, y: 380 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("MatchScene");

  await completeShortMatchForTest(page, [3, 1], 2_000);

  await expect.poll(() => getSceneKey(page)).toBe("PodiumScene");

  await canvas.click({ position: { x: 400 * scaleX, y: 580 * scaleY } });

  await expect.poll(() => getSceneKey(page)).toBe("SetupScene");

  for (const color of ["blue", "red", "purple", "orange"] as const) {
    expect(await getSwatchEnabled(page, 0, color)).toBe(true);
    expect(await getSwatchEnabled(page, 1, color)).toBe(true);
  }
});
