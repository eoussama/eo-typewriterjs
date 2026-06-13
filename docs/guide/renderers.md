# Renderers

A **renderer** is the bridge between the typewriter state and your output target. It implements the [`IRenderer`](/api/interfaces/IRenderer) interface.

## Built-in renderers

### `domRenderer` — browser DOM

The most common renderer for web applications. It writes the current text directly into a DOM element's `textContent`.

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline.type("Hello, DOM!");
await tw.play();
```

`domRenderer(element)` returns a [`DomRenderer`](/api/classes/DomRenderer) instance that:
- On `mount` — clears the element and sets `textContent` to the initial empty state
- On `render` — updates `textContent` with the current accumulated text
- On `unmount` — no-op (leaves the final text in place)

### `stringRenderer` — Node.js / testing

For server-side rendering, testing, or any context without a DOM. Accepts a callback that receives the current text on every update.

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";

const frames: string[] = [];

const tw = createTypewriter({
  renderer: stringRenderer(text => {
    frames.push(text);
  }),
});

tw.timeline.type("Hi");
await tw.play();

console.log(frames); // ["H", "Hi"]
```

`stringRenderer(callback)` returns a [`StringRenderer`](/api/classes/StringRenderer) instance. The callback is invoked on every `render` call with the accumulated plain text.

---

## Custom renderer

Implement [`IRenderer`](/api/interfaces/IRenderer) to write to any output target:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";

class ConsoleRenderer implements IRenderer {
  mount(_state: TTypewriterState): void {
    process.stdout.write("\x1Bc"); // clear terminal
  }

  render(state: TTypewriterState): void {
    process.stdout.write(`\r${state.document.text}`);
  }

  unmount(): void {
    process.stdout.write("\n");
  }
}

const tw = createTypewriter({ renderer: new ConsoleRenderer() });
tw.timeline.type("Hello, terminal!");
await tw.play();
```

### Lifecycle

| Method | When called | Typical use |
|---|---|---|
| `mount(state)` | Once, before the first event | Prepare the output target |
| `render(state)` | After every event | Write the updated text |
| `unmount()` | Once, after the last event | Tear down / flush |

---

## Reading state

Both `mount` and `render` receive the full `TTypewriterState`. You can use it for more advanced rendering:

```ts
render(state: TTypewriterState): void {
  const text = state.document.characters
    .map(c => c.value)
    .join("");

  this.outputEl.textContent = text;
}
```

See [`TTypewriterState`](/api/type-aliases/TTypewriterState) and [`TRichTextDocument`](/api/type-aliases/TRichTextDocument) in the API reference for the full shape.
