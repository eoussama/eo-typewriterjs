# Renderers

A **renderer** is the bridge between the typewriter state and your output target. It implements the [`IRenderer`](/api/interfaces/IRenderer) interface.

## Built-in renderers

### `domRenderer` — browser DOM

The most common renderer for web applications. It writes the current document text into a DOM element and renders the cursor inline at the correct character position.

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";

const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline.type("Hello, DOM!");
await tw.play();
```

`domRenderer(element)` returns a [`DomRenderer`](/api/classes/DomRenderer) instance.

#### How the cursor is rendered

On every render call, `DomRenderer` splits the document text at the active cursor index (`state.cursors.main.index`) and injects three inline nodes into the target element:

```html
<!-- example state: text = "Hello world", cursor.index = 5 -->
Hello
<span class="typewriter-cursor" aria-hidden="true"></span>
 world
```

This means the cursor always appears at the **correct visual position** in the text, including mid-word and after `moveCursor()` repositioning.

#### Cursor styling

Add the `.typewriter-cursor` class to your CSS to style the blinking cursor:

```css
.typewriter-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  border-radius: 1px;
  vertical-align: text-bottom;
  animation: blink 1.1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

#### Lifecycle

| Method | When called | Behaviour |
|---|---|---|
| `mount(state)` | Once, before the first event | Paints initial state (empty text + cursor) into the element |
| `render(state)` | After every event | Repaints text and cursor at the new position |
| `unmount()` | Once, after the last event | Releases the element reference (final content stays in place) |

---

### `stringRenderer` — Node.js / testing

For server-side rendering, testing, or any context without a DOM. Accepts an optional callback that receives the current plain text on every update, and exposes a `.toString()` method.

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

`stringRenderer(callback?)` returns a [`StringRenderer`](/api/classes/StringRenderer) instance.

The callback is optional — you can omit it and read the final value via `.toString()`:

```ts
const renderer = stringRenderer();
const tw = createTypewriter({ renderer });

tw.timeline.type("Hello world");
await tw.play();

console.log(renderer.toString()); // "Hello world"
```

> `StringRenderer` outputs plain text only. It does not include any cursor marker.

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

Both `mount` and `render` receive the full `TTypewriterState`. You can use it for advanced rendering:

```ts
render(state: TTypewriterState): void {
  const { text } = state.document;
  const cursorIndex = state.cursors["main"]?.index ?? text.length;

  // render text before cursor, the cursor itself, and text after
  this.outputEl.textContent = text.slice(0, cursorIndex) + "|" + text.slice(cursorIndex);
}
```

See [`TTypewriterState`](/api/type-aliases/TTypewriterState), [`TRichTextDocument`](/api/type-aliases/TRichTextDocument), and [`TCursorState`](/api/type-aliases/TCursorState) in the API reference for the full shape.
