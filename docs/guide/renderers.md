# Renderers

A **renderer** is the bridge between the typewriter state and your output target. It implements the [`IRenderer`](/api/interfaces/IRenderer) interface.

## Built-in renderers

### `domRenderer` - browser DOM

The most common renderer for web applications. It writes the current document text into a DOM element and renders all active cursors inline at their correct character positions.

```ts
import { createTypewriter, domRenderer } from "eo-typewriterjs";



const el = document.getElementById("output")!;

const tw = createTypewriter({
  renderer: domRenderer(el),
});

tw.timeline.type("Hello, DOM!");
await tw.play();
```

`domRenderer(element)` returns a [`DomRenderer`](/api/classes/DomRenderer) instance. The target may be an `Element` reference or a CSS selector string.

#### How the DOM is rendered

On every render call, `DomRenderer` segments the document by its text styles and then splits each segment at every cursor and selection boundary. The result is a mix of plain text nodes, styled `<span>` elements, and cursor marker `<span>` elements, all assembled into a `DocumentFragment` before replacing the target's `innerHTML`.

- Text without any active style or selection is emitted as a bare text node.
- Text inside an active selection or with an active style is wrapped in a `<span>`. If both apply, a single `<span>` carries both `typewriter-selection` and the text style classes/attributes.
- Each visible cursor is rendered as `<span class="typewriter-cursor" aria-hidden="true" data-cursor-id="...">`.

```html
<!-- example: text = "Hello world", style on "world" (class "highlight"), cursor at 5 -->
Hello
<span class="typewriter-cursor" aria-hidden="true" data-cursor-id="main" data-cursor-kind="pipe" data-cursor-animation="blink">|</span>
<span class="highlight"> world</span>
```

#### Text styles to DOM

When a `TStyleObject` is applied to a segment, the renderer maps its fields onto the `<span>`:

| `TStyleObject` field | DOM effect |
|---|---|
| `className` | `classList.add(...)` (space-separated classes) |
| `css` | `el.style[prop] = value` (inline styles) |
| `attrs` | `el.setAttribute(key, value)` (HTML attributes) |
| `ansi` | Ignored by `DomRenderer` (terminal-only) |
| `meta` | Ignored by `DomRenderer` |

Multiple styles can overlap. Their properties are **merged** — later styles in document order win on conflicting keys.

#### Cursor rendering

Every visible cursor is rendered as a `<span>` with the base class `typewriter-cursor`. Additional data attributes and classes communicate cursor state to CSS:

| Attribute / class | Value |
|---|---|
| `data-cursor-id` | The cursor name (e.g. `"main"`) |
| `data-cursor-kind` | The cursor kind (e.g. `"pipe"`, `"block"`, `"underscore"`, ...etc.) |
| `data-cursor-animation` | `"blink"`, `"none"`, or `"custom"` |
| `typewriter-cursor--blink` | Added when `animation` is `"blink"` |

The renderer **automatically injects** a built-in stylesheet with the blink animation (`@keyframes tw-cursor-blink`) the first time a `DomRenderer` is created. No extra CSS is required to get a blinking cursor.

The cursor glyph defaults to `|` for the `"pipe"` kind. You can override it via the `cursor` option at creation time or at runtime with `setCursorOptions()`. Available kinds and their default glyphs:

| Kind | Default glyph |
|---|---|
| `"pipe"` | `\|` |
| `"underscore"` | `_` |
| `"block"` | `▋` |
| `"block-underscore"` | `▄` |
| `"caret"` | `^` |
| `"custom"` | _(empty, provide your own `content`)_ |

You can also pass `content: ""` for a CSS-only cursor (styled with `background`, `::before`, etc.) or provide any string to use as the glyph.

To add your own CSS on top of the built-in defaults, target the classes directly:

```css
.typewriter-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  border-radius: 1px;
  vertical-align: text-bottom;
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

When selected text also carries a text style, a single `<span>` carries both `typewriter-selection` and the style's class names / inline styles simultaneously.

#### Lifecycle

| Method | When called | Behaviour |
|---|---|---|
| `render(state)` | After every event | Repaints text, cursors, and selections at the new positions |
| `mount(state)` | Once, before the first event | Resolves the target element and paints the initial state |
| `unmount()` | When called by the consumer or player | Releases the element reference; final content stays in place |

### `stringRenderer` - Node.js / testing

For server-side rendering, testing, or any context without a DOM. Stores the latest state in memory and does not produce any cursor marker output. Exposes two read methods:

- **`.toString()`**, returns the plain document text, styles ignored.
- **`.toAnsiString()`**, returns the document text with ANSI escape codes applied from styles that carry an `ansi` map.

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

Use the `ansi` field in a `TStyleObject` to provide ANSI code segments. The renderer collects all `ansi` map values for a segment, joins them with `;`, and wraps the text in `\x1B[<codes>m...\x1B[0m`:

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

If no styles carry an `ansi` map, `toAnsiString()` falls back to the same value as `toString()`.

> `StringRenderer` does not include any cursor marker in either output method.

## Custom renderer

Implement [`IRenderer`](/api/interfaces/IRenderer) to write to any output target. Only `render` is required; `mount` and `unmount` are optional:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";



class ConsoleRenderer implements IRenderer {
  render(state: TTypewriterState): void {
    process.stdout.write(`\r${state.document.text}`);
  }

  mount(_state: TTypewriterState): void {
    process.stdout.write("\x1Bc"); // clear terminal
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
| `render(state)` | After every event | Write the updated text |
| `mount(state)` | Once, before the first event | Prepare the output target |
| `unmount()` | Optional teardown | Flush / release resources |

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

### Working with styles directly

Text styles live on `state.document.styles`. Use the exported `segmentRichText()` helper to split the document into styled segments:

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

See [`TTypewriterState`](/api/type-aliases/TTypewriterState), [`TRichTextDocument`](/api/type-aliases/TRichTextDocument), [`TCursorState`](/api/type-aliases/TCursorState), [`TTextStyle`](/api/type-aliases/TTextStyle), [`TStyleObject`](/api/type-aliases/TStyleObject), and [`TRichTextSegment`](/api/type-aliases/TRichTextSegment) in the API reference for the full shape.
