/**
 * @description
 * A single sandbox recipe
 */
export type TSandboxRecipe = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: TSandboxCategory;
  readonly code: string;
};

/**
 * @description
 * Recipe category — matches the filter chip order in the UI
 */
export type TSandboxCategory
  = | "all"
    | "basics"
    | "timing"
    | "editing"
    | "cursor"
    | "styling"
    | "callbacks"
    | "audio";

/**
 * @description
 */

/**
 * @description
 * All built-in sandbox recipes, ordered by category to match the filter chips
 */
export const SANDBOX_RECIPES: readonly TSandboxRecipe[] = [
  // ── Basics ────────────────────────────────────────────────────────────────

  {
    id: "hello-world",
    title: "Hello World",
    description: "The classic first animation — type a greeting one character at a time.",
    category: "basics",
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
    id: "emoji-unicode",
    title: "Emoji & Unicode",
    description: "Type and delete emoji clusters, flags, ZWJ sequences, and accented text using by: \"grapheme\" for correct user-perceived character handling.",
    category: "basics",
    code: `const tw = createTypewriter({ renderer });

// Each emoji spans a different number of codepoints but is one user-perceived character.
//   🙂     = 1 codepoint
//   👍🏽    = base + skin-tone modifier (2 codepoints)
//   🇲🇦    = flag via two regional indicators (2 codepoints)
//   👨‍👩‍👧‍👦 = ZWJ family sequence (7 codepoints joined by U+200D)
// by: "grapheme" steps one perceived character at a time regardless of byte length.
tw.timeline
  .type("🙂  👍🏽  🇲🇦  👨‍👩‍👧‍👦", { by: "grapheme", interval: 250 })
  .wait(600)
  .type("\\ncafé  naïve  façade", { by: "grapheme", interval: 70 })
  .wait(500)
  .delete(6, { by: "grapheme", interval: 110 })
  .type("résumé", { by: "grapheme", interval: 90 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "multiple-commands",
    title: "Full Sequence",
    description: "A full demo combining type, wait, delete, and retype in one timeline.",
    category: "basics",
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

  // ── Timing ────────────────────────────────────────────────────────────────

  {
    id: "fast-slow",
    title: "Fast → Slow",
    description: "Demonstrate interval variation — start fast, end slow.",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Speeding up: ", { by: "char", interval: 20 })
  .type("then slowing way down...", { by: "char", interval: 160 });

await tw.play();`,
  },

  {
    id: "dramatic-pause",
    title: "Dramatic Pause",
    description: "Build tension with a long pause in the middle of a sentence.",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("And the winner is", { by: "char", interval: 80 })
  .wait(1800)
  .type("...", { by: "char", interval: 400 })
  .wait(1000)
  .type(" TypewriterJS!", { by: "char", interval: 60 });

await tw.play();`,
  },

  {
    id: "staged-reveal",
    title: "Staged Reveal",
    description: "Reveal content line by line with deliberate pauses between each line.",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Step 1: Define the problem.", { by: "word", interval: 120 })
  .wait(700)
  .type("\\nStep 2: Break it into parts.", { by: "word", interval: 120 })
  .wait(700)
  .type("\\nStep 3: Ship.", { by: "word", interval: 200 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "word-vs-char",
    title: "Word vs Character Pacing",
    description: "Compare typing by word against typing by character — same text, different feel.",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

// By character feels like real typing.
// By word feels like fast pasting.
// "the quick brown fox" = 19 chars — deleted char by char before the second pass.
tw.timeline
  .type("By character: ", { by: "char", interval: 40 })
  .type("the quick brown fox", { by: "char", interval: 60 })
  .wait(800)
  .delete(19, { by: "char", interval: 25 })
  .delete(14, { by: "char", interval: 25 })
  .wait(300)
  .type("By word: ", { by: "char", interval: 40 })
  .type("the quick brown fox", { by: "word", interval: 200 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "accelerating-reveal",
    title: "Accelerating Reveal",
    description: "Each word in the sequence types faster than the last — building momentum.",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

// Intervals decrease with each segment, creating a natural acceleration.
tw.timeline
  .type("Ready ", { by: "char", interval: 150 })
  .type("set ", { by: "char", interval: 100 })
  .type("go!", { by: "char", interval: 40 })
  .wait(600)
  .type("\\nFaster and faster.", { by: "char", interval: 30 });

await tw.play();`,
  },

  {
    id: "rate-control",
    title: "Rate Control",
    description: "Override the global playback rate to play the entire animation at 2.5× speed.",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("This types at 2.5x the normal speed.", { by: "char", interval: 80 });

tw.setRate(2.5);

await tw.play();`,
  },

  {
    id: "loop-demo",
    title: "Loop",
    description: "Replay a short animation in a continuous loop using replay().",
    category: "timing",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Looping forever!", { by: "char", interval: 70 })
  .wait(600)
  .delete(16, { by: "char", interval: 40 })
  .wait(300);

await tw.play();

while (true) {
  await tw.replay();
}`,
  },

  // ── Editing ───────────────────────────────────────────────────────────────

  {
    id: "delete-by-word",
    title: "Delete by Word",
    description: "Erase a sentence word by word — each delete step removes one full word.",
    category: "editing",
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
    description: "Move the cursor mid-sentence with move() and insert a missing word.",
    category: "editing",
    code: `const tw = createTypewriter({ renderer });

// "I love TypewriterJS" — move to index 7 (after "I love ") to insert "using "
tw.timeline
  .type("I love TypewriterJS", { by: "char", interval: 70 })
  .wait(600)
  .move(7)
  .wait(300)
  .type("using ", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "narrated-refactor",
    title: "Narrated Refactor",
    description: "Type rough copy, correct a typo in-place, then style the polished result.",
    category: "editing",
    code: `const tw = createTypewriter({ renderer });

// "A usefull library." = 18 chars
// "usefull" occupies indices 2-8 (7 chars). Cursor at 9 (after the l).
// Delete 7 backward → removes "usefull", then type "useful" (6 chars).
// Final text: "A useful library." (17 chars)
// Marks: "useful" = 2-8, "library" = 9-16
tw.timeline
  .type("A usefull library.", { by: "char", interval: 70 })
  .wait(600)
  .move(9)
  .wait(200)
  .delete(7, { by: "char", interval: 55 })
  .type("useful", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-success", { from: 2, to: 8 })
  .style("tw-accent",  { from: 9, to: 16 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "status-board",
    title: "Status Board",
    description: "Populate a multi-line status board, then update each status field in sequence.",
    category: "editing",
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
  .move(14)
  .delete(1, { by: "word", interval: 50 })
  .type("OK", { by: "word", interval: 60 })
  .move(24)
  .delete(1, { by: "word", interval: 50 })
  .type("OK", { by: "word", interval: 60 })
  .move(34)
  .delete(1, { by: "word", interval: 50 })
  .type("MISSING", { by: "word", interval: 60 })
  .wait(600);

await tw.play();`,
  },

  // ── Cursor ────────────────────────────────────────────────────────────────

  {
    id: "cursor-styles",
    title: "Cursor Styles",
    description: "Compare all five built-in cursor kinds: pipe, underscore, block, block-underscore, and caret.",
    category: "cursor",
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
    id: "move",
    title: "Move Cursor",
    description: "Move the cursor to a specific position in the text.",
    category: "cursor",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .move(5)
  .wait(300)
  .type(",", { by: "char", interval: 80 })
  .move(13)
  .type("!", { by: "char", interval: 80 });

await tw.play();`,
  },

  {
    id: "select-text",
    title: "Select Text",
    description: "Select a range of characters in the document.",
    category: "cursor",
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
    code: `const tw = createTypewriter({ renderer });

// "Name: \\nRole: " = 13 chars. main ends at 13 (after "Role: ").
// cursor "b" is parked at 6 (end of "Name: " line, before \\n).
// Both cursors then type "Alice" at their respective positions.
tw.timeline
  .type("Name: \\nRole: ", { by: "char", interval: 70 })
  .wait(400)
  .move(6, { cursor: "b" })
  .wait(200)
  .type("Alice", { cursor: ["main", "b"], by: "char", interval: 90 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "multi-cursor-paragraph",
    title: "Multi-Cursor Corrections",
    description: "A paragraph with two typos; two cursors are positioned and correct each mistake in sequence.",
    category: "cursor",
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
  .move(8, { cursor: "b" })
  .wait(200)
  // Fix typo 1 with cursor "b"
  .delete(4, { cursor: "b", by: "char", interval: 60 })
  .type("quick", { cursor: "b", by: "char", interval: 70 })
  .wait(300)
  // Fix typo 2 with main — position after "jumpd".
  // After fixing "qick"(4 chars) -> "quick"(5 chars), main has shifted by 1 to 44.
  // "jumpd" now ends at index 25. Move main there.
  .move(25)
  .wait(200)
  .delete(5, { cursor: "main", by: "char", interval: 60 })
  .type("jumped", { cursor: "main", by: "char", interval: 70 })
  .wait(600);

await tw.play();`,
  },

  // ── Styling ───────────────────────────────────────────────────────────────

  {
    id: "style-while-typing",
    title: "Style While Typing",
    description: "Pass style on type() so each character appears styled as it is typed — no separate style step needed.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// style: "tw-accent" is applied per-character during insertion.
// Characters appear in the accent colour as they are typed,
// not as a style applied after the fact.
tw.timeline
  .type("Plain text, then ", { by: "char", interval: 60 })
  .type("styled as typed", { by: "char", interval: 70, style: "tw-accent" })
  .type(".", { by: "char", interval: 60 });

await tw.play();`,
  },

  {
    id: "multi-style-inline",
    title: "Multiple Inline Styles",
    description: "Type separate segments each with a different inline style — no style() calls required.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Each type() call uses a different style class.
// Characters appear in their style immediately on insertion.
tw.timeline
  .type("error",   { by: "char", interval: 70, style: "tw-danger" })
  .type(" | ",     { by: "char", interval: 60 })
  .type("warning", { by: "char", interval: 70, style: "tw-highlight" })
  .type(" | ",     { by: "char", interval: 60 })
  .type("ok",      { by: "char", interval: 70, style: "tw-success" })
  .wait(800);

await tw.play();`,
  },

  {
    id: "style-highlight",
    title: "Highlight After Typing",
    description: "Type plain text, then apply a highlight style to a range once typing is complete.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Text is typed plain first. style() applies the style after the fact.
// "Highlight this text!" = 20 chars. Mark covers the full range 0-20.
tw.timeline
  .type("Highlight this text!", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 20 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "marketing-slogan",
    title: "Slogan Rotator",
    description: "A word cycles through styled alternatives — each replacement appears styled as it is typed.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// style: "tw-accent" on each type() means styled characters appear live,
// not as a post-hoc style. delete() erases the old word, then the new one
// types in with its style applied character by character.
tw.timeline
  .type("Code in ", { by: "char", interval: 80 })
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
    title: "Gradient Banner (Mark After)",
    description: "Type a headline word by word, then apply a gradient style to the full text once typing finishes.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Text is typed plain. The gradient is applied via style() after completion.
tw.timeline
  .type("Ship faster. Build better.", { by: "word", interval: 200 })
  .wait(400)
  .style("tw-gradient", { from: 0, to: 26 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "layered-marks",
    title: "Layered Marks (Mark After)",
    description: "Type plain text, then apply distinct styles to different regions simultaneously.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// All marks are applied after typing — style() stamps a style onto an existing range.
// "Deleted text | Added text | Keyword"
//   danger: 0-12   success:15-25   pill:28-35
tw.timeline
  .type("Deleted text | Added text | Keyword", { by: "char", interval: 55 })
  .wait(500)
  .style("tw-danger",  { from: 0,  to: 12 })
  .style("tw-success", { from: 15, to: 25 })
  .style("tw-pill",    { from: 28, to: 35 })
  .wait(1000);

await tw.play();`,
  },

  {
    id: "code-annotation",
    title: "Code Annotation (Mark After)",
    description: "Type a function call plain, then progressively style the function name and arguments.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Characters are typed without styling. style() highlights each token in sequence.
// "render(scene, camera)" — fn: 0-5, arg1: 7-11, arg2: 14-19
tw.timeline
  .type("render(scene, camera)", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-accent", { from: 0,  to: 6  })
  .wait(300)
  .style("tw-code",   { from: 7,  to: 12 })
  .wait(300)
  .style("tw-code",   { from: 14, to: 20 })
  .wait(800);

await tw.play();`,
  },

  {
    id: "select-and-restyle",
    title: "Select & Restyle (Mark After)",
    description: "Type plain text, select a word backward, then apply a style to the selection.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Text is typed plain. The selection is made and the style applied after the fact.
// "Make this word pop." — "word" starts at index 10 (4 chars).
tw.timeline
  .type("Make this word pop.", { by: "char", interval: 70 })
  .wait(500)
  .move(14)
  .wait(200)
  .select(-4, { by: "char" })
  .wait(300)
  .style("tw-accent", "selection")
  .wait(800);

await tw.play();`,
  },

  {
    id: "unselect",
    title: "Clear Selection",
    description: "Create a selection, keep it visible for a moment, then dismiss it with unselect() without moving the cursor.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// select() creates the selection; unselect() removes it.
// The cursor stays at index 6 — only the highlight disappears.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .move(6)
  .select(5)
  .wait(800)
  .unselect()
  .wait(600);

await tw.play();`,
  },

  {
    id: "unstyle-range",
    title: "Unstyle by Range",
    description: "Style the full text, then unstyle a specific range — the unstyled region loses its style while the rest keeps it.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Style everything, then unstyle "World" (indices 6-11).
// Marks that partially overlap are clipped — "Hello " keeps its style.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 11 })
  .wait(800)
  .unstyle({ from: 6, to: 11 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "unstyle-selection",
    title: "Unstyle by Selection",
    description: "Select a range, then pass \"selection\" to unstyle() to remove marks in that region using the cursor selection as the target.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// "selection" resolves to the cursor's active selection at play time.
// The selection is also cleared after the unstyle fires.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 11 })
  .wait(400)
  .move(6)
  .select(5)
  .wait(600)
  .unstyle("selection")
  .wait(600);

await tw.play();`,
  },

  {
    id: "unstyle-split",
    title: "Unstyle Split",
    description: "Unstyle the middle of a styled range — the style is split into two fragments covering the regions outside the unstyle range.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Style all 11 chars, then unstyle indices 3-8 (the middle portion).
// Result: two fragments: [0,3] and [8,11] both keep tw-highlight.
// Characters 3-7 carry no style.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 11 })
  .wait(800)
  .unstyle({ from: 3, to: 8 })
  .wait(600);

await tw.play();`,
  },

  {
    id: "style-unstyle-cycle",
    title: "Style/Unstyle Cycle",
    description: "Apply and remove a style in a loop to create a pulsing highlight effect.",
    category: "styling",
    code: `const tw = createTypewriter({ renderer });

// Each loop applies a style then removes it to create a visual blink.
tw.timeline
  .type("Blinking highlight", { by: "char", interval: 70 })
  .wait(300)
  .style("tw-highlight", { from: 0, to: 18 })
  .wait(400)
  .unstyle({ from: 0, to: 18 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 18 })
  .wait(400)
  .unstyle({ from: 0, to: 18 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 18 })
  .wait(600);

await tw.play();`,
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────

  {
    id: "call-command",
    title: "Call Command",
    description: "Schedule an inline callback mid-animation using call(). The callback receives the current typewriter state.",
    category: "callbacks",
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
const tw2 = createTypewriter({ renderer });
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

  // ── Audio ─────────────────────────────────────────────────────────────────

  {
    id: "audio-default",
    title: "Enable Typing Sounds",
    description: "Audio is off by default. Pass audio: { enabled: true } to opt in. Each keystroke plays a keyboard click from the built-in voice pack.",
    category: "audio",
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
    code: `const tw = createTypewriter({ renderer, audio: { enabled: true, volume: 1 } });

// The second block types at 20% of the master volume — noticeably softer.
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
    description: "Configure the strategy that picks which sound sample plays next: shuffle-bag, round-robin, or random.",
    category: "audio",
    code: `const tw = createTypewriter({
  renderer,
  audio: {
    enabled: true,
    typing: {
      strategy: EAudioStrategy.ROUND_ROBIN,
      avoidImmediateRepeat: true,
    },
  },
});

tw.timeline
  .type("Round-robin sampling — 1, 2, 3, 1, 2, 3\u2026", { by: "char", interval: 75 });

await tw.play();`,
  },

  {
    id: "audio-jitter",
    title: "Pitch & Volume Jitter",
    description: "Add playbackRateJitter and volumeJitter to each channel for natural, human-feeling variation.",
    category: "audio",
    code: `const tw = createTypewriter({
  renderer,
  audio: {
    enabled: true,
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
    code: `// Replace the URLs below with real audio file URLs or base64 data URLs.
const tw = createTypewriter({
  renderer,
  audio: {
    voices: {
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
    code: `const tw = createTypewriter({ renderer, audio: { enabled: true } });

tw.timeline
  .type("Full volume...", { by: "char", interval: 70 })
  .call(() => {
    tw.setAudioVolume(0.3);
  })
  .type("\\nSoft now...", { by: "char", interval: 80 })
  .call(() => {
    tw.setAudioEnabled(false);
  })
  .type("\\nSilent.", { by: "char", interval: 80 })
  .call(() => {
    tw.setAudioEnabled(true);
    tw.setAudioVolume(1);
  })
  .wait(300)
  .type("\\nBack!", { by: "char", interval: 70 });

await tw.play();`,
  },


] as const;
