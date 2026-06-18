# `.unmark()` — remove style marks from a range

Removes style marks that overlap a given document range or cursor selection.

```ts
tw.timeline.unmark(
  range: TMarkRange | "selection",
  options?: TUnmarkOptions
): TimelineBuilder
```

`.unmark()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. Marks are never mutated — they are either removed entirely (if fully inside the range) or **clipped** to exclude the range (if they partially overlap).

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `range` | `TMarkRange \| "selection"` | The range to clear — absolute indices or the current cursor selection |
| `options` | `TUnmarkOptions` | Optional cursor targeting and lifecycle hooks |

## Options

```ts
type TUnmarkOptions = {
  cursor?: TCursorSelector; // default: "main"
  before?: TCallbackHook;
  after?: TCallbackHook;
  audio?: TAudioCommandOverride;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `cursor` | `TCursorSelector` | `"main"` | Whose selection to read when `range` is `"selection"` |
| `before` | `TCallbackHook` | — | Hook fired before the marks are removed |
| `after` | `TCallbackHook` | — | Hook fired after the marks are removed |
| `audio` | `TAudioCommandOverride` | — | Per-command audio override |

## Range (`TMarkRange`)

```ts
type TMarkRange = { from: number; to: number };
```

- `from` — inclusive start index (0-based character position in the document text)
- `to` — exclusive end index

```ts
// removes marks overlapping characters 6–10 ("World" in "Hello World")
tw.timeline.unmark({ from: 6, to: 11 });
```

### Using `"selection"`

When `range` is `"selection"`, the marks are removed from the targeted cursor's **current selection range** at the moment the event fires. The selection itself is also cleared after the marks are removed.

```ts
tw.timeline
  .type("Hello World")
  .moveCursor(6)
  .select(5) // selects "World"
  .unmark("selection"); // removes marks in the selection range
```

## Clipping behavior

Marks that partially overlap the unmark range are clipped rather than fully removed. Marks that span the entire range are split into two fragments:

| Mark position relative to unmark range | Result |
|---|---|
| Entirely outside the range | Preserved unchanged |
| Entirely inside the range | Removed |
| Overlaps from the left (`mark.from < from`) | Clipped: `mark.to` set to `from` |
| Overlaps from the right (`mark.to > to`) | Clipped: `mark.from` set to `to` |
| Spans the entire range | Split into two: `[mark.from, from]` and `[to, mark.to]` |

## Examples

### Remove a mark by absolute range

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .mark("highlight", { from: 0, to: 11 }) // marks everything
  .wait(800)
  .unmark({ from: 6, to: 11 }); // removes mark from "World"

await tw.play();
// "Hello " still carries "highlight"; "World" does not
```

### Partial overlap is clipped

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .mark("highlight", { from: 0, to: 11 }) // marks all 11 chars
  .wait(800)
  .unmark({ from: 3, to: 8 }); // unmark overlaps the single mark

await tw.play();
// mark is split: [0, 3] and [8, 11] both keep "highlight"
// characters 3–7 are no longer marked
```

### Remove marks using the current selection

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .mark("highlight", { from: 0, to: 11 })
  .wait(600)
  .moveCursor(6)
  .select(5) // selects "World"
  .unmark("selection"); // removes marks in the selection, clears selection

await tw.play();
// "Hello " is still highlighted; "World" is not
```

### Remove multiple overlapping marks

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .mark("bold", { from: 0, to: 7 }) // "Hello W"
  .mark("italic", { from: 4, to: 11 }) // "o World"
  .wait(600)
  .unmark({ from: 4, to: 7 }); // unmarks the overlapping region

await tw.play();
// "bold" is clipped to [0, 4]; "italic" is clipped to [7, 11]
// characters 4–6 carry neither mark
```

### Animate mark then unmark

```ts
tw.timeline
  .type("Searching...", { by: "char", interval: 60 })
  .mark("searching", { from: 0, to: 12 })
  .wait(1200)
  .unmark({ from: 0, to: 12 }) // remove the search indicator
  .mark("found", { from: 0, to: 9 }); // apply result style

await tw.play();
```

## Interaction with renderers

`.unmark()` modifies `state.document.marks`. All renderers that read marks — the DOM renderer and `StringRenderer.toAnsiString()` — will reflect the removal on the next render frame.

## Edge cases

- **No marks in range** — no-op; the marks array is returned unchanged.
- **`from === to`** — empty range; no marks are affected.
- **`"selection"` with no active selection** — returns state unchanged without modifying marks or raising an error.
- **`"selection"` clears the selection** — when `range` is `"selection"`, the cursor's selection is cleared after the marks are removed, mirroring the behavior of `.mark("...", "selection")`.
- **Range exceeds document bounds** — marks are still evaluated against the provided `from`/`to` values. Out-of-bounds indices produce correct results because marks are compared numerically.

## Relationship to `.mark()`

`.unmark()` is the inverse of `.mark()`. Where `.mark()` adds a style to a range, `.unmark()` removes it. The two commands share the same range input format and support the same `"selection"` shorthand.

```ts
// Mark then unmark the same range — document ends with no marks
tw.timeline
  .type("Hello")
  .mark("highlight", { from: 0, to: 5 })
  .wait(600)
  .unmark({ from: 0, to: 5 });
```

## Type reference

- [`TUnmarkOptions`](/api/type-aliases/TUnmarkOptions)
- [`TUnmarkCommand`](/api/type-aliases/TUnmarkCommand)
- [`TMarkRange`](/api/type-aliases/TMarkRange)
- [`TTextMark`](/api/type-aliases/TTextMark)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
