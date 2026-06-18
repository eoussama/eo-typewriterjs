import { expect, test } from "@playwright/test";

import { getOutputLocator, getOutputText, gotoScenario } from "../helpers/harness.helper";



test.describe("styling", () => {
  test("mark after typing wraps marked range in a styled span", async ({ page }) => {
    await gotoScenario(page, "mark-after-typing");

    await expect(
      getOutputLocator(page).locator("span.tw-highlight"),
    ).toBeVisible();

    const markedText = await getOutputLocator(page).locator("span.tw-highlight").textContent();

    expect(markedText).toBe("Hello");
  });

  test("inline style while typing produces styled spans per character", async ({ page }) => {
    await gotoScenario(page, "inline-style");

    const spans = getOutputLocator(page).locator("span.tw-accent");

    expect(await spans.count()).toBeGreaterThan(0);

    const styledText = await spans.allTextContents();
    const combined = styledText.join("");

    expect(combined).toBe("styled");
  });

  test("layered marks produce independent styled spans", async ({ page }) => {
    await gotoScenario(page, "layered-marks");

    await expect(getOutputLocator(page).locator("span.tw-danger")).toBeVisible();
    await expect(getOutputLocator(page).locator("span.tw-success")).toBeVisible();

    const dangerText = await getOutputLocator(page).locator("span.tw-danger").textContent();
    const successText = await getOutputLocator(page).locator("span.tw-success").textContent();

    expect(dangerText).toBe("Error");
    expect(successText).toBe("Ok");
  });

  test("selection-based mark applies to the selected range", async ({ page }) => {
    await gotoScenario(page, "selection-mark");

    await expect(
      getOutputLocator(page).locator("span.tw-highlight"),
    ).toBeVisible();

    const markedText = await getOutputLocator(page).locator("span.tw-highlight").textContent();

    expect(markedText).toBe("world");
  });

  test("style object mark applies inline CSS to the styled range", async ({ page }) => {
    await gotoScenario(page, "style-object-mark");

    const styled = getOutputLocator(page).locator("span[style]");

    await expect(styled).toBeVisible();

    const color = await styled.evaluate(el => (el as HTMLElement).style.color);

    expect(color).toBe("red");

    expect(await getOutputText(page)).toBe("Styled");
  });
});
