# `.move()` — reposition the cursor

Moves the cursor **relative to its current position** by a given number of units.

```ts
tw.timeline.move(offset: number, options?: TMoveOptions): TimelineBuilder
```

`.move()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock.

**Signed offset semantics:**

| `offset` | Direction |
|---|---|
| Positive (`offset > 0`) | Move **right** (forward in the document) |
| Negative (`offset < 0`) | Move **left** (backward in the document) |
| Zero (`offset === 0`) | **No-op** — cursor stays where it is |

## Options

```ts
type TMoveOptions = {
  by?: TAdvanceModeInput;   // default: "char"
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | Unit granularity for the offset |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor to reposition (supports multi-cursor arrays) |
| `before` | `TCallbackHook` | — | Hook fired before the cursor moves |
| `after` | `TCallbackHook` | — | Hook fired after the cursor has moved |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Behavior

- The cursor moves `|offset|` units from its **current position** in the direction indicated by the sign.
- The result is **clamped** to `[0, document.text.length]` — the cursor never moves past document boundaries.
- The cursor's current **selection is cleared** when `.move()` fires.
- Subsequent `.type()` calls insert at the new cursor position.
- Subsequent `.delete(-n)` calls remove backward from the new cursor position.
- In the DOM renderer, the cursor element moves to the correct visual location.

## Advance modes (`by`)

```ts
tw.timeline.move(-5, { by: "char" });  // move 5 chars left
tw.timeline.move(2, { by: "word" });   // move 2 words right
tw.timeline.move(-1, { by: "line" });  // move 1 line up
```

## Examples

### Prepend text (move to start)

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .wait(400)
  .move(-999) // a large negative offset clamps to 0
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

### Correct a typo (forward-delete a misplaced char)

```ts
tw.timeline
  .type("Helo world", { by: "char", interval: 80 })
  .move(-9)
  .delete(1, { by: "char", interval: 50 }); // forward delete duplicate 'l'

await tw.play();
// "Helo world" → "Helo world" (extra l removed)
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
  .move(-999, { cursor: "a" }) // move only cursor "a" to start
  .type(">> ", { cursor: "a" });

await tw.play();
```

## Interaction with selections

`.move()` always clears the selection of the targeted cursor. This is the standard way to deselect after a `.select()` command:

```ts
tw.timeline
  .type("Hello World")
  .move(-5)
  .select(5)                    // selects "World"
  .style("highlight", "selection")
  .move(0);                     // zero = no-op, but position is preserved

await tw.play();
```

## Clock behavior

Because `.move()` does not advance the clock, any timed command that follows starts at the same timestamp:

```ts
tw.timeline
  .type("Hello", { interval: 80 })  // ends at 400 ms
  .move(-999)                       // no clock change — still at 400 ms
  .type(">> ", { interval: 80 });   // starts at 400 ms

await tw.play();
```

## Edge cases

- **`offset = 0`** — no-op; cursor stays in place.
- **Large positive offset** — clamped to `text.length`.
- **Large negative offset** — clamped to `0`.
- **Empty document** — clamped to `0`; effectively a no-op.
- **Consecutive `.move()` calls** — each fires at the same timestamp; only the cumulative effect matters for the next command.

## Type reference

- [`TMoveOptions`](/api/type-aliases/TMoveOptions)
- [`TMoveCommand`](/api/type-aliases/TMoveCommand)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
