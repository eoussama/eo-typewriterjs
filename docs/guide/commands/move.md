<script setup>
const prependCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Hello world", { by: "char", interval: 80 })
  .move("start")
  .type(">>> ", { by: "char", interval: 80 });

await tw.play();`;

const insertMiddleCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("Helloworld", { by: "char", interval: 80 })
  .move(-5)
  .type(" ", { by: "char", interval: 80 });

await tw.play();`;

const moveByWordCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The brown fox", { by: "char", interval: 70 })
  .wait(400)
  .move(-2, { by: "word" })
  .type("quick ", { by: "char", interval: 70 });

await tw.play();`;

const correctWordCode = `const tw = createTypewriter({ renderer });

tw.timeline
  .type("The rain in Spain falls mainly on the plane", { by: "char", interval: 50 })
  .wait(600)
  .move("end")
  .move(-5, { by: "char" })
  .delete(5, { by: "char", interval: 50 })
  .type("plain", { by: "char", interval: 70 });

await tw.play();`;
</script>

# `.move()` - reposition the cursor

Moves a cursor to a new position in the document.

```ts
tw.timeline.move(offset: TMoveValue, options?: TMoveOptions): TimelineBuilder
```

`.move()` works like `.type()` and `.delete()`: it splits the offset into steps, emitting one event per unit (or per `amount` units), and advances the timeline clock by `interval` with each step. The cursor moves one step at a time, visiting every intermediate position.

String boundaries (`"start"` and `"end"`) remain a single event, they are still instant jumps.

## Operand semantics

| `offset` | Behavior | Steps |
|---|---|---|
| Positive number (`offset > 0`) | Move **forward** (right) one unit at a time | `ceil(offset / amount)` |
| Negative number (`offset < 0`) | Move **backward** (left) one unit at a time | `ceil(\|offset\| / amount)` |
| Zero (`offset === 0`) | Cursor stays in place, clock does not advance; hooks still fire once during sequential playback | 0 |
| `"start"` | Jump to absolute document **start** (index 0) | 1 |
| `"end"` | Jump to absolute document **end** (index `text.length`) | 1 |

`"start"` and `"end"` are absolute: they jump to the document boundaries regardless of where the cursor currently is. Numeric offsets are relative to the cursor's current position.

The resulting position is always **clamped** to `[0, text.length]` - the cursor never moves past document boundaries.

## Options

```ts
type TMoveOptions = {
  by?: TAdvanceModeInput;   // default: "char" (numeric offsets only)
  interval?: number;        // default: 50 (ms)
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `by` | `TAdvanceModeInput` | `"char"` | Unit granularity for the offset (numeric offsets only) |
| `interval` | `number` | `50` | Duration in ms the move occupies on the timeline |
| `cursor` | `TCursorSelector` | `"main"` | Which cursor(s) to reposition |
| `before` | `TCallbackHook` | - | Hook fired before the cursor moves |
| `after` | `TCallbackHook` | - | Hook fired after the cursor has moved |
| `audio` | `TAudioCommandOverride` | - | Per-command audio override |

## Behavior

- The cursor's current **selection is cleared** at every step.
- Subsequent `.type()` calls insert at the new cursor position.
- Subsequent `.delete(-n)` calls delete backward from the new cursor position.
- Subsequent `.delete(n)` calls delete forward from the new cursor position.
- **Numeric offset**: the cursor moves one unit (or `amount` units) per step. `before` and `after` fire once per step, not once per command.
- **String boundary**: `"start"` and `"end"` are single-step jumps. `before` and `after` each fire once.

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

> Note: `"line"` splits on `\n` characters in the document text. There is no concept of visual rows - movement is purely character-based.

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

<DocsPlayground :code="prependCode" />

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

<DocsPlayground :code="insertMiddleCode" />

### Move with a large offset (clamped to boundary)

```ts
tw.timeline
  .type("world", { by: "char", interval: 80 })
  .move(-9999) // clamps to 0
  .type("Hello ", { by: "char", interval: 80 });

await tw.play();
// result: "Hello world"
```

### Move step by step with a custom interval

```ts
tw.timeline
  .type("Hello cruel world", { by: "char", interval: 60 })
  .move(-12, { by: "char", interval: 300 }) // 12 steps × 300 ms; cursor moves one char per step
  .type("!", { by: "char", interval: 60 });

await tw.play();
// cursor visits 17→16→...→5 before "!" is inserted
// result: "Hello! cruel world"
```

### Move by word to insert before a specific word

```ts
tw.timeline
  .type("The brown fox", { by: "char", interval: 70 })
  .wait(400)
  .move(-2, { by: "word" }) // move back 2 words - cursor before "brown"
  .type("quick ", { by: "char", interval: 70 });

await tw.play();
// result: "The quick brown fox"
```

<DocsPlayground :code="moveByWordCode" />

### Correct a word in the middle of a sentence

```ts
tw.timeline
  .type("The rain in Spain falls mainly on the plane", { by: "char", interval: 50 })
  .wait(600)
  .move("end")
  .move(-5, { by: "char" }) // cursor before "plane"
  .delete(5, { by: "char", interval: 50 })
  .type("plain", { by: "char", interval: 70 });

await tw.play();
// result: "The rain in Spain falls mainly on the plain"
```

<DocsPlayground :code="correctWordCode" />

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

`.move()` advances the timeline clock by `interval` for every emitted step event. A zero offset produces no events and does not advance the clock.

For a numeric offset of magnitude `N` with unit amount `A`:
- Steps = `ceil(N / A)`
- Total duration = `steps × interval`

String boundaries (`"start"`, `"end"`) always produce exactly one step, so they consume exactly one `interval`.

```ts
tw.timeline
  .type("Hello", { interval: 80 })  // ends at 400 ms
  .move("start")                    // 1 step at 400 ms, ends at 450 ms
  .select("whole")                  // fires at 450 ms, ends at 500 ms
  .style("faded", "selection")      // fires at 500 ms, ends at 550 ms
  .move("end")                      // 1 step at 550 ms, ends at 600 ms
  .type("?", { interval: 80 });     // starts at 600 ms

await tw.play();
```

A move like `.move(-5, { by: "char", interval: 100 })` occupies `5 × 100 = 500 ms` and visits 5 intermediate cursor positions.

## Edge cases

- **`offset = 0`** - no events emitted; clock does not advance; cursor position is unchanged. `before` and `after` hooks still fire once during sequential playback (`play()`/`replay()`).
- **`"start"` when cursor is already at 0** - selection is cleared; position unchanged.
- **`"end"` when cursor is already at `text.length`** - selection is cleared; position unchanged.
- **Large positive offset** - clamped to `text.length`.
- **Large negative offset** - clamped to `0`.
- **Empty document** - any move clamps to `0`.
- **Unknown boundary string** - passing a string operand other than `"start"` or `"end"` throws an error at compile time.
- **Unknown `by` unit** - passing an unrecognised advance unit for the `by` option throws an error at compile time. Only `"char"`, `"grapheme"`, `"word"`, and `"line"` are accepted. `"whole"` is not valid for `by`.

## Type reference

- [`TMoveOptions`](/api/type-aliases/TMoveOptions)
- [`TMoveCommand`](/api/type-aliases/TMoveCommand)
- [`TMoveValue`](/api/type-aliases/TMoveValue)
- [`TAdvanceModeInput`](/api/type-aliases/TAdvanceModeInput)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
