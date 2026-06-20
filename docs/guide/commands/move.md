# `.move()` — reposition the cursor

Moves the cursor to a new position.

```ts
tw.timeline.move(offset: TMoveValue, options?: TMoveOptions): TimelineBuilder
```

`.move()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock.

**Operand semantics:**

| `offset` | Behavior |
|---|---|
| Positive number (`offset > 0`) | Move **right** (forward in the document) |
| Negative number (`offset < 0`) | Move **left** (backward in the document) |
| Zero (`offset === 0`) | **No-op** — cursor stays where it is |
| `"start"` | Jump to absolute document **start** (index 0) |
| `"end"` | Jump to absolute document **end** (index `text.length`) |

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
| `cursor` | `TCursorSelector` | `"main"` | Which cursor to reposition (supports multi-cursor arrays) |
| `before` | `TCallbackHook` | — | Hook fired before the cursor moves |
| `after` | `TCallbackHook` | — | Hook fired after the cursor has moved |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- `"start"` and `"end"` jump to the absolute document boundaries regardless of the cursor's current position.
- Numeric offsets move the cursor `|offset|` units from its **current position** in the direction indicated by the sign.
- The result is **clamped** to `[0, document.text.length]` — the cursor never moves past document boundaries.
- The cursor's current **selection is cleared** when `.move()` fires.
- Subsequent `.type()` calls insert at the new cursor position.
- Subsequent `.delete(-n)` calls remove backward from the new cursor position.

## Advance modes (`by`)

Applies to numeric offsets only:

```ts
tw.timeline.move(-5, { by: "char" });  // move 5 chars left
tw.timeline.move(2, { by: "word" });   // move 2 words right
tw.timeline.move(-1, { by: "line" });  // move 1 line up
```

## Examples

### Jump to document start

```ts
tw.timeline
  .type("hello world", { by: "char", interval: 80 })
  .move("start")
  .type(">", { by: "char", interval: 80 });

await tw.play();
// result: ">hello world"
```

### Jump to document end

```ts
tw.timeline
  .type("hello world", { by: "char", interval: 80 })
  .move("start")
  .move("end")
  .type("!", { by: "char", interval: 80 });

await tw.play();
// result: "hello world!"
```

### Prepend text (large negative offset)

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .wait(400)
  .move(-999) // large negative offset clamps to 0
  .type("Hello ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world"
```

### Insert in the middle

```ts
tw.timeline
  .type("Helloworld", { by: "char", interval: 80 })
  .move(-5) // move cursor 5 chars left (between "Hello" and "world")
  .type(" ");

await tw.play();
// result: "Hello world"
```

### Move by word

```ts
tw.timeline
  .type("The quick brown fox", { by: "char", interval: 60 })
  .move(-2, { by: "word" }) // move back 2 words
  .type("red ", { by: "char", interval: 60 }); // insert before "brown"

await tw.play();
// result: "The quick red brown fox"
```

### Multi-cursor repositioning

```ts
tw.timeline
  .type("Hello", { cursor: ["a", "b"] })
  .move("start", { cursor: "a" }) // move only cursor "a" to start
  .type(">> ", { cursor: "a" });

await tw.play();
```

## Interaction with selections

`.move()` always clears the selection of the targeted cursor:

```ts
tw.timeline
  .type("Hello World")
  .move(-5)
  .select(5)                    // selects "World"
  .style("highlight", "selection")
  .move("end");                 // clears selection, jumps to end

await tw.play();
```

## Clock behavior

Because `.move()` does not advance the clock, any timed command that follows starts at the same timestamp:

```ts
tw.timeline
  .type("Hello", { interval: 80 })  // ends at 400 ms
  .move("start")                    // no clock change — still at 400 ms
  .type(">> ", { interval: 80 });   // starts at 400 ms

await tw.play();
```

## Edge cases

- **`offset = 0`** — no-op; cursor stays in place.
- **`"start"` when cursor is already at 0** — no-op.
- **`"end"` when cursor is already at `text.length`** — no-op.
- **Large positive offset** — clamped to `text.length`.
- **Large negative offset** — clamped to `0`.
- **Empty document** — clamped to `0`; effectively a no-op.

## Type reference

- [`TMoveOptions`](/api/type-aliases/TMoveOptions)
- [`TMoveCommand`](/api/type-aliases/TMoveCommand)
- [`TMoveValue`](/api/type-aliases/TMoveValue)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
