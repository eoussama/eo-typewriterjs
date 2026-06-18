# Getting Started

## Installation

```bash
# pnpm (recommended)
pnpm add eo-typewriterjs

# npm
npm install eo-typewriterjs

# yarn
yarn add eo-typewriterjs
```

## Quick start

### In the browser (DOM renderer)

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline.type("Hello, World!");

await tw.play();
```

### Node.js / server (string renderer)

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";



let result = "";

const tw = createTypewriter({
  renderer: stringRenderer((text) => {
    result = text;
  }),
});

tw.timeline.type("Hello, World!");

await tw.play();

console.log(result); // "Hello, World!"
```

## Basic options

Control how text is typed with the `by` and `interval` options:

```ts
// Type word by word, 200 ms between each word
tw.timeline.type("The quick brown fox", {
  by: "word",
  interval: 200,
});

// Type 2 characters at a time
tw.timeline.type("Fast typing!", {
  by: { unit: "char", amount: 2 },
  interval: 50,
});
```

## Chaining commands

Call `.type()` multiple times to queue sequential animations:

```ts
tw.timeline
  .type("Line one.\n", { interval: 80 })
  .type("Line two.", { interval: 80 });

await tw.play(); // plays both in sequence
```

## Next steps

- Read the [Core Concepts](./core-concepts) page to understand how the library works internally.
- See the available [Renderers](./renderers) for DOM, string, and custom output targets.
- Explore the [Timeline & Commands](./timeline) page for all advance modes.
- Try the interactive **[Sandbox](/sandbox)** to experiment in real time.
