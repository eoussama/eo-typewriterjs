<script setup>
const rotatingPhrasesCode = `const tw = createTypewriter({ renderer });
const phrases = ["Developer", "Designer", "Problem solver"];

for (const phrase of phrases) {
  tw.timeline
    .type(phrase, { by: "char", interval: 80 })
    .wait(1000)
    .delete(-phrase.length, { by: "char", interval: 40 })
    .wait(300);
}

await tw.play();`;

const loadingIndicatorCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Connecting", { by: "char", interval: 60 })
  .type("...", { by: "char", interval: 300 });

await tw.play();`;

const graphemeSafeCode = `const tw = createTypewriter({ renderer });

tw.timeline.type("I ❤️ open source 🚀", { by: "grapheme", interval: 100 });

await tw.play();`;

const inlineCallbackCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Step 1: connecting", { by: "char", interval: 60 })
  .call(async () => {
    await new Promise(r => setTimeout(r, 600));
  })
  .type("\\nStep 2: authenticated", { by: "char", interval: 60 });

await tw.play();`;

const perStepHookCode = `const tw = createTypewriter({ renderer });
const chars = [];

tw.timeline.type("Hello", {
  by: "char",
  interval: 80,
  after: ({ state }) => {
    chars.push(state.document.text.at(-1) ?? "");
  },
});

await tw.play();
console.log(chars.join(", "));`;

const customCursorCode = `const tw = createTypewriter({
  renderer,
  cursor: { kind: ECursorKind.PIPE },
});

tw.timeline
  .call(() => tw.setCursorOptions({ kind: ECursorKind.PIPE }))
  .type("Pipe cursor", { by: "char", interval: 60 })
  .call(() => tw.setCursorOptions({ kind: ECursorKind.BLOCK }))
  .type("\\nBlock cursor", { by: "char", interval: 60 });

await tw.play();`;
</script>

# Recipes

Common patterns and real-world usage examples.

::: tip Try it interactively
More recipes are available in the **[live sandbox](https://ouss.es/eo-typewriterjs/sandbox/)**, an interactive editor where you can run, tweak, and experiment with every example in the browser.
:::

## Looping animation

Replay the same animation indefinitely using `replay()`:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Hello, World!", { by: "char", interval: 80 })
  .wait(1500)
  .delete(-13, { by: "char", interval: 40 })
  .wait(300);

await tw.play();

while (true) {
  await tw.replay();
}
```

## Rotating phrases

Build one timeline that cycles through a list of phrases. Each phrase is typed, held, then deleted before the next one begins:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });
const phrases = ["Developer", "Designer", "Problem solver"];

for (const phrase of phrases) {
  tw.timeline
    .type(phrase, { by: "char", interval: 80 })
    .wait(1500)
    .delete(-phrase.length, { by: "char", interval: 40 })
    .wait(300);
}

await tw.play();
```

To loop indefinitely, wrap in a `while (true)` and call `tw.replay()` after `tw.play()`.

<DocsPlayground :code="rotatingPhrasesCode" />

## Loading indicator

Use a short interval for a snappy loading animation:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Connecting", { by: "char", interval: 60 })
  .type("...", { by: "char", interval: 300 });

await tw.play();
```

<DocsPlayground :code="loadingIndicatorCode" />

## Collecting all rendered frames

Use a custom renderer to capture every intermediate state. This is useful for testing or generating CSS keyframes:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";
import { createTypewriter } from "eo-typewriterjs";



class FrameCapture implements IRenderer {
  readonly frames: string[] = [];

  mount(state: TTypewriterState): void {
    this.frames.push(state.document.text);
  }

  render(state: TTypewriterState): void {
    this.frames.push(state.document.text);
  }

  unmount(): void {}
}

const capture = new FrameCapture();
const tw = createTypewriter({ renderer: capture });

tw.timeline.type("Hi!", { by: "char", interval: 0 });
await tw.play();

console.log(capture.frames); // ["", "H", "Hi", "Hi!"]
```

## Grapheme-safe typing

Use `"grapheme"` to handle emoji, accented characters, and Unicode sequences correctly:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline.type("I ❤️ open source 🚀", { by: "grapheme", interval: 100 });
await tw.play();
```

`"grapheme"` steps one user-perceived character at a time regardless of how many code points the character occupies.

<DocsPlayground :code="graphemeSafeCode" />

## Server-side / Node.js rendering

Use `stringRenderer` to produce a plain-text snapshot without a DOM. Setting `by: "whole"` treats the entire input as a single step so there are no delays:

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";



async function renderFinal(text: string): Promise<string> {
  const renderer = stringRenderer();
  const tw = createTypewriter({ renderer });

  tw.timeline.type(text, { by: "whole", interval: 0 });
  await tw.play();

  return renderer.toString();
}
```

## Custom renderer: writing to a `<canvas>`

Implement `IRenderer` and pass it to `createTypewriter` like any built-in renderer:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";
import { createTypewriter } from "eo-typewriterjs";



class CanvasRenderer implements IRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.ctx.font = "24px monospace";
    this.ctx.fillStyle = "#e2e8f0";
  }

  mount(_state: TTypewriterState): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  render(state: TTypewriterState): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillText(state.document.text, 20, 40);
  }

  unmount(): void {}
}

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const tw = createTypewriter({ renderer: new CanvasRenderer(canvas) });

tw.timeline.type("Hello from canvas!", { by: "char", interval: 60 });
await tw.play();
```

## Awaiting completion before continuing

`tw.play()` returns a `Promise<void>` that resolves when all commands finish:

```ts
await tw.play();
// this line runs only after the animation finishes
doSomethingAfter();
```

## Inline callback between commands

Use `.call()` to run logic mid-animation without breaking the chain:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Step 1: connecting", { by: "char", interval: 60 })
  .call(async () => {
    await fetch("/api/ping");
  })
  .type("\nStep 2: authenticated", { by: "char", interval: 60 });

await tw.play();
```

<DocsPlayground :code="inlineCallbackCode" note="The playground uses setTimeout instead of a real fetch call to simulate async work without a network request." />

## Per-step hook

Use the `after` hook to react after each individual character is typed:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });
const chars: string[] = [];

tw.timeline.type("Hello", {
  by: "char",
  interval: 80,
  after: ({ state }) => {
    chars.push(state.document.text.at(-1) ?? "");
  },
});

await tw.play();
console.log(chars); // ["H", "e", "l", "l", "o"]
```

<DocsPlayground :code="perStepHookCode" />

## Conditional branch

Use `.call()` to capture a result mid-animation. If you need to branch based on that result, run a follow-up timeline after the first one resolves:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });
let connected = false;

tw.timeline
  .type("Checking connection", { by: "char", interval: 60 })
  .type("...", { by: "char", interval: 300 })
  .call(async () => {
    connected = await checkConnection();
  });

await tw.play();

const tw2 = createTypewriter({ renderer: domRenderer(el) });

tw2.timeline.type(
  connected ? "\nConnected!" : "\nFailed.",
  { by: "char", interval: 60 },
);

await tw2.play();
```

## Typing sounds

Enable audio and optionally supply a custom sound effects pack:

```ts
import { createTypewriter, domRenderer, EAudioStrategy } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    enabled: true,
    volume: 0.6,
    sfxs: {
      key: { samples: ["/sounds/key1.mp3", "/sounds/key2.mp3"] },
    },
    typing: { sfx: "key", strategy: EAudioStrategy.SHUFFLE_BAG },
  },
});

tw.timeline.type("Clicky keys", { by: "char", interval: 80 });
await tw.play();
```

Silence a single command while keeping audio enabled globally:

```ts
tw.timeline
  .type("Audible line", { interval: 80 })
  .type("Silent line", { interval: 80, audio: false });
```

## Custom cursor

Set the cursor kind at creation time and swap it at runtime with `.call()`:

```ts
import { createTypewriter, domRenderer, ECursorKind } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: { kind: ECursorKind.PIPE },
});

tw.timeline
  .type("Pipe cursor", { by: "char", interval: 60 })
  .call(() => tw.setCursorOptions({ kind: ECursorKind.BLOCK }))
  .type("\nBlock cursor", { by: "char", interval: 60 });

await tw.play();
```

<DocsPlayground :code="customCursorCode" />

Hide the cursor before typing and reveal it after:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;
const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: { visible: false },
});

tw.timeline
  .type("Revealed after typing", { by: "char", interval: 60 })
  .call(() => tw.setCursorVisible(true));

await tw.play();
