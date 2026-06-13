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

You add **commands** to the timeline via `tw.timeline.type(text, options)`. Each command describes what to type and how to type it.

At play time, `compile()` converts commands into a flat list of **timeline events** — one event per "step" (character, word, line, etc.) — each stamped with an absolute timestamp.

### 2. Events → State (reduce)

The **player** advances through events in timestamp order. For each event it calls the **reducer**, which updates the immutable `TTypewriterState` (the rich-text document plus cursor position).

### 3. State → Output (render)

After each state update, the **renderer** is called with the new state. The built-in renderers extract the plain text from the state and write it to their target (a DOM element or a string callback).

---

## State shape

`TTypewriterState` contains:

| Field | Description |
|---|---|
| `document` | A `TRichTextDocument` — the list of typed characters with optional style marks |
| `cursor` | A `TCursorState` — the current cursor position within the document |

The document is append-only during a forward animation. Each render receives the complete state including all characters typed so far.

---

## Advance modes

The `by` option of `.type()` controls how the text is segmented before being dispatched as events:

| Value | Description |
|---|---|
| `"char"` | One event per ASCII character |
| `"grapheme"` | One event per Unicode grapheme cluster (handles emoji 🎉) |
| `"word"` | One event per word (trailing whitespace is attached to the preceding word) |
| `"line"` | One event per line (newline character is attached to the preceding line) |
| `"custom"` | Entire text as a single event |
| `{ unit, amount }` | `amount` consecutive segments joined per event |

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

`TimelineBuilder` is a fluent builder. Commands are stored in a readonly array and only compiled when `play()` is called, so the same timeline can be replayed.

```ts
tw.timeline
  .type("Hello")
  .type(", ")
  .type("World!");

await tw.play(); // compiles fresh each time
await tw.play(); // replays the same sequence
