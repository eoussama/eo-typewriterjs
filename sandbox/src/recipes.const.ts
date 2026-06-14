import type { TTypewriter } from "@eo-typewriterjs";



/**
 * @description
 * Default playback settings that a recipe variant can override
 */
export type TRecipeDefaults = {
  readonly unit?: "char" | "grapheme" | "word" | "line";
  readonly amount?: number;
  readonly interval?: number;
  readonly rate?: number;
};

/**
 * @description
 * A single variant of a recipe demonstrating a specific pacing or behaviour
 */
export type TRecipeVariant = {
  readonly label: string;
  readonly defaults?: TRecipeDefaults;
  readonly source: string;
  readonly build: (tw: TTypewriter, defaults: Required<TRecipeDefaults>) => void;
};

/**
 * @description
 * A named recipe grouping one or more playback variants
 */
export type TRecipe = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: "basics" | "timing" | "editing" | "cursor" | "styling" | "advanced";
  readonly variants: readonly TRecipeVariant[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unit(d: Required<TRecipeDefaults>) {
  return d.amount === 1 ? d.unit : { unit: d.unit, amount: d.amount };
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export const RECIPES: readonly TRecipe[] = [
  // ── Basics ─────────────────────────────────────────────────────────────
  {
    id: "hello-world",
    title: "Hello World",
    description: "The classic first animation — type a greeting one character at a time.",
    category: "basics",
    variants: [
      {
        label: "char / 80ms",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline.type("Hello, World!", { by: "char", interval: 80 });`,
        build(tw, d) {
          tw.timeline.type("Hello, World!", { by: unit(d), interval: d.interval });
        },
      },
      {
        label: "word / 200ms",
        defaults: { unit: "word", amount: 1, interval: 200 },
        source: `tw.timeline.type("Hello, World!", { by: "word", interval: 200 });`,
        build(tw, d) {
          tw.timeline.type("Hello, World!", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
  {
    id: "multiline",
    title: "Multiline",
    description: "Animate text that spans multiple lines.",
    category: "basics",
    variants: [
      {
        label: "line / 300ms",
        defaults: { unit: "line", amount: 1, interval: 300 },
        source: `tw.timeline.type("Line one.\\nLine two.\\nLine three.", { by: "line", interval: 300 });`,
        build(tw, d) {
          tw.timeline.type("Line one.\nLine two.\nLine three.", { by: unit(d), interval: d.interval });
        },
      },
      {
        label: "char / 50ms",
        defaults: { unit: "char", amount: 1, interval: 50 },
        source: `tw.timeline.type("Line one.\\nLine two.\\nLine three.", { by: "char", interval: 50 });`,
        build(tw, d) {
          tw.timeline.type("Line one.\nLine two.\nLine three.", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
  {
    id: "emoji",
    title: "Emoji & Unicode",
    description: "Emoji grapheme clusters and accented characters are kept intact.",
    category: "basics",
    variants: [
      {
        label: "char / 80ms",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline.type("I love Morocco 🇲🇦 and coding 💻!", { by: "char", interval: 80 });`,
        build(tw, d) {
          tw.timeline.type("I love Morocco 🇲🇦 and coding 💻!", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },

  // ── Timing ─────────────────────────────────────────────────────────────
  {
    id: "pause",
    title: "Wait / Pause",
    description: "Insert deliberate pauses between segments to create dramatic timing.",
    category: "timing",
    variants: [
      {
        label: "standard",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello")
  .wait(800)
  .type("...")
  .wait(500)
  .type(" world!");`,
        build(tw, d) {
          tw.timeline
            .type("Hello", { by: unit(d), interval: d.interval })
            .wait(800)
            .type("...", { by: unit(d), interval: d.interval })
            .wait(500)
            .type(" world!", { by: unit(d), interval: d.interval });
        },
      },
      {
        label: "dramatic",
        defaults: { unit: "char", amount: 1, interval: 100 },
        source: `tw.timeline
  .type("Loading")
  .wait(400).type(".").wait(400).type(".").wait(400).type(".")
  .wait(600)
  .type(" Done!");`,
        build(tw, d) {
          tw.timeline
            .type("Loading", { by: unit(d), interval: d.interval })
            .wait(400)
            .type(".", { by: unit(d), interval: d.interval })
            .wait(400)
            .type(".", { by: unit(d), interval: d.interval })
            .wait(400)
            .type(".", { by: unit(d), interval: d.interval })
            .wait(600)
            .type(" Done!", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
  {
    id: "slow-motion",
    title: "Slow Motion",
    description: "Use a low playback rate to demonstrate every keystroke.",
    category: "timing",
    variants: [
      {
        label: "0.5x speed",
        defaults: { unit: "char", amount: 1, interval: 80, rate: 0.5 },
        source: `tw.setRate(0.5);
tw.timeline.type("Slow and deliberate.", { by: "char", interval: 80 });`,
        build(tw, d) {
          tw.setRate(0.5);
          tw.timeline.type("Slow and deliberate.", { by: unit(d), interval: d.interval });
        },
      },
      {
        label: "4x fast",
        defaults: { unit: "char", amount: 1, interval: 80, rate: 4 },
        source: `tw.setRate(4);
tw.timeline.type("Blisteringly fast!", { by: "char", interval: 80 });`,
        build(tw, d) {
          tw.setRate(4);
          tw.timeline.type("Blisteringly fast!", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },

  // ── Editing ─────────────────────────────────────────────────────────────
  {
    id: "delete",
    title: "Delete",
    description: "Type then erase — a common pattern for animated corrections.",
    category: "editing",
    variants: [
      {
        label: "type + backspace",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello world")
  .wait(600)
  .delete(6, { by: "char", interval: 60 });`,
        build(tw, d) {
          tw.timeline
            .type("Hello world", { by: unit(d), interval: d.interval })
            .wait(600)
            .delete(6, { by: unit(d), interval: Math.max(30, d.interval - 20) });
        },
      },
      {
        label: "word-level delete",
        defaults: { unit: "word", amount: 1, interval: 200 },
        source: `tw.timeline
  .type("The quick brown fox")
  .wait(600)
  .delete(2, { by: "word", interval: 200 });`,
        build(tw, d) {
          tw.timeline
            .type("The quick brown fox", { by: unit(d), interval: d.interval })
            .wait(600)
            .delete(2, { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
  {
    id: "replace",
    title: "Replace Word",
    description: "Select a word, delete it and retype — a live correction effect.",
    category: "editing",
    variants: [
      {
        label: "replace last word",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello beautiful world")
  .wait(800)
  .delete(16, { by: "char", interval: 50 })
  .type("world!", { by: "char", interval: 80 });`,
        build(tw, d) {
          tw.timeline
            .type("Hello beautiful world", { by: unit(d), interval: d.interval })
            .wait(800)
            .delete(16, { by: "char", interval: Math.max(30, d.interval - 30) })
            .type("world!", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },

  // ── Cursor ─────────────────────────────────────────────────────────────
  {
    id: "insert-middle",
    title: "Insert in Middle",
    description: "Move the cursor to a specific position and inject text.",
    category: "cursor",
    variants: [
      {
        label: "prepend text",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("world")
  .wait(600)
  .moveCursor(0)
  .type("Hello ");`,
        build(tw, d) {
          tw.timeline
            .type("world", { by: unit(d), interval: d.interval })
            .wait(600)
            .moveCursor(0)
            .type("Hello ", { by: unit(d), interval: d.interval });
        },
      },
      {
        label: "insert space",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Helloworld")
  .wait(600)
  .moveCursor(5)
  .type(" ");`,
        build(tw, d) {
          tw.timeline
            .type("Helloworld", { by: unit(d), interval: d.interval })
            .wait(600)
            .moveCursor(5)
            .type(" ", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
  {
    id: "select",
    title: "Selection",
    description: "Programmatically select text ranges to highlight content.",
    category: "cursor",
    variants: [
      {
        label: "select forward",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello world")
  .wait(600)
  .moveCursor(6)
  .select(5);  // selects "world"`,
        build(tw, d) {
          tw.timeline
            .type("Hello world", { by: unit(d), interval: d.interval })
            .wait(600)
            .moveCursor(6)
            .select(5);
        },
      },
      {
        label: "select backward",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello world")
  .wait(600)
  .select(-5);  // selects "world" backward`,
        build(tw, d) {
          tw.timeline
            .type("Hello world", { by: unit(d), interval: d.interval })
            .wait(600)
            .select(-5);
        },
      },
    ],
  },
  {
    id: "multi-cursor",
    title: "Multi-cursor",
    description: "Drive multiple cursors simultaneously for parallel text insertion.",
    category: "cursor",
    variants: [
      {
        label: "two cursors",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello!", { cursor: ["a", "b"] });`,
        build(tw, d) {
          tw.timeline.type("Hello!", { cursor: ["a", "b"], by: unit(d), interval: d.interval });
        },
      },
    ],
  },

  // ── Styling ─────────────────────────────────────────────────────────────
  {
    id: "style-while-typing",
    title: "Style While Typing",
    description: "Attach a CSS class to each character as it is typed using the style option.",
    category: "styling",
    variants: [
      {
        label: "class name",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello ", { style: "tw-muted", interval: 80 })
  .type("World!", { style: "tw-accent", interval: 80 });`,
        build(tw, d) {
          tw.timeline
            .type("Hello ", { style: "tw-muted", by: unit(d), interval: d.interval })
            .type("World!", { style: "tw-accent", by: unit(d), interval: d.interval });
        },
      },
      {
        label: "inline CSS",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Danger zone", {
    style: { css: { color: "#ef4444", fontWeight: "bold" } },
    interval: 80,
  });`,
        build(tw, d) {
          tw.timeline
            .type("Danger zone", {
              style: { css: { color: "#ef4444", fontWeight: "bold" } },
              by: unit(d),
              interval: d.interval,
            });
        },
      },
    ],
  },
  {
    id: "mark-fixed-range",
    title: "Mark Fixed Range",
    description: "Type text first, then apply a style mark to an absolute character range.",
    category: "styling",
    variants: [
      {
        label: "highlight word",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello World", { interval: 80 })
  .mark("tw-highlight", { from: 6, to: 11 });`,
        build(tw, d) {
          tw.timeline
            .type("Hello World", { by: unit(d), interval: d.interval })
            .mark("tw-highlight", { from: 6, to: 11 });
        },
      },
      {
        label: "multiple marks",
        defaults: { unit: "char", amount: 1, interval: 60 },
        source: `tw.timeline
  .type("Error: file not found", { interval: 60 })
  .mark("tw-error",  { from: 0,  to: 5  })
  .mark("tw-muted",  { from: 7,  to: 21 });`,
        build(tw, d) {
          tw.timeline
            .type("Error: file not found", { by: unit(d), interval: d.interval })
            .mark("tw-error", { from: 0, to: 5 })
            .mark("tw-muted", { from: 7, to: 21 });
        },
      },
    ],
  },
  {
    id: "mark-selection",
    title: "Mark Selection",
    description: "Select a range then apply a style mark to that selection instantly.",
    category: "styling",
    variants: [
      {
        label: "select + mark",
        defaults: { unit: "char", amount: 1, interval: 80 },
        source: `tw.timeline
  .type("Hello World", { interval: 80 })
  .wait(600)
  .moveCursor(6)
  .select(5)                        // selects "World"
  .mark("tw-highlight", "selection")
  .moveCursor(11);                  // clear selection`,
        build(tw, d) {
          tw.timeline
            .type("Hello World", { by: unit(d), interval: d.interval })
            .wait(600)
            .moveCursor(6)
            .select(5)
            .mark("tw-highlight", "selection")
            .moveCursor(11);
        },
      },
    ],
  },

  // ── Advanced ────────────────────────────────────────────────────────────
  {
    id: "storytelling",
    title: "Storytelling",
    description: "A full sequence: type, pause, erase, retype — tells a short story.",
    category: "advanced",
    variants: [
      {
        label: "standard",
        defaults: { unit: "char", amount: 1, interval: 70 },
        source: `tw.timeline
  .type("Once upon a time...")
  .wait(1000)
  .delete(3, { by: "char", interval: 50 })
  .type(", in a land far away,")
  .wait(800)
  .type("\\nthere lived a typewriter. 🖊️");`,
        build(tw, d) {
          tw.timeline
            .type("Once upon a time...", { by: unit(d), interval: d.interval })
            .wait(1000)
            .delete(3, { by: "char", interval: 50 })
            .type(", in a land far away,", { by: unit(d), interval: d.interval })
            .wait(800)
            .type("\nthere lived a typewriter. 🖊️", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
  {
    id: "terminal",
    title: "Terminal Prompt",
    description: "Simulate a terminal session with commands and output.",
    category: "advanced",
    variants: [
      {
        label: "npm install",
        defaults: { unit: "char", amount: 1, interval: 60 },
        source: `tw.timeline
  .type("$ npm install @eo-typewriterjs")
  .wait(800)
  .type("\\n✔ Packages installed.")
  .wait(400)
  .type("\\n$ node -e \\"require('@eo-typewriterjs')\\"")
  .wait(600)
  .type("\\n✔ Ready.");`,
        build(tw, d) {
          tw.timeline
            .type("$ npm install @eo-typewriterjs", { by: unit(d), interval: d.interval })
            .wait(800)
            .type("\n✔ Packages installed.", { by: unit(d), interval: d.interval })
            .wait(400)
            .type("\n$ node -e \"require('@eo-typewriterjs')\"", { by: unit(d), interval: d.interval })
            .wait(600)
            .type("\n✔ Ready.", { by: unit(d), interval: d.interval });
        },
      },
    ],
  },
] as const;
