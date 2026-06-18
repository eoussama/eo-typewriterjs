/**
 * @description
 * A single sandbox recipe
 */
export type TSandboxRecipe = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: TSandboxCategory;
  readonly difficulty: TSandboxDifficulty;
  readonly code: string;
};

/**
 * @description
 * Recipe category
 */
export type TSandboxCategory
  = | "all"
    | "basics"
    | "timing"
    | "editing"
    | "cursor"
    | "styling"
    | "callbacks"
    | "audio"
    | "advanced";

/**
 * @description
 * Recipe difficulty
 */
export type TSandboxDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * @description
 * All built-in sandbox recipes
 */
export const SANDBOX_RECIPES: readonly TSandboxRecipe[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "The classic first animation — type a greeting one character at a time.",
    category: "basics",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello, World!", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "type-and-wait",
    title: "Type & Wait",
    description: "Type a sentence, pause, then continue typing.",
    category: "basics",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Loading", { by: "char", interval: 80 })
  .wait(300)
  .type("...", { by: "char", interval: 200 })
  .wait(400)
  .type(" Done!", { by: "char", interval: 60 });

await tw.play();`,
  },

  {
    id: "type-by-word",
    title: "Type by Word",
    description: "Type text word by word instead of character by character.",
    category: "basics",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The quick brown fox jumps over the lazy dog", {
    by: "word",
    interval: 180,
  });

await tw.play();`,
  },

  {
    id: "multiline",
    title: "Multiline Output",
    description: "Type across multiple lines using newline characters.",
    category: "basics",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Line one\\n", { by: "char", interval: 60 })
  .wait(200)
  .type("Line two\\n", { by: "char", interval: 60 })
  .wait(200)
  .type("Line three", { by: "char", interval: 60 });

await tw.play();`,
  },

  {
    id: "fast-slow",
    title: "Fast \u2192 Slow",
    description: "Demonstrate interval variation — start fast, end slow.",
    category: "timing",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Speeding up: ", { by: "char", interval: 20 })
  .type("then slowing way down...", { by: "char", interval: 160 });

await tw.play();`,
  },

  {
    id: "long-wait",
    title: "Dramatic Pause",
    description: "Use wait() to create a suspenseful pause mid-sentence.",
    category: "timing",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The answer is", { by: "char", interval: 90 })
  .wait(1200)
  .type("... 42.", { by: "char", interval: 120 });

await tw.play();`,
  },

  {
    id: "ellipsis-loader",
    title: "Ellipsis Loader",
    description: "Dots appear one by one, then resolve to a success message.",
    category: "timing",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Connecting", { by: "char", interval: 70 })
  .wait(400)
  .type(".", { by: "char", interval: 0 })
  .wait(350)
  .type(".", { by: "char", interval: 0 })
  .wait(350)
  .type(".", { by: "char", interval: 0 })
  .wait(700)
  .delete(13, { by: "char", interval: 30 })
  .wait(200)
  .type("Connected \u2713", { by: "char", interval: 65 });

await tw.play();`,
  },

  {
    id: "searching-for-words",
    title: "Searching for Words",
    description: "Simulate hesitation — type, reconsider, delete, settle on the right word.",
    category: "timing",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The project is ", { by: "char", interval: 70 })
  .type("good", { by: "char", interval: 110 })
  .wait(500)
  .delete(4, { by: "char", interval: 60 })
  .type("great", { by: "char", interval: 110 })
  .wait(400)
  .delete(5, { by: "char", interval: 60 })
  .type("outstanding", { by: "char", interval: 85 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "staggered-reveal",
    title: "Staggered Reveal",
    description: "Each phrase lands with an increasing pause, like reading aloud for emphasis.",
    category: "timing",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Ready.", { by: "char", interval: 60 })
  .wait(300)
  .type(" Set.", { by: "char", interval: 90 })
  .wait(500)
  .type(" Go!", { by: "char", interval: 140 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "delete-and-retype",
    title: "Delete & Retype",
    description: "Type text, delete it, then type something new.",
    category: "editing",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello, World!", { by: "char", interval: 70 })
  .wait(600)
  .delete(6, { by: "char", interval: 50 })
  .wait(300)
  .type("Sandbox!", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "delete-to-empty",
    title: "Delete to Empty",
    description: "Edge case — erase every character until the document is empty, then start fresh.",
    category: "editing",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("This will all disappear.", { by: "char", interval: 60 })
  .wait(700)
  .delete(24, { by: "char", interval: 35 })
  .wait(500)
  .type("Clean slate.", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "typo-correction",
    title: "Typo Correction",
    description: "Type a sentence with deliberate mistakes, then jump back and fix each typo in place.",
    category: "editing",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "Definately the best libraary!"
// Cursor ends at 29. Fix "libraary"(20-27) first, then "Definately"(0-9).
tw.timeline
  .type("Definately the best libraary!", { by: "char", interval: 65 })
  .wait(700)
  .moveCursor(28)
  .wait(200)
  .delete(8, { by: "char", interval: 55 })
  .type("library", { by: "char", interval: 70 })
  .wait(500)
  .moveCursor(10)
  .wait(200)
  .delete(10, { by: "char", interval: 55 })
  .type("Definitely", { by: "char", interval: 70 })
  .wait(400)
  .moveCursor(28);

await tw.play();`,
  },

  {
    id: "rewrite-headline",
    title: "Rewrite the Headline",
    description: "Select the last word of a headline, delete it, and land a stronger ending.",
    category: "editing",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("BREAKING: Markets are crashing", { by: "char", interval: 60 })
  .wait(700)
  .select(-8, { by: "char" })
  .wait(400)
  .delete(8, { by: "char", interval: 50 })
  .wait(300)
  .type("recovering", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "delete-by-word",
    title: "Delete by Word",
    description: "Erase a sentence word by word — each delete step removes one full word.",
    category: "editing",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// Each .delete(1, { by: "word" }) removes one whole word from the end.
tw.timeline
  .type("one two three four five", { by: "char", interval: 60 })
  .wait(600)
  .delete(1, { by: "word", interval: 300 })
  .delete(1, { by: "word", interval: 300 })
  .delete(1, { by: "word", interval: 300 })
  .delete(1, { by: "word", interval: 300 })
  .delete(1, { by: "word", interval: 300 })
  .wait(400)
  .type("all erased.", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "insert-in-middle",
    title: "Insert in the Middle",
    description: "Move the cursor mid-sentence with moveCursor() and insert a missing word.",
    category: "editing",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "I love TypewriterJS" — move to index 7 (after "I love ") to insert "using "
tw.timeline
  .type("I love TypewriterJS", { by: "char", interval: 70 })
  .wait(600)
  .moveCursor(7)
  .wait(300)
  .type("using ", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "cursor-styles",
    title: "Cursor Styles",
    description: "Compare all five built-in cursor kinds: pipe, underscore, block, block-underscore, and caret.",
    category: "cursor",
    difficulty: "beginner",
    code: `// Each typewriter uses a different cursor kind.
// Kinds in order: pipe, underscore, block, block-underscore, caret.
const kinds = [
  { kind: ECursorKind.PIPE,             label: "Pipe cursor" },
  { kind: ECursorKind.UNDERSCORE,       label: "Underscore cursor" },
  { kind: ECursorKind.BLOCK,            label: "Block cursor" },
  { kind: ECursorKind.BLOCK_UNDERSCORE, label: "Block-underscore cursor" },
  { kind: ECursorKind.CARET,            label: "Caret cursor" },
];

for (const k of kinds) {
  const tw = createTypewriter({ renderer, cursor: { kind: k.kind } });
  tw.timeline.type(k.label, { by: "char", interval: 35 }).wait(600);
  await tw.play();
}`,
  },

  {
    id: "cursor-hidden",
    title: "Hidden Cursor",
    description: "Start with the cursor hidden, type text silently, then reveal the cursor at the end.",
    category: "cursor",
    difficulty: "beginner",
    code: `const tw = createTypewriter({
  renderer,
  cursor: { visible: false },
});

tw.timeline
  .type("Cursor is hidden while typing...", { by: "char", interval: 60 })
  .wait(400)
  .call(() => {
    // Reveal the cursor — it will appear at the end of the text
    tw.setCursorVisible(true);
  })
  .wait(1200);

await tw.play();`,
  },

  {
    id: "cursor-swap",
    title: "Runtime Cursor Swap",
    description: "Switch the cursor kind dynamically mid-animation using setCursorOptions().",
    category: "cursor",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer, cursor: { kind: ECursorKind.PIPE } });

// call() fires synchronously during playback and swaps the cursor immediately.
// The document text is preserved across each swap.
tw.timeline
  .type("pipe ", { by: "char", interval: 60 })
  .wait(400)
  .call(() => tw.setCursorOptions({ kind: ECursorKind.UNDERSCORE }))
  .type("underscore ", { by: "char", interval: 60 })
  .wait(400)
  .call(() => tw.setCursorOptions({ kind: ECursorKind.BLOCK }))
  .type("block ", { by: "char", interval: 60 })
  .wait(400)
  .call(() => tw.setCursorOptions({ kind: ECursorKind.BLOCK_UNDERSCORE }))
  .type("block-underscore ", { by: "char", interval: 60 })
  .wait(400)
  .call(() => tw.setCursorOptions({ kind: ECursorKind.CARET }))
  .type("caret", { by: "char", interval: 60 })
  .wait(700);

await tw.play();`,
  },

  {
    id: "cursor-animation",
    title: "Cursor Animation",
    description: "Control cursor animation: built-in blink, static (no animation), and a fully custom CSS animation.",
    category: "cursor",
    difficulty: "beginner",
    code: `// Three typewriters — each demonstrating a different animation setting.

// 1. Built-in blink (default)
const twBlink = createTypewriter({ renderer, cursor: { kind: ECursorKind.PIPE, animation: "blink" } });
twBlink.timeline.type("Blinking cursor...", { by: "char", interval: 40 }).wait(2000);
await twBlink.play();

// 2. Static — no animation at all
const twNone = createTypewriter({ renderer, cursor: { kind: ECursorKind.BLOCK, animation: "none" } });
twNone.timeline.type("Static cursor...", { by: "char", interval: 40 }).wait(2000);
await twNone.play();

// 3. Custom animation — use a @keyframes name defined in the sandbox stylesheet
// (tw-cursor-pulse fades the cursor opacity in and out smoothly)
const twCustom = createTypewriter({
  renderer,
  cursor: {
    kind: ECursorKind.UNDERSCORE,
    animation: {
      name: "tw-cursor-pulse",
      duration: "900ms",
      timingFunction: "ease-in-out",
      iterationCount: "infinite",
      direction: "alternate",
    },
  },
});
twCustom.timeline.type("Custom animation", { by: "char", interval: 40 });
await twCustom.play();`,
  },

  {
    id: "cursor-classes",
    title: "Styled Cursor",
    description: "Apply a custom CSS class to the cursor for a vivid glowing accent effect.",
    category: "cursor",
    difficulty: "intermediate",
    code: `// .tw-cursor-accent is defined in the sandbox stylesheet:
// bright accent color, bold weight, and a glow via text-shadow.
const tw = createTypewriter({
  renderer,
  cursor: {
    kind: "custom",
    content: "▍",
    className: "tw-cursor-accent tw-cursor-glow",
  },
});

tw.timeline
  .type("Glowing block cursor", { by: "char", interval: 70 })
  .wait(1400);

await tw.play();`,
  },

  {
    id: "move-cursor",
    title: "Move Cursor",
    description: "Move the cursor to a specific position in the text.",
    category: "cursor",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .moveCursor(5)
  .wait(300)
  .type(",", { by: "char", interval: 80 })
  .moveCursor(13)
  .type("!", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "select-text",
    title: "Select Text",
    description: "Select a range of characters in the document.",
    category: "cursor",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Select me!", { by: "char", interval: 70 })
  .wait(500)
  .select(-10, { by: "char" })
  .wait(800);

await tw.play();`,
  },

  {
    id: "mirror-cursors",
    title: "Mirror Cursors",
    description: "Two cursors on separate lines type the same text simultaneously.",
    category: "cursor",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "Name: \\nRole: " = 13 chars. main ends at 13 (after "Role: ").
// cursor "b" is parked at 6 (end of "Name: " line, before \\n).
// Both cursors then type "Alice" at their respective positions.
tw.timeline
  .type("Name: \\nRole: ", { by: "char", interval: 70 })
  .wait(400)
  .moveCursor(6, { cursor: "b" })
  .wait(200)
  .type("Alice", { cursor: ["main", "b"], by: "char", interval: 90 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "dual-edit-distinct",
    title: "Dual Edit — Distinct Values",
    description: "Two cursors fill different fields with different content, one after the other.",
    category: "cursor",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

// "City: \\nCountry: " = 17 chars. main at 17 (after "Country: ").
// cursor "b" parked at 6 (after "City: ").
// "Paris" typed at cursor b (lower index) first, then "France" at main.
// Because b is at a lower index, inserting there shifts main automatically.
tw.timeline
  .type("City: \\nCountry: ", { by: "char", interval: 65 })
  .wait(400)
  .moveCursor(6, { cursor: "b" })
  .wait(200)
  .type("Paris",  { cursor: "b",    by: "char", interval: 90 })
  .type("France", { cursor: "main", by: "char", interval: 90 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "three-cursor-fill",
    title: "Three-Cursor Fill",
    description: "Three cursors across three lines each type a distinct value in succession.",
    category: "cursor",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

// "Name: \\nDept: \\nScore: " = 21 chars, main cursor at 21.
// "b" parked at 6 (end of line 1), "c" at 13 (end of line 2).
// Fill from lowest index up so each insert shifts the cursors above correctly.
tw.timeline
  .type("Name: \\nDept: \\nScore: ", { by: "char", interval: 55 })
  .wait(400)
  .moveCursor(6,  { cursor: "b" })
  .moveCursor(13, { cursor: "c" })
  .wait(200)
  .type("Alice",       { cursor: "b",    by: "char", interval: 70 })
  .type("Engineering", { cursor: "c",    by: "char", interval: 70 })
  .type("98",          { cursor: "main", by: "char", interval: 70 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "mark-highlight",
    title: "Mark / Highlight",
    description: "Apply a highlight mark to the entire text after typing it.",
    category: "styling",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "Highlight this text!" = 20 chars. Mark covers the full range 0-20.
tw.timeline
  .type("Highlight this text!", { by: "char", interval: 70 })
  .wait(400)
  .mark("tw-highlight", { from: 0, to: 20 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "marketing-slogan",
    title: "Marketing Slogan Rotator",
    description: "A word cycles through styled alternatives — styled from the very first character using the style option.",
    category: "styling",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

// Use style: "tw-accent" on type() so styling appears as each letter is typed.
tw.timeline
  .type("Code in ", { by: "char", interval: 80 })
  .wait(200)
  .type("style",     { by: "char", interval: 90, style: "tw-accent" })
  .wait(900)
  .delete(5, { by: "char", interval: 45 })
  .type("bravery",   { by: "char", interval: 90, style: "tw-accent" })
  .wait(900)
  .delete(7, { by: "char", interval: 45 })
  .type("elegance",  { by: "char", interval: 90, style: "tw-accent" })
  .wait(900)
  .delete(8, { by: "char", interval: 45 })
  .type("precision", { by: "char", interval: 90, style: "tw-accent" })
  .wait(1000);

await tw.play();`,
  },

  {
    id: "gradient-banner",
    title: "Gradient Banner",
    description: "Type a headline word by word, then apply a gradient mark to the full text.",
    category: "styling",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Ship faster. Build better.", { by: "word", interval: 200 })
  .wait(400)
  .mark("tw-gradient", { from: 0, to: 26 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "layered-marks",
    title: "Layered Marks",
    description: "Apply distinct mark styles to different regions of the same text simultaneously.",
    category: "styling",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "Deleted text | Added text | Keyword"
//   danger: 0-12   success:15-25   pill:28-35
tw.timeline
  .type("Deleted text | Added text | Keyword", { by: "char", interval: 55 })
  .wait(500)
  .mark("tw-danger",  { from: 0,  to: 12 })
  .mark("tw-success", { from: 15, to: 25 })
  .mark("tw-pill",    { from: 28, to: 35 })
  .wait(1000);

await tw.play();`,
  },

  {
    id: "code-annotation",
    title: "Code Annotation",
    description: "Type a function call, then progressively highlight its function name and arguments.",
    category: "styling",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "render(scene, camera)" — fn: 0-5, arg1: 7-11, arg2: 14-19
tw.timeline
  .type("render(scene, camera)", { by: "char", interval: 70 })
  .wait(400)
  .mark("tw-accent", { from: 0,  to: 6  })
  .wait(300)
  .mark("tw-code",   { from: 7,  to: 12 })
  .wait(300)
  .mark("tw-code",   { from: 14, to: 20 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "select-and-restyle",
    title: "Select & Restyle",
    description: "Select a word backward, then immediately apply a style mark to the selection.",
    category: "styling",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// "Make this word pop." — "word" starts at index 10 (4 chars)
tw.timeline
  .type("Make this word pop.", { by: "char", interval: 70 })
  .wait(500)
  .moveCursor(14)
  .wait(200)
  .select(-4, { by: "char" })
  .wait(300)
  .mark("tw-accent", "selection")
  .wait(800);

await tw.play();`,
  },

  {
    id: "narrated-refactor",
    title: "Narrated Refactor",
    description: "Write rough copy, correct a word in-place, then mark the polished result.",
    category: "advanced",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

// "A usefull library." — fix "usefull" (indices 2-8) then style the result
tw.timeline
  .type("A usefull library.", { by: "char", interval: 70 })
  .wait(600)
  .moveCursor(9)
  .wait(200)
  .delete(7, { by: "char", interval: 55 })
  .type("useful", { by: "char", interval: 70 })
  .wait(400)
  .mark("tw-success", { from: 2, to: 8  })
  .mark("tw-accent",  { from: 9, to: 16 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "status-board",
    title: "Status Board",
    description: "Populate a multi-line status board, then update each status field in sequence.",
    category: "advanced",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// Line format: "SVC    PENDING\\n" — 15 chars per line.
// "SVC    " = 7 chars prefix, "PENDING" = 7 chars status, "\\n" = 1 char.
// To update a status: move cursor to end of status field (prefix + 7),
// delete 7 chars backward, then type the new 7-char status.
//
// Line offsets (end of status field, before \\n):
//   Line 1: index 14  (7 prefix + 7 status)
//   Line 2: index 29  (15 + 7 + 7)
//   Line 3: index 44  (30 + 7 + 7)
tw.timeline
  .type("API    PENDING\\n", { by: "char", interval: 40 })
  .type("DB     PENDING\\n", { by: "char", interval: 40 })
  .type("CACHE  PENDING\\n", { by: "char", interval: 40 })
  .wait(600)
  // Update line 1: move to end of its status field, delete backward, type new
  .moveCursor(14)
  .delete(1, { by: "word", interval: 50 })
  .type("OK", { by: "word", interval: 60 })
  // Update line 2: index 24 (line has shifted by 0 — same structure)
  .moveCursor(24)
  .delete(1, { by: "word", interval: 50 })
  .type("OK", { by: "word", interval: 60 })
  // Update line 3: index 34
  .moveCursor(34)
  .delete(1, { by: "word", interval: 50 })
  .type("MISSING", { by: "word", interval: 60 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "multi-cursor-paragraph",
    title: "Multi-Cursor Corrections",
    description: "A paragraph with two typos; two cursors are positioned and correct each mistake in sequence.",
    category: "cursor",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

// "The qick brown fox jumpd over the lazy dog."
// Typo 1: "qick" at index 4-7 (4 chars).
// Typo 2: "jumpd" at index 20-24 (5 chars).
// We use cursor "b" to fix "qick" and main to fix "jumpd".
tw.timeline
  .type("The qick brown fox jumpd over the lazy dog.", {
    by: "char",
    interval: 50,
  })
  .wait(600)
  // Park cursor "b" after "qick" (index 8)
  .moveCursor(8, { cursor: "b" })
  .wait(200)
  // Fix typo 1 with cursor "b"
  .delete(4, { cursor: "b", by: "char", interval: 60 })
  .type("quick", { cursor: "b", by: "char", interval: 70 })
  .wait(300)
  // Fix typo 2 with main — position after "jumpd".
  // After fixing "qick"(4 chars) -> "quick"(5 chars), main has shifted by 1 to 44.
  // "jumpd" now ends at index 25. Move main there.
  .moveCursor(25)
  .wait(200)
  .delete(5, { cursor: "main", by: "char", interval: 60 })
  .type("jumped", { cursor: "main", by: "char", interval: 70 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "multiple-commands",
    title: "Full Sequence",
    description: "A full demo combining type, wait, delete, and retype.",
    category: "advanced",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("EO TypewriterTS", { by: "char", interval: 60 })
  .wait(500)
  .delete(2, { by: "char", interval: 80 })
  .wait(300)
  .type("JS Sandbox \uD83C\uDF89", { by: "char", interval: 80 })
  .wait(400)
  .type("\\n\u2014 write, compile, play.", { by: "char", interval: 55 });

await tw.play();`,
  },

  // ── Callbacks, hooks, and cancel ──────────────────────────────────────────

  {
    id: "call-command",
    title: "Call Command",
    description: "Schedule an inline callback mid-animation using call(). The callback receives the current typewriter state.",
    category: "callbacks",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Building", { by: "char", interval: 80 })
  .wait(200)
  .type("...", { by: "char", interval: 300 })
  .call(({ state }) => {
    // This fires after "Building..." is fully rendered.
    console.log("Text so far:", state.document.text);
  })
  .wait(400)
  .delete(3, { by: "char", interval: 60 })
  .type(" complete!", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "async-call",
    title: "Async Call",
    description: "call() supports async callbacks — playback is suspended until the returned Promise resolves.",
    category: "callbacks",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Fetching data", { by: "char", interval: 70 })
  .type("...", { by: "char", interval: 300 })
  .call(async () => {
    // Simulate an async operation (e.g. API fetch).
    await new Promise(resolve => setTimeout(resolve, 800));
  })
  .wait(200)
  .delete(13, { by: "char", interval: 25 })
  .type("Data loaded \u2713", { by: "char", interval: 65 });

await tw.play();`,
  },

  {
    id: "before-after-whole",
    title: "Before / After Hooks",
    description: "Attach before and after hooks to any command. They fire once around the whole command.",
    category: "callbacks",
    difficulty: "beginner",
    code: `const tw = createTypewriter({ renderer });
const log = [];

tw.timeline
  .type("Hello, hooks!", {
    by: "char",
    interval: 70,
    before: {
      callback: ({ state }) => {
        log.push("before: \\"" + state.document.text + "\\"");
      },
    },
    after: {
      callback: ({ state }) => {
        log.push("after: \\"" + state.document.text + "\\"");
      },
    },
  })
  .call(() => {
    console.log(log.join("\\n"));
  });

await tw.play();`,
  },

  {
    id: "per-unit-hook",
    title: "Per-Character Hook",
    description: "Set unit on a hook to fire it once per character typed. Use stepIndex and stepCount to track progress.",
    category: "callbacks",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

// The after hook fires after each individual character is typed.
tw.timeline
  .type("Loading", {
    by: "char",
    interval: 120,
    after: {
      unit: "char",
      callback: ({ stepIndex, stepCount, state }) => {
        const pct = Math.round(((stepIndex + 1) / stepCount) * 100);
        console.log(\`[\${pct}%] typed so far: "\${state.document.text}"\`);
      },
    },
  });

await tw.play();`,
  },

  {
    id: "cancel-from-callback",
    title: "Cancel from Callback",
    description: "Use tw.cancel() inside a call() to stop playback at a specific point, preserving the rendered output.",
    category: "callbacks",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Chapter One", { by: "char", interval: 70 })
  .wait(400)
  .call(() => {
    // Stop here — everything typed so far stays on screen.
    tw.cancel();
  })
  .type(" — continued...", { by: "char", interval: 70 });

// play() resolves as soon as cancel() is called.
await tw.play();
console.log("Status:", tw.getState().status); // CANCELLED`,
  },

  {
    id: "conditional-branch",
    title: "Conditional Branch",
    description: "Use call() to inspect state mid-animation and branch — typing different endings based on text length.",
    category: "callbacks",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });
let branch = "short";

tw.timeline
  .type("Hello!", { by: "char", interval: 70 })
  .call(({ state }) => {
    branch = state.document.text.length > 4 ? "long" : "short";
  })
  .wait(300);

await tw.play();

// Second animation depends on what call() captured
const tw2 = createTypewriter({ renderer: tw.getState ? renderer : renderer });
tw2.timeline
  .type(branch === "long" ? "\\n(That was a long one.)" : "\\n(Short!)", {
    by: "char",
    interval: 60,
  });

await tw2.play();`,
  },

  {
    id: "cancel-after-delay",
    title: "Auto-Cancel After Delay",
    description: "Cancel a slow-typing animation from outside after a fixed time — like a timeout guard.",
    category: "callbacks",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type(
    "This very long sentence types one character at a time at a deliberately slow pace to demonstrate the cancel feature.",
    { by: "char", interval: 120 },
  );

// Cancel after 600 ms — whatever was typed stays on screen.
setTimeout(() => {
  if (tw.getState().status === EPlaybackStatus.PLAYING) {
    tw.cancel();
  }
}, 600);

await tw.play();

const { status } = tw.getState();
console.log("Final status:", status);`,
  },

  // ── Audio ────────────────────────────────────────────────────────────────

  {
    id: "audio-default",
    title: "Enable Typing Sounds",
    description: "Audio is off by default. Pass audio: { enabled: true } to opt in. Each keystroke plays a keyboard click from the built-in voice pack.",
    category: "audio",
    difficulty: "beginner",
    code: `// Audio is OFF by default. Pass audio: { enabled: true } to opt in.
// The built-in voice pack has three keyboard-click samples played in
// shuffle-bag order so the same sound never plays twice in a row.
// Use the speaker button in the sandbox toolbar to mute at any time.
const tw = createTypewriter({ renderer, audio: { enabled: true } });

tw.timeline
  .type("Typing sounds are enabled!", { by: "char", interval: 80 })
  .wait(400)
  .type("\\nEvery keystroke plays a click.", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "audio-disabled",
    title: "Audio Off (Default)",
    description: "Audio is disabled by default. Omitting the audio field is the same as passing audio: { enabled: false }.",
    category: "audio",
    difficulty: "beginner",
    code: `// No audio field → no sounds. This is the default behaviour.
// Both lines below create a silent typewriter:
//   createTypewriter({ renderer })
//   createTypewriter({ renderer, audio: { enabled: false } })
const tw = createTypewriter({ renderer });

tw.timeline
  .type("Silent mode — no sounds.", { by: "char", interval: 70 })
  .wait(400)
  .type("\\nCall tw.setAudioEnabled(true) to turn on.", { by: "char", interval: 60 });

await tw.play();`,
  },

  {
    id: "audio-mute-command",
    title: "Silence a Specific Command",
    description: "Enable audio globally, then set audio: false on individual .type() or .delete() commands to silence just those steps.",
    category: "audio",
    difficulty: "beginner",
    code: `// Audio is enabled globally. The second .type() and the .delete() are silenced.
// The first and last .type() commands still play sounds.
const tw = createTypewriter({ renderer, audio: { enabled: true } });

tw.timeline
  .type("Loud ", { by: "char", interval: 70 })
  .type("silent ", { by: "char", interval: 70, audio: false })
  .type("loud again!", { by: "char", interval: 70 })
  .wait(500)
  .delete(11, { by: "char", interval: 50, audio: false })
  .type("done.", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "audio-volume-command",
    title: "Per-Command Volume",
    description: "Pass audio: { volume } on individual commands to control loudness per keystroke.",
    category: "audio",
    difficulty: "intermediate",
    code: `// Master volume is 1.0, audio is explicitly enabled.
// The second block types at 20% of the master volume — noticeably softer.
// The third block restores full volume.
const tw = createTypewriter({ renderer, audio: { enabled: true, volume: 1 } });

tw.timeline
  .type("Full volume: ", { by: "char", interval: 70 })
  .type("LOUD!", { by: "char", interval: 80 })
  .wait(400)
  .type("\\nSoft: ", { by: "char", interval: 70 })
  .type("quiet...", { by: "char", interval: 80, audio: { volume: 0.2 } })
  .wait(400)
  .type("\\nBack to normal!", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "audio-strategy",
    title: "Sample Selection Strategy",
    description: "Configure the strategy that picks which sound sample plays next: shuffle-bag (default), round-robin, or random.",
    category: "audio",
    difficulty: "intermediate",
    code: `// round-robin cycles through samples in order.
// shuffle-bag (default) shuffles then drains the pool before reshuffling.
// random picks freely on every keystroke.
//
// All three behave identically in this demo since the default pack has 3 samples.
// Swap EAudioStrategy.ROUND_ROBIN for SHUFFLE_BAG or RANDOM to compare.
const tw = createTypewriter({
  renderer,
  audio: {
    typing: {
      strategy: EAudioStrategy.ROUND_ROBIN,
      avoidImmediateRepeat: true,
    },
  },
});

tw.timeline
  .type("Round-robin sampling — 1, 2, 3, 1, 2, 3…", { by: "char", interval: 75 });

await tw.play();`,
  },

  {
    id: "audio-jitter",
    title: "Pitch & Volume Jitter",
    description: "Add playbackRateJitter and volumeJitter to each channel for natural, human-feeling variation.",
    category: "audio",
    difficulty: "intermediate",
    code: `// playbackRateJitter varies the pitch of each click between 85% and 115%.
// volumeJitter varies the loudness between 80% and 100% of the master volume.
// Together they prevent the mechanical feel of a single repeated click.
const tw = createTypewriter({
  renderer,
  audio: {
    volume: 0.9,
    typing: {
      strategy: EAudioStrategy.SHUFFLE_BAG,
      playbackRateJitter: { min: 0.85, max: 1.15 },
      volumeJitter: { min: 0.8, max: 1.0 },
    },
    delete: {
      playbackRateJitter: { min: 0.75, max: 0.95 },
    },
  },
});

tw.timeline
  .type("Natural-feeling keystrokes with jitter.", { by: "char", interval: 75 })
  .wait(400)
  .delete(7, { by: "char", interval: 60 })
  .type("variance!", { by: "char", interval: 75 });

await tw.play();`,
  },

  {
    id: "audio-custom-voices",
    title: "Custom Voice Pack",
    description: "Supply your own voice pack with named voices, then target a specific voice per command.",
    category: "audio",
    difficulty: "advanced",
    code: `// Replace the URLs below with real audio file URLs or base64 data URLs.
// Each voice can have multiple samples — the strategy picks between them.
const tw = createTypewriter({
  renderer,
  audio: {
    voices: {
      // Two named voices — swap the URLs for your own sounds
      mechanical: { samples: ["https://assets.mixkit.co/active_storage/sfx/2533/2533-preview.mp3", "https://assets.mixkit.co/active_storage/sfx/2542/2542-preview.mp3"] },
      soft:       { samples: ["https://assets.mixkit.co/active_storage/sfx/2841/2841-preview.mp3"] },
    },
    typing: { voice: "mechanical", strategy: EAudioStrategy.ROUND_ROBIN },
    delete: { voice: "soft",       strategy: EAudioStrategy.ROUND_ROBIN },
  },
});

tw.timeline
  .type("Mechanical keys: ", { by: "char", interval: 80 })
  .type("clack clack!", { by: "char", interval: 90 })
  .wait(400)
  .delete(12, { by: "char", interval: 60 })
  .type("soft delete.", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "audio-runtime-control",
    title: "Runtime Audio Control",
    description: "Change volume, enable/disable, and replace the full audio config at runtime during playback.",
    category: "audio",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer, audio: { enabled: true } });

// Ramp volume down mid-animation using call() hooks
tw.timeline
  .type("Full volume...", { by: "char", interval: 70 })
  .call(() => {
    // halve the volume mid-flight
    tw.setAudioVolume(0.3);
  })
  .type("\\nSoft now...", { by: "char", interval: 80 })
  .call(() => {
    // mute entirely
    tw.setAudioEnabled(false);
  })
  .type("\\nSilent.", { by: "char", interval: 80 })
  .call(() => {
    // restore
    tw.setAudioEnabled(true);
    tw.setAudioVolume(1);
  })
  .wait(300)
  .type("\\nBack!", { by: "char", interval: 70 });

await tw.play();`,
  },

  {
    id: "rate-control",
    title: "Rate Control",
    description: "Change playback rate dynamically to speed up the animation.",
    category: "advanced",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("This types at 2.5x the normal speed.", { by: "char", interval: 80 });

tw.setRate(2.5);

await tw.play();`,
  },

  {
    id: "loop-demo",
    title: "Loop Demo",
    description: "Loop a short animation by replaying it until manually stopped.",
    category: "advanced",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Looping forever!", { by: "char", interval: 70 })
  .wait(600)
  .delete(16, { by: "char", interval: 40 })
  .wait(300);

void (async () => {
  await tw.play();
  while (tw.getState().status !== EPlaybackStatus.STOPPED) {
    await tw.replay();
  }
})();`,
  },
] as const;
