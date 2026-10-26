<script setup>
const domQuickStartCode = `const tw = createTypewriter({ renderer });
tw.timeline.type("Hello, World!");
await tw.play();`;

const stringQuickStartCode = `const strRenderer = stringRenderer();
const tw = createTypewriter({ renderer: strRenderer });
tw.timeline.type("Hello, World!");
await tw.play();
console.log(strRenderer.toString());`;
</script>

# Getting Started

::: warning Legacy versions
Any release prior to **6.0.0** is considered legacy and is **not compatible** with version 6 or later. This documentation covers version **6.0.0 and above** only. If you are on an older version, refer to the archived release notes for that version.
:::

## Installation

The package is published to both the **npm registry** and the **GitHub Packages registry**.

```bash
pnpm add eo-typewriterjs
```

To install from the GitHub Packages registry instead, scope the registry in your `.npmrc`:

```ini
@eoussama:registry=https://npm.pkg.github.com
```

Then install as usual:

```bash
pnpm add @eoussama/eo-typewriterjs
```

### Without a bundler

Browser bundles are included for a plain `<script>` tag. The IIFE build exposes everything on the `EOTypewriterJS` global:

```html
<div id="output"></div>
<script src="https://cdn.jsdelivr.net/npm/eo-typewriterjs@6/dist/index.iife.js"></script>
<script>
  const { createTypewriter, domRenderer } = EOTypewriterJS;
  const tw = createTypewriter({ renderer: domRenderer("#output") });

  tw.timeline.type("Hello from a script tag!");
  tw.play();
</script>
```

A minified ES module (`dist/index.browser.mjs`) and a UMD build (`dist/index.umd.js`) are available as well.

The package targets ES2022 and needs Node.js 24 or later on the server.

## Quick start

### In the browser (DOM renderer)

The DOM renderer writes directly into a target element, given as an element or a CSS selector. Each render rebuilds the element's content, so the output follows every step of the animation in real time. A selector that matches nothing throws a clear error when playback starts.

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline.type("Hello, World!");

await tw.play();
```

<DocsPlayground :code="domQuickStartCode" />

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

<DocsPlayground :code="stringQuickStartCode" :show-preview="false" />

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

`tw.play()` returns a `Promise<void>` that resolves when playback completes, or when it is paused, stopped or cancelled. It rejects when a hook, a `call()` callback or the renderer throws; playback is then cancelled. Calling `play()` while already playing returns the same promise.

```ts
const playing = tw.play(); // start without waiting

tw.pause();                // pause on exactly what is on screen
tw.play();                 // resume: hooks, callbacks and sounds keep firing
tw.seek(1200);             // jump to 1.2 s into the timeline
tw.setRate(2);             // play at double speed
tw.cancel();               // stop and keep the current output on screen
tw.stop();                 // stop and reset to the initial state
await tw.replay();         // restart from the beginning
```

When the typewriter is no longer needed, for example when its element is removed, call `tw.destroy()` to stop playback and unmount the renderer.

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

Typing, deleting and moving the cursor each have their own sound: typing clicks naturally, deleting sounds lower and heavier, and moving is a light, quiet tick. Other commands are silent unless you give them an `audio` override.

When no custom `sfxs` are provided, the library uses a built-in pack of keyboard-click samples. The pack lives in its own chunk and is only downloaded the first time a typewriter enables audio without custom sfxs. To reference or extend it explicitly, import it from the subpath entry:

```ts
import { DEFAULT_SFX_PACK } from "eo-typewriterjs/audio-pack";
```

You can adjust or toggle audio at any point during playback. Changes take effect immediately on the next sound event:

```ts
// Lower the volume mid-animation
tw.setAudioVolume(0.3);

// Mute audio entirely without stopping playback
tw.setAudioEnabled(false);

// Unmute and restore volume
tw.setAudioEnabled(true);
tw.setAudioVolume(1);
```

You can also replace the full audio configuration in one call. The new options replace the old ones entirely:

```ts
tw.setAudioOptions({
  enabled: true,
  volume: 0.6,
});
```

## Next steps

- Read the [Core Concepts](./core-concepts) page to understand the document model, state shape, and how the pipeline works.
- See the [Renderers](./renderers) guide for DOM, string, and custom renderer targets.
- Explore the [Timeline](./timeline) page for all available commands and advance modes.
- Browse the [Commands reference](./commands/) for per-command options, including [type](./commands/type), [delete](./commands/delete), [wait](./commands/wait), [move](./commands/move), [select](./commands/select), [style](./commands/style), and [call](./commands/call).
- Try the interactive **[Sandbox](/sandbox)** to experiment with timelines in real time without any setup.
