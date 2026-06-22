# Migration Guide

::: warning Version 6 is a full rewrite
Version **6.0.0** is not backward-compatible with any prior release. The API surface, concepts, and package structure are entirely new. There is no incremental upgrade path; adopt v6 as a fresh integration.
:::

## What changed

### Architecture

Versions before 6 mutated a DOM element's `innerHTML` directly in a recursive `setTimeout` loop. Version 6 introduces a structured pipeline:

- A **declarative timeline builder** replaces imperative method calls.
- A **compiler** converts commands into timestamped events.
- A **reducer** applies events to an immutable state object.
- A **renderer interface** decouples state from output.

The result is that the same animation can target a DOM element, a string buffer, a canvas, or a terminal without changing any timeline code.

### Package name

The package name is unchanged: `eo-typewriterjs`. Update to `^6.0.0` in your `package.json`.

```bash
pnpm add eo-typewriterjs@^6.0.0
```

### Entry point

Version 6 is an ES module with named exports. There is no default export.

```ts
// v6
import { createTypewriter, domRenderer, stringRenderer } from "eo-typewriterjs";
```

### Creating a typewriter instance

In v5, `Typewriter` was a class constructor that accepted a CSS selector string and an options object:

```js
// v5
var tw = new Typewriter("#target");
var tw = new Typewriter("#target", { tick: 100, delay: 500 });
```

In v6, use the `createTypewriter` factory and pass a renderer that holds the output target:

```ts
// v6
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });
```

### Defining and starting animations

In v5, each method call started executing immediately (after its `delay` option) and returned a Promise. Sequencing required `.then()` chaining or `await`:

```js
// v5: promise chaining
var tw = new Typewriter("#target", { tick: 100 });
tw.type("Hello").then(() => tw.delete(5)).then(() => tw.type("World!"));

// v5: async/await
await tw.type("Hello");
await tw.delete(5);
await tw.type("World!");
```

In v6, all commands are registered on `tw.timeline` first and then executed together when you call `tw.play()`:

```ts
// v6
tw.timeline
  .type("Hello", { by: "char", interval: 100 })
  .delete(-5, { by: "char", interval: 100 })
  .type("World!", { by: "char", interval: 100 });

await tw.play();
```

### Typing text

```js
// v5
await tw.type("Hello, World!");

// v5 with options
await tw.type("Hello", { tick: 80, delay: 200 });
```

```ts
// v6
tw.timeline.type("Hello, World!");

// v6 with options
tw.timeline.type("Hello", { by: "char", interval: 80 });
```

The v5 `tick` option (ms per character) maps directly to v6's `interval` option.

### Deleting text

In v5, `.delete(chars)` always deleted backward (toward the start) one character at a time:

```js
// v5: delete 5 characters backward
await tw.delete(5);

// v5: delete 1 character (default)
await tw.delete();
```

In v5, `.clear()` removed all text instantly (without a character-by-character animation):

```js
// v5: clear all text instantly
await tw.clear();
```

```ts
// v6: delete 5 characters to the left of the cursor
tw.timeline.delete(-5);

// v6: delete 5 characters to the right
tw.timeline.delete(5);

// v6: delete entire document (animated, one step)
tw.timeline.delete("whole");
```

Note the sign convention change: v6 uses negative numbers for leftward deletion (backspace direction) and positive for rightward (forward delete direction).

### Stopping and resuming

In v5, `.stop()` paused the current operation and `.resume()` restarted it from where it stopped:

```js
// v5
await tw.type("Long text...");
await tw.stop({ delay: 1000 });
await tw.resume({ delay: 500 });
```

In v6, the equivalents are `.pause()` and `.play()`:

```ts
// v6
tw.timeline.type("Long text...", { by: "char", interval: 60 });

await tw.play();
tw.pause();   // pause at current position
await tw.play(); // resume from where it stopped
```

### Moving the cursor

In v5, `.move(index)` took an **absolute** zero-based index and was synchronous:

```js
// v5: move cursor to position 3 (absolute index)
tw.move(3);
```

In v6, `.move()` takes a **relative** offset or a string boundary and is a timeline command:

```ts
// v6: move left 3 units
tw.timeline.move(-3);

// v6: move to the start of the document
tw.timeline.move("start");

// v6: move to the end of the document
tw.timeline.move("end");
```

### Pausing between steps

In v5, delays were per-method options (`delay` field):

```js
// v5: start typing after 500 ms
await tw.type("Hello", { delay: 500 });
```

In v6, use `.wait()` to insert an explicit pause between commands:

```ts
// v6: pause 500 ms before typing
tw.timeline
  .wait(500)
  .type("Hello", { by: "char", interval: 80 });
```

### Running code mid-animation

v5 had no built-in way to interleave arbitrary logic inside an animation sequence. You would chain promises externally:

```js
// v5: run code between two operations
await tw.type("Checking...");
await doSomething();
await tw.type("Done!");
```

In v6, use `.call()` to schedule a callback at a specific point in the timeline:

```ts
// v6
tw.timeline
  .type("Checking...", { by: "char", interval: 60 })
  .call(async () => {
    await doSomething();
  })
  .type("Done!", { by: "char", interval: 60 });

await tw.play();
```

### Speed and timing options

In v5, `tick` controlled the ms-per-character speed in the constructor options and could be overridden per-method:

```js
// v5
var tw = new Typewriter("#target", { tick: 200 });
await tw.type("Slow text");
await tw.type("Fast text", { tick: 50 });
```

In v6, use `interval` per command or `setRate()` to scale all timings globally:

```ts
// v6: per-command interval
tw.timeline.type("Slow text", { interval: 200 });
tw.timeline.type("Fast text", { interval: 50 });

// v6: scale all timings with a multiplier
tw.setRate(2); // double speed
tw.setRate(1); // restore normal speed
```

### Cursor configuration

In v5, cursor options were in the constructor config. The cursor `type` was a CSS class name suffix (`"stick"` → `eo-typewriter__cursor--stick`, `"underscore"` → `eo-typewriter__cursor--underscore`):

```js
// v5
var tw = new Typewriter("#target", {
  cursor: {
    type: "stick",
    blink: true,
    index: 0
  }
});
```

In v6, cursor configuration uses `ECursorKind` constants:

```ts
// v6
import { createTypewriter, domRenderer, ECursorKind } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: {
    kind: ECursorKind.PIPE,     // replaces cursor.type = "stick"
    animation: "blink",          // replaces cursor.blink = true
  },
});
```

### Sound / audio

In v5, audio was configured in the constructor:

```js
// v5
var tw = new Typewriter("#target", {
  sound: {
    enabled: true,
    volume: 0.5
  }
});
```

In v6, the audio option has more control, including per-command overrides and playback strategies:

```ts
// v6
import { createTypewriter, domRenderer, EAudioStrategy } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    enabled: true,
    volume: 0.5,
  },
});
```

### Looping

v5 had no built-in loop option. You would chain recursive promise calls manually. v6 is the same, loop control is explicit:

```ts
// v6 looping
await tw.play();
while (true) {
  await tw.replay();
}
```

### HTML output

v5 rendered its own `innerHTML` structure using `<span>` elements per character. Typed text was plain text; there was no rich-text style system.

v6 also works with plain text and provides a separate `.style()` API for adding CSS classes or inline styles to ranges:

```ts
// v6: apply a CSS class to a range of text
tw.timeline
  .type("Important")
  .style("bold", { from: 0, to: 9 });
```

```css
.bold { font-weight: bold; }
```

## Quick migration checklist

- [ ] Replace `new Typewriter(selector, opts)` with `createTypewriter({ renderer: domRenderer(el) })`.
- [ ] Move all method calls to `tw.timeline.*` before calling `tw.play()`.
- [ ] Replace `await tw.type("text")` with `tw.timeline.type("text")` + `await tw.play()`.
- [ ] Replace `tw.delete(n)` with `tw.timeline.delete(-n)` (add the negative sign).
- [ ] Replace `tw.clear()` with `tw.timeline.delete("whole")`.
- [ ] Replace `{ tick: n }` with `{ interval: n }` on each command.
- [ ] Replace `{ delay: n }` before a command with `.wait(n)` on the timeline.
- [ ] Replace `tw.stop()` / `tw.resume()` with `tw.pause()` / `tw.play()`.
- [ ] Replace `tw.move(absoluteIndex)` with `tw.timeline.move(relativeOffset)` or `tw.timeline.move("start"/"end")`.
- [ ] Replace `cursor.type = "stick"` with `cursor: { kind: ECursorKind.PIPE }`.
- [ ] Replace `cursor.blink = true/false` with `cursor: { animation: "blink"/"none" }`.
- [ ] Replace `sound.enabled/volume` with `audio: { enabled, volume }`.
- [ ] Add interleaved logic using `tw.timeline.call(fn)` instead of promise chains.

## Staying on v5

If you cannot migrate immediately, keep the specific version pinned:

```bash
pnpm add eo-typewriterjs@5
```

v5 is no longer maintained. Security fixes and new features are only available on v6.
