import { expect, test } from "@playwright/test";

import { getOutputText, gotoScenario } from "../helpers/harness.helper";



test.describe("editing", () => {
  test("delete removes trailing characters", async ({ page }) => {
    await gotoScenario(page, "delete-chars");

    expect(await getOutputText(page)).toBe("Hello");
  });

  test("move('start') jumps cursor to document start", async ({ page }) => {
    await gotoScenario(page, "move-start-boundary");

    expect(await getOutputText(page)).toBe(">hello world");
  });

  test("move('end') jumps cursor to document end", async ({ page }) => {
    await gotoScenario(page, "move-end-boundary");

    expect(await getOutputText(page)).toBe("hello world!");
  });

  test("delete('start') removes text from cursor to document start", async ({ page }) => {
    await gotoScenario(page, "delete-start-boundary");

    expect(await getOutputText(page)).toBe("world");
  });

  test("delete('end') removes text from cursor to document end", async ({ page }) => {
    await gotoScenario(page, "delete-end-boundary");

    expect(await getOutputText(page)).toBe("hello ");
  });

  test("delete('whole') removes the entire document", async ({ page }) => {
    await gotoScenario(page, "delete-whole-boundary");

    expect(await getOutputText(page)).toBe("");
  });

  test("select('start') shows selection from cursor to start", async ({ page }) => {
    await gotoScenario(page, "select-start-boundary");

    await expect(
      page.locator(".typewriter-selection"),
    ).toHaveCount(1);
  });

  test("select('end') shows selection from cursor to end", async ({ page }) => {
    await gotoScenario(page, "select-end-boundary");

    await expect(
      page.locator(".typewriter-selection"),
    ).toHaveCount(1);
  });

  test("select('whole') shows selection over entire document", async ({ page }) => {
    await gotoScenario(page, "select-whole-boundary");

    await expect(
      page.locator(".typewriter-selection"),
    ).toHaveCount(1);
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

  test("select then unselect removes selection highlight from DOM", async ({ page }) => {
    await gotoScenario(page, "select-and-clear");

    await expect(
      page.locator(".typewriter-selection"),
    ).toHaveCount(0);

    expect(await getOutputText(page)).toBe("Hello");
  });

  test("style then unstyle removes styled span from DOM", async ({ page }) => {
    await gotoScenario(page, "select-style-and-unstyle");

    await expect(
      page.locator(".tw-bold"),
    ).toHaveCount(0);

    expect(await getOutputText(page)).toBe("Hello World");
  });

  test("delete count exceeding text length clears all text", async ({ page }) => {
    await gotoScenario(page, "delete-exceeds-length");

    expect(await getOutputText(page)).toBe("");
  });

  test("selection-based style then type inserts at cursor position after style", async ({ page }) => {
    await gotoScenario(page, "type-then-select-and-retype");

    expect(await getOutputText(page)).toBe("HelloHi World");
  });
});
