<script setup>
const typeBackspaceCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(600)
  .delete(-6, { by: "char", interval: 50 });

await tw.play();`;

const typoCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Helllo world", { by: "char", interval: 75 })
  .wait(400)
  .move(-8)
  .delete(-1, { by: "char", interval: 60 })
  .move("end");

await tw.play();`;

const deleteByWordCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The quick brown fox", { by: "word", interval: 140 })
  .wait(500)
  .delete(-3, { by: "word", interval: 120 });

await tw.play();`;

const eraseWholeCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("This text will vanish", { by: "char", interval: 60 })
  .wait(1000)
  .delete("whole")
  .type("Something new.", { by: "char", interval: 80 });

await tw.play();`;

const deleteSelectionCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello cruel world", { by: "char", interval: 60 })
  .wait(400)
  .move(-12)
  .select(6)
  .delete(1);

await tw.play();`;
</script>

# `.delete()` - remove text

Removes text relative to the cursor position, one step at a time.

```ts
tw.timeline.delete(count: TDeleteValue, options?: TDeleteOptions): TimelineBuilder
```

The first argument determines both **how much** to delete and **in which direction**. Numeric values produce multiple timed steps; boundary strings compile to a single step.

## Operand semantics

| `count` | Direction | Steps |
|---|---|---|
| Positive number (`count > 0`) | Delete **forward** from the cursor | `ceil(count / amount)` |
| Negative number (`count < 0`) | Delete **backward** from the cursor | `ceil(\|count\| / amount)` |
| `"start"` | Delete from cursor back to document **start** | 1 |
| `"end"` | Delete from cursor forward to document **end** | 1 |
| `"whole"` | Delete the **entire document** | 1 |

Numeric counts advance the timeline clock by `steps × interval` ms. Boundary strings (`"start"`, `"end"`, `"whole"`) compile to a single event and use the default interval (`50ms`) for their duration.

## Options

```ts
type TDeleteOptions = {
  by?: TAdvanceModeInput;       // default: "char" (numeric counts only)
  interval?: number;            // default: 50 (ms)
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
| `before` | `TCallbackHook` | - | Hook fired before each step |
| `after` | `TCallbackHook` | - | Hook fired after each step |
| `audio` | `TAudioCommandOverride` | - | Per-command audio override |

## Behavior

- **Backward deletion** (`count < 0`): removes units immediately before the cursor and moves the cursor left by the same amount.
- **Forward deletion** (`count > 0`): removes units immediately after the cursor; the cursor position does not change.
- **`"start"`**: deletes all text from the cursor's current position back to index 0 in one step.
- **`"end"`**: deletes all text from the cursor's current position forward to the end of the document in one step.
- **`"whole"`**: clears the entire document in one step regardless of cursor position.
- All deletions are **clamped** - the operation never exceeds the document boundaries.
- When `cursor` targets multiple cursors, one set of events is produced per cursor at the same timestamps. The timeline clock advances only once.
- When a selection is active on the targeted cursor, the selection range is deleted in one step (regardless of numeric `count` or `by`), then the selection is cleared. `"whole"` bypasses this and always deletes the entire document.
- Styles that overlap the deleted range are automatically adjusted: styles fully inside the range are removed, styles partially overlapping are trimmed, and styles entirely outside the range are preserved and shifted as needed.

## Advance modes (`by`)

Applies to numeric counts only. The unit controls how the deleted amount is measured and chunked:

```ts
// Delete 5 characters one at a time - backward
tw.timeline.delete(-5, { by: "char", interval: 60 });

// Delete 3 characters at a time - forward
tw.timeline.delete(6, { by: { unit: "char", amount: 3 }, interval: 80 });
// 2 steps, each removes 3 chars

// Delete 2 words backward
tw.timeline.delete(-2, { by: "word", interval: 100 });

// Delete 2 lines forward
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

<DocsPlayground :code="typeBackspaceCode" />

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

<DocsPlayground :code="typoCode" />

### Delete by word (backward)

```ts
tw.timeline
  .type("The quick brown fox", { by: "word", interval: 140 })
  .wait(500)
  .delete(-3, { by: "word", interval: 120 });

await tw.play();
// → "The quick brown fox", then removes "fox", "brown ", "quick " → "The "
```

<DocsPlayground :code="deleteByWordCode" />

### Delete to document start

```ts
tw.timeline
  .type("Preamble - Hello world", { by: "char", interval: 60 })
  .move(-11)        // cursor is now before "Hello world"
  .delete("start"); // removes "Preamble - " in one step

await tw.play();
// result: "Hello world"
```

### Delete to document end

```ts
tw.timeline
  .type("Hello world - Epilogue", { by: "char", interval: 60 })
  .move(-11)        // cursor right after "Hello world"
  .delete("end");   // removes " - Epilogue" in one step

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

<DocsPlayground :code="eraseWholeCode" />

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

### Delete a single-line string by line

```ts
tw.timeline
  .type("Loading fffff", { by: "line", interval: 80 })
  .delete(-2, { by: "line", interval: 150 });

await tw.play();
// cursor is at end after typing; line delete falls back to the current line's content
// result: ""
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

<DocsPlayground :code="deleteSelectionCode" />

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

- **Cursor at position 0 with backward deletion** - no-op for `char`, `grapheme`, and `word`; for `by: "line"` the current line's content is consumed, which deletes the whole line on single-line text.
- **Cursor at the end with forward deletion** - no-op for `char`, `grapheme`, and `word`; for `by: "line"` the current line's content is consumed, which deletes the whole line on single-line text.
- **`|count|` larger than available text** - deletion stops at the document boundary without error.
- **`"whole"` on an empty document** - no-op.
- **`"start"` with cursor at 0** - no-op.
- **`"end"` with cursor at the end** - no-op.
- **Active selection** - for numeric and `"start"`/`"end"` operands, the entire selected range is deleted in one step; `count` and `by` are ignored. `"whole"` always deletes the entire document regardless of any active selection.
- **Unknown `by` value** - passing an unrecognised advance unit such as `"custom"` throws an error at compile time. Only `"char"`, `"grapheme"`, `"word"`, and `"line"` are accepted for `by`. `"whole"` is not a valid `by` unit - use `.delete("whole")` instead.
- **`by: "line"` on text without newlines** - the whole text is treated as a single line. Forward delete from the end (or backward delete from the start) consumes the entire line's content.
- **Unknown boundary string** - passing a string operand other than `"whole"`, `"start"`, or `"end"` throws an error at compile time.

## Type reference

- [`TDeleteOptions`](/api/type-aliases/TDeleteOptions)
- [`TDeleteCommand`](/api/type-aliases/TDeleteCommand)
- [`TDeleteValue`](/api/type-aliases/TDeleteValue)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
