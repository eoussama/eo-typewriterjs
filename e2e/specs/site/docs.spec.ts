import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { collectErrors, previewText } from "../../helpers/site.helper";



const GUIDE_PAGES = [
  ...readdirSync("docs/guide").filter(file => file.endsWith(".md")).map(file => `/guide/${file.replace(/\.md$/, "")}`),
  ...readdirSync("docs/guide/commands").filter(file => file.endsWith(".md")).map(file => `/guide/commands/${file.replace(/(?:index)?\.md$/, "")}`),
];

test.describe("docs site", () => {
  test("home page links to the guide and the sandbox", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sandbox" }).first()).toHaveAttribute("href", "/sandbox");
    await page.getByRole("link", { name: "Guide" }).first().click();
    await expect(page).toHaveURL(/\/guide\//);
    expect(errors).toEqual([]);
  });

  test("an embedded playground plays its example", async ({ page }) => {
    await page.goto("/guide/commands/type");

    const playground = page.getByTestId("docs-playground").first();

    await playground.scrollIntoViewIfNeeded();
    await expect.poll(() => previewText(playground.getByTestId("preview"))).toBe("Hello, world!");
  });

  test("a string renderer example logs its output", async ({ page }) => {
    await page.goto("/guide/getting-started");

    const playground = page.getByTestId("docs-playground").nth(1);

    await playground.scrollIntoViewIfNeeded();
    await expect(playground.getByTestId("console")).toContainText("Hello, World!");
  });

  for (const path of GUIDE_PAGES) {
    test(`${path} renders its playgrounds without errors`, async ({ page }) => {
      const errors = collectErrors(page);

      await page.goto(path);

      for (const playground of await page.getByTestId("docs-playground").all()) {
        await playground.scrollIntoViewIfNeeded();
      }

      await page.waitForTimeout(500);
      await expect(page.locator(".pg-error")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
});
