/**
 * @description
 * A predefined sandbox snippet
 */
export type TSnippet = {
  readonly label: string;
  readonly text: string;
};

/**
 * @description
 * Predefined text snippets available in the sandbox
 */
export const SNIPPETS: readonly TSnippet[] = [
  {
    label: "Hello World",
    text: "Hello, World!",
  },
  {
    label: "Multiline",
    text: "Line one.\nLine two.\nLine three.",
  },
  {
    label: "Emoji",
    text: "I love Morocco 🇲🇦 and coding 💻!",
  },
  {
    label: "Long paragraph",
    text: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  },
  {
    label: "Words",
    text: "Typewriter animations are smooth and elegant.",
  },
] as const;
