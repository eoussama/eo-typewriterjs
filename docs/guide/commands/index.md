# Commands

Commands are the building blocks of a typewriter animation. They are scheduled on the [`TimelineBuilder`](/guide/timeline) and compiled into timed playback events when `play()` is called. No work is done at the moment you call a builder method, the entire sequence is defined declaratively, then replayed.

## Command model

The typewriter maintains an internal **timeline clock** that tracks how many milliseconds have elapsed since the animation started. Each timed command advances this clock; instant and timing-only commands do not. Every event is scheduled at a precise timestamp relative to that clock.

There are five categories:

### Segmented commands

Segmented commands split their operand into `ceil(totalUnits / amount)` steps and emit **one event per step per targeted cursor**. The clock advances by `steps × interval` ms.

| Command | Steps | Mutates document? |
|---|---|---|
| [type](/guide/commands/type) | One per text chunk (char, grapheme, word, line…) | Yes, inserts text |
| [delete](/guide/commands/delete) | One per deleted chunk (numeric counts only) | Yes, removes text |
| [move](/guide/commands/move) | `ceil(\|offset\| / amount)` per cursor (numeric offsets only) | No, repositions cursor |
| [select](/guide/commands/select) | `ceil(\|count\| / amount)` per cursor (numeric counts only) | No, sets cursor's selection range |

A zero operand (`move(0)`, `select(0)`) is a special case: no events are emitted and the clock does not advance, but lifecycle hooks still fire once during sequential playback.

### Boundary commands

Boundary commands accept a **string operand** (`"start"`, `"end"`, or `"whole"` where applicable). They compile to **one event per targeted cursor** at the current clock position, then advance the clock by `interval` (default `50 ms`).

| Command | Accepted boundaries | Mutates document? |
|---|---|---|
| [delete](/guide/commands/delete) | `"start"`, `"end"`, `"whole"` | Yes, removes text |
| [move](/guide/commands/move) | `"start"`, `"end"` | No, repositions cursor |
| [select](/guide/commands/select) | `"start"`, `"end"`, `"whole"` | No, sets cursor's selection range |

### Instant commands

Instant commands compile to **one event per targeted cursor** at the current clock position. They do **not** advance the clock. If they follow any other command, they fire at the exact timestamp that command ends.

| Command | Mutates document? |
|---|---|
| [unselect](/guide/commands/unselect) | No, clears the cursor's selection |
| [style](/guide/commands/style) | Yes, adds a style to a document range |
| [unstyle](/guide/commands/unstyle) | Yes, removes styles from a document range |

### Timing-only commands

Timing-only commands produce **no events** and do not mutate the document. They only advance the timeline clock, creating a gap before the next command starts.

| Command | Clock advance |
|---|---|
| [wait](/guide/commands/wait) | Exactly `duration` ms |

### Runtime-only commands

Runtime-only commands produce **no compiled events** and do not appear in the event stream. They are executed purely by the sequential executor (`play()` / `replay()`), between the commands that surround them.

`.call()` can suspend playback: if the callback returns a `Promise`, the executor waits for it to settle before starting the next command. It has no effect during event-based navigation (`seek()`, `stepForward()`, `stepBackward()`).

| Command | Mutates document? |
|---|---|
| [call](/guide/commands/call) | No, invokes a callback function |

## Command overview table

| Command | Signature | Advances clock? | Mutates document? |
|---|---|---|---|
| [type](/guide/commands/type) | `.type(text, options?)` | ✅ yes | ✅ yes, inserts text |
| [delete](/guide/commands/delete) | `.delete(count, options?)` | ✅ yes | ✅ yes, removes text |
| [move](/guide/commands/move) | `.move(offset, options?)` | ✅ yes, `steps × interval` ms (numeric) / `interval` ms (boundary) | ❌ no |
| [wait](/guide/commands/wait) | `.wait(duration, options?)` | ✅ yes | ❌ no |
| [select](/guide/commands/select) | `.select(count, options?)` | ✅ yes, `steps × interval` ms (numeric) / `interval` ms (boundary) | ❌ no |
| [unselect](/guide/commands/unselect) | `.unselect(options?)` | ❌ no | ❌ no |
| [style](/guide/commands/style) | `.style(style, range, options?)` | ❌ no | ✅ yes, applies style |
| [unstyle](/guide/commands/unstyle) | `.unstyle(range, options?)` | ❌ no | ✅ yes, removes style |
| [call](/guide/commands/call) | `.call(fn, options?)` | ❌ no | ❌ no |

> **Note on `delete` with boundary operands:** When `count` is `"start"`, `"end"`, or `"whole"`, the deletion happens in a single step. The clock still advances by the default interval (50 ms), so commands after a boundary delete are scheduled 50 ms later.

## Shared options

All commands accept the following options in addition to their own:

| Option | Type | Description |
|---|---|---|
| `before` | `TCallbackHook` | Hook invoked before each step (or once for instant commands) |
| `after` | `TCallbackHook` | Hook invoked after each step (or once for instant commands) |
| `audio` | `TAudioCommandOverride` | Per-command audio override, `false` to silence, or an object with sfx/volume settings |

See [Hooks and context](#hooks-and-context) below for the full hook shape.

## Cursor targeting

Every command accepts a `cursor` option (default: `"main"`) that names the cursor to target. Pass an array of cursor IDs to target multiple cursors with the same command. Each named cursor maintains its own independent position and selection in the shared document.

```ts
// All three cursors type the same text at their respective positions
tw.timeline.type("Hello", { cursor: ["a", "b", "c"] });

// Independently reposition two cursors
tw.timeline
  .move("start", { cursor: "a" })
  .move("end", { cursor: "b" });
```

The `"main"` cursor is always present. Additional named cursors are created the first time they are referenced in a command.

## Advance modes

Segmented commands (`type`, `delete`, `move`, `select`) all accept a `by` option that controls the unit of segmentation. This is called the **advance mode**.

### String shortcuts

| Value | Meaning |
|---|---|
| `"char"` | One Unicode code unit per step (default) |
| `"grapheme"` | One grapheme cluster per step, safe for emoji and composed characters |
| `"word"` | One whitespace-delimited word per step |
| `"line"` | One newline-delimited line per step |
| `"whole"` | The entire input as a single step |

### Object form - multiple units per step

Use `{ unit, amount }` to consume multiple units per step:

```ts
// Delete 3 characters per step instead of 1
tw.timeline.delete(-9, { by: { unit: "char", amount: 3 } });
// 3 steps: removes 3 chars each time → 9 chars total removed
```

```ts
// Type 2 words per step
tw.timeline.type("one two three four", { by: { unit: "word", amount: 2 } });
// steps: "one two " → "one two three four"
```

## Composition patterns

Commands compose by chaining. `select` advances the clock by `interval` (default `50 ms`). `move` advances the clock by `steps × interval` for numeric offsets, or `interval` for string boundaries. `style`, `unstyle`, and `unselect` are instant and do not advance the clock, so multiple instant operations stack at the same timestamp:

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 }) // timed: ~880 ms
  .wait(600)                                          // pause 600 ms
  .move(-5)                                           // segmented: 5 steps × 50 ms = 250 ms
  .select(5)                                          // segmented: 5 steps × 50 ms = 250 ms
  .style("highlight", "selection")                   // instant (fires at same moment as previous end)
  .move("end")                                        // boundary: advances clock 50 ms
  .type("!", { by: "char", interval: 80 });           // timed: 80 ms

await tw.play();
// Result: "Hello World!", "World" permanently carries the "highlight" class
```

### Simulated editing

```ts
tw.timeline
  .type("The quikc brown fox", { by: "char", interval: 70 }) // intentional typo
  .wait(400)
  .move(-15, { by: "char" })   // cursor before "quikc"
  .delete(5, { by: "char", interval: 50 }) // delete "quikc", positive number indicates 5 characters to the right of the cursor
  .type("quick", { by: "char", interval: 70 }) // retype correctly
  .move("end")
  .type(".", { by: "char", interval: 70 });

await tw.play();
// "The quick brown fox."
```

### Highlight then erase

```ts
tw.timeline
  .type("Loading data...", { by: "char", interval: 60 })
  .wait(1000)
  .select("whole")
  .style("faded", "selection")
  .wait(400)
  .delete("whole")
  .type("Done.", { by: "char", interval: 80 });

await tw.play();
```

## Hooks and context

Every command accepts optional `before` and `after` lifecycle hooks. They share the same `TCallbackFn` signature, which receives a `TCallbackContext`.

**For segmented commands** (`type`, `delete`, `move` with a numeric offset, and `select` with a numeric count), both hooks fire once per step, before and after each individual operation.

**For all other commands** (boundary `delete`/`move`/`select`, `unselect`, `style`, `unstyle`, `wait`, `call`, and `move(0)`/`select(0)`), they fire once total.

```ts
tw.timeline.type("Hello world", {
  by: "word",
  interval: 200,
  before: ({ state, stepIndex, stepCount }) => {
    console.log(`About to type step ${stepIndex + 1}/${stepCount}`);
    console.log(`Document is currently: "${state.document.text}"`);
  },
  after: ({ state, stepIndex, stepCount }) => {
    console.log(`After step ${stepIndex + 1}/${stepCount}: "${state.document.text}"`);
  },
});
```

```ts
tw.timeline.move("start", {
  before: ({ state }) => {
    console.log(`Cursor about to jump from position ${state.cursors["main"].index}`);
  },
  after: ({ state }) => {
    console.log(`Cursor is now at ${state.cursors["main"].index}`);
  },
});
```

### `TCallbackContext` fields

| Field | Type | Description |
|---|---|---|
| `state` | `TTypewriterState` | Current document and cursor snapshot at the time of invocation |
| `stepIndex` | `number` | Zero-based index of the current step within the command |
| `stepCount` | `number` | Total number of steps the command will produce |
| `unit` | `TAdvanceUnit \| null` | The text chunk typed or deleted in this step, or `null` for instant commands |
| `signal` | `AbortSignal` | Aborted when `tw.cancel()` is called |

The `state` is a read-only snapshot. Mutating it does not affect the running animation. Use `tw.cancel()` or the `signal` to respond to cancellation.

## Selection lifecycle

A selection is created on a cursor by `.select()` and cleared by the first of these that targets the same cursor afterward:

1. `.type()`: the selected range is **replaced** by the typed text on the first step; subsequent steps insert normally at the cursor position
2. `.delete()`: the selected range is **deleted** and the `count`/direction operand is **ignored**; use `"whole"` as the operand to clear the entire document regardless of any selection
3. `.move()`: the selection is cleared; the cursor jumps to the new position
4. `.unselect()`: the selection is cleared; the cursor stays in place
5. `.select()`: the existing selection is replaced by the new one

`.style()` and `.unstyle()` with `"selection"` read the selection range and **do** clear the selection state after applying. Unlike the commands above, they mutate the document (styles list) without moving the cursor.

## Command pages

- [Type](/guide/commands/type)
- [Delete](/guide/commands/delete)
- [Move](/guide/commands/move)
- [Wait](/guide/commands/wait)
- [Select](/guide/commands/select)
- [Unselect](/guide/commands/unselect)
- [Style](/guide/commands/style)
- [Unstyle](/guide/commands/unstyle)
- [Call](/guide/commands/call)
