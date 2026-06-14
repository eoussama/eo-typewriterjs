# Timeline & Commands

The `TimelineBuilder` is the primary interface for scheduling what the typewriter types and how. Commands are stored in order and compiled into timed playback events when `play()` is called.

## Commands overview

| Command | Method | Description |
|---|---|---|
| Type | `.type(text, options?)` | Insert text into the document step by step |
| Wait | `.wait(duration)` | Pause the timeline for a given number of milliseconds |
| Delete | `.delete(count, options?)` | Remove characters backward from the cursor |
| Move cursor | `.moveCursor(index, options?)` | Teleport the cursor to an absolute document index |
| Mark | `.mark(style, range, options?)` | Apply a style to a range of already-typed text |

All methods return `this`, so calls can be chained fluently:

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(5, { by: "char", interval: 60 })
  .moveCursor(0)
  .type("EO TypewriterJS", { by: "char", interval: 80 })
  .mark("highlight", { from: 3, to: 16 });
```

---

## `.type()` — insert text

```ts
tw.timeline.type(text: string, options?: TTypeOptions): TimelineBuilder
```

Schedules text to be inserted into the document one step at a time. Each step produces an **insert event** that advances the document text and the cursor.

### `TTypeOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to segment the text into steps |
| `interval` | `number` | `100` | Milliseconds between each step |
| `cursor` | `string` | `"main"` | Which cursor to advance |

### Advance modes (`by`)

#### String shortcuts

```ts
tw.timeline.type("Hello", { by: "char" });            // one character per step (default)
tw.timeline.type("Hello", { by: "grapheme" });        // one grapheme cluster per step
tw.timeline.type("Hello world", { by: "word" });      // one word per step
tw.timeline.type("Line 1\nLine 2", { by: "line" });   // one line per step
tw.timeline.type("All at once", { by: "custom" });    // entire text as a single step
```

#### Object form (with `amount`)

```ts
// 2 characters per step
tw.timeline.type("Hello!", { by: { unit: "char", amount: 2 } });
// → "He" → "Hell" → "Hello!"

// 3 words per step
tw.timeline.type("one two three four five", { by: { unit: "word", amount: 3 } });
// → "one two three " → "one two three four five"
```

### Unicode and emoji

Use `"grapheme"` to handle multi-codepoint sequences correctly:

```ts
// ✅ Correct — each emoji is one step
tw.timeline.type("🇺🇸🇬🇧🇲🇦", { by: "grapheme" });

// ⚠️ May split composite emoji — use grapheme instead
tw.timeline.type("👨‍👩‍👧‍👦", { by: "char" });
```

---

## `.wait()` — pause the timeline

```ts
tw.timeline.wait(duration: number): TimelineBuilder
```

Inserts a pause of `duration` milliseconds before the next command starts.

A `.wait()` command generates **no playback events** — it only advances the internal time cursor used during compilation. The player's existing timing loop handles the resulting gap automatically.

```ts
tw.timeline
  .type("Hello", { by: "char", interval: 80 })
  .wait(600)
  .type(" world", { by: "char", interval: 80 });

await tw.play();
// types "Hello", pauses 600 ms, then types " world"
```

---

## `.delete()` — remove text

```ts
tw.timeline.delete(count: number, options?: TDeleteOptions): TimelineBuilder
```

Removes `count` units of text backward from the cursor position, one step at a time.

### `TDeleteOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | How to count units when deleting |
| `interval` | `number` | `100` | Milliseconds between each deletion step |
| `cursor` | `string` | `"main"` | Which cursor to delete from |

### Behavior

- Deletion is clamped to the start of the document — it will not delete beyond position 0
- Each step removes one "unit" (character, word, etc.) and decrements the cursor

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .wait(500)
  .delete(6, { by: "char", interval: 60 });

await tw.play();
// types "Hello world", pauses, then deletes " world" → leaves "Hello"
```

### Deleting by word

```ts
tw.timeline
  .type("one two three", { by: "word", interval: 150 })
  .wait(400)
  .delete(2, { by: "word", interval: 120 });

await tw.play();
// → "one two three", then deletes "three" and "two "
```

---

## `.moveCursor()` — reposition the cursor

```ts
tw.timeline.moveCursor(index: number, options?: TMoveCursorOptions): TimelineBuilder
```

Teleports the cursor to the given **absolute document index** instantly, with no visible delay and no effect on the timeline clock. Commands after `.moveCursor()` start at the same timestamp as if it were not there.

### `TMoveCursorOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `string` | `"main"` | Which cursor to reposition |

### Behavior

- `index` is clamped to `[0, document.text.length]`
- Subsequent `.type()` calls insert at the new cursor position
- Subsequent `.delete()` calls remove backward from the new cursor position
- The cursor element in the DOM renderer moves to the correct visual position

### Example — prepend text

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .wait(400)
  .moveCursor(0)
  .type("Hello ", { by: "char", interval: 80 });

await tw.play();
// → "world" → pause → "Hello world"
```

### Example — insert in the middle

```ts
tw.timeline
  .type("Helloworld", { by: "char", interval: 80 })
  .moveCursor(5)
  .type(" ", { by: "char", interval: 1 });

await tw.play();
// → "Helloworld" → "Hello world"
```

---

## `.mark()` — apply a style to typed text

```ts
tw.timeline.mark(style: TStyleRef, range: TMarkRange | "selection", options?: TMarkOptions): TimelineBuilder
```

Applies a style mark to a range of document text. The mark is stored on the document's `marks` array and consumed by renderers to produce styled output (DOM spans, ANSI codes, etc.).

`.mark()` is **instantaneous** — it does not advance the timeline clock and produces no visible delay.

### `TMarkOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `string` | `"main"` | Which cursor's selection to use when `range` is `"selection"` |

### `TMarkRange`

```ts
type TMarkRange = { from: number; to: number };
```

An absolute character-index range within the document text (`from` inclusive, `to` exclusive).

### `TStyleRef`

A style reference can be either a plain CSS class name string or a `TStyleObject`:

```ts
// class name shorthand
tw.timeline.mark("highlight", { from: 0, to: 5 });

// full style object
tw.timeline.mark(
  { className: "tag", css: { color: "#ef4444" }, attrs: { "data-label": "error" } },
  { from: 0, to: 5 }
);
```

`TStyleObject` fields:

| Field | Type | Description |
|---|---|---|
| `className` | `string` | One or more CSS class names (space-separated) |
| `css` | `Record<string, string>` | Inline CSS properties applied to the span |
| `attrs` | `Record<string, string>` | HTML attributes set on the span |
| `ansi` | `Record<string, string>` | ANSI escape code segments used by `StringRenderer.toAnsiString()` |
| `meta` | `Record<string, unknown>` | Arbitrary metadata; renderers may inspect this for custom behaviour |

---

### Styling as text is typed

Pass `style` to `.type()` to attach a mark to every character as it is inserted:

```ts
tw.timeline
  .type("Hello", { style: "greeting", interval: 80 })
  .type(" World", { style: { css: { color: "#3b82f6" } }, interval: 80 });

await tw.play();
// "Hello" will carry the "greeting" class
// " World" will carry the blue-colour inline style
```

---

### Styling a fixed range

Type text first, then apply a mark at absolute indices:

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .mark("highlight", { from: 6, to: 11 });

await tw.play();
// "World" (indices 6–11) receives the "highlight" class
```

---

### Styling the current selection

Combine `.select()` and `.mark()` to style whatever the cursor has selected:

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .moveCursor(6)
  .select(5)                       // selects "World"
  .mark("highlight", "selection"); // applies style to the selection range

await tw.play();
// "World" receives the "highlight" class; selection UI clears on next command
```

> **Note:** `"selection"` reads the cursor's current selection at play time. The mark is permanent — it persists even after the selection is cleared by subsequent commands.

---

### ANSI styling in the terminal

Use the `ansi` field to drive `StringRenderer.toAnsiString()`:

```ts
tw.timeline
  .type("Error: file not found", { by: "char", interval: 20 })
  .mark({ ansi: { fg: "31", bold: "1" } }, { from: 0, to: 5 });

// After play:
renderer.toAnsiString(); // "\x1B[31;1mError\x1B[0m: file not found"
```

---

## Chaining multiple commands

Commands are applied in the order they are added. The timeline clock advances only for commands that produce events with durations (`type`, `delete`). `wait` advances the clock by its duration. `moveCursor` does not advance the clock at all.

```ts
tw.timeline
  .type("Loading", { by: "char", interval: 80 })
  .type("...", { by: "char", interval: 300 })
  .wait(400)
  .delete(3, { by: "char", interval: 80 })
  .type("!", { by: "char", interval: 1 });

await tw.play();
// "Loading..." → pause → "Loading" → "Loading!"
```

---

## Replaying

Because commands are stored in the builder and compiled fresh on each `play()` call, the same animation can be replayed:

```ts
await tw.play(); // first run
await tw.play(); // plays the same sequence again
```

---

## Accessing the command list

```ts
console.log(tw.timeline.commands);
// ReadonlyArray<TTypeCommand | TWaitCommand | TDeleteCommand | TMoveCursorCommand | TMarkCommand>
```

This is the raw ordered list that gets compiled when `play()` is called. You can inspect it for debugging.

---

## Type reference

- [`TimelineBuilder`](/api/classes/TimelineBuilder)
- [`TTypeOptions`](/api/type-aliases/TTypeOptions)
- [`TDeleteOptions`](/api/type-aliases/TDeleteOptions)
- [`TMarkOptions`](/api/type-aliases/TMarkOptions)
- [`TMarkRange`](/api/type-aliases/TMarkRange)
- [`TAdvanceMode`](/api/type-aliases/TAdvanceMode)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TAdvanceUnit`](/api/type-aliases/TAdvanceUnit)
- [`TTypeCommand`](/api/type-aliases/TTypeCommand)
- [`TWaitCommand`](/api/type-aliases/TWaitCommand)
- [`TDeleteCommand`](/api/type-aliases/TDeleteCommand)
- [`TMoveCursorCommand`](/api/type-aliases/TMoveCursorCommand)
- [`TMarkCommand`](/api/type-aliases/TMarkCommand)
- [`TStyleRef`](/api/type-aliases/TStyleRef)
- [`TStyleObject`](/api/type-aliases/TStyleObject)
