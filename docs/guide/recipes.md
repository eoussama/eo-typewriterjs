# Recipes

Common patterns and real-world usage examples.

---

## Looping animation

Replay the same animation indefinitely using `replay()`:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Hello, World!", { by: "char", interval: 80 })
  .wait(1500);

await tw.play();

while (true) {
  await tw.replay();
}
```

---

## Rotating phrases

Type a different phrase on each iteration:

```ts
const phrases = ["Developer", "Designer", "Problem solver"];
let index = 0;

async function typePhrases() {
  while (true) {
    const tw = createTypewriter({ renderer: domRenderer(el) });

    tw.timeline.type(phrases[index % phrases.length], { by: "char", interval: 80 });
    index++;

    await tw.play();
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

---

## Loading indicator

Use fast interval and `"char"` mode for a snappy loading animation:

```ts
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline
  .type("Connecting", { by: "char", interval: 60 })
  .type("...", { by: "char", interval: 300 });

await tw.play();
```

---

## Collecting all rendered frames

Use a custom renderer to capture every intermediate state:

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

This is useful for testing animations or generating CSS keyframes.

---

## Word-by-word with emoji

Use `"grapheme"` to handle emoji-heavy text:

```ts
tw.timeline.type("I ❤️ open source 🚀", { by: "grapheme", interval: 100 });
await tw.play();
```

---

## Server-side / Node.js rendering

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";



async function renderFinal(text: string): Promise<string> {
  const renderer = stringRenderer();

  const tw = createTypewriter({ renderer });

  tw.timeline.type(text, { by: "custom", interval: 0 }); // instant
  await tw.play();

  return renderer.toString();
}
```

Setting `by: "custom"` and `interval: 0` makes the animation complete in a single step with no delay — useful for SSR pre-render.

---

## Custom renderer: writing to a `<canvas>`

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";



class CanvasRenderer implements IRenderer {
  private ctx: CanvasRenderingContext2D;

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

  unmount(): void { /* no-op */ }
}
```

---

## Awaiting completion before continuing

`tw.play()` returns a `Promise<void>` that resolves when all events are processed:

```ts
await tw.play();
// ← this line runs only after the animation finishes
doSomethingAfter();
```

---

## Inline callback between commands

Use `.call()` to run logic mid-animation without breaking the chain:

```ts
tw.timeline
  .type("Step 1: connecting", { by: "char", interval: 60 })
  .call(async () => {
    await fetch("/api/ping");
  })
  .type("\nStep 2: authenticated", { by: "char", interval: 60 });

await tw.play();
```

---

## Per-step hook

Use the `after` hook to react after every individual character:

```ts
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

---

## Conditional branch

Use `.call()` to branch based on state:

```ts
const tw = createTypewriter({ renderer: domRenderer(el) });
let path = "";

tw.timeline
  .type("Loading", { by: "char", interval: 60 })
  .call(async ({ state }) => {
    const ok = await checkConnection();

    path = ok ? "ok" : "err";
  });

await tw.play();

const tw2 = createTypewriter({ renderer: domRenderer(el) });

if (path === "ok") {
  tw2.timeline.type(" — connected!", { by: "char", interval: 60 });
}
else {
  tw2.timeline.type(" — failed.", { by: "char", interval: 60 });
}

await tw2.play();
```

---

## Typing sounds

Enable audio and optionally supply a custom voice pack:

```ts
import { createTypewriter, domRenderer, EAudioStrategy } from "eo-typewriterjs";

const tw = createTypewriter({
  renderer: domRenderer(el),
  audio: {
    enabled: true,
    volume: 0.6,
    voices: {
      key: { samples: ["/sounds/key1.mp3", "/sounds/key2.mp3"] },
    },
    typing: { voice: "key", strategy: EAudioStrategy.SHUFFLE_BAG },
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

---

## Custom cursor

Set the cursor kind at creation time and swap it at runtime with `.call()`:

```ts
import { createTypewriter, domRenderer, ECursorKind } from "eo-typewriterjs";

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

Hide the cursor before typing and reveal it after:

```ts
const tw = createTypewriter({
  renderer: domRenderer(el),
  cursor: { visible: false },
});

tw.timeline
  .type("Revealed after typing", { by: "char", interval: 60 })
  .call(() => tw.setCursorVisible(true));

await tw.play();
```
