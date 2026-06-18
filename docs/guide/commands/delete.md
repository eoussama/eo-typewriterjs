# `.delete()` — remove text

Removes `count` units of text backward from the cursor position, one step at a time.

```ts
tw.timeline.delete(count: number, options?: TDeleteOptions): TimelineBuilder
```

Each step produces a **delete event** that removes one unit and moves the cursor one unit backward. The command advances the timeline clock by `steps × interval` ms.

## Options

```ts
type TDeleteOptions = {
  by?: TAdvanceModeInput; // default: "char"
  interval?: number; // default: 100 (ms)
  cursor?: TCursorSelector; // default: "main"
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to count units when deleting |
| `interval` | `number` | `100` | Milliseconds between each deletion step |
| `cursor` | `string` | `"main"` | Which cursor to delete from |

## Behavior

- Deletion is always **backward** from the current cursor position.
- Each step removes one "unit" (character, word, etc.) before the cursor.
- The cursor moves backward by the width of each deleted unit.
- Deletion is **clamped** at document position `0` — it will not delete beyond the start of the document.
- If `count` exceeds the number of available units before the cursor, deletion stops at position `0`.

## Advance modes (`by`)

The `by` option controls how text is chunked when counting deletion units.

```ts
tw.timeline.delete(5, { by: "char" }); // delete 5 characters
tw.timeline.delete(2, { by: "word" }); // delete 2 words
tw.timeline.delete(1, { by: "line" }); // delete 1 line
tw.timeline.delete(3, { by: "grapheme" }); // delete 3 grapheme clusters
```

Use the object form for multi-unit steps:

```ts
tw.timeline.delete(3, { by: { unit: "char", amount: 2 } });
// each step removes 2 characters; 3 steps total = 6 characters removed
```

## Examples

### Type then delete

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(6, { by: "char", interval: 60 });

await tw.play();
// types "Hello world", pauses, then deletes " world" → "Hello"
```

### Delete by word

```ts
tw.timeline
  .type("The quick brown fox", { by: "word", interval: 150 })
  .wait(400)
  .delete(2, { by: "word", interval: 120 });

await tw.play();
// → "The quick brown fox", then removes "fox" and "brown " → "The quick "
```

### Simulated correction

```ts
tw.timeline
  .type("Helo world", { by: "char", interval: 80 })
  .wait(300)
  .delete(9, { by: "char", interval: 50 }) // erase back to "H"
  .type("ello world", { by: "char", interval: 80 });

await tw.play();
// types typo, then corrects it
```

### Delete at end of document (fast backspace)

```ts
tw.timeline
  .type("Loading...", { by: "char", interval: 80 })
  .wait(600)
  .delete(3, { by: "char", interval: 100 }); // remove "..."

await tw.play();
// "Loading..." → "Loading"
```

### Delete entire content

```ts
tw.timeline
  .type("Temporary text", { by: "char", interval: 60 })
  .wait(800)
  .delete(14, { by: "char", interval: 30 });

await tw.play();
// full erasure
```

## Interaction with cursor position

`.delete()` removes text backward from wherever the cursor currently is. Use `.moveCursor()` first to delete from a specific position:

```ts
tw.timeline
  .type("Hello World")
  .moveCursor(5) // cursor is now at index 5 (between "Hello" and " ")
  .delete(5, { by: "char", interval: 60 }); // removes "Hello"

await tw.play();
// result: " World"
```

## Interaction with selections

If the targeted cursor has an active selection when `.delete()` fires, the entire selected range is deleted in one step (regardless of `count` or `by`). The selection is then cleared.

```ts
tw.timeline
  .type("Hello World")
  .moveCursor(6)
  .select(5) // selects "World"
  .delete(1); // deletes the selection in one step

await tw.play();
// result: "Hello "
```

## Edge cases

- **`count = 0`** — produces no events. Clock is not advanced.
- **Cursor at position 0** — the command is a no-op; nothing to delete.
- **`count` larger than available text** — deletion stops at position 0 without error.
- **Marks overlap deleted range** — marks that fully cover the deleted range are removed. Marks that partially overlap are trimmed to the new boundary. Marks entirely before the deletion point are shifted left by the number of deleted characters.

## Type reference

- [`TDeleteOptions`](/api/type-aliases/TDeleteOptions)
- [`TDeleteCommand`](/api/type-aliases/TDeleteCommand)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
