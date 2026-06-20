# `.move()` — reposition the cursor

Moves a cursor to a new position in the document.

```ts
tw.timeline.move(offset: TMoveValue, options?: TMoveOptions): TimelineBuilder
```

`.move()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. If placed after a timed command, it fires at the exact moment the previous command finishes.

## Operand semantics

| `offset` | Behavior |
|---|---|
| Positive number (`offset > 0`) | Move **forward** (right) from the current position |
| Negative number (`offset < 0`) | Move **backward** (left) from the current position |
| Zero (`offset === 0`) | No-op — cursor stays in place |
| `"start"` | Jump to absolute document **start** (index 0) |
| `"end"` | Jump to absolute document **end** (index `text.length`) |

`"start"` and `"end"` are absolute: they jump to the document boundaries regardless of where the cursor currently is. Numeric offsets are relative to the cursor's current position.

The resulting position is always **clamped** to `[0, text.length]` — the cursor never moves past document boundaries.

## Options

```ts
type TMoveOptions = {
  by?: TAdvanceModeInput;   // default: "char" (numeric offsets only)
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | Unit granularity for the offset (numeric offsets only) |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor(s) to reposition |
| `before` | `TCallbackHook` | — | Hook fired before the cursor moves |
| `after` | `TCallbackHook` | — | Hook fired after the cursor has moved |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- The cursor's current **selection is cleared** when `.move()` fires.
- Subsequent `.type()` calls insert at the new cursor position.
- Subsequent `.delete(-n)` calls delete backward from the new cursor position.
- Subsequent `.delete(n)` calls delete forward from the new cursor position.
- `.move()` does not fire intermediate steps — it is a single atomic jump.

## Advance modes (`by`)

Applies to numeric offsets. The unit controls what one "step" of movement means:

```ts
// Move 5 characters backward
tw.timeline.move(-5, { by: "char" });

// Move 3 words forward
tw.timeline.move(3, { by: "word" });

// Move 2 words backward
tw.timeline.move(-2, { by: "word" });

// Move past 1 newline-delimited segment backward
tw.timeline.move(-1, { by: "line" });
```

Note: `"line"` splits on `\n` characters in the document text. There is no concept of visual rows — movement is purely character-based.

## Examples

### Jump to document start and prepend text

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .move("start")
  .type(">>> ", { by: "char", interval: 80 });

await tw.play();
// result: ">>> Hello world"
```

### Jump to document end and append

```ts
tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .move("start")          // jump to start
  .move("end")            // jump back to end
  .type("!", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world!"
```

### Insert text in the middle

```ts
tw.timeline
  .type("Helloworld", { by: "char", interval: 80 })
  .move(-5)    // cursor between "Hello" and "world"
  .type(" ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world"
```

### Move with a large offset (clamped to boundary)

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .move(-9999) // clamps to 0
  .type("Hello ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world"
```

### Move by word to insert before a specific word

```ts
tw.timeline
  .type("The brown fox", { by: "char", interval: 70 })
  .wait(400)
  .move(-2, { by: "word" }) // move back 2 words — cursor before "brown"
  .type("quick ", { by: "char", interval: 70 });

await tw.play();
// result: "The quick brown fox"
```

### Correct a word in the middle of a sentence

```ts
tw.timeline
  .type("The rain in Spain falls mainly on the plane", { by: "char", interval: 50 })
  .wait(600)
  .move("end")
  .move(-5, { by: "char" }) // cursor before "plane"
  .delete(-5, { by: "char", interval: 50 })
  .type("plain", { by: "char", interval: 70 });

await tw.play();
// result: "The rain in Spain falls mainly on the plain"
```

### Multi-cursor repositioning

```ts
tw.timeline
  .type("ABCDE", { cursor: ["a", "b"], by: "char", interval: 80 })
  .move("start", { cursor: "a" }) // only cursor "a" moves to start
  .type(">> ", { cursor: "a", by: "char", interval: 80 });

await tw.play();
```

## Interaction with selections

`.move()` always clears the selection of the targeted cursor. Use `.unselect()` instead if you want to dismiss a selection without changing the cursor position.

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(400)
  .move(-5)
  .select(5)                    // selects "World"
  .style("highlight", "selection")
  .move("end");                 // clears the selection, moves to end

await tw.play();
// "World" carries "highlight"; no selection UI remains
```

## Clock behavior

Because `.move()` does not advance the clock, a chain of instant commands all fire at the same timestamp as the preceding timed command's last event:

```ts
tw.timeline
  .type("Hello", { interval: 80 })  // ends at 400 ms
  .move("start")                    // fires at 400 ms
  .select("whole")                  // fires at 400 ms
  .style("faded", "selection")      // fires at 400 ms
  .move("end")                      // fires at 400 ms
  .type("?", { interval: 80 });     // starts at 400 ms

await tw.play();
```

## Edge cases

- **`offset = 0`** — no-op; cursor stays in place; selection is still cleared.
- **`"start"` when cursor is already at 0** — selection is cleared; position unchanged.
- **`"end"` when cursor is already at `text.length`** — selection is cleared; position unchanged.
- **Large positive offset** — clamped to `text.length`.
- **Large negative offset** — clamped to `0`.
- **Empty document** — any move clamps to `0`.

## Type reference

- [`TMoveOptions`](/api/type-aliases/TMoveOptions)
- [`TMoveCommand`](/api/type-aliases/TMoveCommand)
- [`TMoveValue`](/api/type-aliases/TMoveValue)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
