# Core Concepts

Understanding the library's architecture helps you use it more effectively.

## The pipeline

Every typewriter animation passes through four stages:

```
Timeline commands
      ↓  compile()
  Timeline events (with absolute timestamps)
      ↓  play()
  Reducer (apply each event to state)
      ↓  renderer.render()
  Output (DOM element / string / custom)
```

### 1. Commands → Events (compile)

You add **commands** to the timeline using the fluent builder methods:

| Method | Description |
|---|---|
| `.type(text, options?)` | Insert text step by step |
| `.wait(duration)` | Pause before the next command |
| `.delete(count, options?)` | Remove text backward from the cursor |
| `.moveCursor(index, options?)` | Teleport the cursor to an absolute index |
| `.select(count, options?)` | Create a text selection relative to the cursor |
| `.mark(style, range, options?)` | Apply a style mark to a document range |

At play time, `compile()` converts the ordered command list into a flat array of **timeline events** — one event per step — each stamped with an absolute timestamp.

`wait`, `moveCursor`, and `mark` are special:
- `wait` generates no events but advances the internal clock
- `moveCursor` generates a single instant event and does **not** advance the clock
- `mark` generates one or more instant mark events (one per cursor when `range` is `"selection"`) and does **not** advance the clock

### 2. Events → State (reduce)

The **player** advances through events in timestamp order. For each event it calls the **reducer**, which produces a new immutable `TTypewriterState` (the rich-text document plus the cursor map).

### 3. State → Output (render)

After each state update, the **renderer** is called with the new state. The built-in DOM renderer reads both the document text and the active cursor index to paint the output correctly.

---

## State shape

`TTypewriterState` contains:

| Field | Description |
|---|---|
| `document` | A `TRichTextDocument` — the current text content and its style marks |
| `cursors` | A `Record<string, TCursorState>` — named cursors, each with an `index` and `visible` flag |
| `selections` | A `Record<string, TSelectionState>` — per-cursor active selection ranges |

The default initial state has a single cursor named `"main"` at index `0`.

The document text grows as insert events are applied and shrinks as delete events are applied. The cursor index tracks where the next insert or delete will occur.

### `TRichTextDocument`

```ts
type TRichTextDocument = {
  readonly text: string;
  readonly marks: readonly TTextMark[];
};
```

`marks` is an append-only list of style annotations. Each `TTextMark` carries:

| Field | Type | Description |
|---|---|---|
| `from` | `number` | Start index (inclusive) |
| `to` | `number` | End index (exclusive) |
| `style` | `TStyleRef` | A class-name string or a `TStyleObject` |

Marks can overlap freely. The `segmentRichText()` helper (exported from `eo-typewriterjs`) slices the document into non-overlapping `TRichTextSegment` values, each carrying the ordered stack of active styles for that slice.

```ts
import { segmentRichText, mergeStyles } from "eo-typewriterjs";

const segments = segmentRichText(state.document);
// [{ text: "Hello", from: 0, to: 5, styles: ["greeting"] }, ...]

const merged = mergeStyles(segments[0].styles);
// { className: "greeting" }
```

---

## Advance modes

The `by` option on `.type()` and `.delete()` controls how text is segmented:

| Value | Description |
|---|---|
| `"char"` | One event per ASCII character or grapheme cluster |
| `"grapheme"` | One event per Unicode grapheme cluster (handles composite emoji 🎉) |
| `"word"` | One event per word (trailing whitespace attached to the preceding word) |
| `"line"` | One event per line (newline attached to the preceding line) |
| `"custom"` | Entire text as a single event |
| `{ unit, amount }` | `amount` consecutive segments joined into one event |

---

## Renderer contract

A renderer implements `IRenderer`:

```ts
interface IRenderer {
  mount(state: TTypewriterState): void;   // called once before playback
  render(state: TTypewriterState): void;  // called after each event
  unmount(): void;                         // called once after playback ends
}
```

You can implement this interface to write to a canvas, a terminal, a virtual DOM, or anything else.

---

## Timeline builder

`TimelineBuilder` is a fluent builder. Commands are stored in a readonly array and only compiled when `play()` is called, so the same timeline can be replayed:

```ts
tw.timeline
  .type("Hello World")
  .wait(300)
  .moveCursor(6)
  .select(5)
  .mark("highlight", "selection")
  .delete(2, { by: "char", interval: 60 });

await tw.play(); // compiles fresh each time
await tw.play(); // replays the same sequence
```

See [Timeline & Commands](/guide/timeline) for the full command reference.
