import { expect, test } from "@playwright/test";

import { getOutputLocator, getOutputText, gotoScenario } from "../helpers/harness.helper";



test.describe("cursor", () => {
  test("cursor element is present after typing", async ({ page }) => {
    await gotoScenario(page, "cursor-exists");

    await expect(getOutputLocator(page).locator(".typewriter-cursor")).toBeVisible();
  });

  test("pipe cursor sets correct data-cursor-kind", async ({ page }) => {
    await gotoScenario(page, "cursor-kind-pipe");

    await expect(
      getOutputLocator(page).locator(".typewriter-cursor[data-cursor-kind='pipe']"),
    ).toBeVisible();
  });

  test("block cursor sets correct data-cursor-kind", async ({ page }) => {
    await gotoScenario(page, "cursor-kind-block");

    await expect(
      getOutputLocator(page).locator(".typewriter-cursor[data-cursor-kind='block']"),
    ).toBeVisible();
  });

  test("hidden cursor produces no cursor element", async ({ page }) => {
    await gotoScenario(page, "cursor-hidden");

    await expect(
      getOutputLocator(page).locator(".typewriter-cursor"),
    ).toHaveCount(0);
  });

  test("hidden cursor revealed by call shows cursor element", async ({ page }) => {
    await gotoScenario(page, "cursor-hidden-then-revealed");

    await expect(
      getOutputLocator(page).locator(".typewriter-cursor"),
    ).toBeVisible();
  });

  test("cursor swap changes data-cursor-kind at runtime", async ({ page }) => {
    await gotoScenario(page, "cursor-swap");

    await expect(
      getOutputLocator(page).locator(".typewriter-cursor[data-cursor-kind='block']"),
    ).toBeVisible();
  });

  test("moveCursor then type inserts text at correct position", async ({ page }) => {
    await gotoScenario(page, "move-cursor-type");

    expect(await getOutputText(page)).toBe("Hello, World");
  });

  test("multi-cursor mirror types same text at both cursor positions", async ({ page }) => {
    await gotoScenario(page, "multi-cursor-mirror");

    const text = await getOutputText(page);

    expect(text).toContain("Name: Alice");
    expect(text).toContain("Role: Alice");
  });
});
