import type { Locator, Page } from "@playwright/test";



/**
 * @description
 * Read the text a preview shows, without its cursor glyphs
 *
 * @param preview - The preview element
 * @returns The rendered text
 */
export async function previewText(preview: Locator): Promise<string> {
  return preview.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;

    clone.querySelectorAll(".typewriter-cursor").forEach(cursor => cursor.remove());

    return clone.textContent ?? "";
  });
}

/**
 * @description
 * Collect uncaught page errors and console errors while a test runs
 *
 * @param page - The page to watch
 * @returns The live list of errors
 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", error => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

/**
 * @description
 * Open the sandbox, optionally on a recipe, and wait until its first run has created a typewriter
 *
 * @param page - The page
 * @param recipe - The recipe id to open
 * @returns A promise resolving once a typewriter exists
 */
export async function openSandbox(page: Page, recipe?: string): Promise<void> {
  await page.goto(recipe === undefined ? "/sandbox" : `/sandbox#recipe=${recipe}`);
  await page.getByTestId("seek").and(page.locator(":enabled")).waitFor();
}
