import { expect, test } from "@playwright/test";

interface MatchSceneForTest {
  match: { view(): { elapsedMs: number } };
}

function matchElapsed(): number {
  const scene = window.__CHICKEN_OLYMPICS__!.scene.getScene(
    "MatchScene",
  ) as unknown as MatchSceneForTest;
  return scene.match.view().elapsedMs;
}

async function startMatch(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => window.__CHICKEN_OLYMPICS__ !== undefined);
  await page.evaluate(() => {
    localStorage.clear();
    window.__CHICKEN_OLYMPICS__!.scene.start("MatchScene", {
      playerSlotCount: 2,
    });
  });
  await page.keyboard.press("`");
}

test("the playtest form supports native interaction and pauses the Match Runtime", async ({
  page,
}) => {
  await startMatch(page);
  const form = page.locator("[data-playtest-tuning]");
  await expect(form).toBeVisible();
  await expect(form.locator("input")).toHaveCount(22);

  const firstInput = form.locator("input").first();
  await firstInput.click();
  await expect(firstInput).toBeFocused();
  await page.keyboard.press("Tab");
  const secondInput = form.locator("input").nth(1);
  await expect(secondInput).toBeFocused();
  await expect
    .poll(() =>
      secondInput.evaluate((input) => getComputedStyle(input).outlineWidth),
    )
    .toBe("3px");
  await page.keyboard.press("Shift+Tab");
  await expect(firstInput).toBeFocused();

  const elapsedWhileOpen = await page.evaluate(matchElapsed);
  await page.waitForTimeout(100);
  expect(await page.evaluate(matchElapsed)).toBe(elapsedWhileOpen);

  await page.keyboard.press("Escape");
  await expect(form).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(matchElapsed))
    .toBeGreaterThan(elapsedWhileOpen);
});

test("the form reports validation inline and applies through a native keyboard action", async ({
  page,
}) => {
  await startMatch(page);
  const form = page.locator("[data-playtest-tuning]");
  const matchLength = form.locator("input").first();

  await matchLength.fill("not-valid");
  await expect(form.locator("output").first()).toContainText(
    "Invalid duration",
  );
  await form.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(matchLength).toHaveValue("not-valid");

  await matchLength.fill("120s");
  const apply = form.getByRole("button", { name: "Apply", exact: true });
  await apply.focus();
  await page.keyboard.press("Enter");
  await expect(matchLength).toHaveValue("120000ms");

  await matchLength.fill("60s");
  const reset = form.getByRole("button", { name: "Reset Draft", exact: true });
  await reset.focus();
  await page.keyboard.press("Space");
  await expect(matchLength).toHaveValue("120000ms");
});

test("restarting the scene cleans up the native form", async ({ page }) => {
  await startMatch(page);
  const form = page.locator("[data-playtest-tuning]");

  await form
    .getByRole("button", { name: "Restart Match With Tuning", exact: true })
    .click();
  await expect(form).toHaveCount(0);
});
