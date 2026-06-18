import { expect, test } from "@playwright/test";

import { getOutputText, gotoScenario } from "../helpers/harness.helper";



test.describe("basic flows", () => {
  test("hello world types full text", async ({ page }) => {
    await gotoScenario(page, "hello-world");

    expect(await getOutputText(page)).toBe("Hello, World!");
  });

  test("type-and-wait produces combined output", async ({ page }) => {
    await gotoScenario(page, "type-and-wait");

    expect(await getOutputText(page)).toBe("Loading Done!");
  });

  test("type by word produces full text", async ({ page }) => {
    await gotoScenario(page, "type-by-word");

    expect(await getOutputText(page)).toBe("Hello world");
  });

  test("multiline output contains newlines", async ({ page }) => {
    await gotoScenario(page, "multiline");

    const text = await getOutputText(page);

    expect(text).toContain("Line one");
    expect(text).toContain("Line two");
    expect(text).toContain("Line three");
    expect(text).toContain("\n");
  });
});
