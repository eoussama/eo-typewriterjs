# Recipes

Common patterns and real-world usage examples.

---

## Looping animation

Replay the same animation indefinitely by calling `play()` in a loop:

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;
const tw = createTypewriter({ renderer: domRenderer(el) });

tw.timeline.type("Hello, World!", { by: "char", interval: 80 });

async function loop() {
  while (true) {
    el.textContent = "";
    await tw.play();
    await new Promise(r => setTimeout(r, 1500)); // pause before repeat
  }
}

loop();
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

Use `stringRenderer` to capture every intermediate state:

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";

const frames: string[] = [];

const tw = createTypewriter({
  renderer: stringRenderer(text => frames.push(text)),
});

tw.timeline.type("Hi!", { by: "char", interval: 0 });
await tw.play();

console.log(frames); // ["H", "Hi", "Hi!"]
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
  let result = "";

  const tw = createTypewriter({
    renderer: stringRenderer(t => { result = t; }),
  });

  tw.timeline.type(text, { by: "custom", interval: 0 }); // instant
  await tw.play();

  return result;
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
    const text = state.document.characters.map(c => c.value).join("");
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillText(text, 20, 40);
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
