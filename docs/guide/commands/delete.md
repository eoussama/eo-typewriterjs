# `.delete()` — remove text

Removes text relative to the cursor position, one step at a time.

```ts
tw.timeline.delete(count: TDeleteValue, options?: TDeleteOptions): TimelineBuilder
```

**Operand semantics:**

| `count` | Behavior |
|---|---|
| Positive number (`count > 0`) | Delete **forward** from the cursor |
| Negative number (`count < 0`) | Delete **backward** from the cursor |
| `"start"` | Delete from the cursor back to document **start** |
| `"end"` | Delete from the cursor forward to document **end** |
| `"whole"` | Delete the **entire document** |

String operands (`"start"`, `"end"`, `"whole"`) are instant — they happen in one step and do not respect `by` or `interval`. Numeric counts advance the timeline clock by `steps × interval` ms.

## Options

```ts
type TDeleteOptions = {
  by?: TAdvanceModeInput;      // default: "char"  (numeric counts only)
  interval?: number;           // default: 50 (ms) (numeric counts only)
  cursor?: TCursorSelector;    // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to count units (numeric counts only) |
| `interval` | `number` | `50` | Milliseconds between each deletion step (numeric counts only) |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor to delete from (supports multi-cursor arrays) |
| `before` | `TCallbackHook` | — | Hook fired before each step (or once for boundary operands) |
| `after` | `TCallbackHook` | — | Hook fired after each step (or once for boundary operands) |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override — `false` to silence, or a voice/volume object |

## Behavior

- **Backward deletion** (`count < 0`): removes units before the cursor and moves it left.
- **Forward deletion** (`count > 0`): removes units after the cursor; the cursor stays in place.
- **Boundary `"start"`**: removes all text from cursor position to document start in one step.
- **Boundary `"end"`**: removes all text from cursor position to document end in one step.
- **Boundary `"whole"`**: clears the entire document in one step.
- All deletions are **clamped** — never exceeds document boundaries.
- `"start"` is a no-op when the cursor is already at position 0.
- `"end"` is a no-op when the cursor is already at the end of the document.

## Advance modes (`by`)

Applies to numeric counts only:

```ts
tw.timeline.delete(-5, { by: "char" });     // delete 5 chars backward
tw.timeline.delete(-2, { by: "word" });     // delete 2 words backward
tw.timeline.delete(3, { by: "char" });      // delete 3 chars forward
```

Use the object form for multi-unit steps:

```ts
tw.timeline.delete(-4, { by: { unit: "char", amount: 2 } });
// 2 steps, each deleting 2 chars = 4 chars removed backward
```

## Examples

### Type then backspace

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(-6, { by: "char", interval: 60 });

await tw.play();
// types "Hello world", pauses, backspaces " world" → "Hello"
```

### Delete to document start

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .move(-5)          // cursor at 6 (between "Hello " and "world")
  .delete("start");  // removes "Hello " → "world"

await tw.play();
```

### Delete to document end

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .move(-5)        // cursor at 6
  .delete("end");  // removes "world" → "Hello "

await tw.play();
```

### Delete entire document

```ts
tw.timeline
  .type("Temporary text", { by: "char", interval: 60 })
  .wait(800)
  .delete("whole");

await tw.play();
// full erasure in one step
```

### Delete by word (backward)

```ts
tw.timeline
  .type("The quick brown fox", { by: "word", interval: 150 })
  .wait(400)
  .delete(-2, { by: "word", interval: 120 });

await tw.play();
// → "The quick brown fox", then removes "fox" and "brown " → "The quick "
```

### Forward delete from inside the document

```ts
tw.timeline
  .type("Helo world", { by: "char", interval: 80 })
  .move(-9)
  .delete(1, { by: "char", interval: 50 }); // forward delete duplicate 'l'

await tw.play();
```

### Simulated typing correction

```ts
tw.timeline
  .type("Helo world", { by: "char", interval: 80 })
  .wait(300)
  .delete(-9, { by: "char", interval: 50 }) // backspace back to "H"
  .type("ello world", { by: "char", interval: 80 });

await tw.play();
```

## Interaction with cursor position

`.delete()` operates relative to wherever the cursor currently is. Use `.move()` first to target a specific position:

```ts
tw.timeline
  .type("Hello World")
  .move(-6)                                // cursor is now 6 chars from the end
  .delete(-5, { by: "char", interval: 60 }); // removes "Hello"

await tw.play();
// result: " World"
```

## Interaction with selections

If the targeted cursor has an active selection when `.delete()` fires, the entire selected range is deleted in one step (regardless of `count` or `by`). The selection is then cleared.

## Edge cases

- **Cursor at position 0 with `"start"` or negative count** — no-op; nothing to delete backward.
- **Cursor at end with `"end"` or positive count** — no-op; nothing after the cursor.
- **`|count|` larger than available text** — deletion stops at the document boundary without error.
- **`"whole"` on empty document** — no-op.
- **Styles overlap deleted range** — styles fully contained in the range are removed. Styles partially overlapping are trimmed. Styles entirely outside are preserved.

## Type reference

- [`TDeleteOptions`](/api/type-aliases/TDeleteOptions)
- [`TDeleteCommand`](/api/type-aliases/TDeleteCommand)
- [`TDeleteValue`](/api/type-aliases/TDeleteValue)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
