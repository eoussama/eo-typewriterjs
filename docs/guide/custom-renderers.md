# Custom Renderers

The built-in `domRenderer` and `stringRenderer` cover most use cases, but you can implement `IRenderer` to write to any output target: a `<canvas>`, a terminal, a virtual DOM, a data stream, or anything else.

This page walks through building a complete custom renderer from scratch.

## The interface

```ts
interface IRenderer {
  render(state: TTypewriterState): void;
  mount?(state: TTypewriterState): void;
  unmount?(): void;
}
```

Only `render` is required. `mount` and `unmount` are optional.

| Method | When called | Typical use |
|---|---|---|
| `mount(state)` | Before rendering begins (on `play()`, `replay()`, or `seek()` from idle) | Prepare the output target (clear it, inject styles, etc.) |
| `render(state)` | After every compiled event | Write the updated document to the target |
| `unmount()` | When explicitly torn down | Release resources, flush buffers |

The same `state` is passed to both `mount` and `render`. It contains:

- `state.document.text`: the current plain text
- `state.document.styles`: the active style annotations
- `state.cursors`: a map of cursor name → `{ index, visible }`
- `state.selections`: a map of cursor name → `{ from, to }` or `undefined`

## Minimal renderer

The simplest possible renderer prints each state update to the console:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";
import { createTypewriter } from "eo-typewriterjs";

const logRenderer: IRenderer = {
  render(state: TTypewriterState): void {
    console.log(state.document.text);
  },
};

const tw = createTypewriter({ renderer: logRenderer });
tw.timeline.type("Hello!", { by: "char", interval: 80 });
await tw.play();
```

## Terminal renderer

A renderer that overwrites the current terminal line on each update, then drops to a new line when done:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";

export class TerminalRenderer implements IRenderer {
  mount(_state: TTypewriterState): void {
    process.stdout.write("\x1Bc"); // clear screen
  }

  render(state: TTypewriterState): void {
    process.stdout.write(`\r${state.document.text}`);
  }

  unmount(): void {
    process.stdout.write("\n");
  }
}
```

Usage:

```ts
import { createTypewriter } from "eo-typewriterjs";

const tw = createTypewriter({ renderer: new TerminalRenderer() });
tw.timeline.type("Hello, terminal!", { by: "char", interval: 60 });
await tw.play();
```

To include ANSI color codes, combine this with the `ansi` field on `TStyleObject` and `segmentRichText()`. See [Styling](/guide/styling#styles-and-the-string-renderer) for the ANSI pattern.

## Canvas renderer

A renderer that draws the document text into a `<canvas>` element:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";

export class CanvasRenderer implements IRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx.font = "20px monospace";
    this.ctx.fillStyle = "#e2e8f0";
  }

  mount(_state: TTypewriterState): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  render(state: TTypewriterState): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const cursorIndex = state.cursors["main"]?.index ?? state.document.text.length;
    const before = state.document.text.slice(0, cursorIndex);
    const after = state.document.text.slice(cursorIndex);
    const x = 20;
    const y = 40;

    this.ctx.fillText(before + "|" + after, x, y);
  }
}
```

Usage:

```ts
import { createTypewriter } from "eo-typewriterjs";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const tw = createTypewriter({ renderer: new CanvasRenderer(canvas) });

tw.timeline.type("Hello from canvas!", { by: "char", interval: 60 });
await tw.play();
```

## Styled canvas renderer

To apply text styles on a canvas, use `segmentRichText()` to get styled slices, then `mergeStyles()` to flatten the style stack for each slice:

```ts
import { segmentRichText, mergeStyles } from "eo-typewriterjs";
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";

export class StyledCanvasRenderer implements IRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx.font = "20px monospace";
  }

  mount(_state: TTypewriterState): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  render(state: TTypewriterState): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const segments = segmentRichText(state.document);
    let x = 20;
    const y = 40;

    for (const segment of segments) {
      if (segment.styles.length > 0) {
        const merged = mergeStyles(segment.styles);
        // map CSS color from merged.css if present
        this.ctx.fillStyle = merged.css?.["color"] ?? "#e2e8f0";
      } else {
        this.ctx.fillStyle = "#e2e8f0";
      }

      this.ctx.fillText(segment.text, x, y);
      x += this.ctx.measureText(segment.text).width;
    }
  }
}
```

## Frame-capture renderer

Useful in tests and SSR pipelines. Records every rendered state as an array of snapshots:

```ts
import type { IRenderer, TTypewriterState } from "eo-typewriterjs";

export class FrameCapture implements IRenderer {
  readonly frames: string[] = [];

  mount(state: TTypewriterState): void {
    this.frames.push(state.document.text);
  }

  render(state: TTypewriterState): void {
    this.frames.push(state.document.text);
  }

  unmount(): void {}
}
```

Usage:

```ts
import { createTypewriter } from "eo-typewriterjs";

const capture = new FrameCapture();
const tw = createTypewriter({ renderer: capture });

tw.timeline.type("Hi!", { by: "char", interval: 0 });
await tw.play();

console.log(capture.frames);
// ["", "H", "Hi", "Hi!"]
```

## Accessing cursors and selections

The full cursor and selection state is available on every render call:

```ts
render(state: TTypewriterState): void {
  const text = state.document.text;

  // cursor position
  const cursor = state.cursors["main"];
  const index = cursor?.index ?? text.length;

  // active selection
  const selection = state.selections["main"];

  if (selection) {
    const selected = text.slice(selection.from, selection.to);
    console.log(`Selection: "${selected}"`);
  }

  const withCursor = text.slice(0, index) + "█" + text.slice(index);
  console.log(withCursor);
}
```

## Registering the renderer

Pass the renderer instance to `createTypewriter()`:

```ts
import { createTypewriter } from "eo-typewriterjs";

const tw = createTypewriter({ renderer: new TerminalRenderer() });
```

The renderer lifecycle is tied to playback:
- `mount` is called once when playback begins (or resumes from idle via `seek`).
- `render` is called after every event.
- `unmount` is called when the renderer is explicitly torn down (if the API exposes that path).

## Tips

**Avoid heavy work inside `render`.** It is called on every event, which may be many times per second. Keep `render` fast; offload heavy computation to `mount` or outside the renderer.

**Batch DOM updates.** If your renderer writes to the DOM, build the output in memory (e.g., a `DocumentFragment`) before inserting it. This matches what `DomRenderer` does internally.

**Use `segmentRichText` for styled output.** It returns non-overlapping slices that are safe to iterate. Do not walk `state.document.styles` directly, styles can overlap and are not sorted.

**Handle missing cursors gracefully.** A cursor ID may be absent from `state.cursors` if it has not been referenced by any command yet. Use optional chaining or a fallback index.

## Type reference

- [`IRenderer`](/api/interfaces/IRenderer)
- [`TTypewriterState`](/api/type-aliases/TTypewriterState)
- [`TRichTextDocument`](/api/type-aliases/TRichTextDocument)
- [`TRichTextSegment`](/api/type-aliases/TRichTextSegment)
- [`segmentRichText`](/api/functions/segmentRichText)
- [`mergeStyles`](/api/functions/mergeStyles)
