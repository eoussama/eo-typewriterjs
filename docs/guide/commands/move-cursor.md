# `.moveCursor()` — reposition the cursor

Teleports the cursor to a given absolute document index instantly.

```ts
tw.timeline.moveCursor(index: number, options?: TMoveCursorOptions): TimelineBuilder
```

`.moveCursor()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. Commands after it start at the same timestamp.

## Options

```ts
type TMoveCursorOptions = {
  cursor?: TCursorSelector; // default: "main"
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `TCursorSelector` | `"main"` | Which cursor to reposition |

## Behavior

- `index` is an **absolute** character index into the document text (`0` = before the first character, `text.length` = after the last character).
- `index` is **clamped** to `[0, document.text.length]` — values outside this range are silently clamped, not rejected.
- The cursor's current **selection is cleared** when `.moveCursor()` fires.
- The move is invisible — no visual transition occurs, the cursor jumps immediately.
- Subsequent `.type()` calls insert at the new cursor position.
- Subsequent `.delete()` calls remove backward from the new cursor position.
- In the DOM renderer, the cursor element moves to the correct visual location.

## Examples

### Prepend text

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .wait(400)
  .moveCursor(0)
  .type("Hello ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world"
```

### Insert in the middle

```ts
tw.timeline
  .type("Helloworld", { by: "char", interval: 80 })
  .moveCursor(5)
  .type(" ");

await tw.play();
// result: "Hello world"
```

### Replace a specific word

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .wait(600)
  .moveCursor(6) // position before "World"
  .delete(5, { by: "char", interval: 60 }) // remove "World"
  .type("TypewriterJS", { by: "char", interval: 80 });

await tw.play();
// result: "Hello TypewriterJS"
```

### Multi-cursor repositioning

```ts
tw.timeline
  .type("Hello", { cursor: ["a", "b"] })
  .moveCursor(0, { cursor: "a" }) // move only cursor "a"
  .type(">> ", { cursor: "a" }); // cursor "a" prepends

await tw.play();
```

## Interaction with selections

`.moveCursor()` always clears the selection of the targeted cursor. This is the standard way to deselect after a `.select()` command:

```ts
tw.timeline
  .type("Hello World")
  .moveCursor(6)
  .select(5) // selects "World"
  .mark("highlight", "selection") // style the selection
  .moveCursor(11); // deselect — cursor goes to end

await tw.play();
```

## Clock behavior

Because `.moveCursor()` does not advance the clock, any timed command that follows starts at the same timestamp as if the move were not there:

```ts
tw.timeline
  .type("Hello", { interval: 80 }) // ends at 5 × 80 = 400 ms
  .moveCursor(0) // no clock change — still at 400 ms
  .type(">> ", { interval: 80 }); // starts at 400 ms

await tw.play();
```

## Edge cases

- **`index = 0`** — moves cursor to the very start of the document.
- **`index = text.length`** — moves cursor to the very end of the document.
- **`index < 0`** — clamped to `0`.
- **`index > text.length`** — clamped to `text.length`.
- **Calling on an empty document** — clamped to `0`; effectively a no-op.
- **Consecutive `.moveCursor()` calls** — each fires at the same timestamp and replaces the previous cursor position; only the last one has an observable effect on subsequent commands.

## Type reference

- [`TMoveCursorOptions`](/api/type-aliases/TMoveCursorOptions)
- [`TMoveCursorCommand`](/api/type-aliases/TMoveCursorCommand)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
