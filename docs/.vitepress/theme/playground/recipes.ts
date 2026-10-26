import type { TRecipe } from "./recipe.type";



/**
 * @description
 * The recipes listed in the sandbox, grouped by category.
 * `expected` is the final text of the main preview, checked by the tests.
 */
export const RECIPES: readonly TRecipe[] = [
  {
    id: "hello-world",
    title: "Hello World",
    description: "The classic first animation - type a greeting one character at a time.",
    category: "basics",
    expected: "Hello, World!",
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
    expected: "Loading... Done!",
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
    expected: "The quick brown fox jumps over the lazy dog",
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
    expected: "Line one\nLine two\nLine three",
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
    description: "Type and delete emoji, flags, ZWJ sequences and accented text. Every step is one user-perceived character, whatever its length in code units.",
    category: "basics",
    expected: "🙂  👍🏽  🇲🇦  🐈\ncafé  naïve  résumé",
    code: `const tw = createTypewriter({ renderer });

// Each emoji spans a different number of code points but is one perceived character:
//   🙂 = 1 code point, 👍🏽 = 2, 🇲🇦 = 2, 👨‍👩‍👧‍👦 = 7 joined by U+200D.
// Typing and deleting by "grapheme" (or "char", which means the same) never splits them.
tw.timeline
  .type("🙂  👍🏽  🇲🇦  👨‍👩‍👧‍👦", { by: "grapheme", interval: 250 })
  .wait(600)
  .delete(-1, { by: "grapheme", interval: 250 })
  .type("🐈", { by: "grapheme", interval: 250 })
  .type("\\ncafé  naïve  façade", { by: "grapheme", interval: 70 })
  .wait(500)
  .delete(-6, { by: "grapheme", interval: 110 })
  .type("résumé", { by: "grapheme", interval: 90 })
  .wait(800);

await tw.play();`,
  },
  {
    id: "multiple-commands",
    title: "Full Sequence",
    description: "A full demo combining type, wait, delete, and retype in one timeline.",
    category: "basics",
    expected: "EO TypewriterJS Sandbox 🎉\n— write, compile, play.",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("EO TypewriterTS", { by: "char", interval: 60 })
  .wait(500)
  .delete(-2, { by: "char", interval: 80 })
  .wait(300)
  .type("JS Sandbox \uD83C\uDF89", { by: "char", interval: 80 })
  .wait(400)
  .type("\\n\u2014 write, compile, play.", { by: "char", interval: 55 });

await tw.play();`,
  },
  {
    id: "fast-slow",
    title: "Fast → Slow",
    description: "Demonstrate interval variation - start fast, end slow.",
    category: "timing",
    expected: "Speeding up: then slowing way down...",
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
    expected: "And the winner is... TypewriterJS!",
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
    expected: "Step 1: Define the problem.\nStep 2: Break it into parts.\nStep 3: Ship.",
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
    description: "Compare typing by word against typing by character - same text, different feel.",
    category: "timing",
    expected: "By word: the quick brown fox",
    code: `const tw = createTypewriter({ renderer });

// By character feels like real typing.
// By word feels like fast pasting.
// "the quick brown fox" = 19 chars - deleted char by char before the second pass.
tw.timeline
  .type("By character: ", { by: "char", interval: 40 })
  .type("the quick brown fox", { by: "char", interval: 60 })
  .wait(800)
  .delete(-19, { by: "char", interval: 25 })
  .delete(-14, { by: "char", interval: 25 })
  .wait(300)
  .type("By word: ", { by: "char", interval: 40 })
  .type("the quick brown fox", { by: "word", interval: 200 })
  .wait(800);

await tw.play();`,
  },
  {
    id: "accelerating-reveal",
    title: "Accelerating Reveal",
    description: "Each word in the sequence types faster than the last - building momentum.",
    category: "timing",
    expected: "Ready set go!\nFaster and faster.",
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
    expected: "This types at 2.5x the normal speed.",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("This types at 2.5x the normal speed.", { by: "char", interval: 80 });

tw.setRate(2.5);

await tw.play();`,
  },
  {
    id: "loop-demo",
    title: "Loop",
    description: "Replay a short animation a few times with replay().",
    category: "timing",
    expected: "",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Looping!", { by: "char", interval: 70 })
  .wait(600)
  .delete(-8, { by: "char", interval: 40 })
  .wait(300);

await tw.play();

// replay() restarts from the beginning; loop while the sandbox keeps running.
for (let round = 1; round < 3 && !signal.aborted; round++) {
  await tw.replay();
}`,
  },
  {
    id: "delete-by-word",
    title: "Delete by Word",
    description: "Erase a sentence word by word - each delete step removes one full word.",
    category: "editing",
    expected: "all erased.",
    code: `const tw = createTypewriter({ renderer });

// Deleting by word removes one whole word (with its trailing space) per step.
tw.timeline
  .type("one two three four five", { by: "char", interval: 60 })
  .wait(600)
  .delete(-5, { by: "word", interval: 300 })
  .wait(400)
  .type("all erased.", { by: "char", interval: 70 });

await tw.play();`,
  },
  {
    id: "insert-in-middle",
    title: "Insert in the Middle",
    description: "Move the cursor mid-sentence with move() and insert a missing word.",
    category: "editing",
    expected: "I love using TypewriterJS",
    code: `const tw = createTypewriter({ renderer });

// "I love TypewriterJS" = 19 chars. Move back 12 to reach index 7 (after "I love ").
tw.timeline
  .type("I love TypewriterJS", { by: "char", interval: 70 })
  .wait(600)
  .move(-12)
  .wait(300)
  .type("using ", { by: "char", interval: 80 });

await tw.play();`,
  },
  {
    id: "narrated-refactor",
    title: "Narrated Refactor",
    description: "Type rough copy, correct a typo in-place, then style the polished result.",
    category: "editing",
    expected: "A useful library.",
    code: `const tw = createTypewriter({ renderer });

// "A usefull library." = 18 chars. Cursor at 18 after typing.
// "usefull" occupies indices 2-8 (7 chars). Move back 9 to reach index 9 (after "usefull").
// Delete 7 backward → removes "usefull", then type "useful" (6 chars).
// Final text: "A useful library." (17 chars)
// Marks: "useful" = 2-8, "library" = 9-16
tw.timeline
  .type("A usefull library.", { by: "char", interval: 70 })
  .wait(600)
  .move(-9)
  .wait(200)
  .delete(-7, { by: "char", interval: 55 })
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
    description: "Fill in a status board, then jump between lines with move() to update each status.",
    category: "editing",
    expected: "API    OK\nDB     OK\nCACHE  MISSING",
    code: `const tw = createTypewriter({ renderer });

// Each line is "NAME   PENDING\\n". Moving by line jumps between rows; moving to the
// end of a row puts the cursor right after its status, ready to replace it.
tw.timeline
  .type("API    PENDING\\n", { by: "char", interval: 40 })
  .type("DB     PENDING\\n", { by: "char", interval: 40 })
  .type("CACHE  PENDING", { by: "char", interval: 40 })
  .wait(600)
  .move("start")
  .move(14)
  .delete(-1, { by: "word", interval: 50 })
  .type("OK", { by: "word", interval: 60 })
  .move(15)
  .delete(-1, { by: "word", interval: 50 })
  .type("OK", { by: "word", interval: 60 })
  .move("end")
  .delete(-1, { by: "word", interval: 50 })
  .type("MISSING", { by: "word", interval: 60 })
  .wait(600);

await tw.play();`,
  },
  {
    id: "cursor-styles",
    title: "Cursor Styles",
    description: "Compare the five built-in cursor kinds side by side: pipe, underscore, block, block-underscore and caret.",
    category: "cursor",
    expected: "Pipe cursor",
    previews: { "Underscore cursor": "Underscore cursor", "Block cursor": "Block cursor", "Block-underscore cursor": "Block-underscore cursor", "Caret cursor": "Caret cursor" },
    code: `// preview(label) adds a labelled output next to the main one.
const kinds = [
  { kind: ECursorKind.PIPE, label: "Pipe cursor" },
  { kind: ECursorKind.UNDERSCORE, label: "Underscore cursor" },
  { kind: ECursorKind.BLOCK, label: "Block cursor" },
  { kind: ECursorKind.BLOCK_UNDERSCORE, label: "Block-underscore cursor" },
  { kind: ECursorKind.CARET, label: "Caret cursor" },
];

const typewriters = kinds.map(({ kind, label }, i) => {
  const tw = createTypewriter({ renderer: i === 0 ? renderer : preview(label), cursor: { kind } });

  tw.timeline.type(label, { by: "char", interval: 35 }).wait(600);

  return tw;
});

await Promise.all(typewriters.map(tw => tw.play()));`,
  },
  {
    id: "cursor-hidden",
    title: "Hidden Cursor",
    description: "Start with the cursor hidden, type text silently, then reveal the cursor at the end.",
    category: "cursor",
    expected: "Cursor is hidden while typing...",
    code: `const tw = createTypewriter({
  renderer,
  cursor: { visible: false },
});

tw.timeline
  .type("Cursor is hidden while typing...", { by: "char", interval: 60 })
  .wait(400)
  .call(() => {
    // Reveal the cursor - it will appear at the end of the text
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
    expected: "pipe underscore block block-underscore caret",
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
    description: "Compare cursor animations side by side: the built-in blink, no animation, and a custom CSS animation.",
    category: "cursor",
    expected: "Blinking cursor",
    previews: { "No animation": "Static cursor", "Custom animation": "Pulsing cursor" },
    code: `// 1. Built-in blink (the default)
const blink = createTypewriter({ renderer, cursor: { kind: ECursorKind.PIPE, animation: "blink" } });
blink.timeline.type("Blinking cursor", { by: "char", interval: 40 });

// 2. No animation at all
const still = createTypewriter({ renderer: preview("No animation"), cursor: { kind: ECursorKind.BLOCK, animation: "none" } });
still.timeline.type("Static cursor", { by: "char", interval: 40 });

// 3. A custom animation using @keyframes defined in the page stylesheet
const pulse = createTypewriter({
  renderer: preview("Custom animation"),
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
pulse.timeline.type("Pulsing cursor", { by: "char", interval: 40 });

await Promise.all([blink.play(), still.play(), pulse.play()]);`,
  },
  {
    id: "cursor-classes",
    title: "Styled Cursor",
    description: "Apply a custom CSS class to the cursor for a vivid glowing accent effect.",
    category: "cursor",
    expected: "Glowing block cursor",
    code: `// .tw-cursor-accent and .tw-cursor-glow are defined in the page stylesheet:
// accent colour, bold weight and a glow via text-shadow.
const tw = createTypewriter({
  renderer,
  cursor: {
    kind: ECursorKind.CUSTOM,
    content: "▍",
    className: "tw-cursor-accent tw-cursor-glow",
    animation: "none",
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
    expected: "Hello, World!",
    code: `const tw = createTypewriter({ renderer });

// After typing "Hello World" (11 chars), cursor is at 11.
// move(-6) positions cursor at index 5 (before "World").
// After inserting "," cursor is at 6; move("end") jumps to the end.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .move(-6)
  .wait(300)
  .type(",", { by: "char", interval: 80 })
  .move("end")
  .type("!", { by: "char", interval: 80 });

await tw.play();`,
  },
  {
    id: "select-text",
    title: "Select Text",
    description: "Select a range of characters in the document.",
    category: "cursor",
    expected: "Select me!",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Select me!", { by: "char", interval: 70 })
  .wait(500)
  .select(-10, { by: "char" })
  .wait(800);

await tw.play();`,
  },
  {
    id: "multi-cursor-paragraph",
    title: "Multi-Cursor Corrections",
    description: "A paragraph with two typos: a second cursor fixes the first one while the main cursor fixes the other.",
    category: "cursor",
    expected: "The quick brown fox jumped over the lazy dog.",
    code: `const tw = createTypewriter({ renderer });

// "The qick brown fox jumpd over the lazy dog." (43 characters)
// A new cursor starts at index 0, so cursor "b" first moves right after "qick" (index 8).
tw.timeline
  .type("The qick brown fox jumpd over the lazy dog.", { by: "char", interval: 50 })
  .wait(600)
  .move(8, { cursor: "b", interval: 30 })
  .delete(-4, { cursor: "b", interval: 60 })
  .type("quick", { cursor: "b", interval: 70 })
  .wait(300)
  // The fix grew the text by 1, so main is at 44 and "jumpd" now ends at 25.
  .move(-19, { interval: 20 })
  .delete(-5, { interval: 60 })
  .type("jumped", { interval: 70 })
  .wait(600);

await tw.play();`,
  },
  {
    id: "style-while-typing",
    title: "Style While Typing",
    description: "Pass style on type() so each character appears styled as it is typed - no separate style step needed.",
    category: "styling",
    expected: "Plain text, then styled as typed.",
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
    description: "Type separate segments each with a different inline style - no style() calls required.",
    category: "styling",
    expected: "error | warning | ok",
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
    expected: "Highlight this text!",
    code: `const tw = createTypewriter({ renderer });

// Text is typed plain first. style() applies the style after the fact.
// "Highlight this text!" = 20 chars. Style covers the full range 0-20.
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
    description: "A word cycles through styled alternatives - each replacement appears styled as it is typed.",
    category: "styling",
    expected: "Code in precision",
    code: `const tw = createTypewriter({ renderer });

// style: "tw-accent" on each type() means styled characters appear live,
// not as a post-hoc style. delete() erases the old word, then the new one
// types in with its style applied character by character.
tw.timeline
  .type("Code in ", { by: "char", interval: 80 })
  .type("style",     { by: "char", interval: 90, style: "tw-accent" })
  .wait(900)
  .delete(-5, { by: "char", interval: 45 })
  .type("bravery",   { by: "char", interval: 90, style: "tw-accent" })
  .wait(900)
  .delete(-7, { by: "char", interval: 45 })
  .type("elegance",  { by: "char", interval: 90, style: "tw-accent" })
  .wait(900)
  .delete(-8, { by: "char", interval: 45 })
  .type("precision", { by: "char", interval: 90, style: "tw-accent" })
  .wait(1000);

await tw.play();`,
  },
  {
    id: "gradient-banner",
    title: "Gradient Banner (Style After)",
    description: "Type a headline word by word, then apply a gradient style to the full text once typing finishes.",
    category: "styling",
    expected: "Ship faster. Build better.",
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
    id: "layered-styles",
    title: "Layered Styles (Style After)",
    description: "Type plain text, then apply distinct styles to different regions simultaneously.",
    category: "styling",
    expected: "Deleted text | Added text | Keyword",
    code: `const tw = createTypewriter({ renderer });

// All styles are applied after typing - style() stamps a style onto an existing range.
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
    title: "Code Annotation (Style After)",
    description: "Type a function call plain, then progressively style the function name and arguments.",
    category: "styling",
    expected: "render(scene, camera)",
    code: `const tw = createTypewriter({ renderer });

// Characters are typed without styling. style() highlights each token in sequence.
// "render(scene, camera)" - fn: 0-5, arg1: 7-11, arg2: 14-19
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
    title: "Select & Restyle (Style After)",
    description: "Type plain text, select a word backward, then apply a style to the selection.",
    category: "styling",
    expected: "Make this word pop.",
    code: `const tw = createTypewriter({ renderer });

// Text is typed plain. The selection is made and the style applied after the fact.
// "Make this word pop." - "word" starts at index 10 (4 chars).
tw.timeline
  .type("Make this word pop.", { by: "char", interval: 70 })
  .wait(500)
  .move(-5)
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
    expected: "Hello World",
    code: `const tw = createTypewriter({ renderer });

// select() creates the selection; unselect() removes it.
// The cursor stays at index 6 - only the highlight disappears.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .move(-5)
  .select(5)
  .wait(800)
  .unselect()
  .wait(600);

await tw.play();`,
  },
  {
    id: "unstyle-range",
    title: "Unstyle by Range",
    description: "Style the full text, then unstyle a specific range - the unstyled region loses its style while the rest keeps it.",
    category: "styling",
    expected: "Hello World",
    code: `const tw = createTypewriter({ renderer });

// Style everything, then unstyle "World" (indices 6-11).
// Marks that partially overlap are clipped - "Hello " keeps its style.
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
    description: "Select a range, then pass \"selection\" to unstyle() to remove styles in that region using the cursor selection as the target.",
    category: "styling",
    expected: "Hello World",
    code: `const tw = createTypewriter({ renderer });

// "selection" resolves to the cursor's active selection at play time.
// The selection is also cleared after the unstyle fires.
tw.timeline
  .type("Hello World", { by: "char", interval: 70 })
  .wait(400)
  .style("tw-highlight", { from: 0, to: 11 })
  .wait(400)
  .move(-5)
  .select(5)
  .wait(600)
  .unstyle("selection")
  .wait(600);

await tw.play();`,
  },
  {
    id: "unstyle-split",
    title: "Unstyle Split",
    description: "Unstyle the middle of a styled range - the style is split into two fragments covering the regions outside the unstyle range.",
    category: "styling",
    expected: "Hello World",
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
    expected: "Blinking highlight",
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
  {
    id: "call-command",
    title: "Call Command",
    description: "Schedule an inline callback mid-animation using call(). The callback receives the current typewriter state.",
    category: "callbacks",
    expected: "Building complete!",
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
  .delete(-3, { by: "char", interval: 60 })
  .type(" complete!", { by: "char", interval: 70 });

await tw.play();`,
  },
  {
    id: "async-call",
    title: "Async Call",
    description: "call() supports async callbacks - playback is suspended until the returned Promise resolves.",
    category: "callbacks",
    expected: "Data loaded ✓",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Fetching data", { by: "char", interval: 70 })
  .type("...", { by: "char", interval: 300 })
  .call(async () => {
    // Simulate an async operation (e.g. API fetch).
    await new Promise(resolve => setTimeout(resolve, 800));
  })
  .wait(200)
  .delete(-16, { by: "char", interval: 25 })
  .type("Data loaded \u2713", { by: "char", interval: 65 });

await tw.play();`,
  },
  {
    id: "before-after-whole",
    title: "Before / After Hooks",
    description: "Attach before and after hooks to a command. They fire around every step: once per character when typing by char.",
    category: "callbacks",
    expected: "Hooks!",
    code: `const tw = createTypewriter({ renderer });

tw.timeline.type("Hooks!", {
  by: "char",
  interval: 150,
  before: ({ stepIndex, stepCount }) => {
    console.log(\`before step \${stepIndex + 1}/\${stepCount}\`);
  },
  after: ({ state }) => {
    console.log(\`after: "\${state.document.text}"\`);
  },
});

await tw.play();`,
  },
  {
    id: "per-unit-hook",
    title: "Per-Character Hook",
    description: "The after hook fires once per step - once per character when by is 'char'. Use stepIndex and stepCount to track progress.",
    category: "callbacks",
    expected: "Loading",
    code: `const tw = createTypewriter({ renderer });

// The after hook fires after each individual character is typed.
tw.timeline
  .type("Loading", {
    by: "char",
    interval: 120,
    after: ({ stepIndex, stepCount, state }) => {
      const pct = Math.round(((stepIndex + 1) / stepCount) * 100);
      console.log(\`[\${pct}%] typed so far: "\${state.document.text}"\`);
    },
  });

await tw.play();`,
  },
  {
    id: "cancel-from-callback",
    title: "Cancel from Callback",
    description: "Use tw.cancel() inside a call() to stop playback at a specific point, preserving the rendered output.",
    category: "callbacks",
    expected: "Chapter One",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Chapter One", { by: "char", interval: 70 })
  .wait(400)
  .call(() => {
    // Stop here - everything typed so far stays on screen.
    tw.cancel();
  })
  .type(" - continued...", { by: "char", interval: 70 });

// play() resolves as soon as cancel() is called.
await tw.play();
console.log("Status:", tw.getState().status); // "cancelled"`,
  },
  {
    id: "conditional-branch",
    title: "Conditional Branch",
    description: "Timelines are plain code: build a different ending depending on your data before playing.",
    category: "callbacks",
    expected: "Hello, Ada Lovelace!\nWhat a long name.",
    code: `const name = "Ada Lovelace"; // try a short name such as "Ada"

const tw = createTypewriter({ renderer });

tw.timeline.type(\`Hello, \${name}!\`, { by: "char", interval: 70 }).wait(300);

if (name.length > 4) {
  tw.timeline.type("\\nWhat a long name.", { by: "char", interval: 60 });
}
else {
  tw.timeline.type("\\nShort and sweet.", { by: "char", interval: 60 });
}

tw.timeline.call(({ state }) => {
  console.log("Final text:", state.document.text);
});

await tw.play();`,
  },
  {
    id: "cancel-after-delay",
    title: "Auto-Cancel After Delay",
    description: "Cancel a slow-typing animation from outside after a fixed time - like a timeout guard.",
    category: "callbacks",
    expected: "This ",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type(
    "This very long sentence types one character at a time at a deliberately slow pace to demonstrate the cancel feature.",
    { by: "char", interval: 120 },
  );

// Cancel after 600 ms - whatever was typed stays on screen.
setTimeout(() => {
  if (tw.getState().status === EPlaybackStatus.PLAYING) {
    tw.cancel();
  }
}, 600);

await tw.play();

const { status } = tw.getState();
console.log("Final status:", status);`,
  },
  {
    id: "audio-default",
    title: "Enable Typing Sounds",
    description: "Audio is off by default. Pass audio: { enabled: true } to opt in. Each keystroke plays a keyboard click from the built-in sfx pack.",
    category: "audio",
    expected: "Typing sounds are on.",
    code: `// Audio is off by default. Pass audio: { enabled: true } (or any audio options) to opt in.
// Without custom sfxs the built-in pack is used: typing clicks naturally, deleting
// sounds lower and moving the cursor is a light tick. In your own project the pack is
// available from "eo-typewriterjs/audio-pack".
const tw = createTypewriter({ renderer, audio: { enabled: true } });

tw.timeline
  .type("Typing sounds are enabled!", { by: "char", interval: 80 })
  .wait(400)
  .move(-9, { interval: 60 })
  .move("end")
  .delete(-1, { by: "word", interval: 200 })
  .type("on.", { by: "char", interval: 70 });

await tw.play();`,
  },
  {
    id: "audio-extend-builtin",
    title: "Extend Built-in SFX Pack",
    description: "Spread DEFAULT_SFX_PACK into your own pack, add an entry, and point a channel at it.",
    category: "audio",
    expected: "Built-in clicks while deleting.",
    code: `// DEFAULT_SFX_PACK is a sandbox global. In your project:
//   import { DEFAULT_SFX_PACK } from "eo-typewriterjs/audio-pack";
//
// Spread it to keep the built-in sounds and add your own entries.
// Here the new "thud" entry reuses one built-in sample, pitched way down.
const tw = createTypewriter({
  renderer,
  audio: {
    sfxs: {
      ...DEFAULT_SFX_PACK,
      thud: { samples: DEFAULT_SFX_PACK.default.samples.slice(0, 1) },
    },
    delete: { sfx: "thud", playbackRateJitter: { min: 0.5, max: 0.55 } },
  },
});

tw.timeline
  .type("Built-in clicks while typing!", { by: "char", interval: 80 })
  .wait(400)
  .delete(-7, { by: "char", interval: 90 })
  .type("deleting.", { by: "char", interval: 80 });

await tw.play();`,
  },
  {
    id: "audio-disabled",
    title: "Audio Off (Default)",
    description: "Audio is disabled by default. Omitting the audio field is the same as passing audio: { enabled: false }.",
    category: "audio",
    expected: "Silent mode - no sounds.\nCall tw.setAudioEnabled(true) to turn on.",
    code: `// No audio field → no sounds. This is the default behaviour.
// Both lines below create a silent typewriter:
//   createTypewriter({ renderer })
//   createTypewriter({ renderer, audio: { enabled: false } })
const tw = createTypewriter({ renderer });

tw.timeline
  .type("Silent mode - no sounds.", { by: "char", interval: 70 })
  .wait(400)
  .type("\\nCall tw.setAudioEnabled(true) to turn on.", { by: "char", interval: 60 });

await tw.play();`,
  },
  {
    id: "audio-mute-command",
    title: "Silence a Specific Command",
    description: "Enable audio globally, then set audio: false on individual .type() or .delete() commands to silence just those steps.",
    category: "audio",
    expected: "Loud silent done.",
    code: `// Audio is enabled globally. The second .type() and the .delete() are silenced.
// The first and last .type() commands still play sounds.
const tw = createTypewriter({ renderer, audio: { enabled: true } });

tw.timeline
  .type("Loud ", { by: "char", interval: 70 })
  .type("silent ", { by: "char", interval:120 , audio: false })
  .type("loud again!", { by: "char", interval: 70 })
  .wait(500)
  .delete(-11, { by: "char", interval: 50, audio: false })
  .type("done.", { by: "char", interval: 70 });

await tw.play();`,
  },
  {
    id: "audio-volume-command",
    title: "Per-Command Volume",
    description: "Pass audio: { volume } on individual commands to control loudness per keystroke.",
    category: "audio",
    expected: "Full volume: LOUD!\nSoft: quiet...\nBack to normal!",
    code: `const tw = createTypewriter({ renderer, audio: { enabled: true, volume: 1 } });

// The second block types at 20% of the master volume - noticeably softer.
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
    description: "Choose how the next sample is picked: shuffle-bag (default), round-robin, or random without immediate repeats.",
    category: "audio",
    expected: "Random sampling, never the same click twice in a row.",
    code: `const tw = createTypewriter({
  renderer,
  audio: {
    typing: {
      // "random" picks any sample; avoidImmediateRepeat stops the same one playing twice in a row.
      strategy: EAudioStrategy.RANDOM,
      avoidImmediateRepeat: true,
    },
  },
});

tw.timeline
  .type("Random sampling, never the same click twice in a row.", { by: "char", interval: 75 });

await tw.play();`,
  },
  {
    id: "audio-jitter",
    title: "Pitch & Volume Jitter",
    description: "Add playbackRateJitter and volumeJitter to each channel for natural, human-feeling variation.",
    category: "audio",
    expected: "Natural-feeling keystrokes with variance!",
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
  .delete(-7, { by: "char", interval: 60 })
  .type("variance!", { by: "char", interval: 75 });

await tw.play();`,
  },
  {
    id: "audio-custom-sfxs",
    title: "Custom Sfx Pack",
    description: "Bring your own samples: here two short tones are generated as WAV data URLs and used as a custom pack.",
    category: "audio",
    expected: "Beep boop: low delete.",
    code: `// Build a short decaying tone as a WAV data URL. Real projects would use audio files.
function tone(frequency) {
  const rate = 22050;
  const length = Math.floor(rate * 0.05);
  const view = new DataView(new ArrayBuffer(44 + length * 2));
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

  text(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * 2, true);

  for (let i = 0; i < length; i++) {
    const fade = 1 - i / length;
    view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * frequency * i / rate) * fade * 12000, true);
  }

  let binary = "";
  new Uint8Array(view.buffer).forEach(byte => binary += String.fromCharCode(byte));

  return \`data:audio/wav;base64,\${btoa(binary)}\`;
}

const tw = createTypewriter({
  renderer,
  audio: {
    sfxs: {
      high: { samples: [tone(880), tone(988)] },
      low: { samples: [tone(220)] },
    },
    typing: { sfx: "high", strategy: EAudioStrategy.ROUND_ROBIN },
    delete: { sfx: "low" },
  },
});

tw.timeline
  .type("Beep boop: ", { by: "char", interval: 80 })
  .type("custom tones!", { by: "char", interval: 90 })
  .wait(400)
  .delete(-13, { by: "char", interval: 60 })
  .type("low delete.", { by: "char", interval: 80 });

await tw.play();`,
  },
  {
    id: "audio-runtime-control",
    title: "Runtime Audio Control",
    description: "Change the volume, mute and unmute, and swap the whole audio config while the animation plays.",
    category: "audio",
    expected: "Full volume...\nSoft now...\nSilent.\nBack, and higher!",
    code: `const tw = createTypewriter({ renderer, audio: { enabled: true } });

tw.timeline
  .type("Full volume...", { by: "char", interval: 70 })
  .call(() => tw.setAudioVolume(0.3))
  .type("\\nSoft now...", { by: "char", interval: 80 })
  .call(() => tw.setAudioEnabled(false))
  .type("\\nSilent.", { by: "char", interval: 80 })
  .call(() => {
    // setAudioOptions replaces the whole configuration.
    tw.setAudioOptions({ enabled: true, volume: 1, typing: { playbackRateJitter: { min: 1.5, max: 1.6 } } });
  })
  .wait(300)
  .type("\\nBack, and higher!", { by: "char", interval: 70 });

await tw.play();`,
  },
];
