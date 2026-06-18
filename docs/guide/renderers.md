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

#### How the DOM is rendered

On every render call, `DomRenderer` segments the document by its style marks and then further splits each segment at every cursor and selection boundary. The result is a mix of plain text nodes, styled `<span>` elements, and cursor markers — all appended to a `DocumentFragment` before replacing the target's `innerHTML`.

```html
<!-- example: text = "Hello world", style on "world" (class "highlight"), cursor at 5 -->
Hello
<span class="typewriter-cursor" aria-hidden="true" data-cursor-id="main"></span>
<span class="highlight"> world</span>
```

#### Style marks → DOM

When a `TStyleObject` is applied to a segment, the renderer maps its fields onto the `<span>`:

| `TStyleObject` field | DOM effect |
|---|---|
| `className` | `classList.add(...)` (space-separated classes) |
| `css` | `el.style[prop] = value` (inline styles) |
| `attrs` | `el.setAttribute(key, value)` (HTML attributes) |
| `ansi` | Ignored by `DomRenderer` (terminal-only) |
| `meta` | Ignored by `DomRenderer` |

Multiple marks can overlap. Their styles are **merged** — later marks in document order win on conflicting keys.

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

#### Selection styling

Selected text is wrapped in a `<span class="typewriter-selection">`. Style it to match your theme:

```css
.typewriter-selection {
  background: rgba(59, 130, 246, 0.35);
  border-radius: 2px;
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

For server-side rendering, testing, or any context without a DOM. Stores the latest state in memory. Exposes two read methods:

- **`.toString()`** — returns the plain document text, marks ignored.
- **`.toAnsiString()`** — returns the document text with ANSI escape codes applied from marks that carry an `ansi` map.

```ts
import { createTypewriter, stringRenderer } from "eo-typewriterjs";



const renderer = stringRenderer();
const tw = createTypewriter({ renderer });

tw.timeline.type("Hello world");
await tw.play();

console.log(renderer.toString()); // "Hello world"
```

`stringRenderer()` returns a [`StringRenderer`](/api/classes/StringRenderer) instance.

#### ANSI output

Use the `ansi` field in a `TStyleObject` to provide ANSI code segments. The renderer joins all code values with `;` and wraps the segment in `\x1B[<codes>m...\x1B[0m`:

```ts
const renderer = stringRenderer();
const tw = createTypewriter({ renderer });

tw.timeline
  .type("ERROR: disk full", { by: "char", interval: 20 })
  .style({ ansi: { fg: "31", bold: "1" } }, { from: 0, to: 5 });

await tw.play();

// plain text:
console.log(renderer.toString()); // "ERROR: disk full"

// with ANSI codes (red + bold on "ERROR"):
console.log(renderer.toAnsiString()); // "\x1B[31;1mERROR\x1B[0m: disk full"
```

If no marks carry an `ansi` map, `toAnsiString()` falls back to the same value as `toString()`.

> `StringRenderer` does not include any cursor marker in either output method.

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

### Working with marks directly

Style marks live on `state.document.marks`. Use the exported `segmentRichText()` helper to split the document into styled segments:

```ts
import { segmentRichText, mergeStyles } from "eo-typewriterjs";

render(state: TTypewriterState): void {
  const segments = segmentRichText(state.document);

  for (const segment of segments) {
    if (segment.styles.length > 0) {
      const merged = mergeStyles(segment.styles);
      // apply merged.className, merged.css, etc. to your output
    }
    else {
      // plain text, no style
    }
  }
}
```

See [`TTypewriterState`](/api/type-aliases/TTypewriterState), [`TRichTextDocument`](/api/type-aliases/TRichTextDocument), [`TCursorState`](/api/type-aliases/TCursorState), [`TTextMark`](/api/type-aliases/TTextMark), [`TStyleObject`](/api/type-aliases/TStyleObject), and [`TRichTextSegment`](/api/type-aliases/TRichTextSegment) in the API reference for the full shape.
