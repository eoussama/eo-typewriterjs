# `.unstyle()` — remove style marks from a range

Removes style marks that overlap a given document range or cursor selection.

```ts
tw.timeline.unstyle(
  range: TStyleRange | "selection",
  options?: TUnstyleOptions
): TimelineBuilder
```

`.unstyle()` is an **instant command**. It produces a single event at the current timeline clock position and does **not** advance the clock. Marks are never mutated — they are either removed entirely (if fully inside the range) or **clipped** to exclude the range (if they partially overlap).

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `range` | `TStyleRange \| "selection"` | The range to clear — absolute indices or the current cursor selection |
| `options` | `TUnstyleOptions` | Optional cursor targeting and lifecycle hooks |

## Options

```ts
type TUnstyleOptions = {
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

## Range (`TStyleRange`)

```ts
type TStyleRange = { from: number; to: number };
```

- `from` — inclusive start index (0-based character position in the document text)
- `to` — exclusive end index

```ts
// removes marks overlapping characters 6–10 ("World" in "Hello World")
tw.timeline.unstyle({ from: 6, to: 11 });
```

### Using `"selection"`

When `range` is `"selection"`, the marks are removed from the targeted cursor's **current selection range** at the moment the event fires. The selection itself is also cleared after the marks are removed.

```ts
tw.timeline
  .type("Hello World")
  .move(6)
  .select(5) // selects "World"
  .unstyle("selection"); // removes marks in the selection range
```

## Clipping behavior

Marks that partially overlap the unstyle range are clipped rather than fully removed. Marks that span the entire range are split into two fragments:

| Mark position relative to unstyle range | Result |
|---|---|
| Entirely outside the range | Preserved unchanged |
| Entirely inside the range | Removed |
| Overlaps from the left (`style.from < from`) | Clipped: `style.to` set to `from` |
| Overlaps from the right (`style.to > to`) | Clipped: `style.from` set to `to` |
| Spans the entire range | Split into two: `[style.from, from]` and `[to, style.to]` |

## Examples

### Remove a style by absolute range

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 }) // marks everything
  .wait(800)
  .unstyle({ from: 6, to: 11 }); // removes style from "World"

await tw.play();
// "Hello " still carries "highlight"; "World" does not
```

### Partial overlap is clipped

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 }) // marks all 11 chars
  .wait(800)
  .unstyle({ from: 3, to: 8 }); // unstyle overlaps the single style

await tw.play();
// style is split: [0, 3] and [8, 11] both keep "highlight"
// characters 3–7 are no longer marked
```

### Remove marks using the current selection

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("highlight", { from: 0, to: 11 })
  .wait(600)
  .move(6)
  .select(5) // selects "World"
  .unstyle("selection"); // removes marks in the selection, clears selection

await tw.play();
// "Hello " is still highlighted; "World" is not
```

### Remove multiple overlapping marks

```ts
tw.timeline
  .type("Hello World", { by: "char", interval: 80 })
  .style("bold", { from: 0, to: 7 }) // "Hello W"
  .style("italic", { from: 4, to: 11 }) // "o World"
  .wait(600)
  .unstyle({ from: 4, to: 7 }); // unstyles the overlapping region

await tw.play();
// "bold" is clipped to [0, 4]; "italic" is clipped to [7, 11]
// characters 4–6 carry neither style
```

### Animate style then unstyle

```ts
tw.timeline
  .type("Searching...", { by: "char", interval: 60 })
  .style("searching", { from: 0, to: 12 })
  .wait(1200)
  .unstyle({ from: 0, to: 12 }) // remove the search indicator
  .style("found", { from: 0, to: 9 }); // apply result style

await tw.play();
```

## Interaction with renderers

`.unstyle()` modifies `state.document.marks`. All renderers that read marks — the DOM renderer and `StringRenderer.toAnsiString()` — will reflect the removal on the next render frame.

## Edge cases

- **No marks in range** — no-op; the marks array is returned unchanged.
- **`from === to`** — empty range; no marks are affected.
- **`"selection"` with no active selection** — returns state unchanged without modifying marks or raising an error.
- **`"selection"` clears the selection** — when `range` is `"selection"`, the cursor's selection is cleared after the marks are removed, mirroring the behavior of `.style("...", "selection")`.
- **Range exceeds document bounds** — marks are still evaluated against the provided `from`/`to` values. Out-of-bounds indices produce correct results because marks are compared numerically.

## Relationship to `.style()`

`.unstyle()` is the inverse of `.style()`. Where `.style()` adds a style to a range, `.unstyle()` removes it. The two commands share the same range input format and support the same `"selection"` shorthand.

```ts
// Mark then unstyle the same range — document ends with no marks
tw.timeline
  .type("Hello")
  .style("highlight", { from: 0, to: 5 })
  .wait(600)
  .unstyle({ from: 0, to: 5 });
```

## Type reference

- [`TUnstyleOptions`](/api/type-aliases/TUnstyleOptions)
- [`TUnstyleCommand`](/api/type-aliases/TUnstyleCommand)
- [`TStyleRange`](/api/type-aliases/TStyleRange)
- [`TTextMark`](/api/type-aliases/TTextMark)
- [`TCursorSelector`](/api/type-aliases/TCursorSelector)
- [`TCallbackHook`](/api/type-aliases/TCallbackHook)
- [`TAudioCommandOverride`](/api/type-aliases/TAudioCommandOverride)
