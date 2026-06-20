# `.select()` — create a text selection

Creates a text selection relative to the current cursor position.

```ts
tw.timeline.select(count: number, options?: TSelectOptions): TimelineBuilder
```

`.select()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock.

## Options

```ts
type TSelectOptions = {
  by?: TAdvanceModeInput;   // default: "char"
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | Unit used to measure the selection |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor creates the selection |
| `before` | `TCallbackHook` | — | Hook fired before the selection is applied |
| `after` | `TCallbackHook` | — | Hook fired after the selection is applied |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- A positive `count` selects **forward** from the cursor's current position.
- A negative `count` selects **backward** from the cursor's current position.
- A zero `count` selects the **entire document** (`[0, text.length]`).
- The selection is **relative** to the cursor — it extends `count` units in the chosen direction from wherever the cursor currently sits.
- The selection is stored on the cursor state and consumed by the DOM renderer to render a visual highlight.
- The selection is **cleared** by any subsequent `.type()`, `.delete()`, or `.move()` command targeting the same cursor.
- Selections do **not** prevent the cursor from continuing to type — they are metadata describing a range, not a lock.

## Advance modes (`by`)

The `by` option controls how selection units are measured.

```ts
tw.timeline.select(5);                  // select 5 characters forward
tw.timeline.select(-3);                 // select 3 characters backward
tw.timeline.select(0);                  // select the entire document
tw.timeline.select(2, { by: "word" });  // select 2 words forward
tw.timeline.select(-1, { by: "line" }); // select 1 line backward
tw.timeline.select(3, { by: "grapheme" }); // select 3 grapheme clusters
```

## Selection lifecycle

A selection exists from the moment `.select()` fires until one of these clears it:

1. `.type()` targeting the same cursor
2. `.delete()` targeting the same cursor
3. `.move()` targeting the same cursor
4. Another `.select()` targeting the same cursor (replaces the previous selection)

## Examples

### Select forward then highlight

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .move(6)
  .select(5); // selects "World"

await tw.play();
// "World" appears highlighted in the DOM renderer
```

### Select backward

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .select(-5); // selects "World" backward from the end

await tw.play();
// "World" appears highlighted
```

### Select then apply a style

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(6)
  .select(5) // selects "World"
  .style("highlight", "selection") // applies style to selection range
  .move(11); // clear selection, move to end

await tw.play();
// "World" permanently carries the "highlight" class
```

### Select by word

```ts
tw.timeline
  .type("one two three", { by: "word", interval: 150 })
  .wait(400)
  .move(4)
  .select(2, { by: "word" }); // selects "two three"

await tw.play();
```

### Select then replace

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(6)
  .select(5) // selects "World"
  .type("TypewriterJS"); // replaces selection

await tw.play();
// result: "Hello TypewriterJS"
```

### Select then delete

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(6)
  .select(5) // selects "World"
  .delete(1); // deletes the selection in one step

await tw.play();
// result: "Hello "
```

## Multi-cursor selections

Use the `cursor` option to create selections on specific cursors:

```ts
tw.timeline
  .type("ABCDE", { cursor: ["a", "b"] })
  .select(3, { cursor: "a" }) // only cursor "a" creates a selection
  .style("highlight", "selection", { cursor: "a" });

await tw.play();
// "CDE" is highlighted (cursor "a" was at position 2 after typing 5 chars,
// depending on initial cursor positions)
```

## Renderer behavior

In the **DOM renderer**, the active selection is wrapped in a `<span>` with the class `typewriter-selection`. You can style it via CSS:

```css
.typewriter-selection {
  background: rgba(99, 102, 241, 0.3);
}
```

In the **string renderer**, `toString()` returns plain text without selection markers. Use `toAnsiString()` for terminal output with ANSI-highlighted selection ranges.

## Edge cases

- **`count = 0`** — selects the entire document (`from: 0, to: text.length`).
- **`count` exceeds document bounds** — the selection is clamped at the document boundary.
- **Backward selection past position 0** — clamped at `0`.
- **Selection on an empty document** — produces an empty selection; the selection range is `[0, 0]`.
- **Overlapping selections from multiple cursors** — each cursor tracks its own selection independently. The renderer renders all active selections simultaneously.
- **`.select()` called twice without clearing** — the second call replaces the first selection entirely.

## Type reference

- [`TSelectOptions`](/api/type-aliases/TSelectOptions)
- [`TSelectCommand`](/api/type-aliases/TSelectCommand)
- [`TSelectionState`](/api/type-aliases/TSelectionState)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
