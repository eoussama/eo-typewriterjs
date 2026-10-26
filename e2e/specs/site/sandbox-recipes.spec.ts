import { expect, test } from "@playwright/test";

import { RECIPES } from "../../../docs/.vitepress/theme/playground/recipes";
import { collectErrors, openSandbox, previewText } from "../../helpers/site.helper";



// Recipes whose result depends on wall-clock time, so they must run at normal speed.
const REAL_TIME = new Set(["cancel-after-delay"]);

test.describe("sandbox recipes", () => {
  for (const recipe of RECIPES) {
    test(`${recipe.id} plays to its expected output`, async ({ page }) => {
      const errors = collectErrors(page);

      await openSandbox(page, recipe.id);

      if (!REAL_TIME.has(recipe.id)) {
        await page.getByLabel("Speed").selectOption("4");
      }

      await expect(page.getByTestId("status")).toHaveText(/Completed|Cancelled/, { timeout: 30_000 });
      await expect(page.getByTestId("error")).toHaveCount(0);

      expect(await previewText(page.getByTestId("preview"))).toBe(recipe.expected);

      const previews: Record<string, string> = {};

      for (const extra of await page.locator(".pg-extra").all()) {
        previews[(await extra.locator(".pg-extra__label").textContent()) ?? ""] = await previewText(extra.locator(".pg-output"));
      }

      expect(previews).toEqual(recipe.previews ?? {});
      expect(errors).toEqual([]);
    });
  }
});
