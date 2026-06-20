# `.delete()` — remove text

Removes text relative to the cursor position, one step at a time.

```ts
tw.timeline.delete(count: TDeleteValue, options?: TDeleteOptions): TimelineBuilder
```

The first argument determines both **how much** to delete and **in which direction**. Numeric values produce multiple timed steps; boundary strings delete in one instant step.

## Operand semantics

| `count` | Direction | Steps |
|---|---|---|
| Positive number (`count > 0`) | Delete **forward** from the cursor | `count / amount` |
| Negative number (`count < 0`) | Delete **backward** from the cursor | `|count| / amount` |
| `"start"` | Delete from cursor back to document **start** | 1 (instant) |
| `"end"` | Delete from cursor forward to document **end** | 1 (instant) |
| `"whole"` | Delete the **entire document** | 1 (instant) |

Numeric counts advance the timeline clock by `steps × interval` ms. Boundary strings (`"start"`, `"end"`, `"whole"`) are instant — they do not advance the clock.

## Options

```ts
type TDeleteOptions = {
  by?: TAdvanceModeInput;       // default: "char" (numeric counts only)
  interval?: number;            // default: 50 (ms) (numeric counts only)
  cursor?: TCursorSelector;     // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | Unit used to measure and chunk the deletion (numeric counts only) |
| `interval` | `number` | `50` | Milliseconds between each deletion step (numeric counts only) |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor(s) to delete from |
| `before` | `TCallbackHook` | — | Hook fired before each step (or once for boundary operands) |
| `after` | `TCallbackHook` | — | Hook fired after each step (or once for boundary operands) |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- **Backward deletion** (`count < 0`): removes units immediately before the cursor and moves the cursor left by the same amount.
- **Forward deletion** (`count > 0`): removes units immediately after the cursor; the cursor position does not change.
- **`"start"`**: deletes all text from the cursor's current position back to index 0 in one step.
- **`"end"`**: deletes all text from the cursor's current position forward to the end of the document in one step.
- **`"whole"`**: clears the entire document in one step regardless of cursor position.
- All deletions are **clamped** — the operation never exceeds the document boundaries.
- When a selection is active on the targeted cursor, the selection range is deleted in one step (regardless of `count` or `by`), then the selection is cleared.
- Styles that overlap the deleted range are automatically adjusted: styles fully inside the range are removed, styles partially overlapping are trimmed, and styles entirely outside the range are preserved and shifted as needed.

## Advance modes (`by`)

Applies to numeric counts only. The unit controls how the deleted amount is measured and chunked:

```ts
// Delete 5 characters one at a time — backward
tw.timeline.delete(-5, { by: "char", interval: 60 });

// Delete 3 characters at a time — forward
tw.timeline.delete(6, { by: { unit: "char", amount: 3 }, interval: 80 });
// 2 steps, each removes 3 chars

// Delete 2 words backward
tw.timeline.delete(-2, { by: "word", interval: 100 });

// Delete whole lines forward
tw.timeline.delete(2, { by: "line", interval: 150 });
```

## Examples

### Type then backspace

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(600)
  .delete(-6, { by: "char", interval: 50 });

await tw.play();
// types "Hello world", pauses 600 ms, backspaces " world" → "Hello"
```

### Simulate a typo correction

```ts
tw.timeline
  .type("Helllo world", { by: "char", interval: 75 })
  .wait(400)
  .move(-8)                                     // cursor after the double 'l'
  .delete(-1, { by: "char", interval: 60 })     // remove the extra 'l'
  .move("end");                                 // jump back to the end

await tw.play();
// result: "Hello world"
```

### Delete by word (backward)

```ts
tw.timeline
  .type("The quick brown fox", { by: "word", interval: 140 })
  .wait(500)
  .delete(-3, { by: "word", interval: 120 });

await tw.play();
// → "The quick brown fox", then removes "fox", "brown ", "quick " → "The "
```

### Delete to document start

```ts
tw.timeline
  .type("Preamble — Hello world", { by: "char", interval: 60 })
  .move(-11)        // cursor is now before "Hello world"
  .delete("start"); // removes "Preamble — " in one step

await tw.play();
// result: "Hello world"
```

### Delete to document end

```ts
tw.timeline
  .type("Hello world — Epilogue", { by: "char", interval: 60 })
  .move(11)         // cursor right after "Hello world"
  .delete("end");   // removes " — Epilogue" in one step

await tw.play();
// result: "Hello world"
```

### Erase the entire document

```ts
tw.timeline
  .type("This text will vanish", { by: "char", interval: 60 })
  .wait(1000)
  .delete("whole")
  .type("Something new.", { by: "char", interval: 80 });

await tw.play();
```

### Insert a missing character mid-word

```ts
tw.timeline
  .type("Helo world", { by: "char", interval: 75 })
  .wait(300)
  .move(-8)                               // cursor between "He" and "lo" (index 2)
  .type("l", { by: "char", interval: 60 }); // insert the missing 'l'

await tw.play();
// result: "Hello world"
```

### Forward delete a duplicate character

```ts
tw.timeline
  .type("Helllo world", { by: "char", interval: 75 })
  .wait(300)
  .move(-9)                               // cursor between "Hel" and "lo" (index 3)
  .delete(1, { by: "char", interval: 60 }); // forward delete the extra 'l'

await tw.play();
// result: "Hello world"
```

### Delete in chunks (2 chars per step)

```ts
tw.timeline
  .type("ABCDEFGH", { by: "char", interval: 80 })
  .wait(400)
  .delete(-8, { by: { unit: "char", amount: 2 }, interval: 100 });
  // 4 steps: removes "GH" → "EF" → "CD" → "AB"

await tw.play();
```

### Delete a selection

```ts
tw.timeline
  .type("Hello cruel world", { by: "char", interval: 60 })
  .wait(400)
  .move(-12)          // cursor before "cruel "
  .select(6)          // selects "cruel "
  .delete(1);         // deletes the whole selection in one step

await tw.play();
// result: "Hello world"
```

## Interaction with cursor position

`.delete()` always operates relative to the cursor's current position. Use `.move()` first to target a specific location in the document:

```ts
tw.timeline
  .type("Goodbye World")
  .move("start")
  .delete(7, { by: "char", interval: 60 }) // forward deletes "Goodbye"
  .type("Hello", { by: "char", interval: 80 });

await tw.play();
// result: "Hello World"
```

## Edge cases

- **Cursor at position 0 with backward deletion** — no-op; there is nothing before the cursor.
- **Cursor at the end with forward deletion** — no-op; there is nothing after the cursor.
- **`|count|` larger than available text** — deletion stops at the document boundary without error.
- **`"whole"` on an empty document** — no-op.
- **`"start"` with cursor at 0** — no-op.
- **`"end"` with cursor at the end** — no-op.
- **Active selection** — the entire selected range is deleted in one step; `count` and `by` are ignored.

## Type reference

- [`TDeleteOptions`](/api/type-aliases/TDeleteOptions)
- [`TDeleteCommand`](/api/type-aliases/TDeleteCommand)
- [`TDeleteValue`](/api/type-aliases/TDeleteValue)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
