import { expect, test } from "@playwright/test";

import { getOutputText, gotoScenario } from "../helpers/harness.helper";



test.describe("editing", () => {
  test("delete removes trailing characters", async ({ page }) => {
    await gotoScenario(page, "delete-chars");

    expect(await getOutputText(page)).toBe("Hello");
  });

  test("insert in middle produces correct text", async ({ page }) => {
    await gotoScenario(page, "insert-in-middle");

    expect(await getOutputText(page)).toBe("Hello world");
  });

  test("delete by word removes last word", async ({ page }) => {
    await gotoScenario(page, "delete-by-word");

    expect(await getOutputText(page)).toBe("one two ");
  });

  test("type then delete then retype produces new text", async ({ page }) => {
    await gotoScenario(page, "type-and-retype");

    expect(await getOutputText(page)).toBe("World");
  });

  test("type without explicit by or interval renders correctly", async ({ page }) => {
    await gotoScenario(page, "type-default-mode");

    expect(await getOutputText(page)).toBe("Hi");
  });

  test("delete without explicit by or interval removes chars from end", async ({ page }) => {
    await gotoScenario(page, "delete-default-mode");

    expect(await getOutputText(page)).toBe("He");
  });

  test("select then clearSelection removes selection highlight from DOM", async ({ page }) => {
    await gotoScenario(page, "select-and-clear");

    await expect(
      page.locator(".typewriter-selection"),
    ).toHaveCount(0);

    expect(await getOutputText(page)).toBe("Hello");
  });

  test("mark then unmark removes styled span from DOM", async ({ page }) => {
    await gotoScenario(page, "select-mark-and-unmark");

    await expect(
      page.locator(".tw-bold"),
    ).toHaveCount(0);

    expect(await getOutputText(page)).toBe("Hello World");
  });

  test("delete count exceeding text length clears all text", async ({ page }) => {
    await gotoScenario(page, "delete-exceeds-length");

    expect(await getOutputText(page)).toBe("");
  });

  test("selection-based mark then type inserts at cursor position after mark", async ({ page }) => {
    await gotoScenario(page, "type-then-select-and-retype");

    expect(await getOutputText(page)).toBe("HelloHi World");
  });
});
