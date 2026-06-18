# Getting Started

## Installation

```bash
pnpm add eo-typewriterjs
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

const renderer = stringRenderer();

const tw = createTypewriter({ renderer });

tw.timeline.type("Hello, World!");

await tw.play();

console.log(renderer.toString()); // "Hello, World!"
```

## Basic options

Control how text is typed with the `by` and `interval` options:

```ts
// Type word by word, 200 ms between each word
tw.timeline.type("The quick brown fox", {
  by: "word",
  interval: 200,
});

// Type 2 characters at a time, 50 ms apart
tw.timeline.type("Fast typing!", {
  by: { unit: "char", amount: 2 },
  interval: 50,
});
```

The default interval is **50 ms** per step when `interval` is not specified.

## Chaining commands

All timeline methods return `this`, so calls chain fluently:

```ts
tw.timeline
  .type("Line one.\n", { interval: 80 })
  .type("Line two.", { interval: 80 });

await tw.play(); // plays both in sequence
```

## Playback controls

`tw.play()` returns a `Promise<void>` that resolves when all events finish. The same instance also exposes pause, stop, and replay:

```ts
await tw.play();    // start — resolves on completion
tw.pause();         // pause at the current position
tw.stop();          // stop and reset to blank
await tw.replay();  // restart from the beginning
tw.cancel();        // stop and keep current output on screen
```

## Inline callbacks

Use `.call()` to run code at any point in the animation:

```ts
tw.timeline
  .type("Building...", { by: "char", interval: 60 })
  .call(async ({ state }) => {
    console.log("text so far:", state.document.text);
    await doSomeWork();
  })
  .type(" Done!", { by: "char", interval: 60 });

await tw.play();
```

Async callbacks suspend playback until the returned promise settles.

## Audio

Typing sounds are off by default. Pass `audio: { enabled: true }` to turn them on:

```ts
const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: { enabled: true },
});
```

## Next steps

- Read the [Core Concepts](./core-concepts) page to understand the pipeline, state shape, and runtime controls.
- See the available [Renderers](./renderers) for DOM, string, and custom output targets.
- Explore the [Timeline & Commands](./timeline) page for all commands and advance modes.
- Browse the [Commands overview](./commands/) for per-command option references, including [call](./commands/call), hooks, and audio overrides.
- Try the interactive **[Sandbox](/sandbox)** to experiment in real time.
