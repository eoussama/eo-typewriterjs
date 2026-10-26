/**
 * @description
 * Category of a sandbox recipe
 */
export type TRecipeCategory = "basics" | "timing" | "editing" | "cursor" | "styling" | "callbacks" | "audio";

/**
 * @description
 * A ready-to-run example listed in the sandbox
 */
export type TRecipe = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: TRecipeCategory;
  readonly code: string;

  /**
   * @description
   * The text of the main preview once the recipe has finished, checked by the tests
   */
  readonly expected: string | null;

  /**
   * @description
   * The final text of each labelled preview, for recipes that use `preview(label)`
   */
  readonly previews?: Readonly<Record<string, string>>;
};
