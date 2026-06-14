/**
 * @description
 * A single playback segment — a type step, a wait pause, a delete step, or a cursor move
 */
export type TSnippetSegment
  = | { readonly kind: "type"; readonly text: string }
    | { readonly kind: "wait"; readonly duration: number }
    | { readonly kind: "delete"; readonly count: number }
    | { readonly kind: "moveCursor"; readonly index: number };

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
  {
    label: "Delete",
    text: "Hello world → Hello",
    segments: [
      { kind: "type", text: "Hello world" },
      { kind: "wait", duration: 600 },
      { kind: "delete", count: 6 },
    ],
  },
  {
    label: "Move Cursor",
    text: "world → Hello world",
    segments: [
      { kind: "type", text: "world" },
      { kind: "wait", duration: 600 },
      { kind: "moveCursor", index: 0 },
      { kind: "type", text: "Hello " },
    ],
  },
] as const;
