# `.select()` — create a text selection

Creates a text selection.

```ts
tw.timeline.select(count: TSelectValue, options?: TSelectOptions): TimelineBuilder
```

`.select()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock.

**Operand semantics:**

| `count` | Behavior |
|---|---|
| Positive number (`count > 0`) | Select **forward** from the cursor |
| Negative number (`count < 0`) | Select **backward** from the cursor |
| `"start"` | Select from cursor to document **start** |
| `"end"` | Select from cursor to document **end** |
| `"whole"` | Select the **entire document** |

## Options

```ts
type TSelectOptions = {
  by?: TAdvanceModeInput;   // default: "char" (numeric counts only)
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | Unit used to measure the selection (numeric counts only) |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor creates the selection |
| `before` | `TCallbackHook` | — | Hook fired before the selection is applied |
| `after` | `TCallbackHook` | — | Hook fired after the selection is applied |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- **`"start"`**: selects from the cursor's current position back to index 0 — the range is `[0, cursorIndex]`.
- **`"end"`**: selects from the cursor's current position forward to the end — the range is `[cursorIndex, text.length]`.
- **`"whole"`**: selects the entire document — the range is always `[0, text.length]`.
- **Numeric count**: the selection extends `count` units from the cursor in the given direction.
- The selection is stored on the cursor state and consumed by the DOM renderer to render a visual highlight.
- The selection is **cleared** by any subsequent `.type()`, `.delete()`, or `.move()` command targeting the same cursor.
- Selections do **not** prevent the cursor from continuing to type — they are metadata describing a range, not a lock.

## Advance modes (`by`)

Applies to numeric counts only:

```ts
tw.timeline.select(5);                  // select 5 characters forward
tw.timeline.select(-3);                 // select 3 characters backward
tw.timeline.select("whole");            // select entire document
tw.timeline.select("start");            // select from cursor to start
tw.timeline.select("end");              // select from cursor to end
tw.timeline.select(2, { by: "word" });  // select 2 words forward
tw.timeline.select(-1, { by: "line" }); // select 1 line backward
```

## Selection lifecycle

A selection exists from the moment `.select()` fires until one of these clears it:

1. `.type()` targeting the same cursor
2. `.delete()` targeting the same cursor
3. `.move()` targeting the same cursor
4. Another `.select()` targeting the same cursor (replaces the previous selection)

## Examples

### Select entire document

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .select("whole");

await tw.play();
// entire "Hello World" highlighted
```

### Select from cursor to start

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(-5)           // cursor at 6
  .select("start");   // selects [0, 6] = "Hello "

await tw.play();
```

### Select from cursor to end

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move("start")      // cursor at 0
  .select("end");     // selects [0, 11] = "Hello World"

await tw.play();
```

### Select forward then highlight

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .move(-5)
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
```

### Select then apply a style

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(-5)
  .select(5)                         // selects "World"
  .style("highlight", "selection")  // applies style to selection range
  .move("end");                      // clear selection, move to end

await tw.play();
// "World" permanently carries the "highlight" class
```

### Select then replace

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(-5)
  .select(5) // selects "World"
  .type("TypewriterJS"); // replaces selection

await tw.play();
// result: "Hello TypewriterJS"
```

### Select then delete

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .move(-5)
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
  .select("whole", { cursor: "a" }); // only cursor "a" selects the whole document

await tw.play();
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

- **`"start"` when cursor is at 0** — produces an empty selection `[0, 0]`, which is cleared.
- **`"end"` when cursor is at end** — produces an empty selection, which is cleared.
- **Numeric count exceeds document bounds** — clamped at the document boundary.
- **Selection on an empty document** — produces a zero-width selection, which is cleared.
- **`.select()` called twice without clearing** — the second call replaces the first selection entirely.

## Type reference

- [`TSelectOptions`](/api/type-aliases/TSelectOptions)
- [`TSelectCommand`](/api/type-aliases/TSelectCommand)
- [`TSelectValue`](/api/type-aliases/TSelectValue)
- [`TSelectionState`](/api/type-aliases/TSelectionState)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
