/**
 * @description
 * A single playback segment — either a type step or a wait pause
 */
export type TSnippetSegment
  = | { readonly kind: "type"; readonly text: string }
    | { readonly kind: "wait"; readonly duration: number };

/**
 * @description
 * A predefined sandbox snippet
 */
export type TSnippet = {
  readonly label: string;
  readonly text: string;
  readonly segments?: readonly TSnippetSegment[];
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
  {
    label: "Wait / Pause",
    text: "Hello... world!",
    segments: [
      { kind: "type", text: "Hello" },
      { kind: "wait", duration: 800 },
      { kind: "type", text: "..." },
      { kind: "wait", duration: 500 },
      { kind: "type", text: " world!" },
    ],
  },
] as const;
