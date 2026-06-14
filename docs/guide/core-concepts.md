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

At play time, `compile()` converts the ordered command list into a flat array of **timeline events** — one event per step — each stamped with an absolute timestamp.

`wait` and `moveCursor` are special:
- `wait` generates no events but advances the internal clock
- `moveCursor` generates a single instant event and does **not** advance the clock

### 2. Events → State (reduce)

The **player** advances through events in timestamp order. For each event it calls the **reducer**, which produces a new immutable `TTypewriterState` (the rich-text document plus the cursor map).

### 3. State → Output (render)

After each state update, the **renderer** is called with the new state. The built-in DOM renderer reads both the document text and the active cursor index to paint the output correctly.

---

## State shape

`TTypewriterState` contains:

| Field | Description |
|---|---|
| `document` | A `TRichTextDocument` — the current text content with optional style marks |
| `cursors` | A `Record<string, TCursorState>` — named cursors, each with an `index` and `visible` flag |

The default initial state has a single cursor named `"main"` at index `0`.

The document text grows as insert events are applied and shrinks as delete events are applied. The cursor index tracks where the next insert or delete will occur.

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
  .type("Hello")
  .wait(300)
  .delete(2, { by: "char", interval: 60 })
  .moveCursor(0)
  .type("EO ");

await tw.play(); // compiles fresh each time
await tw.play(); // replays the same sequence
```

See [Timeline & Commands](/guide/timeline) for the full command reference.
