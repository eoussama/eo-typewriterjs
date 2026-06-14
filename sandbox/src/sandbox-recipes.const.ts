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
    id: "fast-slow",
    title: "Fast → Slow",
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
    id: "mark-highlight",
    title: "Mark / Highlight",
    description: "Apply a style mark to a range of text.",
    category: "styling",
    difficulty: "intermediate",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Highlight this text!", { by: "char", interval: 70 })
  .wait(400)
  .mark("tw-highlight", { from: 0, to: 9 })
  .wait(800);

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
  .type("EO TypewriterJS", { by: "char", interval: 60 })
  .wait(500)
  .delete(2, { by: "word", interval: 80 })
  .wait(300)
  .type(" Sandbox 🎉", { by: "char", interval: 80 })
  .wait(400)
  .type("\\n— write, compile, play.", { by: "char", interval: 55 });

await tw.play();`,
  },

  {
    id: "rate-control",
    title: "Rate Control",
    description: "Change playback rate dynamically during play.",
    category: "advanced",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Normal speed... ", { by: "char", interval: 80 });

// Set a faster rate before playing
tw.setRate(2.5);

await tw.play();`,
  },

  {
    id: "loop-demo",
    title: "Loop Demo",
    description: "Loop an animation indefinitely until stopped.",
    category: "advanced",
    difficulty: "advanced",
    code: `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Looping forever!", { by: "char", interval: 70 })
  .wait(600)
  .delete(16, { by: "char", interval: 40 })
  .wait(300);

// Fire-and-forget infinite loop — use Stop to end it
void (async () => {
  await tw.play();
  while (tw.getState().status !== EPlaybackStatus.STOPPED) {
    await tw.replay();
  }
})();`,
  },
] as const;
