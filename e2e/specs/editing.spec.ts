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
});
