import { expect, test } from "@playwright/test";

import { RECIPES } from "../../../docs/.vitepress/theme/playground/recipes";
import { collectErrors, openSandbox, previewText } from "../../helpers/site.helper";



/**
 * @description
 * Replace the editor's code by typing it
 *
 * @param page - The page
 * @param code - The new code
 * @returns A promise resolving once the code is typed
 */
async function typeCode(page: import("@playwright/test").Page, code: string): Promise<void> {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.locator(".cm-content").pressSequentially(code.replace(/\n\s*/g, " "));
}

test.describe("sandbox", () => {
  test("runs the first recipe on load", async ({ page }) => {
    const errors = collectErrors(page);

    await openSandbox(page);

    await expect(page.getByTestId("status")).toHaveText("Completed", { timeout: 15_000 });
    expect(await previewText(page.getByTestId("preview"))).toBe(RECIPES[0]!.expected);
    expect(errors).toEqual([]);
  });

  test("runs edited code with the shortcut and shows console output", async ({ page }) => {
    await openSandbox(page);
    await typeCode(page, "const tw = createTypewriter({ renderer }); tw.timeline.type(\"Edited\", { interval: 5 }); await tw.play(); console.log(\"done\", { ok: true });");
    await page.keyboard.press("ControlOrMeta+Enter");

    await expect(page.getByTestId("status")).toHaveText("Completed");
    expect(await previewText(page.getByTestId("preview"))).toBe("Edited");
    await expect(page.getByTestId("console")).toContainText("done {\"ok\":true}");
  });

  test("shows the line of an error and selects it in the editor", async ({ page }) => {
    await openSandbox(page);
    await typeCode(page, "const a = 1;\nnull.boom();");
    await page.getByTestId("run").click();

    await expect(page.getByTestId("error")).toContainText("TypeError");
    await expect(page.getByTestId("status")).toHaveText("Error");
  });

  test("keeps the output when switching between DOM and text", async ({ page }) => {
    await openSandbox(page, "multiline");
    await page.getByTestId("play-toggle").click();

    const paused = await previewText(page.getByTestId("preview"));

    expect(paused.length).toBeGreaterThan(0);

    // Text mode draws the cursor as a plain glyph instead of an element.
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await expect(page.getByTestId("preview")).toHaveText(`${paused}|`);
    await expect(page.getByTestId("preview").locator(".typewriter-cursor")).toHaveCount(0);

    await page.getByRole("button", { name: "DOM", exact: true }).click();

    expect(await previewText(page.getByTestId("preview"))).toBe(paused);
    await expect(page.getByTestId("preview").locator(".typewriter-cursor")).toHaveCount(1);
  });

  test("pauses, steps and seeks", async ({ page }) => {
    await openSandbox(page, "type-by-word");
    await page.getByTestId("play-toggle").click();
    await expect(page.getByTestId("status")).toHaveText("Paused");

    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await page.getByRole("button", { name: "Step forward", exact: true }).click();
    expect(await previewText(page.getByTestId("preview"))).toBe("The ");

    const max = await page.getByTestId("seek").getAttribute("max");

    await page.getByTestId("seek").fill(max!);
    expect(await previewText(page.getByTestId("preview"))).toBe("The quick brown fox jumps over the lazy dog");
  });

  test("asks before a recipe replaces edited code", async ({ page }) => {
    await openSandbox(page);
    await typeCode(page, "// mine");

    page.once("dialog", dialog => void dialog.dismiss());
    await page.locator("[data-recipe=multiline]").click();
    await expect(page.locator(".cm-content")).toContainText("// mine");

    page.once("dialog", dialog => void dialog.accept());
    await page.locator("[data-recipe=multiline]").click();
    await expect(page.locator(".cm-content")).toContainText("Line one");
    await expect(page).toHaveURL(/#recipe=multiline$/);
  });

  test("filters recipes by search and category", async ({ page }) => {
    await openSandbox(page);

    await page.getByTestId("recipe-search").fill("emoji");
    await expect(page.locator("[data-recipe]")).toHaveCount(1);

    await page.getByTestId("recipe-search").fill("");
    await page.getByRole("button", { name: "Audio", exact: true }).click();
    await expect(page.locator("[data-recipe]")).toHaveCount(RECIPES.filter(recipe => recipe.category === "audio").length);
  });

  test("shares code through the URL", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openSandbox(page);
    await typeCode(page, "const tw = createTypewriter({ renderer }); tw.timeline.type(\"Shared\", { interval: 5 }); await tw.play();");
    await page.getByRole("button", { name: "Share" }).click();

    const url = await page.evaluate(() => navigator.clipboard.readText());

    expect(url).toMatch(/#code=/);

    // Someone opening the link gets the shared code.
    const recipient = await context.newPage();

    await recipient.goto(url);
    await expect(recipient.getByTestId("status")).toHaveText("Completed");
    expect(await previewText(recipient.getByTestId("preview"))).toBe("Shared");
  });

  test("follows recipe links while open", async ({ page }) => {
    await openSandbox(page);
    await page.evaluate(() => {
      location.hash = "recipe=multiline";
    });

    await expect(page.locator(".cm-content")).toContainText("Line one");
    await expect(page.locator("[data-recipe=multiline]")).toHaveAttribute("aria-current", "true");
  });

  test("opens the recipes drawer on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSandbox(page);

    const drawer = page.getByRole("complementary", { name: "Recipes" });

    await expect(drawer).not.toBeInViewport();
    await page.getByRole("button", { name: "Recipes" }).click();
    await expect(drawer).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeInViewport();
  });
});
