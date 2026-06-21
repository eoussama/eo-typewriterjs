# Commands

Commands are the building blocks of a typewriter animation. They are scheduled on the [`TimelineBuilder`](/guide/timeline) and compiled into timed playback events when `play()` is called. No work is done at the moment you call a builder method, the entire sequence is defined declaratively, then replayed.

## Command model

The typewriter maintains an internal **timeline clock** that tracks how many milliseconds have elapsed since the animation started. Each timed command advances this clock; instant and timing-only commands do not. Every event is scheduled at a precise timestamp relative to that clock.

There are three categories:

### Timed commands

Timed commands produce **multiple playback events** spread over time. Each event fires at a calculated timestamp and mutates the document by one step.

| Command | Steps | Clock advance |
|---|---|---|
| [type](/guide/commands/type) | One per chunk of text (char, word, line…) | `steps × interval` ms |
| [delete](/guide/commands/delete) | One per deleted chunk (numeric counts only) | `steps × interval` ms |

### Timing-only commands

Timing-only commands produce **no events** and do not mutate the document. They simply advance the timeline clock, creating a gap before the next command.

| Command | Clock advance |
|---|---|
| [wait](/guide/commands/wait) | Exactly `duration` ms |

### Instant commands

Instant commands produce **a single event** at the current clock position. They do not advance the clock. If they follow a timed command, they fire at the exact moment that command finishes.

`.call()` is a special case: it produces **no timeline events** and does not appear in the compiled event list. It is executed purely at runtime by the executor, between the commands that surround it.

| Command | Mutates document? |
|---|---|
| [move](/guide/commands/move) | No, repositions the cursor only |
| [select](/guide/commands/select) | No, sets the cursor's selection range |
| [unselect](/guide/commands/unselect) | No, clears the cursor's selection |
| [style](/guide/commands/style) | Yes, adds a style to a document range |
| [unstyle](/guide/commands/unstyle) | Yes, removes styles from a document range |
| [call](/guide/commands/call) | No, invokes a callback function |

## Command overview table

| Command | Signature | Advances clock? | Mutates document? |
|---|---|---|---|
| [type](/guide/commands/type) | `.type(text, options?)` | ✅ yes | ✅ yes, inserts text |
| [delete](/guide/commands/delete) | `.delete(count, options?)` | ✅ yes | ✅ yes, removes text |
| [move](/guide/commands/move) | `.move(offset, options?)` | ❌ instant | ❌ no |
| [wait](/guide/commands/wait) | `.wait(duration, options?)` | ✅ yes | ❌ no |
| [select](/guide/commands/select) | `.select(count, options?)` | ❌ instant | ❌ no |
| [unselect](/guide/commands/unselect) | `.unselect(options?)` | ❌ instant | ❌ no |
| [style](/guide/commands/style) | `.style(style, range, options?)` | ❌ instant | ✅ yes, applies style |
| [unstyle](/guide/commands/unstyle) | `.unstyle(range, options?)` | ❌ instant | ✅ yes, removes style |
| [call](/guide/commands/call) | `.call(fn, options?)` | ❌ instant | ❌ no |

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

Timed commands (`type`, `delete`) and movement commands (`move`, `select`) all accept a `by` option that controls the unit of segmentation. This is called the **advance mode**.

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

Commands compose by chaining. Because instant commands do not advance the clock, you can attach multiple instant operations between timed ones without any perceived gap in the animation:

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 }) // timed: ~880 ms
  .wait(600)                                          // pause 600 ms
  .move(-5)                                           // instant
  .select(5)                                          // instant (fires at same moment)
  .style("highlight", "selection")                   // instant (fires at same moment)
  .move("end")                                        // instant (fires at same moment)
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

**For timed commands** (`type`, `delete`), both hooks fire once per step, before and after each individual insertion or deletion.

**For instant and timing-only commands** (`move`, `select`, `style`, `wait`, `call`, etc.), they fire once total.

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

1. `.type()`: the selection is cleared on the first type step; text is inserted at the cursor position (the selected range is **not** deleted automatically)
2. `.delete()`: deletion proceeds based on `count` and direction from the cursor position; the selection is cleared afterward (the selected range is **not** deleted automatically)
3. `.move()`: the selection is cleared; the cursor jumps to the new position
4. `.unselect()`: the selection is cleared; the cursor stays in place
5. `.select()`: the existing selection is replaced by the new one

`.style()` and `.unstyle()` with `"selection"` consume the selection range as a target but do **not** clear the selection state. Use `.move()` or `.unselect()` afterward to dismiss the highlight.

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
