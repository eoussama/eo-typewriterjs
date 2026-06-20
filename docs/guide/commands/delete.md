# `.delete()` — remove text

Removes text relative to the cursor position, one step at a time.

```ts
tw.timeline.delete(count: number, options?: TDeleteOptions): TimelineBuilder
```

**Signed count semantics:**

| `count` | Direction |
|---|---|
| Positive (`count > 0`) | Delete **forward** from the cursor |
| Negative (`count < 0`) | Delete **backward** from the cursor |
| Zero (`count === 0`) | Delete the **entire document** text |

Each step produces a delete event that removes one unit and re-renders. The command advances the timeline clock by `steps × interval` ms.

## Options

```ts
type TDeleteOptions = {
  by?: TAdvanceModeInput;      // default: "char"
  interval?: number;           // default: 50 (ms)
  cursor?: TCursorSelector;    // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to count units when deleting |
| `interval` | `number` | `50` | Milliseconds between each deletion step |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor to delete from (supports multi-cursor arrays) |
| `before` | `TCallbackHook` | — | Hook fired before each step |
| `after` | `TCallbackHook` | — | Hook fired after each step |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override — `false` to silence, or a voice/volume object |

## Behavior

- **Backward deletion** (`count < 0`): removes units before the cursor and moves it left.
- **Forward deletion** (`count > 0`): removes units after the cursor; the cursor stays in place.
- **Whole-text deletion** (`count = 0`): clears the entire document in one step.
- Deletion is **clamped** — it never deletes beyond the document boundaries.
- Multi-cursor: pass an array to `cursor` to delete from multiple cursors simultaneously.

## Advance modes (`by`)

```ts
tw.timeline.delete(-5, { by: "char" });     // delete 5 chars backward
tw.timeline.delete(-2, { by: "word" });     // delete 2 words backward
tw.timeline.delete(3, { by: "char" });      // delete 3 chars forward
tw.timeline.delete(0);                      // delete the whole document
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
  .move(-9)                                 // move cursor back 9 chars (at index 1)
  .delete(1, { by: "char", interval: 50 }) // forward delete the duplicate "l"
  .type("", { by: "char" })                // cursor now points at corrected text

await tw.play();
// "Helo world" → "Helo world" with extra l removed at position 1 → "Helo world"
```

### Clear everything at once

```ts
tw.timeline
  .type("Temporary text", { by: "char", interval: 60 })
  .wait(800)
  .delete(0);  // whole-document deletion

await tw.play();
// full erasure in one step
```

### Simulated typing correction

```ts
tw.timeline
  .type("Helo world", { by: "char", interval: 80 })
  .wait(300)
  .delete(-9, { by: "char", interval: 50 }) // backspace back to "H"
  .type("ello world", { by: "char", interval: 80 });

await tw.play();
// types typo, then corrects it
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

- **`count = 0`** — deletes the entire document text in one step.
- **Cursor at position 0 with negative count** — the command is a no-op; nothing to delete.
- **Cursor at end with positive count** — the command is a no-op; nothing after the cursor.
- **`|count|` larger than available text** — deletion stops at the document boundary without error.
- **Styles overlap deleted range** — styles that fully cover the deleted range are removed. Styles that partially overlap are trimmed. Styles entirely outside the deletion are preserved.

## Type reference

- [`TDeleteOptions`](/api/type-aliases/TDeleteOptions)
- [`TDeleteCommand`](/api/type-aliases/TDeleteCommand)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
