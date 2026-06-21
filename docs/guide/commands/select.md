# `.select()` - create a text selection

Creates a text selection on a cursor.

```ts
tw.timeline.select(count: TSelectValue, options?: TSelectOptions): TimelineBuilder
```

`.select()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. The selection is stored on the cursor state and consumed by subsequent commands or used by the renderer to display a visual highlight.

## Operand semantics

| `count` | Behavior |
|---|---|
| Positive number (`count > 0`) | Select `count` units **forward** from the cursor |
| Negative number (`count < 0`) | Select `count` units **backward** from the cursor |
| `"start"` | Select from the cursor back to document **start** - range `[0, cursorIndex]` |
| `"end"` | Select from the cursor forward to document **end** - range `[cursorIndex, text.length]` |
| `"whole"` | Select the **entire document** - range `[0, text.length]` |

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
| `by` | `TAdvanceModeInput` | `"char"` | Unit used to measure the selection span (numeric counts only) |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor creates the selection |
| `before` | `TCallbackHook` | - | Hook fired before the selection is applied |
| `after` | `TCallbackHook` | - | Hook fired after the selection is applied |
| `audio` | `TAudioCommandOverride` | - | Per-command audio override |

## Behavior

- The selection stores a `from` and `to` index. The cursor's text position itself is **not** changed.
- A new `.select()` replaces any existing selection on the same cursor.
- The selection is cleared by any subsequent `.type()`, `.delete()`, or `.move()` targeting the same cursor.
- `.style("...", "selection")` and `.unstyle("selection")` read the selection range without clearing it - use `.move()` or `.unselect()` to dismiss the visual highlight afterward.
- Numeric counts that exceed the document boundaries are **clamped** to the document edges.

## Advance modes (`by`)

Applies to numeric counts only:

```ts
// Select 5 characters forward
tw.timeline.select(5, { by: "char" });

// Select 3 characters backward
tw.timeline.select(-3, { by: "char" });

// Select 2 words forward
tw.timeline.select(2, { by: "word" });

// Select 1 newline-delimited segment backward
tw.timeline.select(-1, { by: "line" });
```

## Selection lifecycle

A selection lives from the moment `.select()` fires until one of the following clears it:

| Command | Effect on selection |
|---|---|
| `.type()` | Replaces the selected range with the typed text, then clears the selection |
| `.delete()` | Deletes the selected range in one step, then clears the selection |
| `.move()` | Clears the selection; cursor moves to the new position |
| `.unselect()` | Clears the selection; cursor stays in place |
| `.select()` (again) | Replaces the previous selection with the new one |
| `.style("...", "selection")` | Reads the range but does **not** clear the selection |
| `.unstyle("selection")` | Reads the range but does **not** clear the selection |

## Examples

### Select the entire document

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .select("whole");

await tw.play();
// entire "Hello World" is highlighted in the DOM renderer
```

### Select forward from the cursor

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(6)      // cursor after the space
  .select(5);   // selects "World"

await tw.play();
```

### Select backward from the end

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .select(-5);  // selects "World" backward from the end

await tw.play();
```

### Select from cursor to start

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)           // cursor is now at index 6
  .select("start");   // selects "Hello " (indices 0–6)

await tw.play();
```

### Select from cursor to end

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move("start")     // cursor at 0
  .select("end");    // selects the entire document

await tw.play();
```

### Select then apply a style

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(500)
  .move(-5)
  .select(5)                         // selects "World"
  .style("highlight", "selection")  // marks the selection
  .move("end");                      // clears the selection UI, cursor at end

await tw.play();
// "World" permanently carries the "highlight" class
```

### Select then replace

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)
  .select(5)                // selects "World"
  .type("TypewriterJS");    // replaces "World" - selection is consumed and cleared

await tw.play();
// result: "Hello TypewriterJS"
```

### Select then delete

```ts
tw.timeline
  .type("Hello cruel World", { by: "char", interval: 70 })
  .wait(400)
  .move(-11)       // cursor before "cruel "
  .select(6)       // selects "cruel "
  .delete(1);      // deletes the selection in one step

await tw.play();
// result: "Hello World"
```

### Select by word

```ts
tw.timeline
  .type("The quick brown fox", { by: "char", interval: 60 })
  .wait(400)
  .move("start")
  .select(2, { by: "word" }); // selects "The quick "

await tw.play();
```

### Multi-cursor selections

```ts
tw.timeline
  .type("ABCDE", { cursor: ["a", "b"], by: "char", interval: 80 })
  .select(2, { cursor: "a" }) // cursor "a" selects "AB" from its position
  .select(3, { cursor: "b" }); // cursor "b" selects "ABC" from its position

await tw.play();
```

## Renderer behavior

The **DOM renderer** wraps the active selection in a `<span>` with class `typewriter-selection`. You can style this via CSS:

```css
.typewriter-selection {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 2px;
}
```

The **string renderer**'s `toString()` returns plain text without selection markers. Use `toAnsiString()` for terminal output - it renders the selection range with ANSI highlight codes.

## Edge cases

- **`"start"` when cursor is at 0** - produces a zero-width selection `[0, 0]`, which is immediately cleared.
- **`"end"` when cursor is at the end** - produces a zero-width selection, which is immediately cleared.
- **Numeric count that exceeds document bounds** - clamped to the document boundary.
- **Empty document** - any selection resolves to `[0, 0]` and is immediately cleared.
- **`.select()` called twice** - the second call replaces the first selection entirely.
- **Unknown boundary string** - passing a string operand other than `"start"`, `"end"`, or `"whole"` throws an error at compile time.
- **Unknown `by` unit** - passing an unrecognised advance unit for the `by` option throws an error at compile time. Only `"char"`, `"grapheme"`, `"word"`, and `"line"` are accepted. `"whole"` is not valid for `by` - use `.select("whole")` instead.

## Type reference

- [`TSelectOptions`](/api/type-aliases/TSelectOptions)
- [`TSelectCommand`](/api/type-aliases/TSelectCommand)
- [`TSelectValue`](/api/type-aliases/TSelectValue)
- [`TSelectionState`](/api/type-aliases/TSelectionState)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
