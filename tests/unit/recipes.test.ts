import type { TRecipe } from "../../docs/.vitepress/theme/playground/recipe.type";
import type { StringRenderer } from "../../src/index";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECIPES } from "../../docs/.vitepress/theme/playground/recipes";
import { runSnippet } from "../../docs/.vitepress/theme/playground/run-snippet";
import { stringRenderer } from "../../src/index";



type TOutcome = {
  readonly ok: boolean;
  readonly error: string | null;
  readonly main: string;
  readonly previews: Record<string, string>;
  readonly logs: string[];
};

/**
 * @description
 * Run a recipe headlessly to completion with fake timers
 *
 * @param recipe - The recipe to run
 * @returns What the recipe rendered and logged
 */
async function runRecipe(recipe: TRecipe): Promise<TOutcome> {
  const main = stringRenderer();
  const previews = new Map<string, StringRenderer>();
  const logs: string[] = [];
  const controller = new AbortController();
  const progress = { settled: false };

  const run = runSnippet(recipe.code, {
    renderer: main,
    preview: (label) => {
      const renderer = stringRenderer();

      previews.set(label, renderer);

      return renderer;
    },
    signal: controller.signal,
    onConsole: (level, text) => logs.push(`${level}: ${text}`),
  }).finally(() => {
    progress.settled = true;
  });

  for (let i = 0; i < 1000 && !progress.settled; i++) {
    await vi.advanceTimersByTimeAsync(1000);
  }

  const result = await run;

  controller.abort();

  return {
    ok: result.ok,
    error: result.ok ? null : result.error.message,
    main: main.toString(),
    previews: Object.fromEntries([...previews].map(([label, renderer]) => [label, renderer.toString()])),
    logs,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sandbox recipes", () => {
  it.each(RECIPES.map(recipe => [recipe.id, recipe] as const))("%s runs to its expected output", async (_id, recipe) => {
    const outcome = await runRecipe(recipe);

    if (process.env.PRINT_RECIPES !== undefined) {
      process.stdout.write(`@@ ${JSON.stringify({ id: recipe.id, ...outcome })}\n`);
    }

    expect(outcome.error).toBeNull();
    expect(outcome.main).toBe(recipe.expected);
    expect(outcome.previews).toEqual(recipe.previews ?? {});
  });
});
