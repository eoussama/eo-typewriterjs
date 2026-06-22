import { expect, test } from "@playwright/test";

import { getOutputLocator, getOutputText, gotoScenario } from "../helpers/harness.helper";



test.describe("styling", () => {
  test("style after typing wraps styled range in a styled span", async ({ page }) => {
    await gotoScenario(page, "style-after-typing");

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

  test("layered styles produce independent styled spans", async ({ page }) => {
    await gotoScenario(page, "layered-styles");

    await expect(getOutputLocator(page).locator("span.tw-danger")).toBeVisible();
    await expect(getOutputLocator(page).locator("span.tw-success")).toBeVisible();

    const dangerText = await getOutputLocator(page).locator("span.tw-danger").textContent();
    const successText = await getOutputLocator(page).locator("span.tw-success").textContent();

    expect(dangerText).toBe("Error");
    expect(successText).toBe("Ok");
  });

  test("selection-based style applies to the selected range", async ({ page }) => {
    await gotoScenario(page, "selection-style");

    await expect(
      getOutputLocator(page).locator("span.tw-highlight"),
    ).toBeVisible();

    const markedText = await getOutputLocator(page).locator("span.tw-highlight").textContent();

    expect(markedText).toBe("world");
  });

  test("style object applies inline CSS to the styled range", async ({ page }) => {
    await gotoScenario(page, "style-object");

    const styled = getOutputLocator(page).locator("span[style]");

    await expect(styled).toBeVisible();

    const color = await styled.evaluate(el => (el as HTMLElement).style.color);

    expect(color).toBe("red");

    expect(await getOutputText(page)).toBe("Styled");
  });

  test("unselect removes the selection highlight without moving the cursor", async ({ page }) => {
    await gotoScenario(page, "unselect");

    await expect(
      getOutputLocator(page).locator(".typewriter-selection"),
    ).toHaveCount(0);

    expect(await getOutputText(page)).toBe("Hello World");
  });

  test("unstyle by range removes the styled span from the unstyled portion", async ({ page }) => {
    await gotoScenario(page, "unstyle-range");

    const highlight = getOutputLocator(page).locator("span.tw-highlight");

    await expect(highlight).toBeVisible();

    const markedText = await highlight.textContent();

    expect(markedText).toBe("Hello ");
  });

  test("unstyle by selection removes style from the selected range and clears selection", async ({ page }) => {
    await gotoScenario(page, "unstyle-selection");

    await expect(
      getOutputLocator(page).locator(".typewriter-selection"),
    ).toHaveCount(0);

    const highlight = getOutputLocator(page).locator("span.tw-highlight");

    await expect(highlight).toBeVisible();

    const markedText = await highlight.textContent();

    expect(markedText).toBe("Hello ");
  });

  test("unstyle splitting a spanning style produces two styled fragments", async ({ page }) => {
    await gotoScenario(page, "unstyle-split");

    const highlights = getOutputLocator(page).locator("span.tw-highlight");

    expect(await highlights.count()).toBe(2);

    const texts = await highlights.allTextContents();

    expect(texts[0]).toBe("Hel");
    expect(texts[1]).toBe("rld");
  });

  test("cumulative styles on the same range produce nested spans preserving all classes", async ({ page }) => {
    await gotoScenario(page, "cumulative-styles-same-range");

    const output = getOutputLocator(page);

    await expect(output.locator("span.tw-bold")).toBeVisible();
    await expect(output.locator("span.tw-underline")).toBeVisible();

    const boldText = await output.locator("span.tw-bold").textContent();

    expect(boldText).toBe("Important");

    const underlineText = await output.locator("span.tw-underline").textContent();

    expect(underlineText).toBe("Important");

    // tw-underline must be nested inside tw-bold (first style is outermost)
    const nestedUnderline = output.locator("span.tw-bold span.tw-underline");

    await expect(nestedUnderline).toBeVisible();

    expect(await getOutputText(page)).toBe("Important Notice");
  });
});
