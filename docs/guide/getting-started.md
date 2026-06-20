# Getting Started

::: warning Legacy versions
Any release prior to **6.0.0** is considered legacy and is **not compatible** with version 6 or later. This documentation covers version **6.0.0 and above** only. If you are on an older version, refer to the archived release notes for that version.
:::

## Installation

```bash
pnpm add eo-typewriterjs
```

## Quick start

### In the browser (DOM renderer)

The DOM renderer writes directly into a target element. Each render call updates the element's `innerHTML`, so the output reacts to every step of the animation in real time.

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

The string renderer accumulates output in memory instead of touching the DOM. Call `renderer.toString()` after playback to read the final text. This makes it usable in server-side rendering, test environments, and anywhere the browser `document` API is not available.

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

> **Note:** The `\n` character is typed into the document as a literal newline. For it to render as a visible line break in the browser, the output element must preserve whitespace, for example by using a `<pre>` tag or adding `white-space: pre` via CSS.

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

You can adjust or toggle audio at any point during playback. Changes take effect immediately on the next sound event:

```ts
// Lower the volume mid-animation
tw.audio.setVolume(0.3);

// Mute audio entirely without stopping playback
tw.audio.setEnabled(false);

// Unmute and restore volume
tw.audio.setEnabled(true);
tw.audio.setVolume(1);
```

## Next steps

- Read the [Core Concepts](./core-concepts) page to understand the document model, state shape, and how the pipeline works.
- See the [Renderers](./renderers) guide for DOM, string, and custom renderer targets.
- Explore the [Timeline](./timeline) page for all available commands and advance modes.
- Browse the [Commands reference](./commands/) for per-command options, including [type](./commands/type), [delete](./commands/delete), [wait](./commands/wait), [move](./commands/move), [select](./commands/select), [style](./commands/style), and [call](./commands/call).
- Try the interactive **[Sandbox](https://eoussama.github.io/eo-typewriterjs/sandbox/)** to experiment with timelines in real time without any setup.
